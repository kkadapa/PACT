import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from fastapi import UploadFile, File, Form
from firebase_admin import storage
import uuid
import datetime
from src.agents.contract import ContractAgent
from src.agents.verify import VerifyAgent
from src.agents.detect import DetectAgent
from src.agents.adapt import AdaptAgent
from src.core.schemas import GoalContract, VerificationResult, AuditorDecision, Penalty, ConsequenceType

app = FastAPI(title="PACT API", description="API for PACT Zero Agent System")

# Initialize Firebase Admin
# Initialize Firebase Admin
try:
    if os.path.exists("serviceAccountKey.json"):
        cred = credentials.Certificate("serviceAccountKey.json")
    else:
        # Check for environment variable
        import os
        import base64
        import json
        encoded_creds = os.environ.get("FIREBASE_SERVICE_ACCOUNT_BASE64")
        if encoded_creds:
            decoded_creds = base64.b64decode(encoded_creds)
            creds_dict = json.loads(decoded_creds)
            cred = credentials.Certificate(creds_dict)
        else:
            # Fallback for Vercel/Cloud if we rely on default credentials (GCP)
            # But specific service account is better for external hosting
            print("Warning: No serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT_BASE64 found.")
            cred = None

    if cred:
        # check if app already exists to avoid ValueError
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'pact-demo.appspot.com'
            })
        
        db = firestore.client()
        bucket = storage.bucket()
    else:
        db = None
        bucket = None
except Exception as e:
    print(f"Warning: Firebase Admin not initialized: {e}")
    db = None
    bucket = None

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
    # Support either activity_id OR generic evidence
    activity_id: Optional[str] = None 
    contract: GoalContract
    user_id: str
    text_evidence: Optional[str] = None
    image_url: Optional[str] = None

async def verify_token(authorization: str = Header(...)):
    """Verify Firebase ID Token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization Header")
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
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
async def commit_goal(contract: GoalContract, token_data: dict = Depends(verify_token)):
    """
    Step 1.5: User signs contract -> Store in Firestore & Update User Profile
    """
    try:
        user_id = token_data['uid']
        
        # 1. Update/Create User Profile
        user_ref = db.collection(u'users').document(user_id)
        user_data = {
            'email': token_data.get('email'),
            'display_name': token_data.get('name'),
            'photo_url': token_data.get('picture'),
            'last_login_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        # Stats initialization (using set with merge=True to not overwrite existing stats)
        user_ref.set(user_data, merge=True)
        
        # Atomically increment total_contracts_signed
        # (For MVP doing simple update to avoid transaction complexity if doc doesn't exist yet, 
        # but technically we should check existence. `set(merge=True)` handles existence.)
        # We can use FieldValue.increment
        user_ref.update({
            'stats.total_contracts_signed': firestore.Increment(1)
        })

        # 2. Store Contract
        doc_ref = db.collection(u'contracts').document()
        # Use mode='json' to ensure Enums are converted to strings and Datetimes to ISO strings
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

@app.post("/upload_evidence")
async def upload_evidence(file: UploadFile = File(...)):
    """
    Uploads an image to Firebase Storage and returns the public URL.
    """
    try:
        # Generate unique filename
        filename = f"evidence/{uuid.uuid4()}_{file.filename}"
        blob = bucket.blob(filename)
        
        # Upload
        blob.upload_from_file(file.file, content_type=file.content_type)
        blob.make_public()
        
        return {"url": blob.public_url}
    except Exception as e:
        print(f"Upload Error: {e}")
        # MVP Mock Fallback if storage not configured
        return {"url": "https://placehold.co/600x400?text=Mock+Evidence+Uploaded"}
    
from opik import track

@app.post("/verify")
@track(name="pact_verification_flow", tags=["api", "verification"])
async def verify_activity(request: VerifyRequest):
    """
    Step 2: Simulate verification (Demo purposes).
    """
    # 1. Verify
    
    # Construct Evidence Object if generic fields present
    from src.core.schemas import Evidence
    evidence_input = None
    if request.text_evidence or request.image_url:
        evidence_input = Evidence(
            start_time=datetime.datetime.now(datetime.timezone.utc),
            activity_type="Generic",
            text_evidence=request.text_evidence,
            image_urls=[request.image_url] if request.image_url else []
        )
    
    verification_result = verify_agent.verify(request.contract, request.activity_id, evidence_input)
    
    # Update Progress Stats in User Doc
    if request.user_id:
        try:
           # We use a Fire-and-Forget approach or simple await for MVP
           # In production, this might be a background task
           user_ref = db.collection(u'users').document(request.user_id)
           if verification_result.status == "SUCCESS":
               user_ref.update({
                   'stats.contracts_completed': firestore.Increment(1)
               })
           elif verification_result.status == "FAILURE":
                user_ref.update({
                   'stats.contracts_failed': firestore.Increment(1)
               })
        except Exception as e:
            print(f"Stats Update Error: {e}")

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
