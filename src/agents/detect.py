from opik import track
from src.core.schemas import VerificationResult, VerificationStatus, GoalContract, AuditorDecision, AuditorVerdict
from src.utils.opik_utils import log_agent_trace, track_metric

class DetectAgent:
    """
    The 'Detect' agent (formerly Auditor).
    Detects failure patterns and decides if consequences should be enforced.
    """
    
    def __init__(self, max_penalty_usd: float = 50.0):
        self.max_penalty_usd = max_penalty_usd
        # In a real system, we'd fetch this from Opik
        self.mock_false_positive_rate = 0.02 # 2%

    @track(name="detect_agent", tags=["audit", "safety"])
    def evaluate(self, contract: GoalContract, verification_result: VerificationResult) -> AuditorDecision:
        checks_passed = []
        checks_failed = []

        # 1. Check Verification Status
        if verification_result.status != VerificationStatus.FAILURE:
            # If success or uncertain, we definitely block enforcement (unless it was a success reward?)
            # But the goal is to enforce *penalties*.
            # If status is SUCCESS, we do NOT enforce penalty.
            return AuditorDecision(
                verdict=AuditorVerdict.BLOCK,
                reason="User succeeded or result uncertain.",
                checks_passed=["Verification Not Failure"]
            )

        # 2. Check Confidence
        if verification_result.confidence < contract.confidence_required:
            checks_failed.append(f"Confidence {verification_result.confidence:.2f} < required {contract.confidence_required}")
        else:
            checks_passed.append("High Confidence Verified")

        # 3. Proportionality Check (Safety)
        if contract.penalty.amount_usd and contract.penalty.amount_usd > self.max_penalty_usd:
            checks_failed.append(f"Penalty ${contract.penalty.amount_usd} exceeds safety limit ${self.max_penalty_usd}")
        else:
            checks_passed.append("Penalty within safety limits")

        # 4. System Reliability Check (Circuit Breaker)
        if self.mock_false_positive_rate > 0.05:
            checks_failed.append(f"System FPR {self.mock_false_positive_rate:.1%} > 5% safety threshold")
        else:
            checks_passed.append("System reliability healthy")

        # Decision
        if checks_failed:
            verdict = AuditorVerdict.BLOCK
            reason = "Safety checks failed: " + "; ".join(checks_failed)
        else:
            verdict = AuditorVerdict.ALLOW
            reason = "All checks passed. Enforcement authorized."

        # Opik Logging
        track_metric("detect_verdict", 1 if verdict == AuditorVerdict.ALLOW else 0)
        
        return AuditorDecision(
            verdict=verdict,
            reason=reason,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
