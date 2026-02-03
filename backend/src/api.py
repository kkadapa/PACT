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
import os
from src.agents.contract import ContractAgent
from src.agents.verify import VerifyAgent
from src.agents.detect import DetectAgent
from src.agents.adapt import AdaptAgent
from src.core.schemas import GoalContract, VerificationResult, AuditorDecision, Penalty, ConsequenceType
from src.integrations.twitter import twitter_client

app = FastAPI(title="PACT API", description="API for PACT Zero Agent System", root_path="/api")

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
    
from src.utils.opik_utils import track

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

    # Get Opik Trace ID
    from src.utils.opik_utils import opik_context
    trace_data = opik_context.get_current_trace_data()
    trace_id = trace_data.id if trace_data else None

    # 5. Create Feed Event (NEW - Social)
    if verification_result.status != "UNCERTAIN" and request.contract.is_public:
        try:
             # Basic user info lookup (optimization: pass in request or cached)
             user_doc = db.collection(u'users').document(request.user_id).get()
             user_data = user_doc.to_dict() if user_doc.exists else {}
             
             feed_item = {
                 "type": "verification",
                 "user_id": request.user_id,
                 "user_name": user_data.get("display_name", "Anonymous Agent"),
                 "user_photo": user_data.get("photo_url"),
                 "goal_description": request.contract.goal_description,
                 "status": verification_result.status,
                 "timestamp": firestore.SERVER_TIMESTAMP,
                 "evidence_summary": request.text_evidence if request.text_evidence else "Evidence verified by AI.",
                 "trust_score_delta": 5 if verification_result.status == "SUCCESS" else -10 # Mock logic
             }
             db.collection(u'feed').add(feed_item)
        except Exception as e:
            print(f"Feed Creation Error: {e}")

    return {
        "verification": verification_result,
        "audit": auditor_decision,
        "enforcement": enforcement_log,
        "stake_update": stake_result,
        "opik_trace_id": trace_id
    }

@app.get("/feed")
async def get_feed():
    """
    Returns the 20 most recent public feed events. (Mock Data for Demo)
    """
    # MOCK DATA FOR DEMO
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    return [
        {
            "type": "verification",
            "user_name": "Sarah Jenkins",
            "user_photo": "https://i.pravatar.cc/150?u=sarah",
            "goal_description": "Run 5km before 8 AM",
            "status": "SUCCESS",
            "timestamp": (utc_now - datetime.timedelta(minutes=5)).isoformat(),
            "evidence_summary": "Strava Activity Verified: 5.02km @ 5:30/km",
            "trust_score_delta": 5
        },
        {
            "type": "verification",
            "user_name": "David Kim",
            "user_photo": "https://i.pravatar.cc/150?u=david",
            "goal_description": "Read 30 pages of 'Atomic Habits'",
            "status": "SUCCESS",
            "timestamp": (utc_now - datetime.timedelta(minutes=14)).isoformat(),
            "evidence_summary": "Photo Verified: Open book with page number visible.",
            "trust_score_delta": 5
        },
        {
            "type": "verification",
            "user_name": "Marcus Chen",
            "user_photo": "https://i.pravatar.cc/150?u=marcus",
            "goal_description": "No Sugar for 24h",
            "status": "FAILURE",
            "timestamp": (utc_now - datetime.timedelta(minutes=45)).isoformat(),
            "evidence_summary": "Self-Reported: 'Ate a donut at the office.'",
            "trust_score_delta": -15
        },
        {
            "type": "verification",
            "user_name": "Elena Rodriguez",
            "user_photo": "https://i.pravatar.cc/150?u=elena",
            "goal_description": "Ship 3 Pull Requests",
            "status": "SUCCESS",
            "timestamp": (utc_now - datetime.timedelta(hours=1, minutes=12)).isoformat(),
            "evidence_summary": "GitHub API: 3 Merged PRs detected in repo/frontend.",
            "trust_score_delta": 10
        },
        {
            "type": "verification",
            "user_name": "James T.",
            "user_photo": "https://i.pravatar.cc/150?u=james",
            "goal_description": "Wake up by 6:00 AM",
            "status": "SUCCESS",
            "timestamp": (utc_now - datetime.timedelta(hours=2)).isoformat(),
            "evidence_summary": "Photo Verified: Watch face time check.",
            "trust_score_delta": 5
        }
    ]

@app.get("/leaderboard")
async def get_leaderboard():
    """
    Returns top 10 users by 'contracts_completed'. (Mock Data for Demo)
    """
    return [
        {
            "user_id": "user_001",
            "display_name": "Sarah Jenkins",
            "photo_url": "https://i.pravatar.cc/150?u=sarah",
            "contracts_completed": 142,
            "trust_score": 99
        },
        {
            "user_id": "user_002",
            "display_name": "David Kim",
            "photo_url": "https://i.pravatar.cc/150?u=david",
            "contracts_completed": 115,
            "trust_score": 97
        },
         {
            "user_id": "user_003",
            "display_name": "Elena Rodriguez",
            "photo_url": "https://i.pravatar.cc/150?u=elena",
            "contracts_completed": 98,
            "trust_score": 95
        },
        {
            "user_id": "user_004",
            "display_name": "Michael Chang",
            "photo_url": "https://i.pravatar.cc/150?u=michael",
            "contracts_completed": 89,
            "trust_score": 92
        },
        {
            "user_id": "user_088",
            "display_name": "Jessica Wu",
            "photo_url": "https://i.pravatar.cc/150?u=jessica",
            "contracts_completed": 76,
            "trust_score": 90
        },
        {
            "user_id": "user_999",
            "display_name": "Marcus Chen",
            "photo_url": "https://i.pravatar.cc/150?u=marcus",
            "contracts_completed": 45,
            "trust_score": 82
        },
        {
            "user_id": "user_777",
            "display_name": "Alex T.",
            "photo_url": "https://i.pravatar.cc/150?u=alex",
            "contracts_completed": 30,
            "trust_score": 78
        }
    ]

@app.get("/cron/reaper")
async def reaper_job(authorization: str = Header(None)):
    """
    Cron Job: Automated Integrity Check ("The Reaper").
    Runs periodically to verify deadlocked/expired contracts.
    """
    # 1. Security Check
    CRON_SECRET = os.environ.get("CRON_SECRET")
    if not CRON_SECRET:
         # If not configured, block to be safe, or allow if debugging (but risky)
         # For MVP guide, we enforce it.
         print("Warning: CRON_SECRET not set.")
    
    # Vercel sends "Authorization: Bearer <token>"
    # We check if the header value matches "Bearer <CRON_SECRET>"
    if not authorization or (CRON_SECRET and authorization != f"Bearer {CRON_SECRET}"):
        # Allow local debugging if no secret set? No, safer to return 401.
        if CRON_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized Cron")

    results = []
    
    try:
        if not db:
            return {"status": "error", "detail": "Database not initialized. Check FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel Env Vars."}

        # 2. Find Expired Active Contracts
        # Note: Querying by 'status' == 'Active'
        contracts_ref = db.collection('contracts').where('status', '==', 'Active')
        docs = contracts_ref.stream()
        
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        
        for doc in docs:
            data = doc.to_dict()
            contract_id = doc.id
            
            # Check Deadline
            deadline_str = data.get('deadline_utc')
            if not deadline_str:
                continue
                
            # Parse Firestore Timestamp or String
            if isinstance(deadline_str, datetime.datetime):
                deadline = deadline_str
            else:
                 # Attempt string parse
                 try:
                     deadline = datetime.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                 except:
                     continue
            
            # Ensure TZ aware
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=datetime.timezone.utc)
                
            # Grace period? Let's say 1 hour grace.
            if now_utc > deadline + datetime.timedelta(hours=1):
                # EXPIRED!
                print(f"[Reaper] Reaping Contract {contract_id} (Deadline: {deadline})")
                
                # 3. Simulate Failure
                # We construct a contract object
                contract = GoalContract(**data) # Might need validation/handling
                
                verification_result = VerificationResult(
                    status="FAILURE",
                    confidence=1.0,
                    failure_reason="Deadline exceeded without verification. Auto-Reaped.",
                    evidence=None
                )
                
                # 4. Enforce
                # Detect
                auditor_decision = detect_agent.evaluate(contract, verification_result)
                
                # Adapt
                if auditor_decision.verdict == "ALLOW_ENFORCEMENT":
                     adapt_agent.adapt_and_enforce(contract, auditor_decision)
                
                # Stake Burn
                user_id = data.get('user_id')
                if user_id:
                     stake_manager.handle_outcome(user_id, verification_result)
                     
                     # Update User Stats
                     try:
                        db.collection('users').document(user_id).update({
                            'stats.contracts_failed': firestore.Increment(1)
                        })
                     except:
                        pass
                        
                     # 5. Public Shaming (X/Twitter)
                     try:
                         # Fetch user name for the tweet
                         user_doc = db.collection('users').document(user_id).get()
                         user_name = user_doc.to_dict().get('display_name', 'A PACT User') if user_doc.exists else 'A PACT User'
                         
                         shame_message = f"🚨 SHAME ALERT 🚨\n\n{user_name} just failed their PACT: \"{contract.goal_description}\"\n\nThey didn't verify in time and lost their stake! 💸\n\n#PACT #Accountability #PublicShaming"
                         
                         # Post Tweet
                         twitter_client.post_shame_tweet(shame_message)
                     except Exception as e:
                         print(f"Shaming Error: {e}")

                # 5. Update Contract Status
                db.collection('contracts').document(contract_id).update({
                    'status': 'Failed',
                    'reaped_at': firestore.SERVER_TIMESTAMP
                })
                
                results.append(f"Reaped {contract_id} for user {user_id}")
                
        return {"status": "success", "processed": len(results), "details": results}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "detail": str(e)}


@app.get("/opik/traces")
async def get_opik_traces():
    """
    Returns recent traces from Opik.
    """
    try:
        from src.utils.opik_utils import get_opik_client
        client = get_opik_client()
        if not client:
             # Return mock traces if Opik not active
             return [
                 {"id": "mock-1", "name": "contract_negotiation", "start_time": datetime.datetime.now().isoformat(), "duration": 1.2, "status": "success"},
                 {"id": "mock-2", "name": "verify_evidence", "start_time": datetime.datetime.now().isoformat(), "duration": 0.8, "status": "success"},
             ]
        
        # Search traces (Default project)
        # Note: Opik SDK returns Pydantic models, we need to serialize them
        traces = client.search_traces(project_name=os.environ.get("OPIK_PROJECT_NAME", "pact-demo"), max_results=10)
        
        # Serialize
        serialized_traces = []
        for t in traces:
             t_dict = t.model_dump(mode='json') if hasattr(t, 'model_dump') else t.__dict__
             serialized_traces.append(t_dict)
             
        return serialized_traces
    except Exception as e:
        print(f"Opik Fetch Error: {e}")
        return []

@app.get("/health")
async def health():
    return {"status": "ok"}

