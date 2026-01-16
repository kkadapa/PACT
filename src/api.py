import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from src.agents.contract import ContractAgent
from src.agents.verify import VerifyAgent
from src.agents.detect import DetectAgent
from src.agents.adapt import AdaptAgent
from src.core.schemas import GoalContract, VerificationResult, AuditorDecision, Penalty, ConsequenceType

app = FastAPI(title="PACT API", description="API for PACT Zero Agent System")

# Initialize Firebase Admin
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Warning: Firebase Admin not initialized: {e}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.core.stakes import StakeManager

# Agents
contract_agent = ContractAgent()
verify_agent = VerifyAgent()
detect_agent = DetectAgent()
adapt_agent = AdaptAgent()

# Stake Manager
stake_manager = StakeManager(db)

class GoalRequest(BaseModel):
    goal_text: str
    user_id: Optional[str] = None

class VerifyRequest(BaseModel):
    activity_id: str
    contract: GoalContract
    user_id: str

async def verify_token(authorization: str = Header(...)):
    """Verify Firebase ID Token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization Header")
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Token")

@app.post("/negotiate", response_model=GoalContract)
async def negotiate_goal(request: GoalRequest):
    """
    Step 1: User sends goal text, Agent returns a structured contract.
    """
    contract = contract_agent.negotiate(request.goal_text)
    if not contract:
        raise HTTPException(status_code=500, detail="Negotiation failed. Check API keys.")
    return contract

@app.post("/commit")
async def commit_goal(contract: GoalContract, user_id: str = Depends(verify_token)):
    """
    Step 1.5: User signs contract -> Store in Firestore
    """
    try:
        doc_ref = db.collection(u'contracts').document()
        # Use mode='json' to ensure Enums are converted to strings and Datetimes to ISO strings
        # This prevents Firestore serialization errors with Pydantic types
        contract_dict = contract.model_dump(mode='json')
        contract_dict['user_id'] = user_id
        contract_dict['status'] = 'Active'
        contract_dict['created_at'] = firestore.SERVER_TIMESTAMP
        doc_ref.set(contract_dict)
        return {"status": "success", "contract_id": doc_ref.id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"COMMIT ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Commit failed: {str(e)}")

@app.post("/verify")
async def verify_activity(request: VerifyRequest):
    """
    Step 2: Simulate verification (Demo purposes).
    """
    # 1. Verify
    verification_result = verify_agent.verify(request.contract, request.activity_id)
    
    # 2. Detect (Audit)
    auditor_decision = detect_agent.evaluate(request.contract, verification_result)
    
    # 3. Adapt (Enforce)
    enforcement_log = None
    if auditor_decision.verdict == "ALLOW_ENFORCEMENT":
        enforcement_log = adapt_agent.adapt_and_enforce(request.contract, auditor_decision)
        
    # 4. Stake Accumulation (NEW)
    stake_result = None
    if request.user_id:
        try:
            stake_result = stake_manager.handle_outcome(request.user_id, verification_result)
        except Exception as e:
            print(f"Stake Error: {e}")
            stake_result = {"error": str(e)}

    return {
        "verification": verification_result,
        "audit": auditor_decision,
        "enforcement": enforcement_log,
        "stake_update": stake_result
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
