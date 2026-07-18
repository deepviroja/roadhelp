# 🛠️ RoadHelp — Modern Roadside Assistance Platform

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD627)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**RoadHelp** is an elite, responsive, web-based dispatch and tracking system designed for rapid-deployment roadside assistance. Built on a hybrid serverless/REST architecture, it bridges customers, emergency providers, and control admins under strict security protocols.

---

## ⚡ Core Operational Roles

*   **👤 Customer Terminal**: Submit breakdown geo-coordinates, inspect provider routing live, approve cost adjustments, confirm completions, and process payments.
*   **🚚 Service Provider (SP)**: Toggle online availability, review incoming dispatch orders, verify arrival using dynamic OTP codes, navigate using Leaflet routing machines, request billing adjustments, and monitor payouts.
*   **👑 Control Admin**: Control dispatcher hubs, modify global settings (base price ranges, service radius, commissions), verify providers, configure SOS helpline protocols, and coordinate payouts.

---

## 🔒 Security & Workflow Features

### 1. Guest "Get Help" Magic Link Workflow
*   **First-Time Guests**: Accounts are securely initialized in Firebase Auth with a randomly generated base64url password. Nodemailer delivers a welcome email containing their credentials and a secure **single-use magic token** link (`/magic-login?token=xxx`).
*   **Repeat Guests**: Detects existing emails securely. Dispatches only a 10-minute validity magic link to bypass login forms and direct them to their active tracking screen (avoiding password disclosure or account hijack).
*   **Replay Protection**: Magic tokens are deleted immediately upon the `POST /verify-magic-token` call before custom Firebase authorization tokens are minted.

### 2. Standard 2FA OTP Login & Registration
*   **Credentials Check**: Authenticates user passwords against the Google Identity Toolkit REST API on the backend. Standard Firebase tokens are withheld at this stage.
*   **OTP Dispatch**: If the check passes, the backend saves a session state and generates a 6-digit OTP code sent via HTML email.
*   **Verification**: Logging in requires submitting the OTP. Custom auth tokens are minted only after the OTP is verified.
*   **OTP Resend**: Includes a secure 30-second countdown timer for resending verification codes or OTPs during registration and authentication.
*   **Registration OTP**: Users registering as customers or providers must verify their email with a 6-digit code before their Firebase Auth profile and Firestore document are created.

### 3. Job Verification & Arrival OTP
*   **En Route State**: Moving request status to `arriving` transitions the customer tracking screen to "Helper en route". The 4-digit verification OTP remains hidden to maintain protocol integrity.
*   **Arrival OTP Trigger**: Once the provider reaches the location (detected via telemetry or manual confirmation), they mark "I have Arrived". This updates `providerArrived` to `true`, showing the 4-digit arrival OTP to the customer and loading the OTP verification input field for the provider.
*   **Cost Proposal & Locking**: Providers can submit extra inspection/parts fees via an onscreen modal, locking status to `pendingUserApproval`. Customers review this via an inline caution card and either approve (pricing updates, state reverts to en route) or cancel (status resets, releasing the request).
*   **Double-Counting Mitigation**: Calculations use base `finalPrice` and track `additionalFees` independently to prevent double-counting.

### 4. Admin Price Cap Checks & Telemetry
*   **Validation**: Validates provider bids, completion final amounts, and cost proposals against the global service limits defined in the `services` collection. Submissions violating these boundaries are rejected immediately.
*   **Mission Telemetry**: Admins view coordinates, Google Maps links, description summaries, vehicle characteristics, and preferred contacts directly from the request log.

### 5. Guest Account Phone Synchronization
*   **Phone Parsing**: Backend parses `countryCode` and `phone` separately, saving the clean local number on the guest profile. This prevents prefix doubling.

---

## 📁 Technical Architecture

```text
├── backend/                       # Node.js Express API
│   ├── config/                    # Firebase Admin SDK settings
│   ├── controllers/               # Auth and request lifecycle logic
│   ├── routes/                    # API route endpoints
│   ├── services/                  # Mail templates and database services
│   └── server.js                  # Main server entry
├── src/                           # Vite + React Frontend
│   ├── components/                
│   │   ├── auth/                  # OTP Login & Sign-up forms
│   │   ├── customer/              # Active cards, maps, modals
│   │   ├── provider/              # Job card maps
│   │   └── shared/                # Layout components
│   ├── hooks/                     # Custom tracking, auth, geolocation hooks
│   ├── pages/                     # Authentication, profiles, dashboards
│   ├── types/                     # Strict TypeScript interfaces
│   └── App.tsx                    # React Router configuration
```

---

## 🛠️ Development Setup

### 1. Environment Configurations
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_DATABASE_URL="your_realtime_database_url"
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_PRIVATE_KEY_ID="your_private_key_id"
FIREBASE_CLIENT_EMAIL="your_client_email"
FIREBASE_CLIENT_ID="your_client_id"
FIREBASE_API_KEY="your_web_api_key_for_rest_auth"
SMTP_HOST="your_smtp_server"
SMTP_PORT=587
SMTP_USER="your_smtp_username"
SMTP_PASS="your_smtp_password"
SMTP_FROM="your_verified_sender"
```

### 2. Execution Commands
To run the client and API servers concurrently during development:

**Terminal 1 (Vite Frontend)**:
```bash
npm install
npm run dev
```

**Terminal 2 (Express Backend)**:
```bash
cd backend
npm install
npm start
```
The frontend is available at `http://localhost:5173` and requests proxy automatically to the API server running at `http://localhost:5000`.
