# RoadHelp — Roadside Assistance Platform

RoadHelp is a Vite + React + Firebase web app with **3 roles**:

- **Customer**: create service requests, track provider live, pay + rate.
- **Provider**: receive/accept missions, navigate using route guidance, share live GPS, manage profile and earnings.
- **Admin**: manage users/providers, requests, services/pricing, payouts, platform settings.

---

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS, Radix UI (shadcn style components), Framer Motion, Lucide icons, Sonner toasts
- **State**: Zustand
- **Backend API**: Node.js + Express (handles request generation & secure business logic via Admin SDK)
- **Firebase**:
  - Authentication (Email/Password)
  - **Firestore** (profiles, requests, services, settings) - Used in UI and via Node.js
  - **Realtime Database** (live provider tracking stream)
- **Media**: Fully URL-driven architecture (No Firebase Storage dependency; direct URLs used for all avatars/assets to reduce cost).
- **Maps**:
  - **Leaflet + React-Leaflet**
  - Map tiles: **OpenStreetMap**
  - Routing: **Leaflet Routing Machine** + **OSRM** demo server (`router.project-osrm.org`)

---

## Project Structure (high level)

- `src/components/auth/*` — login/signup forms
- `src/stores/authStore.ts` — auth/session/profile state (Zustand)
- `src/pages/customer/*` — customer flows
- `src/pages/provider/*` — provider flows
- `src/pages/admin/*` — admin panel
- `src/components/map/*` — Leaflet maps (picker + tracking + route)
- `src/hooks/useProviderTracking.ts` — GPS watch + RTDB writes
- `src/hooks/useServiceRequest.ts` — request lifecycle actions (create/accept/status/payment/rating)
- `src/components/shared/ImageUrlInput.tsx` — Lightweight URL-based image manager (replaces Storage uploads)
- `src/hooks/usePlatformSettings.ts` — Centralized global state hook for SOS protocols and platform configs
- `firestore.rules` — Firestore security rules
- `database.rules.json` — Realtime Database security rules
- `public/sw.js` — service worker (network-first + offline fallback)

---

## Environment Variables

Create `roadhelp/.env` with your Firebase web config. Required:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL` (Realtime Database URL; important for live tracking)

For the backend email flow, also set these in `roadhelp/backend/.env` or in Render:

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME` (optional, defaults to `RoadHelp`)
- `APP_PUBLIC_URL` or `FRONTEND_URL`

Backend Firebase Admin auth is loaded from environment variables. Set the Firebase service account fields in `backend/.env` or your hosting provider:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`

Do not commit any `.env` file or service-account secret to GitHub.

---

## Running Locally

From `d:\project\roadhelp`:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

---

## Move Or Clone

To run this project on another machine:

1. Install **Node.js 18+** and **Git**.
2. Clone the repository.
3. Recreate `roadhelp/.env` and `roadhelp/backend/.env` from your secret manager or hosting environment variables.
4. Install dependencies and run the frontend:
   ```bash
   cd roadhelp
   npm install
   npm run dev
   ```
5. In a second terminal, run the backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5000`.

---

## Backend Deployment (Node.js API)

The platform has transitioned to a hybrid architecture: **Frontend (React) → Backend (Node.js) → Firebase**.

### Running Backend Locally
From `d:\project\roadhelp\backend`:
1. Create `backend/.env` with `PORT=5000` and the Firebase Admin credentials listed above.
2. Install and run:
   ```bash
   npm install
   npm start
   ```
   The backend will run on `http://localhost:5000`. The Vite frontend is already configured to proxy `/api` requests automatically during development.

### Deploying the Backend to Production

You can deploy the `/backend` folder independently to platforms like Render, Railway, or a standard VPS:

#### 1. Render / Railway
- Connect your GitHub repository to Render or Railway.
- Create a new Web Service and set the Root Directory to `backend`.
- **Environment Variables**: Provide the Firebase Admin credentials and SendGrid values in the platform secret manager.
- **Email delivery**: `SENDGRID_FROM_EMAIL` must be a verified sender in SendGrid.
- **Runtime**: Use Node.js 18 or newer so the backend can use the built-in `fetch` API for SendGrid requests.
- **Start Command**: `npm start`
- **Build Command**: `npm install`

#### 2. VPS (Ubuntu / Debian)
- SSH into your server, install Node.js and PM2.
- Clone the repository and navigate to the `backend` folder.
- Store secrets in environment variables or a protected `.env` file outside version control.
- Run:
  ```bash
  npm install
  pm2 start server.js --name "roadhelp-backend"
  ```
- Set up **Nginx** reverse proxy to route a subdomain (e.g. `api.yourdomain.com`) to `localhost:5000`.
- Remember to point the frontend in production to your new URL by setting an env variable or updating your reverse proxy appropriately.

---

Lint:

```bash
npm run lint
```

---

## Firebase Setup (required)

In Firebase Console enable:

1. **Authentication → Sign-in method → Email/Password**
2. **Firestore Database**
3. **Realtime Database**
*(Note: Firebase Storage is NOT required as the platform uses a zero-storage URL-driven approach).*

This project includes deploy configs:

- Firestore rules: `roadhelp/firestore.rules`
- RTDB rules: `roadhelp/database.rules.json`
- Hosting: `roadhelp/firebase.json` (single-page app rewrite to `/index.html`)

Deploy rules (requires Firebase CLI):

```bash
firebase deploy --only firestore:rules,database
```

Deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

---

## Data Model (Firestore)

### `users/{uid}`

User profile doc for **customer/provider/admin**. Stored fields include:

- `fullName`, `email`, `phone`, `countryCode`, `role`, `createdAt`
- Provider-only: `companyName`, `serviceTypes`, `vehicleNumber`, `isVerified`, `isOnline`, `rating`, `totalJobs`, `totalEarnings`
- Optional tracking fallback: `location { lat, lng }`, `locationUpdatedAt`

### `serviceRequests/{id}`

Service request lifecycle:

- customer info + location (`customerLocation`)
- provider info (set when accepted)
- status (`pending | bidding | accepted | arriving | inProgress | completed | cancelled`)
- pricing (`estimatedPrice`, `additionalFees`, `totalPrice`, `adminCommission`, `providerEarnings`)
- payment flags (`isPaid`, `tipAmount`, `payoutStatus`, etc.)
- timestamps (`createdAt`, `acceptedAt`, `completedAt`, ...)

### `services/{id}`

Admin-managed service catalog (name, icon, price range, active flag).

### `system/config`

Platform settings used by admin + provider screens (commission, payout delays, tracking interval, etc.).
- **SOS Protocol**: Includes emergency dial numbers (Police, Ambulance, Support) managed by Admin.

---

## Live Tracking: How It Works

### Provider → GPS stream (Realtime Database)

`src/hooks/useProviderTracking.ts`:

- Uses `navigator.geolocation.watchPosition(...)`
- Writes to RTDB path: `tracking/{requestId}`
- Payload resembles:
  - `requestId`
  - `providerUid`
  - `providerLat`, `providerLng`
  - `heading`, `speed`
  - `lastUpdated` (ms epoch)

RTDB rules are in `database.rules.json` and require authenticated writes that match the request path and provider UID.

### Customer → map + route (Firestore + RTDB)

`src/components/map/LiveTrackingMap.tsx`:

- Reads live stream from RTDB `tracking/{requestId}`
- Fallback: if RTDB fails, listens to provider `users/{providerId}.location` in Firestore
- Displays:
  - Customer marker + provider marker
  - Route line + ETA using OSRM routing

### Routing + ETA (OSRM)

Routing uses **Leaflet Routing Machine** with the OSRM public endpoint:

- Service URL: `https://router.project-osrm.org/route/v1`

If you need production reliability, host your own OSRM or use a paid routing API.

---

## Maps: Tile Source

Maps use OpenStreetMap tiles:

- `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

For production traffic, consider using a tile provider with an API key and SLA.

---

## Service Worker (Offline / Cache)

`public/sw.js` uses a **network-first** strategy for same-origin assets and bypasses caching for:

- Firebase + Google APIs
- OSRM and OpenStreetMap related hosts

If you change caching behavior, **unregister the SW** in DevTools to avoid stale cache during development.

---

## Common Production Notes

- **Firestore permissions**: if users can sign up but can’t update profile or `isOnline`, deploy the current `firestore.rules`.
- **Realtime tracking**: provider writes now include the provider UID, and RTDB rules reject writes that do not match the authenticated account.
- **QUIC / HTTP3 network issues**: this repo forces Firestore long polling in `src/config/firebase.ts` to avoid `ERR_QUIC_PROTOCOL_ERROR` on some networks.
- **Firestore client warnings**: `net::ERR_BLOCKED_BY_CLIENT` on `firestore.googleapis.com/.../Listen/channel` usually comes from an ad blocker, privacy extension, or browser network filter rather than the app itself.
- **Legacy folders**: a root `@/` folder and `public/index.html` may exist as legacy scaffolding; the app uses the Vite root `index.html` and `src/*` as the source of truth.

---

## License / Disclaimer

This project uses third-party services (Firebase, OpenStreetMap, OSRM). Review each provider's terms before production use.
