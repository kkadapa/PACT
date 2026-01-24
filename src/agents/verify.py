from datetime import datetime, timezone
from typing import Optional
import os
import google.generativeai as genai
from opik import track
from src.core.schemas import GoalContract, VerificationResult, VerificationStatus, Evidence, ActivityType
from src.utils.strava_mock import StravaMockClient
from src.utils.opik_utils import log_agent_trace
import dateutil.parser
import json

class VerifyAgent:
    def __init__(self, strava_client: Optional[StravaMockClient] = None):
        self.strava_client = strava_client or StravaMockClient()
        
        # Initialize LLM for Generic Verification
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-2.5-flash")
        else:
            self.model = None

    @track(name="verify_agent", tags=["verification"])
    def verify(self, contract: GoalContract, activity_id: str = None, evidence_input: Evidence = None) -> VerificationResult:
        """
        Verifies if a specific activity fulfills the GoalContract.
        Supports both Strava Activities (specific) and Generic Evidence (LLM check).
        """
        
        # Route to Generic Verifier if explicit evidence provided or non-Strava contract
        if (evidence_input and (evidence_input.text_evidence or evidence_input.image_urls)) or contract.target_distance_km is None:
            return self.verify_generic(contract, evidence_input)
            
        return self.verify_strava(contract, activity_id)

    def verify_generic(self, contract: GoalContract, evidence: Optional[Evidence]) -> VerificationResult:
        """
        Uses LLM to verify generic evidence (text/image) against the goal.
        """
        if not self.model:
            return VerificationResult(
                status=VerificationStatus.UNCERTAIN, 
                confidence=0.0, 
                failure_reason="LLM not configured for generic verification."
            )
            
        if not evidence or (not evidence.text_evidence and not evidence.image_urls):
             return VerificationResult(
                status=VerificationStatus.FAILURE, 
                confidence=1.0, 
                failure_reason="No evidence provided for generic goal."
            )

        prompt = f"""
        System Instruction:
        
        You are the PACT⁰ Verification Judge. Your job is to verify physical task completion based on provided evidence.
        You are skeptical. 
        - IF IMAGE PROVIDED: Look for visual artifacts (sweat, equipment, timestamps).
        - IF TEXT ONLY: Evaluate the credibility, specific details, and effort described.
        
        INPUT:
        - Goal: "{contract.goal_description}"
        - Evidence Image: {evidence.image_urls if evidence.image_urls else 'No Image Provided'}
        - Text Context: {evidence.text_evidence}
        - Timestamp: {evidence.start_time}
        
        YOUR TASK:
        1. Analyze Evidence:
           - Image: consistency, metadata clues, generic stock photo detection.
           - Text: Specificity (reps, time, feeling), consistency with goal.
        2. Verify Recency & Authenticity.
        3. Make a Verdict.
        
        OUTPUT JSON:
        {{
          "visual_artifacts_detected": ["List items or 'None'"],
          "is_generic_stock_photo": boolean,
          "relevance_score": 0-100,
          "proof_quality_score": 0-100 (If text only, max is 80 unless extremely convincing),
          "final_verdict": "SUCCESS" | "FAILURE" | "UNCERTAIN",
          "reasoning": "Explanation citing specific evidence or lack thereof."
        }}
        """
        
        try:
             # If image URLs are present, we should actually download/pass them.
             # For this demo step, we assume the URL allows the model (if multimodal) or we just rely on text + context.
             # In a production version with Gemini 1.5, we would pass the image bytes.
             
             response = self.model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
             result = json.loads(response.text)
             
             log_agent_trace("verify_generic", {"evidence": evidence.model_dump()}, result)
             
             # Map Forensic Output to Standard Result
             status_map = {
                 "SUCCESS": VerificationStatus.SUCCESS,
                 "FAILURE": VerificationStatus.FAILURE,
                 "UNCERTAIN": VerificationStatus.UNCERTAIN
             }
             
             return VerificationResult(
                 status=status_map.get(result.get("final_verdict"), VerificationStatus.UNCERTAIN),
                 confidence=result.get("proof_quality_score", 0) / 100.0,
                 failure_reason=result.get("reasoning") if result.get("final_verdict") != "SUCCESS" else None,
                 evidence=evidence
             )
             
        except Exception as e:
            return VerificationResult(
                status=VerificationStatus.UNCERTAIN,
                confidence=0.0,
                failure_reason=f"Verification Error: {str(e)}"
            )

    def verify_strava(self, contract: GoalContract, activity_id: str) -> VerificationResult:
        # 1. Fetch Data
        try:
            activity = self.strava_client.get_activity(activity_id)
        except Exception as e:
            return VerificationResult(
                status=VerificationStatus.UNCERTAIN, 
                confidence=0.0, 
                failure_reason=f"API Error: {str(e)}"
            )

        # 2. Extract Key Metrics
        act_dist_km = activity.get("distance", 0) / 1000.0
        act_start_str = activity.get("start_date")
        act_start = dateutil.parser.isoparse(act_start_str)
        if act_start.tzinfo is None:
            act_start = act_start.replace(tzinfo=timezone.utc)
            
        act_elapsed_sec = activity.get("elapsed_time", 0)
        act_pace_per_km = (act_elapsed_sec / 60) / act_dist_km if act_dist_km > 0 else 0
        
        is_manual = activity.get("manual", False)
        is_treadmill = activity.get("trainer", False)
        has_hr = activity.get("has_heartrate", False)
        avg_hr = activity.get("average_heartrate", 0)

        evidence = Evidence(
            activity_id=str(activity.get("id")),
            distance_km=act_dist_km,
            avg_hr=avg_hr,
            start_time=act_start,
            activity_type=activity.get("type", "Unknown")
        )

        failure_reasons = []

        # --- LOGIC GATES ---

        # 3. Time Validation
        if act_start > contract.deadline_utc:
            failure_reasons.append(f"Activity started after deadline ({act_start} > {contract.deadline_utc})")
        
        # 4. Distance Validation (with 3% tolerance)
        required_dist = contract.target_distance_km * 0.97
        if act_dist_km < required_dist:
            failure_reasons.append(f"Distance {act_dist_km:.2f}km < required {required_dist:.2f}km")

        # 5. Pace Plausibility (Anti-Cheat)
        # Reject world-record paces (< 2:45 min/km) unless specifically allowed? 
        # Let's say < 3:00 min/km is suspicious for average users.
        if act_pace_per_km < 3.0: 
            failure_reasons.append(f"Pace {act_pace_per_km:.2f}/km is suspicious (human limit check)")

        # 6. Manual Entry Check
        if is_manual:
             failure_reasons.append("Manual entries are not allowed")

        # 7. Treadmill / Heart Rate Logic
        if is_treadmill:
            if not has_hr:
                failure_reasons.append("Treadmill run missing heart rate data")
            elif contract.min_heart_rate_avg and avg_hr < contract.min_heart_rate_avg:
                failure_reasons.append(f"Avg HR {avg_hr} < min required {contract.min_heart_rate_avg}")
            
            # Advanced Stream Check (Opik Trace for detailed cheat detection)
            streams = self.strava_client.get_activity_streams(activity_id)
            if streams:
                hrs = [p['heartrate'] for p in streams]
                if len(hrs) > 10:
                    import statistics
                    stdev = statistics.stdev(hrs)
                    if stdev < 2.0: # Extremely flat HR
                        failure_reasons.append(f"HR Variability suspicious (stdev={stdev:.2f})")

        # --- CONCLUSION ---
        
        if failure_reasons:
            return VerificationResult(
                status=VerificationStatus.FAILURE,
                confidence=1.0, # High confidence in failure if rules broken
                failure_reason="; ".join(failure_reasons),
                evidence=evidence
            )
        
        return VerificationResult(
            status=VerificationStatus.SUCCESS,
            confidence=0.98, # High confidence
            evidence=evidence
        )
