# ⚖️ LawEZY: Strategic Legal Intelligence Platform

Welcome to the **LawEZY** Monorepo. This repository centralizes our high-fidelity legal tech ecosystem, integrating real-time professional consultation, AI-driven legal research, and secure financial governance.

---

## 🏗️ Architecture Overview

| Service | Technology | Role |
| :--- | :--- | :--- |
| **[LawEZY-Client](file:///e:/Project/LawEZY/LawEZY-Client)** | React + Vite | Institutional Portal (Clients & Experts) |
| **[LawEZY-Backend](file:///e:/Project/LawEZY/LawEZY-Backend)** | Java + Spring Boot | Auth, Financials, and Appointment Engine |
| **[LawEZY-Messenger](file:///e:/Project/LawEZY/LawEZY-Messenger)** | Node.js + Socket.io | Real-time Hub & Strategic Credit Governance |
| **[LawEZY-AI-Service](file:///e:/Project/LawEZY/LawEZY-AI-Service)** | Python/Node | Legal Intelligence & Research Engine |

---

## 🚀 Quick Start (Development)

To boot the entire ecosystem locally:

1.  **Backend (Java)**:
    ```bash
    cd LawEZY-Backend
    mvn clean spring-boot:run
    ```
2.  **Messenger (Real-time Hub)**:
    ```bash
    cd LawEZY-Messenger
    npm start
    ```
3.  **Frontend (Portal)**:
    ```bash
    cd LawEZY-Client
    npm run dev
    ```

---

## 🛡️ Strategic Handshake Protocol (V2.1)
LawEZY utilizes a proprietary synchronization handshake between the **Messenger** and the **Backend** to ensure:
- **Zero-Drift Credit Governance**: Units are deducted atomically during consultation.
- **Expert Mobilization**: Professionals are automatically prompted for refills/appointments when client tokens are exhausted.
- **Institutional Identity**: Automatic role validation for Lawyers, CAs, and CFAs.

---

## 🔒 Security & Data
- **Relational Data**: Powered by TiDB (Cloud MySQL) for global scale.
- **Chat Ledger**: Stored in MongoDB for high-fidelity archival.
- **Auth**: Secure JWT with strategic role-based access control.

---
**Status: HARDENING (Phase 2 - Development)**
