from datetime import datetime
from src.core.schemas import AuditorDecision, AuditorVerdict, GoalContract
from src.utils.opik_utils import track_metric, log_agent_trace

class AdaptAgent:
    """
    Adapts strictness and executes consequences (formerly Enforcer).
    """

    def adapt_and_enforce(self, contract: GoalContract, decision: AuditorDecision) -> str:
        if decision.verdict == AuditorVerdict.BLOCK:
            return f"Enforcement BLOCKED by Detect Agent. Reason: {decision.reason}"
        
        # If ALLOW, we proceed.
        # Check if penalty is defined
        penalty = contract.penalty
        
        action_log = ""
        if penalty.type == "donation":
            amount = penalty.amount_usd or 0
            dest = penalty.destination or "Charity"
            # Mock Stripe call
            action_log = f"EXECUTED: Charged ${amount} to card ending 4242. Donated to {dest}."
            track_metric("money_moved_usd", amount)
        elif penalty.type == "public_shame":
            action_log = "EXECUTED: Posted shame tweet to X/Twitter."
        else:
            action_log = f"EXECUTED: Generic penalty {penalty.type}"
            
        # Log to Opik
        log_agent_trace(
            "adapt_agent",
            {"contract": contract.model_dump(), "decision": decision.model_dump()},
            {"action": action_log}
        )
        
        return action_log
