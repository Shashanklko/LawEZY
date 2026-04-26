# 🤖 LawinoAI: The Intelligence Layer

LawinoAI is the core research and triage engine of the LawEZY ecosystem. Its primary mission is to **bridge the legal knowledge gap** by providing instant, accurate, and domain-restricted legal information.

## ⚖️ Social Mission: Legal Literacy for All
In many societies, the first hurdle to justice is not knowing where you stand. LawinoAI solves this by:
- **Instant Research:** Providing rapid answers to common legal and financial questions.
- **Domain Restriction:** Strictly focused on Indian Law, Tax (GST/Income Tax), and Finance to prevent misinformation.
- **Triage:** Identifying when a case requires human expert intervention and routing users accordingly.

## 🛠️ Technology
- **Engine:** Google Gemini (Generative AI)
- **Framework:** FastAPI (Python)
- **Memory:** Session persistence via MongoDB Atlas.
- **NLP Layer:** Specialized tactical interception for greetings and general queries.

## 🚀 Setup
```bash
python -m venv venv
source venv/bin/activate # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

## 🛡️ Responsible AI
LawinoAI is designed with safeguards to ensure it provides *information*, not *legal advice*, maintaining the institutional boundary between AI assistance and professional legal counsel.
