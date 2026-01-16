from typing import Optional, Dict
from src.agents.contract import ContractAgent
from src.agents.verify import VerifyAgent
from src.agents.detect import DetectAgent
from src.agents.adapt import AdaptAgent
from src.core.schemas import GoalContract, VerificationResult, AuditorDecision

class PACTOrchestrator:
    def __init__(self):
        self.contract_agent = ContractAgent()
        self.verify_agent = VerifyAgent()
        self.detect_agent = DetectAgent()
        self.adapt_agent = AdaptAgent()

    def run_pipeline(self, user_prompt: str, mock_activity_id: str = "run_valid_outdoor") -> Dict:
        results = {}
        
        # 1. Negotiate (Contract Creation)
        print(f"\n[ORCHESTRATOR] Contract Agent creating contract for: '{user_prompt}'...")
        contract = self.contract_agent.negotiate(user_prompt)
        if not contract:
            return {"error": "Contract creation failed (API key missing or LLM error)"}
        
        results["contract"] = contract.model_dump()
        print(f"[ORCHESTRATOR] Contract Signed!\n  Goal: {contract.target_distance_km}km by {contract.deadline_utc}\n  Penalty: ${contract.penalty.amount_usd}")

        # 2. Wait / Verify
        print(f"\n[ORCHESTRATOR] Verify Agent checking activity '{mock_activity_id}'...")
        verification_result = self.verify_agent.verify(contract, mock_activity_id)
        results["verification"] = verification_result.model_dump()
        
        status_icon = "✅" if verification_result.status == "SUCCESS" else "❌"
        print(f"[ORCHESTRATOR] Verification {verification_result.status} {status_icon}")
        if verification_result.failure_reason:
            print(f"  Reason: {verification_result.failure_reason}")

        # 3. Detect (Audit)
        print(f"\n[ORCHESTRATOR] Detect Agent analyzing patterns...")
        auditor_decision = self.detect_agent.evaluate(contract, verification_result)
        results["audit"] = auditor_decision.model_dump()
        print(f"[ORCHESTRATOR] Verdict: {auditor_decision.verdict}")
        print(f"  Reason: {auditor_decision.reason}")

        # 4. Adapt (Enforce)
        # We enforce/adapt if Auditor (Detect) says ALLOW
        if auditor_decision.verdict == "ALLOW_ENFORCEMENT":
            print(f"\n[ORCHESTRATOR] Adapt Agent Executing Consequence...")
            enforcement_log = self.adapt_agent.adapt_and_enforce(contract, auditor_decision)
            results["enforcement"] = enforcement_log
            print(f"  {enforcement_log}")
        else:
            print(f"\n[ORCHESTRATOR] No enforcement action taken.")

        return results
