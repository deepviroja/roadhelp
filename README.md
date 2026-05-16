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

Create `roadhelp/.env` (the repo includes an example). Required:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL` (Realtime Database URL; important for live tracking)

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

## Moving the Project to a New PC / System

If you want to move this project to another computer or system, follow these exact steps:

1. **Prerequisites on the new PC**:
   - Install **Node.js** (v18 or higher recommended).
   - Install **Git** (if you want to pull directly from your repository).

2. **Copy the code to the new PC**:
   - Easiest way: Copy the entire `roadhelp` folder (except the `node_modules` folders) via a USB drive or ZIP file. Alternatively, clone the repository using Git.
   - **Crucial step:** Make sure to include the `.env` file in `roadhelp/.env` and `roadhelp/backend/.env`. Also, make sure `roadhelp/backend/serviceAccountKey.json` is included. Those files are typically hidden or not tracked by version control but are **required** to authenticate with Firebase.

3. **Install dependencies and run the Frontend**:
   ```bash
   cd roadhelp
   npm install
   npm run dev
   ```

4. **Install dependencies and run the Backend**:
   Open a **new terminal tab/window**:
   ```bash
   cd backend
   npm install
   npm start
   ```

5. **Everything should now run identical to the old PC.** No other configuration is required since the Firebase Cloud resources are stored online.
   - The React frontend will run on `http://localhost:5173`.
   - The Node.js backend will run on `http://localhost:5000` (which is proxied automatically by Vite).

---

## Backend Deployment (Node.js API)

The platform has transitioned to a hybrid architecture: **Frontend (React) → Backend (Node.js) → Firebase**.

### Running Backend Locally
From `d:\project\roadhelp\backend`:
1. Ensure your `serviceAccountKey.json` is placed in the `backend/` folder.
2. Create `backend/.env` with `PORT=5000`.
3. Install and run:
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
- **Environment Variables**: Since `serviceAccountKey.json` shouldn't be committed to version control, it's recommended to parse it from an environment variable (e.g., set `FIREBASE_SERVICE_ACCOUNT` as a JSON string or Base64). You'll need to adapt `config/firebase.js` to parse it.
- **Start Command**: `npm start`
- **Build Command**: `npm install`

#### 2. VPS (Ubuntu / Debian)
- SSH into your server, install Node.js and PM2.
- Clone the repository and navigate to the `backend` folder.
- Safely upload your `serviceAccountKey.json` and `.env` to the server.
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
  - `providerLat`, `providerLng`
  - `heading`, `speed`
  - `lastUpdated` (ms epoch)

RTDB rules are in `database.rules.json` and currently allow authenticated read/write under `tracking/*`.

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
- **QUIC / HTTP3 network issues**: this repo forces Firestore long polling in `src/config/firebase.ts` to avoid `ERR_QUIC_PROTOCOL_ERROR` on some networks.
- **Legacy folders**: a root `@/` folder and `public/index.html` may exist as legacy scaffolding; the app uses the Vite root `index.html` and `src/*` as the source of truth.

---

## License / Disclaimer

This project uses third-party services (Firebase, OpenStreetMap, OSRM). Review each provider’s terms before production use.
