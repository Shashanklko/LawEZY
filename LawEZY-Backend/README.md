# LawEZY Backend: Elite Legal SaaS Engine 🏛️💎

LawEZY is a professional-grade, high-performance legal backend designed to power a revolutionary SaaS ecosystem. It provides the core intelligence, real-time consultation infrastructure, and data management for a distributed legal platform.

---

## 🏛️ System Architecture

The backend is built as a **High-Performance Spring Boot Engine**, following a clean architecture pattern to ensure scalability, security, and elite performance.

### ⚙️ The Elite Tech Stack
*   **Core**: Java 17, Spring Boot 3.x
*   **Security & Persistence**: JPA/Hibernate, Spring Security
*   **Real-Time**: WebSockets (STOMP) for live legal consultations
*   **Primary Database**: **TiDB Cloud (MySQL)** — Global, serverless relational data
*   **Secondary Database**: **MongoDB Atlas** — High-speed chat logs and rich legal content
*   **Intelligence**: **LexBot AI** — Automated legal triage engine
*   **Scheduling**: Automated legal news aggregation and system heartbeats

---

## ✨ Elite Backend Features

### 1. Real-Time Consultation Hub
- A robust WebSocket-based messaging system for instant lawyer-client interaction.
- STOMP protocol integration for reliable, sub-millisecond message delivery.

### 2. LexBot AI Integration
- Automated legal guidance and triage system.
- Intelligent routing of legal queries based on context.

### 3. Global Legal News Aggregator
- Background services (`@Scheduled`) that automatically sync and process the latest legal news globally.
- Integration with external legal feed providers.

### 4. Distributed Data Layer
- Hybrid storage strategy utilizing TiDB for structured data and MongoDB for unstructured chat and news feeds.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Java 17+**
- **Maven 3.8+**
- **MySQL/TiDB Connection String**
- **MongoDB Atlas URI**

### 2. Configuration
Ensure your `src/main/resources/application.yml` or `application.properties` is configured with your database credentials.

### 3. Launching the Engine
```bash
mvn clean install
mvn spring-boot:run
```
*The engine will boot on `http://localhost:8080`. Look for the "🏛️ LawEZY Server is Now Online" heartbeat in the console.*

---

## 🧪 Elite API Testing Hub (Postman)

We have included a professional **Postman Collection** at the root to ensure you can test every single elite backend system instantly:
👉 `LawEZY-Postman-Collection.json`

### 📋 Testing Workflow:
1.  **Import**: Import the collection into Postman.
2.  **Auth Flow**: Register and Login to get your JWT/Session.
3.  **Core Systems**:
    *   **LexBot AI**: Test the `/api/ai/ask` endpoints.
    *   **Community**: Verify the masonry-powered feed pulling from TiDB.
    *   **Consultation**: Use a WebSocket client to connect to `ws://localhost:8080/ws`.

---

## 🏛️ System Status
- [x] **Primary Storage**: TiDB Cloud Active ☁️
- [x] **Log Storage**: MongoDB Atlas Active ☁️
- [x] **Real-Time Engine**: WebSocket (STOMP) Layer Online 🌐
- [x] **AI Core**: LexBot Processing Ready 🤖
