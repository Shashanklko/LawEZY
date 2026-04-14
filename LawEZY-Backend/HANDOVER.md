# LawEZY Backend - Developer Handover Guide (Frontend)

Welcome to the LawEZY Backend! This API is optimized for high-performance legal consultations, community features, and professional resource management.

---

## 1. Quick Start
1.  **Repo Setup**: Copy `src/main/resources/application.yml.example` to `application.yml`.
2.  **Env Setup**: Provide the following environment variables (or fill them in your new `application.yml`):
    - `TIDB_PASSWORD`: MySQL DB password.
    - `MONGO_USER` & `MONGO_PASS`: MongoDB credentials for chat history.
    - `SPRING_AI_GOOGLE_API_KEY`: Google Gemini Key.
    - `JWT_SECRET_256BIT`: A 256-bit secure secret key.
3.  **Run**: `mvn spring-boot:run`

---

## 2. API Excellence (Standardized Responses)
All REST APIs follow a **Unified Response Format** for ease of frontend consumption:

```json
{
  "success": true,
  "message": "Chat history retrieved.",
  "data": { ... payload here ... },
  "timestamp": "2026-04-04T12:00:00"
}
```

- **Data**: The primary payload (Object, List, or Null).
- **Success**: Boolean flag for easy branching in your frontend Fetch/Axios logic.
- **Message**: Descriptive success or error message.

---

## 3. Interactive Documentation
We have integrated **Swagger / OpenAPI**. 
Once the server is running, visit:
👉 **`http://localhost:8080/swagger-ui.html`**

You can test all endpoints, view request/response schemas, and see available parameters there.

---

## 4. Key Endpoints Summary
- **Auth**: `/api/auth` (Sign up/Login).
- **User**: `/api/users` (Profiles, Roles, Roles).
- **Chat**: `/api/chat` (Session start, History, Unlocking logic).
- **Community**: `/api/community` (Social posts, Author verification).
- **Resources**: `/api/resources` (Legal templates, articles).

---

## 6. Deployment (Docker)
The project includes a **Dockerfile** for production-ready containerization.

### Build and Run Locally:
1. `docker build -t lawezy-backend .`
2. `docker run -p 8080:8080 lawezy-backend`

### Cloud Deployment:
When deploying to **AWS App Runner**, **Railway**, or **Render**:
1. Connect this GitHub repo.
2. The platform will automatically detect the **Dockerfile**.
3. **IMPORTANT**: You must set your `application.yml` secrets as **Environment Variables** in the cloud dashboard (refer to `.example` for keys).

---

Happy Coding! 🚀
