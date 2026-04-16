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

- Default: SHORT (2–5 lines)
- Expand ONLY if user asks
- No long paragraphs
- No overload

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
📢 CONTEXT-AWARE FINAL DISCLAIMER (MANDATORY)
-----------------------------------

At the end of EVERY response (except greetings or clarifying questions), add a contextually relevant recommendation:

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
⚠️ CASE-BASED / REAL-LIFE SITUATION HANDLING (HIGH PRIORITY)
-----------------------------------

If the user describes a personal situation, problem, or case and asks:
- "what should I do"
- "guide me"
- "help me"
- "my situation is"
- "I am facing"
- "I got into"

OR shares emotional/legal/financial distress scenarios

RESPONSE FORMAT:
Step 1: Acknowledge briefly (human tone)
Step 2: Give GENERAL high-level direction (NOT specific advice)
Step 3: Redirect to expert (MANDATORY)

RESPONSE TEMPLATE:
"I understand your situation.

Based on what you've shared, this involves legal/financial considerations that depend on specific facts and documentation. Generally, such matters require reviewing your case details, applicable laws, and possible risks before taking action.

It is recommended to consult a qualified professional who can assess your situation properly.

**[CONNECT WITH RELEVANT LEGAL EXPERTS](internal:/experts?category=legal)**
**[CONNECT WITH RELEVANT FINANCIAL EXPERTS](internal:/experts?category=financial)**"

-----------------------------------
🚨 HIGH-RISK / URGENT CASE HANDLING
-----------------------------------

If user mentions:
- police, FIR, arrest
- legal notice
- tax notice / raid
- fraud / serious dispute

Respond:

"This appears to be a serious matter that may require immediate attention.

Situations like this involve legal risks and timelines, so it’s important not to delay or take action without proper guidance.

It is strongly recommended to consult a qualified professional immediately.

**[CLICK HERE TO CONNECT WITH A LAWEZY EXPERT](internal:/experts)**"

-----------------------------------
📄 DOCUMENT / NOTICE EXPLANATION MODE
-----------------------------------

If user shares or asks about a document/notice:

Respond with:
1. What the document is (simple explanation)
2. Why it is issued
3. General implication (no advice)

Then add:

"For proper interpretation and response strategy, consult a qualified professional.

**[CLICK HERE TO CONNECT WITH A LAWEZY EXPERT](internal:/experts)**"

-----------------------------------
🚫 ILLEGAL / NON-COMPLIANT REQUESTS
-----------------------------------

If user asks for:
- tax evasion
- hiding income
- illegal actions

Respond:

"I cannot assist with actions that violate legal or regulatory requirements.

If you want, I can guide you on compliant and legal alternatives."
"""

# Precision-Grade Generation Config
GENERATION_CONFIG = {
    "temperature": 0.15, # Near-zero for factual legal accuracy
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

# Standard Safety Settings
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

app = FastAPI(title="LawEZY Institutional AI Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent Institutional Memory Layer (MongoDB Atlas)
MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database("lawezy_chat") # Sourced from URI (lawezy_chat)
sessions_col = db["chat_sessions"]

def get_institutional_session(session_id: str):
    """Retrieves session from MongoDB with fallback to fresh initialization."""
    session = sessions_col.find_one({"sessionId": session_id})
    if not session:
        return {
            "sessionId": session_id,
            "title": "Untitled Engagement",
            "messages": [],
            "timestamp": datetime.datetime.now().isoformat()
        }
    return session

def save_institutional_session(session_data: dict):
    """Persists tactical session state to MongoDB."""
    sessions_col.update_one(
        {"sessionId": session_data["sessionId"]},
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
async def get_history():
    """Returns a listing of all persistent tactical sessions."""
    sessions = sessions_col.find({}, {"sessionId": 1, "title": 1, "timestamp": 1}).sort("timestamp", -1)
    history = []
    for s in sessions:
        history.append({
            "id": s["sessionId"],
            "title": s.get("title", "Untitled Engagement"),
            "timestamp": s.get("timestamp")
        })
    return {"data": history}

@app.get("/api/ai/sessions/{session_id}")
async def get_session(session_id: str):
    """Retrieves the full message thread from persistent storage."""
    session = sessions_col.find_one({"sessionId": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Institutional session not found.")
    return {"data": session["messages"]}

def handle_local_intercept(query: str) -> Optional[str]:
    """Tactical interception of common/empty queries to preserve Gemini quota."""
    q = query.lower().strip()
    
    # Empty or meaningless
    if len(q) < 2:
        return "Could you please clarify your question? I’ll help you with legal, tax, or financial matters."

    # Greetings
    if q in ["hi", "hello", "hey", "hola", "namaste"]:
        return "Hey 👋\nWhat can I help you with—legal, tax, or finance?"

    # Expert Redirects
    expert_keywords = ["expert", "lawyer", "advocate", "professional", "ca ", " cfa", "consultation", "appointment"]
    if any(k in q for k in expert_keywords):
        return "You can connect with verified professionals here:\n\n**[CLICK HERE TO CONNECT WITH A LAWEZY EXPERT](internal:/experts)**"

    # Gratitude
    thanks_keywords = ["thanks", "thank you", "ok", "got it", "fine", "helpful"]
    if q in thanks_keywords or (len(q) < 15 and any(k in q for k in thanks_keywords)):
        return "Glad I could help 👍 Let me know if you need anything else."

    return None

@app.post("/api/ai/copilot")
async def copilot_interaction(request: CopilotRequest):
    # Institutional Session Initialization
    sid = request.sessionId or str(uuid.uuid4())
    session_data = get_institutional_session(sid)
    
    # Initialize title if fresh
    if not session_data["messages"]:
        session_data["title"] = request.query[:40] + "..." if len(request.query) > 40 else request.query
    
    # Log User Intent
    session_data["messages"].append({
        "role": "user",
        "content": request.query,
        "timestamp": datetime.datetime.now().isoformat()
    })

    # Tactical Local Interceptor
    local_response = handle_local_intercept(request.query)
    if local_response:
        session_data["messages"].append({
            "role": "ai",
            "content": local_response,
            "timestamp": datetime.datetime.now().isoformat()
        })
        save_institutional_session(session_data)
        return {
            "response": local_response,
            "model_used": "tactical-interceptor",
            "sessionId": sid
        }

    # Institutional Models Pool (Optimized for Tactical Resilience)
    models_to_try = [
        "gemini-2.0-flash",    # Primary next-gen
        "gemini-flash-latest", # Reliable flash-latest
        "gemini-1.5-pro",      # Pro fallback if flash fails
        "gemini-pro-latest"    # Legacy pro fallback
    ]
    
    prepared_media = []
    if request.images:
        for img_b64 in request.images:
            try:
                if "," in img_b64:
                    img_b64 = img_b64.split(",")[1]
                
                img_data = base64.b64decode(img_b64)
                prepared_media.append({
                    "mime_type": "image/jpeg",
                    "data": img_data
                })
            except Exception as e:
                logger.error(f"Media decode failure: {str(e)}")
    
    last_error = None
    for model_name in models_to_try:
        try:
            # Initialize Model with Institutional Persona as System Instruction
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS,
                system_instruction=SYSTEM_PROMPT
            )
            
            # Prepare Institutional History (Last 10 messages for context)
            history = []
            raw_messages = session_data["messages"][:-1]
            
            for msg in raw_messages[-10:]:
                gemini_role = "user" if msg["role"] == "user" else "model"
                history.append({"role": gemini_role, "parts": [msg["content"]]})
            
            # Initialize Chat Session
            chat = model.start_chat(history=history)
            
            # Execute Generative Cycle
            current_parts = [request.query] + prepared_media
            response = chat.send_message(current_parts)
            
            if not response or not response.text:
                raise Exception("Empty institutional pulse.")
                
            # Log AI Institutional Response
            ai_content = response.text
            session_data["messages"].append({
                "role": "ai",
                "content": ai_content,
                "timestamp": datetime.datetime.now().isoformat()
            })
            
            # FINAL PERSISTENCE
            save_institutional_session(session_data)
            
            return {
                "response": ai_content, 
                "model_used": model_name,
                "sessionId": sid
            }
            
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Tactical link failed via {model_name}: {last_error}")
            continue

    raise HTTPException(status_code=500, detail=f"Institutional grid offline: {last_error}")

@app.post("/api/ai/guard")
async def safety_guard(request: CopilotRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"temperature": 0.0})
        guard_prompt = f"Analyze message for contact info. Return SAFE/BLOCKED: \"{request.query}\""
        response = model.generate_content(guard_prompt)
        result = response.text.strip().upper()
        return {"status": "BLOCKED" if "BLOCKED" in result else "SAFE"}
    except Exception:
        return {"status": "SAFE"} 

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
