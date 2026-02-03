import datetime
from typing import Dict, Any, Optional, Tuple
from firebase_admin import firestore
from google.cloud import firestore as google_firestore
from src.core.schemas import VerificationResult
from src.utils.opik_utils import log_agent_trace, track_metric

STAKE_REWARD = 5
STAKE_PENALTY = 10

class StakeManager:
    def __init__(self, db_client):
        self.db = db_client

    def handle_outcome(self, user_id: str, verification_result: VerificationResult):
        """
        Main entry point for Stake Accumulation.
        Integrates verification result with stake Ledger.
        """
        confidence = verification_result.confidence_score
        is_success = (verification_result.status == "SUCCESS")
        
        # We wrap the transaction logic
        transaction = self.db.transaction()
        result = self._process_stake_transaction(transaction, user_id, is_success, confidence)
        
        # Post-transaction observability
        self._log_observability(user_id, result, verification_result)
        
        return result

    @firestore.transactional
    def _process_stake_transaction(self, transaction, user_id: str, is_success: bool, confidence: float) -> Dict[str, Any]:
        # 1. Read Current Ledger
        doc_ref = self.db.collection('stake_ledgers').document(user_id)
        snapshot = doc_ref.get(transaction=transaction)
        
        current_balance = 0
        lifetime_earned = 0
        lifetime_burned = 0
        
        if snapshot.exists:
            data = snapshot.to_dict()
            current_balance = data.get('current_balance', 0)
            lifetime_earned = data.get('lifetime_earned', 0)
            lifetime_burned = data.get('lifetime_burned', 0)
        else:
            # Default Start for New Users (User Request: $100 Start)
            current_balance = 100
            
        # 2. Determine Action
        if is_success:
            # AWARD
            new_balance = current_balance + STAKE_REWARD
            new_lifetime_earned = lifetime_earned + STAKE_REWARD
            
            transaction.set(doc_ref, {
                'current_balance': new_balance,
                'lifetime_earned': new_lifetime_earned,
                'lifetime_burned': lifetime_burned,
                'updated_at': firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            self._append_event(transaction, user_id, "EARN", STAKE_REWARD, "Verified Success", confidence)
            
            return {"action": "EARN", "amount": STAKE_REWARD, "new_balance": new_balance}

        else:
            # FAILURE -> Check Burn Gate
            # Opik Governance Logic (Evaluated locally inside transaction for safety)
            verdict, reason = self._evaluate_burn_gate(current_balance, confidence)
            
            if verdict == "ALLOW_BURN":
                new_balance = current_balance - STAKE_PENALTY
                new_lifetime_burned = lifetime_burned + STAKE_PENALTY
                
                transaction.set(doc_ref, {
                    'current_balance': new_balance,
                    'lifetime_earned': lifetime_earned,
                    'lifetime_burned': new_lifetime_burned,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }, merge=True)
                
                self._append_event(transaction, user_id, "BURN", STAKE_PENALTY, reason, confidence, verdict)
                return {"action": "BURN", "amount": STAKE_PENALTY, "new_balance": new_balance, "reason": reason}
            
            else:
                # BLOCKED
                self._append_event(transaction, user_id, "BLOCKED", 0, reason, confidence, verdict)
                return {"action": "BLOCKED", "amount": 0, "reason": reason, "current_balance": current_balance}

    def _evaluate_burn_gate(self, current_balance: float, confidence: float) -> Tuple[str, str]:
        """
        OPIK GOVERNANCE LOGIC: stake_burn_gate
        Inputs: confidence, current_balance
        """
        # 1. Confidence Check
        if confidence < 0.95:
            return "BLOCK_BURN", f"Confidence too low ({confidence} < 0.95)"
        
        # 2. Balance Check
        if current_balance < STAKE_PENALTY:
            return "BLOCK_BURN", f"Insufficient Stake ({current_balance} < {STAKE_PENALTY})"
            
        # 3. Rolling False Positive Rate (Mocked for MVP)
        rolling_fpr = 0.01 
        if rolling_fpr >= 0.05:
            return "BLOCK_BURN", "System High FP Rate"
            
        return "ALLOW_BURN", "Governance Checks Passed"

    def _append_event(
        self, 
        transaction, 
        user_id: str, 
        event_type: str, 
        amount: float, 
        reason: str,
        confidence: float,
        opik_verdict: str = None
    ):
        event_ref = self.db.collection('stake_events').document()
        transaction.set(event_ref, {
            "user_id": user_id,
            "event_type": event_type,
            "amount": amount,
            "reason": reason,
            "verification_confidence": confidence,
            "opik_verdict": opik_verdict,
            "created_at": firestore.SERVER_TIMESTAMP
        })

    def _log_observability(self, user_id: str, result: Dict, verification_result: VerificationResult):
        """
        Log Traces and Metrics to Opik AFTER transaction commits.
        """
        action = result.get("action")
        
        if action == "BURN":
            log_agent_trace(
                "stake_enforcement_trace",
                input_data={"user_id": user_id, "verification": verification_result.model_dump()},
                output_data=result,
                tags=["governance", "burn"]
            )
            track_metric("stake_burn_success_rate", 1.0)
            
        elif action == "BLOCKED":
            log_agent_trace(
                "stake_audit_trace",
                input_data={"user_id": user_id, "verification": verification_result.model_dump()},
                output_data=result,
                tags=["governance", "blocked"]
            )
            track_metric("blocked_burn_rate", 1.0)
            
        elif action == "EARN":
             track_metric("stake_earned_total", STAKE_REWARD)
