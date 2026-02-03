import os
import json
import google.generativeai as genai
from typing import Optional
from dotenv import load_dotenv
from src.core.schemas import GoalContract
from src.utils.opik_utils import log_agent_trace

load_dotenv()

class ContractAgent:
    """
    LLM-powered agent to translate natural language goals into verifiable contracts.
    Renamed from NegotiatorAgent.
    """
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            print("[WARN] GOOGLE_API_KEY not found. Negotiator will fail unless mocked.")
        else:
            genai.configure(api_key=self.api_key)
            # Use 1.5-flash for higher rate limits (15 RPM vs 2 RPM on experimental)
            self.model = genai.GenerativeModel("gemini-2.5-flash") 
            
            # RAG: Load Knowledge Base
            try:
                base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                kb_path = os.path.join(base_path, "data", "standard_terms.json")
                with open(kb_path, "r") as f:
                    self.knowledge_base = json.load(f)
            except Exception as e:
                print(f"[WARN] Failed to load RAG Knowledge Base: {e}")
                self.knowledge_base = {}

    def _retrieve_context(self, goal: str) -> str:
        """Simple RAG Retrieval: Finds best matching category."""
        goal_lower = goal.lower()
        best_match = "general"
        
        # Simple keyword fallback for MVP RAG
        if "run" in goal_lower or "marathon" in goal_lower or "km" in goal_lower:
            best_match = "running"
        elif "code" in goal_lower or "program" in goal_lower or "app" in goal_lower:
            best_match = "coding"
        elif "read" in goal_lower or "book" in goal_lower:
            best_match = "reading"
        elif "gym" in goal_lower or "lift" in goal_lower or "yoga" in goal_lower:
            best_match = "fitness"
            
        kb_data = self.knowledge_base.get(best_match, {})
        if not kb_data:
            return ""
            
        return f"""
        [RAG CONTEXT RETRIEVED]
        CATEGORY: {best_match.upper()}
        STANDARD TERMS: {json.dumps(kb_data.get('terms', []))}
        KNOWN RISK FACTORS: {kb_data.get('risk_factors', 'None')}
        (Use these to inform the 'terms' array in the contract)
        """ 

    def negotiate(self, user_goal: str) -> Optional[GoalContract]:
        if not self.api_key:
            return None

        # RAG Step: Retrieve Context
        rag_context = self._retrieve_context(user_goal)

        prompt = f"""
        You are the Contract Agent for PACT.
        Your job is to convert a user's natural language goal into a Machine Verifiable Contract (JSON).
        
        {rag_context}
        
        USER INPUT: "{user_goal}"
        
        CRITICAL RULES:
        1. Output strictly valid JSON matching the GoalContract schema.
        2. goal_type: If running related, use "running". Otherwise use "general".
        3. goal_description: Summarize the goal clearly (e.g. "No work after 6pm").
        4. If it's a running goal, set target_distance_km. IF NOT, set it to null.
        5. If no deadline specified, infer "end of upcoming Sunday 23:59 UTC".
        6. PENALTY PREFERENCE:
           - "public shame" -> type: "public_shame", amount: 0
           - "stake burn" (or earned stake) -> type: "stake_burn", amount: 10
           - "donation" -> type: "donation", amount: 10
           - DEFAULT (if unspecified): type: "stake_burn", amount: 10
        
        SCHEMA EXAMPLE:
        {{
            "goal_type": "general",
            "goal_description": "No work emails after 6pm",
            "target_distance_km": null,
            "allowed_activity_types": ["General"],
            "deadline_utc": "2024-12-31T23:59:59Z",
            "min_heart_rate_avg": null,
            "confidence_required": 0.95,
            "penalty": {{
                "type": "stake_burn",
                "amount_usd": 10,
                "destination": "Ledger"
            }}
        }}

        IMPORTANT: Return ONLY the JSON. No markdown formatting.
        """

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            raw_json = response.text
            # Log trace
            log_agent_trace("contract_agent", {"goal": user_goal}, {"json": raw_json})
            
            # Parse
            data = json.loads(raw_json)
            # Validate with Pydantic
            contract = GoalContract(**data)
            return contract

        except Exception as e:
            print(f"Contract Agent Error: {e}")
            print(f"[FALLBACK] Using default contract due to API error.")
            log_agent_trace("contract_agent", {"goal": user_goal}, {"error": str(e), "fallback": True})
            
            # Fallback Contract
            from datetime import datetime, timedelta, timezone
            from src.core.schemas import Penalty, ConsequenceType, ActivityType
            
            # Smart Fallback
            penalty_type = ConsequenceType.STAKE_BURN
            amount = 10
            
            goal_lower = user_goal.lower()
            if "public_shame" in goal_lower.replace(" ", "_"):
                penalty_type = ConsequenceType.PUBLIC_SHAME
                amount = 0
            elif "donation" in goal_lower:
                penalty_type = ConsequenceType.DONATION
                amount = 10
            
            return GoalContract(
                goal_type="general",
                goal_description=user_goal,
                target_distance_km=None,
                allowed_activity_types=[ActivityType.GENERAL],
                deadline_utc=datetime.now(timezone.utc) + timedelta(days=2),
                penalty=Penalty(type=penalty_type, amount_usd=amount, destination="Ledger")
            )
