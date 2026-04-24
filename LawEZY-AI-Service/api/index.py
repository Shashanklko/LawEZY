import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI App
app = FastAPI(title="LawEZY Institutional AI Service")

# 🏛️ CONFIGURE INSTITUTIONAL CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific Vercel/Render domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from environment variables")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Initialize MongoDB (For audit logs)
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.lawezy_main

# Models
class ChatRequest(BaseModel):
    prompt: str
    userId: str = None
    context: str = ""

@app.get("/")
async def health_check():
    return {"status": "Institutional AI Service Online", "version": "1.0.0"}

@app.post("/api/ai/chat")
async def lex_chat(request: ChatRequest):
    """🏛️ LEXCHAT AI: HIGH-PRECISION LEGAL & BUSINESS INTELLIGENCE"""
    try:
        # System instructions for LawinoAI
        system_prompt = (
            "You are LawinoAI, the elite intelligence engine of LawEZY. "
            "You provide precise, authoritative, and institutional-grade legal and business insights. "
            "Always maintain a professional tone. If asked about non-legal/business topics, "
            "politely redirect the user to LawEZY's core professional services."
        )
        
        full_prompt = f"{system_prompt}\n\nContext: {request.context}\n\nUser Question: {request.prompt}"
        
        response = model.generate_content(full_prompt)
        answer = response.text
        
        # Log to MongoDB for institutional audit trail
        await db.ai_logs.insert_one({
            "userId": request.userId,
            "type": "LEX_CHAT",
            "prompt": request.prompt,
            "response": answer,
            "timestamp": "now" # In production, use datetime.utcnow()
        })
        
        return {"answer": answer}
        
    except Exception as e:
        print(f"AI ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Intelligence Engine currently recalibrating.")

@app.post("/api/ai/audit")
async def document_audit(request: ChatRequest):
    """🏛️ DOCUMENT AUDITOR: SECURE COMPLIANCE & RISK ANALYSIS"""
    try:
        system_prompt = (
            "You are the LawEZY Document Auditor. Analyze the following document text for: "
            "1. Potential legal risks. 2. Compliance inconsistencies. 3. Critical missing clauses. "
            "Provide a high-density executive summary."
        )
        
        response = model.generate_content(f"{system_prompt}\n\nDocument Text: {request.prompt}")
        
        return {"audit": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Document analysis pipeline interrupted.")

# Vercel requirements: The app object must be named 'app'
