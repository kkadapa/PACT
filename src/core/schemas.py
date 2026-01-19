from enum import Enum
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Enums ---

class ActivityType(str, Enum):
    RUN = "Run"
    TREADMILL = "Treadmill"
    # Generic for MVP extension
    GENERAL = "General"

class ConsequenceType(str, Enum):
    DONATION = "donation"
    PUBLIC_SHAME = "public_shame"
    STAKE_BURN = "stake_burn"

class AuditorVerdict(str, Enum):
    ALLOW = "ALLOW_ENFORCEMENT"
    BLOCK = "BLOCK_ENFORCEMENT"

class VerificationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    UNCERTAIN = "UNCERTAIN"

# --- Negotiator Schemas ---

class Penalty(BaseModel):
    type: ConsequenceType
    amount_usd: Optional[float] = None
    destination: Optional[str] = None
    description: Optional[str] = "Penalty for missing the goal"

class GoalContract(BaseModel):
    """
    Contract produced by the Negotiator Agent.
    """
    goal_type: str = "general"
    goal_description: Optional[str] = "User defined goal"
    target_distance_km: Optional[float] = Field(None, description="Target distance in kilometers (if running)")
    allowed_activity_types: List[ActivityType] = Field(default_factory=lambda: [ActivityType.GENERAL])
    deadline_utc: datetime = Field(..., description="Deadline for the activity in UTC")
    min_heart_rate_avg: Optional[float] = Field(None, description="Minimum average heart rate required (anti-cheat for treadmill)")
    confidence_required: float = Field(0.95, description="Minimum verification confidence required (0.0 - 1.0)")
    penalty: Penalty

# --- Verifier Schemas ---

class Evidence(BaseModel):
    activity_id: Optional[str] = None # Strava ID
    distance_km: Optional[float] = None
    avg_hr: Optional[float] = None
    start_time: datetime
    activity_type: str
    
    # Generic Evidence
    text_evidence: Optional[str] = Field(None, description="User description or reasoning")
    image_urls: List[str] = Field(default_factory=list, description="Screenshots or photos")
    
    raw_strava_summary: Optional[str] = None

class VerificationResult(BaseModel):
    """
    Output from the Verifier Agent.
    """
    status: VerificationStatus
    confidence: float = Field(..., ge=0.0, le=1.0)
    failure_reason: Optional[str] = None
    evidence: Optional[Evidence] = None

# --- Auditor Schemas ---

class AuditorDecision(BaseModel):
    """
    Output from the Auditor Agent.
    """
    verdict: AuditorVerdict
    reason: str
    checks_passed: List[str] = []
    checks_failed: List[str] = []
