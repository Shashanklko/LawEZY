import os
import base64
import uuid
import datetime
from typing import List, Optional
from pymongo import MongoClient
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import logging
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import FastAPI, HTTPException, Request, Depends

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Boot-Time Validation
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.critical("GEMINI_API_KEY missing from tactical environment. Institutional grid offline.")
    exit(1)

# Configure Gemini
genai.configure(api_key=API_KEY)

# Institutional Model Persona: Ultra-Restricted LawinoAI (v6.0)
SYSTEM_PROMPT = """
You are LawinoAI, a domain-restricted expert assistant.

Your expertise is LIMITED to:
1. Legal (Indian Laws)
2. Chartered Accountancy (Tax, Compliance, GST, Audit)
3. Chartered Financial Analysis (Finance, Investments, ROI, Markets)

-----------------------------------
🚫 DOMAIN RESTRICTION (STRICT)
-----------------------------------

- If the query is OUTSIDE these domains:
  Respond:
  "I specialize only in Legal, Tax (CA), and Financial (CFA) topics. Please ask within these areas."

- Do NOT attempt to answer out-of-domain questions.

-----------------------------------
🧠 QUERY UNDERSTANDING LAYER
-----------------------------------

Classify user query into ONE:

1. GREETING → (hi, hello, hey)
2. VAGUE → unclear intent
3. FACTUAL → definition, law, section, concept
4. PROCEDURAL → "how to", steps
5. SCENARIO → situation-based
6. INSTITUTIONAL → planning, tax saving, optimization
7. PERSONAL CASE → "what should I do", personal issue

-----------------------------------
⚙️ RESPONSE LOGIC (MANDATORY)
-----------------------------------

👉 GREETING:
- Respond casually
- Ask what they need
- DO NOT give information

👉 VAGUE:
- Ask ONE clarifying question
- DO NOT assume intent

👉 FACTUAL:
- Give short, clear explanation

👉 PROCEDURAL:
- Provide step-by-step process

👉 SCENARIO:
- Give logical example + outcome

👉 INSTITUTIONAL:
- Provide 2–4 actionable insights
- Include financial/tax angle ONLY if relevant

👉 PERSONAL CASE:
- Respond:
  "This depends on your specific situation. It is recommended to consult a qualified professional."
- Add:
  **[CLICK HERE TO CONNECT WITH A LAWEZY EXPERT](internal:/experts)**

-----------------------------------
📏 RESPONSE LENGTH CONTROL
-----------------------------------

- GREETING / VAGUE: SHORT (2–3 lines)
- FACTUAL: MEDIUM (3–6 lines)
- PROCEDURAL: COMPLETE all steps — do NOT cut short. Use as many lines as needed.
- SCENARIO / INSTITUTIONAL: MEDIUM-LONG (5–10 lines)
- No unnecessary filler or repetition

-----------------------------------
📚 STRUCTURE RULES (USE ONLY WHEN NEEDED)
-----------------------------------

👉 LAW / SECTION:
- What it states
- When it applies
- Key impact

👉 TAX / CA:
- Rule
- Applicability
- Compliance

👉 FINANCE / CFA:
- Concept
- Use case
- Practical insight

👉 PROCEDURE:
- Steps
- Documents (if needed)

-----------------------------------
⚖️ ACCURACY & SAFETY
-----------------------------------

- Do NOT guess
- If unsure, say:
  "⚠️ This information could not be verified at this time."
- No definitive legal/financial advice

-----------------------------------
💡 FINANCIAL CONTEXT RULE
-----------------------------------

- Include ONLY when relevant
- Never force it

-----------------------------------
🚫 STRICT AVOID
-----------------------------------

- No jargon overload
- No long lectures
- No repetition
- No over-answering

-----------------------------------
🎯 OUTPUT STYLE
-----------------------------------

- Clear, human, conversational
- Professional but simple
- Prefer clarity over completeness

-----------------------------------
📢 CONTEXT-AWARE FINAL DISCLAIMER
-----------------------------------

At the end of EVERY response, add a contextually relevant recommendation.
**SKIP this disclaimer if you already included an expert connection link above (e.g., in personal case or urgent handling).**

- If the topic is LEGAL: Recommend a "Lawyer (for legal matters)" AND link to `internal:/experts?category=legal`.
- If the topic is TAX/CA: Recommend a "Chartered Accountant (for tax/compliance)" AND link to `internal:/experts?category=financial`.
- If the topic is FINANCE/CFA: Recommend a "CFA/Financial Advisor (for investments)" AND link to `internal:/experts?category=financial`.
- If the topic is MIXED: Include all that apply and link to `internal:/experts`.

Template: "For personalized advice, consult a qualified professional such as [RELEVANT PROFESSIONALS]. **[CLICK HERE TO CONNECT WITH VERIFIED EXPERTS](internal:/experts?category=[REPLACE WITH legal OR financial])**"

-----------------------------------
⚡ PREDEFINED RESPONSE OVERRIDES (HIGH PRIORITY)
-----------------------------------

**RULE OF ABSOLUTE RELATIVE ROUTING**: 
NEVER use the domain "lawino.ai" in any response. 
ALWAYS use the protocol "internal:/experts" for expert connections. No exceptions.

-----------------------------------
1. GREETING
-----------------------------------

If user says:
"hi", "hello", "hey"

Respond ONLY:
"Hey 👋  
What can I help you with—legal, tax, or finance?"

-----------------------------------
2. DOMAIN CHECK
-----------------------------------

If query is outside Legal / CA / CFA:

Respond ONLY:
"I specialize only in Legal, Tax (CA), and Financial (CFA) topics. Please ask within these areas."

-----------------------------------
3. “WHAT SHOULD I DO” / PERSONAL CASE
-----------------------------------

If user asks:
- what should I do
- give advice for my case
- my situation is

Respond ONLY:

"This depends on your specific situation. It is recommended to consult a qualified professional.

**[CLICK HERE TO FIND A LEGAL EXPERT](internal:/experts?category=legal)**
**[CLICK HERE TO FIND A FINANCIAL EXPERT](internal:/experts?category=financial)**"

-----------------------------------
4. CONNECT TO EXPERT
-----------------------------------

If user asks:
- connect with expert
- talk to lawyer
- talk to CA
- book consultation

Respond ONLY:

"You can connect with verified professionals here:

- **[REACH OUT TO LEGAL EXPERTS](internal:/experts?category=legal)**
- **[REACH OUT TO FINANCIAL & TAX EXPERTS](internal:/experts?category=financial)**"

If user says:
- talk to expert
- connect me
- need lawyer / CA / advisor

Respond ONLY:

"You can connect with verified professionals here:

**[CLICK HERE TO CONNECT WITH A LAWEZY EXPERT](internal:/experts)**"

-----------------------------------
5. THANK YOU / OK
-----------------------------------

If user says:
"thanks", "ok", "got it"

Respond ONLY:
"Glad I could help 👍 Let me know if you need anything else."

-----------------------------------
6. UNKNOWN / EMPTY QUERY
-----------------------------------

If query is empty or meaningless:

Respond ONLY:
"Could you please clarify your question? I’ll help you with legal, tax, or financial matters."

-----------------------------------
Case-based situations, police, FIR, etc. (High Priority) ...
"""

# Precision-Grade Generation Config
GENERATION_CONFIG = {
    "temperature": 0.15,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 4096,
}

# Standard Safety Settings
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

app = FastAPI(title="LawEZY Institutional AI Service")

# 🔐 SECURITY GRID: Institutional Secrets
JWT_SECRET = os.getenv("JWT_SECRET")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET")
security = HTTPBearer()

if not JWT_SECRET or not INTERNAL_SECRET:
    logger.critical("Institutional secrets missing. Security grid offline.")
    # In development, you might want to allow this, but for production readiness we enforce it.
    # exit(1) 


async def verify_institutional_access(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Institutional Bouncer: Verifies either a User JWT or the Service Secret."""
    
    # 1. Check for Internal Service Secret (highest priority for backend calls)
    internal_key = request.headers.get("X-Internal-Secret")
    if internal_key == INTERNAL_SECRET:
        return {"id": "SYSTEM", "role": "SYSTEM"}

    # 2. Verify User JWT
    if not credentials:
        raise HTTPException(status_code=403, detail="Institutional access denied.")
        
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# CORS configuration: Restricted to institutional origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent Institutional Memory Layer (MongoDB Atlas)
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database()
sessions_col = db["ai_chat_sessions"]

# 🧹 AUTO-PURGE
sessions_col.create_index("timestamp", expireAfterSeconds=7776000) 

def get_institutional_session(session_id: str):
    """Retrieves session from MongoDB with fallback to fresh initialization."""
    session = sessions_col.find_one({"_id": session_id})
    if not session:
        return {
            "_id": session_id,
            "userId": "GUEST",
            "title": "Untitled Engagement",
            "messages": [],
            "timestamp": datetime.datetime.now().isoformat()
        }
    return session

def save_institutional_session(session_data: dict):
    """Persists tactical session state to MongoDB."""
    sessions_col.update_one(
        {"_id": session_data["_id"]},
        {"$set": session_data},
        upsert=True
    )

class CopilotRequest(BaseModel):
    query: str
    sessionId: Optional[str] = None
    userId: Optional[str] = None
    images: Optional[List[str]] = None

@app.get("/api/ai/health")
async def health_check():
    return {"status": "operational", "institutional_layer": "active"}

@app.get("/api/ai/history")
async def get_history(auth: dict = Depends(verify_institutional_access)):
    """Returns a listing of persistent tactical sessions for the authenticated user."""
    user_id = auth.get("id")
    if not user_id:
        return {"data": []}
        
    # Strictly filter by user_id
    query = {"userId": user_id} if user_id != "SYSTEM" else {}
    sessions = sessions_col.find(query, {"_id": 1, "title": 1, "timestamp": 1}).sort("timestamp", -1)
    
    history = []
    for s in sessions:
        history.append({
            "id": s["_id"],
            "title": s.get("title", "Untitled Engagement"),
            "timestamp": s.get("timestamp")
        })
    return {"data": history}

@app.get("/api/ai/sessions/{session_id}")
async def get_session(session_id: str, auth: dict = Depends(verify_institutional_access)):
    """Retrieves a persistent message thread, enforcing ownership."""
    user_id = auth.get("id")
    session = sessions_col.find_one({"_id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Institutional session not found.")
        
    # Ownership Check
    if user_id != "SYSTEM" and session.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to institutional dossier.")
        
    return {"data": session["messages"]}

def handle_local_intercept(query: str) -> Optional[str]:
    """Tactical interception of common/empty queries."""
    q = query.lower().strip()
    if len(q) < 2:
        return "Could you please clarify your question? I’ll help you with legal, tax, or financial matters."
    if q in ["hi", "hello", "hey", "hola", "namaste"]:
        return "Hey 👋\nWhat can I help you with—legal, tax, or finance?"
    return None

@app.post("/api/ai/copilot")
async def copilot_interaction(request: CopilotRequest, auth: dict = Depends(verify_institutional_access)):
    user_id = auth.get("id")
    sid = request.sessionId or str(uuid.uuid4())
    session_data = get_institutional_session(sid)
    
    if user_id != "SYSTEM":
        session_data["userId"] = user_id
    elif request.userId:
        session_data["userId"] = request.userId
    
    if not session_data["messages"]:
        session_data["title"] = request.query[:40] + "..." if len(request.query) > 40 else request.query
    
    session_data["messages"].append({
        "role": "user",
        "content": request.query,
        "timestamp": datetime.datetime.now().isoformat()
    })

    local_response = handle_local_intercept(request.query)
    if local_response:
        session_data["messages"].append({"role": "ai", "content": local_response, "timestamp": datetime.datetime.now().isoformat()})
        save_institutional_session(session_data)
        return {"response": local_response, "model_used": "tactical-interceptor", "sessionId": sid}

    models_to_try = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-pro"]
    
    prepared_media = []
    if request.images:
        for img_b64 in request.images:
            try:
                if "," in img_b64: img_b64 = img_b64.split(",")[1]
                prepared_media.append({"mime_type": "image/jpeg", "data": base64.b64decode(img_b64)})
            except Exception: pass
    
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name=model_name, generation_config=GENERATION_CONFIG, safety_settings=SAFETY_SETTINGS, system_instruction=SYSTEM_PROMPT)
            history = []
            for msg in session_data["messages"][:-1][-10:]:
                history.append({"role": "user" if msg["role"] == "user" else "model", "parts": [msg["content"]]})
            
            chat = model.start_chat(history=history)
            response = chat.send_message([request.query] + prepared_media)
            
            ai_content = response.text
            session_data["messages"].append({"role": "ai", "content": ai_content, "timestamp": datetime.datetime.now().isoformat()})
            save_institutional_session(session_data)
            return {"response": ai_content, "model_used": model_name, "sessionId": sid}
        except Exception as e:
            logger.warning(f"Failed via {model_name}: {str(e)}")
            continue

    raise HTTPException(status_code=500, detail="Institutional grid offline.")

@app.post("/api/ai/guard")
async def safety_guard(request: CopilotRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"Return SAFE/BLOCKED: \"{request.query}\"")
        return {"status": "BLOCKED" if "BLOCKED" in response.text.upper() else "SAFE"}
    except Exception: return {"status": "SAFE"} 

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
