# ⚖️ LawEZY: Legal and Financial services MarketPlace
Welcome to the **LawEZY** . This repository centralizes our high-fidelity legal tech ecosystem, integrating real-time professional consultation, AI-driven legal research, and secure financial governance with experts

---

## 🏗️ Architecture Overview

| Service | Technology | Role |
| :--- | :--- | :--- |
| **[LawEZY-Client](file:///e:/Project/LawEZY/LawEZY-Client)** | React + Vite | Institutional Portal (Clients & Experts) |
| **[LawEZY-Backend](file:///e:/Project/LawEZY/LawEZY-Backend)** | Java + Spring Boot | Auth, Financials, and Appointment Engine |
| **[LawEZY-Messenger](file:///e:/Project/LawEZY/LawEZY-Messenger)** | Node.js + Socket.io | Real-time Hub & Institutional Credit Governance |
| **[LawEZY-AI-Service](file:///e:/Project/LawEZY/LawEZY-AI-Service)** | Python (FastAPI) | LawinoAI - Legal & Financial Intelligence |

---

## 🏗️ Service Architecture & Features

### 🤖 LawinoAI (v6.0)
The **LawEZY-AI-Service** is a domain-restricted intelligence engine powered by Google Gemini.

**Core Capabilities**:
- **Domain Restriction**: Expert knowledge limited to Indian Law, CA (Tax/GST), and CFA (Finance/Investments).
- **Tactical Interception**: A local NLP layer that handles greetings and common queries to optimize resource usage.
- **Institutional Routing**: Automatically identifies personal cases and prompts users to connect with human LawEZY Experts.
- **Persistent Memory**: Full session persistence via MongoDB Atlas for long-form consultation history.

---

## 🚀 Quick Start (Development)

To boot the entire ecosystem locally:

### 1. Backend (Java/Maven)
```bash
cd LawEZY-Backend
mvn clean spring-boot:run
```

### 2. Messenger (Real-time Hub)
```bash
cd LawEZY-Messenger
npm start
```

### 3. AI Service (Python/FastAPI)
```bash
cd LawEZY-AI-Service
# Setup: python -m venv venv && ./venv/Scripts/activate && pip install -r requirements.txt
python main.py
```

### 4. Frontend (React Portal)
```bash
cd LawEZY-Client
npm run dev
```

---

## 🛡️ Institutional Handshake Protocol (V2.1)
LawEZY utilizes a proprietary synchronization handshake between the **Messenger** and the **Backend** to ensure:
- **Zero-Drift Credit Governance**: Units are deducted atomically during consultation.
- **Expert Mobilization**: Professionals are automatically prompted for refills/appointments when client tokens are exhausted.
- **Institutional Identity**: Automatic role validation for Lawyers, CAs, and CFAs.

---

## 🔒 Security & Data
- **Relational Data**: Powered by TiDB (Cloud MySQL) for global scale.
- **Chat Ledger**: Stored in MongoDB for high-fidelity archival.
- **Auth**: Secure JWT with institutional role-based access control.

---
**Status: HARDENING (Phase 2 - Development)**
