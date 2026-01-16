from datetime import datetime, timezone
from typing import Optional
from opik import track # Assuming opik decorator available, or we use manual
from src.core.schemas import GoalContract, VerificationResult, VerificationStatus, Evidence, ActivityType
from src.utils.strava_mock import StravaMockClient
from src.utils.opik_utils import log_agent_trace
import dateutil.parser

class VerifyAgent:
    def __init__(self, strava_client: Optional[StravaMockClient] = None):
        self.strava_client = strava_client or StravaMockClient()

    @track(name="verify_agent", tags=["verification"])
    def verify(self, contract: GoalContract, activity_id: str) -> VerificationResult:
        """
        Verifies if a specific Strava activity fulfills the GoalContract.
        """
        
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
