# LawEZY Monetized Consultation Engine (PRD & Blueprint)

## 1️⃣ USER FLOW (STEP-BY-STEP)
### 🔹 Step 1: Lawyer Selection
User browses lawyers and sees:
- Name, Rating ⭐, Experience, Chat fee, Consultation fee
- **Call to Action (CTA):** "Chat Now" or "Book Consultation"

### 🔹 Step 2: Chat Opens & 🔹 Step 3: User Sends Query
- **Auto Greeting:** "Hello! Please describe your legal issue in detail."
- User submits Text / Voice / Document. (Status: "Sent to lawyer for review")

### 🔹 Step 4: Lawyer Dashboard & 🔹 Step 5: Locked Reply
- Lawyer receives query and types response.
- User sees: 🔒 "Your lawyer has responded" (Blurred preview)
- **CTA:** 👉 "Unlock Reply for ₹99"

### 🔹 Step 6: Payment System
- User pays. Reply unlocks.
- **Token Allocation:** User is granted a batch of Message Tokens (e.g., 10 Tokens).

### 🔹 Step 7: Dual-Sided Resolution & Ratings
The chat does not just end arbitrarily; it must be formally resolved.
- **If User Ends Chat:** Status instantly becomes `RESOLVED`.
  - User is immediately presented with a Rating/Review UI for the Lawyer and the Platform.
- **If Lawyer Ends Chat:** The app asks the User to confirm it.
  - *Popup:* "The lawyer has ended the chat. Is your query fully resolved?"
  - **If User clicks YES:** Status is `RESOLVED` -> Proceeds to Rating UI.
  - **If User clicks NO:** And they have tokens left, they are prompted to send a follow-up message to force the chat back open.

### 🔹 Step 8: Token Rollover (The Global Wallet)
If a chat gets `RESOLVED` early (e.g., it took 6 messages out of 10):
- The remaining **4 tokens** are saved in the User's **Global Token Wallet**.
- The User can use these 4 saved tokens to chat with *other* lawyers in the future without paying the initial unlock fee barrier!

### 🔹 Step 9 & 10: Consultation Upsell & Booking
- Inside chat buttons: Book Online / Offline Consultation -> Payment (Platform takes 20%).

---

## 2️⃣ LAWYER FLOW
### 🔹 Dashboard & Earnings
- Set Chat unlock fee (₹49–₹149), Consultation fee (₹500–₹5000), set custom greeting.
- Track Chat earnings, Consultation earnings, Platform commission.

---

## 3️⃣ CORE FEATURES
- **💬 Chat System:** Real-time messaging, Voice notes, Message locks, Two-Sided Resolution.
- **🎟️ Token Economy:** Global User Token Wallets, Rollover tokens.
- **🔒 Monetization:** Pay-to-unlock reply, Message limits, Consultation upsell.
- **⭐ Trust System:** Post-resolution mandatory Ratings & reviews.

---

## 4️⃣ ANTI-LEAKAGE SYSTEM
- Block phone numbers in chat via Real-time Regex scanning.
- Disable file sharing before payment.
- Show warnings for suspicious behavior ("call me").

---
---

## 5️⃣ TECHNICAL ARCHITECTURE BLUEPRINT (Spring Boot + MongoDB)

### Phase 1: Database & Financial Architecture
#### [MySQL] `User` Entity (Updates)
- `globalTokenBalance` (Integer) - Stores rollover tokens.

#### [MySQL] `LawyerProfile` Entity
- `chatFee`, `consultationFee`, `customGreeting`, `walletBalance`

#### [MongoDB] `ChatSession` Document
- `status` (`AWAITING_REPLY`, `LOCKED_REPLY`, `ACTIVE`, `PENDING_RESOLUTION`, `RESOLVED`)
- `tokensConsumed` (Tracks how many tokens were burned in this specific chat)

#### [MongoDB] `ChatMessage` Document
- `type`: `TEXT`, `VOICE`, `FILE`, `LOCKED_REPLY`, `UPSELL_OFFER`, `RESOLUTION_PROMPT`
- `content`, `isLocked`

### Phase 2: The Core Chat Engine (WebSockets)
- **Token Decoupling:** When a `TEXT` goes through, server subtracts `-1` from the User's `globalTokenBalance` in MySQL, and adds `+1` to the ChatSession's `tokensConsumed` in MongoDB.
- **Resolution Webhooks:** Endpoints that trigger the Frontend UI cards (`RESOLUTION_PROMPT`).

### Phase 3: Anti-Leakage System
- Custom Spring Boot `ChannelInterceptor` using Regex to intercept "1234567890" or "Email me" and throw exceptions.

### Phase 4: Payment & Commission System
- Razorpay Webhooks. 
- 80/20 split logic for Lawyer Wallets vs Platform Earnings.
