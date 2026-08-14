# RoadHelp

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20DB-FFCA28?logo=firebase&logoColor=000)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Unlicensed-lightgrey)]()

RoadHelp is a modern roadside assistance platform built for the moments when every minute matters.

It connects:

- customers who need help fast
- providers who want clear, nearby jobs
- admins who need full control over operations, content, and support workflows

This repo includes the customer app, provider app, admin console, and supporting backend services in one codebase.

---

## Product Snapshot

RoadHelp is designed to turn a stressful roadside breakdown into a simple guided flow:

1. a customer requests help
2. the system matches or notifies nearby providers
3. a provider accepts the job and travels to the location
4. the customer tracks progress in real time
5. the job is completed, reviewed, and recorded

The platform is structured around practical emergency use cases like:

- towing
- flat tire support
- jump starts
- fuel delivery
- other roadside assistance services

---

## Why It Exists

Traditional roadside support is often slow, fragmented, and hard to track.
RoadHelp solves that by giving every role a focused workspace and a shared source of truth.

The result:

- faster request handling
- clearer provider coordination
- better customer visibility
- easier admin operations

---

## Key Capabilities

### For Customers

- create a new roadside request in a guided form
- pick the required service and share location
- see nearby providers
- track an active request live
- view request history and profile data
- access public tracking pages

### For Providers

- see incoming requests and active jobs
- accept and manage assigned work
- navigate to the customer location
- update job status as work progresses
- review earnings and job history
- maintain provider profile details

### For Admins

- manage users, providers, services, and vehicle types
- manage requests, payouts, and revenue views
- edit CMS pages and email templates
- review audit logs and support messages
- manage system settings and SOS tools
- control access with granular permissions

### Platform Safety

- role-based routing for customer, provider, and admin areas
- OTP and magic-login workflows
- password recovery flows
- maintenance mode support
- public request tracking without requiring sign-in

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router
- React Hook Form
- Zod
- Leaflet and Leaflet Routing Machine
- Sonner for notifications

### Backend

- Node.js
- Express
- Firebase Admin
- Nodemailer
- CORS middleware

### Firebase and Storage

- Firebase Authentication
- Firebase Realtime Database or Firestore-based services depending on flow
- security rules in `firestore.rules` and `database.rules.json`

---

## Repository Layout

```text
src/
  components/   UI, map, auth, customer, provider, admin, shared building blocks
  config/       Firebase client setup
  hooks/        Reusable application hooks
  lib/          App services, validators, logging, routing helpers
  pages/        Public pages and role-based dashboards
  stores/       Zustand stores for auth, requests, and system state
  App.tsx       Route definitions and access control
backend/
  config/       Firebase Admin setup
  controllers/  Request and auth handlers
  middlewares/  Backend auth middleware
  routes/       Express API routes
  services/     Email and request services
  server.js     Backend entry point
public/         PWA assets, manifest, icons, and service worker
scripts/        Utility scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- a Firebase project
- SMTP credentials for email delivery

### Install

```bash
npm install
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_DATABASE_URL="your_realtime_database_url"
```

Create a `.env` file in `backend/`:

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

### Run Locally

Open two terminals.

Frontend:

```bash
npm run dev
```

Backend:

```bash
cd backend
npm start
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`

---

## Scripts

### Frontend

Run from the project root:

- `npm run dev` - start the development server
- `npm run build` - type-check and build production assets
- `npm run lint` - lint the full workspace
- `npm run preview` - preview the built frontend locally

### Backend

Run from `backend/`:

- `npm start` - start the Express API server

---

## Developer Notes

### Authentication Flow

The app supports several login paths, including standard login, password reset, OTP verification, and magic login.
Authorization is handled on the client with role-aware routing, and the backend supports auth-sensitive workflows such as email delivery and request lifecycle operations.

### Routing Model

Public routes cover marketing pages and public tracking.
Protected routes are separated into customer, provider, and admin sections.
Admin routes can also be further constrained by permissions such as users, requests, services, CMS, finance, and settings.

### Logging and Observability

The app includes system logging and audit logging for navigation and admin actions.
That makes it easier to trace operational issues and review important platform activity.

### Maps and Tracking

The project uses Leaflet-based maps and routing utilities for location selection, provider navigation, and live job tracking.

---

## Important Routes

### Public

- `/`
- `/services`
- `/how-it-works`
- `/for-customers`
- `/for-providers`
- `/about`
- `/contact`
- `/faq`
- `/help`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/magic-login`
- `/track/:id`

### Customer

- `/customer/dashboard`
- `/customer/new-request`
- `/customer/track/:id`
- `/customer/history`
- `/customer/profile`
- `/customer/nearby`

### Provider

- `/provider/dashboard`
- `/provider/history`
- `/provider/earnings`
- `/provider/profile`
- `/provider/active-job/:id`

### Admin

- `/admin`
- `/admin/dashboard`
- `/admin/users`
- `/admin/providers`
- `/admin/requests`
- `/admin/services`
- `/admin/vehicles`
- `/admin/forms`
- `/admin/pages`
- `/admin/email-templates`
- `/admin/revenue`
- `/admin/payouts`
- `/admin/settings`
- `/admin/admins`
- `/admin/sos`
- `/admin/logs`
- `/admin/contact-messages`

---

## Deployment Notes

- The frontend expects the backend API to be available for auth and email-driven workflows.
- The service worker is disabled on localhost and enabled in non-local environments.
- Update Firebase credentials, SMTP credentials, and any deployment URLs before shipping.
- Keep `firestore.rules`, `database.rules.json`, and `cors.json` aligned with the environments you deploy to.

---

## Contributing

If you are contributing as a developer, use this order of operations:

1. identify the user flow you want to change
2. trace the page in `src/pages/`
3. inspect reusable UI in `src/components/`
4. review store state in `src/stores/`
5. check helper logic in `src/lib/` and hooks in `src/hooks/`
6. update `backend/` if the change touches authentication, request orchestration, or email delivery

### Good Contribution Targets

- tighten validation rules in `src/lib/validators.ts`
- improve route guards in `src/App.tsx`
- refine request state in `src/stores/requestStore.ts`
- adjust admin workflows in `src/pages/admin/`
- improve provider and customer tracking components
- harden backend auth and request endpoints

### Before Opening a PR

- run `npm run build`
- run `npm run lint`
- test the relevant customer, provider, and admin flows manually
- confirm backend email and auth flows work with the expected environment variables

---

## License

No license file is currently included. Add one if you want to distribute the project publicly.
