# Qiko Frontend

React frontend for **[Qiko](https://qiko.ai)** — a platform for deploying AI digital workers that handle specialized business workflows (pre-sales RFP responses, sales opportunity intelligence, property finance insights, and more).

This repository is **frontend-only**. APIs are served by the companion Laravel backend ([`qiko-backend`](../qiko-backend)).

| Project | Typical local URL |
|---------|-------------------|
| Frontend (this repo) | http://localhost:3000 |
| Backend | http://localhost:8000 |

---

## Product overview

Users authenticate, create or open **workers** (AI agents), and operate them from **Studio** dashboards. Each worker type has its own cockpit, use cases, and APIs.

### Studio sections

| Section | Worker focus | What it does |
|---------|--------------|--------------|
| **IDG Security** | Pre Sales Writer | RFP upload/parse, AI response drafting, knowledge base, section assignment, compliance, win/loss |
| **Sales Intelligence** | Sales Intelligence | Tender ingestion (UNGM/TED), qualification, human review, Salesforce push, audit history |
| **Essential Living** | Property Finance Specialist | Property finance analysis and portfolio insights |

### Sales Intelligence workflow

```
Ingestion (portal scan) → Pipeline / Review → Validate → Push to Salesforce
                              ↓
              Archive · Activity Logs · Scan History · Decision History
```

Live data flows through REST (`/api/avatar/idg-sales/...`) via `client/src/lib/idgSalesApi.ts` and `useIdgSalesIntel` (React context), not the legacy Redux mock slice.

### Mock data mode

Set `VITE_USE_MOCK_DATA=true` to run the app entirely from the single source file `client/src/data/mock-data.json` (auth, agents, Sales Intelligence, assignments, research, finance, etc.). Requests go through `appFetch` → `mockHttp` and never hit the network. Components should use `@/data/services` (or existing API modules, which already route through `appFetch`) — do not import the JSON from UI code.

Mock login: `admin@qiko.local` / `Admin123!` (also `demo@qiko.local` / `Demo123!`). Session tokens are stored in `localStorage` as usual; mock payloads are not duplicated there.

When `VITE_USE_MOCK_DATA=false`, the same API surface calls the real backends.

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **pnpm** 10.4.1+ (this repo sets `"packageManager": "pnpm@10.4.1"`)

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Copy the example env file and adjust for your environment:

```bash
cp .env.example .env
```

Mode-specific files (used with Vite `--mode`):

| File | Mode | Typical use |
|------|------|-------------|
| `.env` / `.env.example` | default | Local defaults |
| `.env.stage` | `stage` | Stage backend (`stage-backend.qiko.ai`) |
| `.env.live` | `live` | Production |

#### Required / commonly used

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Laravel Avatar API base (default stage: `https://stage-backend.qiko.ai/api/avatar`; local: `http://127.0.0.1:8000/api/avatar`) |
| `VITE_USE_MOCK_DATA` | `true` / `false` — when `true`, the app serves all data from `client/src/data/mock-data.json` via the data layer and makes **no API calls**. When `false`, existing API clients call the network. |
| `VITE_APP_VERSION` | App version string shown in the UI |
| `VITE_ENV` | Environment label (`stage`, `live`, `development`, …) |
| `VITE_LANDING_PAGE_URL` | Marketing / landing site URL |
| `VITE_LARAVEL_DECRYPT_KEY` | Key for decrypting backend payloads where required |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (checkout) |
| `VITE_ADMIN_API_BASE_URL` | Admin API origin (if used) |
| `VITE_CSP_CONNECT_SRC` | Extra CSP `connect-src` hosts (APIs, Stripe, Vapi, etc.) |

Firebase Cloud Messaging (web push for Sales Intelligence notifications) uses `VITE_FIREBASE_*` vars — set `VITE_FIREBASE_VAPID_KEY` from Firebase Web Push certificates, and keep `client/public/firebase-messaging-sw.js` in sync when web config changes.

### 3. Run locally

```bash
# Default / local API from .env
pnpm dev

# Point at stage / live backends
pnpm dev:stage
pnpm dev:live
```

Vite serves the app from the `client/` root. Open the URL printed in the terminal (often `http://localhost:3000` or `5173`).

Ensure the **backend** is reachable at the host in `VITE_API_BASE_URL` (and CORS allows your frontend origin).

### 4. Build & preview

```bash
pnpm build          # → dist/public
pnpm build:stage
pnpm build:live

pnpm preview
pnpm preview:stage
```

### 5. Quality scripts

```bash
pnpm check    # TypeScript (tsc --noEmit)
pnpm format   # Prettier
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4, Radix UI, CVA |
| Routing | Wouter |
| Client state | Redux Toolkit (+ redux-persist for selected IDG slices) |
| Server / feature data | REST to Laravel (`VITE_API_BASE_URL`), feature hooks/context (e.g. Sales Intel) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Payments | Stripe |
| Voice / realtime | Vapi, Daily (where enabled) |
| Push | Firebase Cloud Messaging |
| Toasts | Sonner |

tRPC packages remain in dependencies for some legacy paths; **primary product APIs for Studio workers use the Laravel Avatar REST base**.

---

## Project structure

```
qiko-frontend/
├── client/                      # Vite app root
│   ├── public/                  # Static assets, FCM service worker
│   ├── index.html
│   └── src/
│       ├── App.tsx              # Routes
│       ├── components/          # Shared UI + dashboard chrome
│       ├── pages/
│       │   ├── studio-dashboard/          # Studio cockpits
│       │   │   ├── StudioDashboard.tsx
│       │   │   ├── studioSections.ts      # Worker classification
│       │   │   └── sales-intelligence/    # SI views + idgSales hooks
│       │   ├── WorkersPage.tsx
│       │   ├── Onboarding.tsx
│       │   └── …
│       ├── lib/                 # API clients (idgSalesApi, IDGApi, …)
│       └── store/               # Redux store + slices
├── patches/                     # pnpm patched deps
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

Path alias: `@/*` → `client/src/*`.

---

## Key routes

| Path | Purpose |
|------|---------|
| `/login`, `/signup` | Auth |
| `/wizard`, `/creating` | Worker creation / onboarding |
| `/app` | App home |
| `/app/workers`, `/app/workers/:workerId` | Worker management |
| `/app/studio`, `/app/studio/:workerId` | Studio cockpit (IDG / Sales Intelligence / …) |
| `/app/pricing`, `/app/checkout` | Plans & Stripe checkout |
| `/app/settings` | Account settings |
| `/chat/:workerId`, `/c/:slug` | Public chat surfaces |

---

## Architecture notes

### API base

All Avatar REST calls build from `VITE_API_BASE_URL`. Session auth uses the Bearer token in `localStorage` (`qiko_session_token`). A `401` clears the session and redirects to `/login`.

### State ownership

| Concern | Owner |
|---------|--------|
| Auth, avatars, team, most app chrome | Redux Toolkit |
| IDG RFP / knowledge base (persisted) | Redux + redux-persist |
| Sales Intelligence live pipeline | `SalesIntelProvider` + `useIdgSalesIntel` → `idgSalesApi` |
| Notifications (SI) | `SalesIntelNotificationProvider` + FCM |

Prefer matching the existing pattern for the feature you touch: do not invent a parallel data layer.

### Related docs

- Sales Intelligence feature notes: `client/src/pages/studio-dashboard/sales-intelligence/SALES_INTELLIGENCE_WORKER.md`  
  *(historical; live SI is API-backed — treat the “mock Redux only” sections as outdated)*

---

## Backend pairing

| Concern | Repo |
|---------|------|
| UI, Studio, workers UX | **qiko-frontend** (this repo) |
| Laravel APIs, auth, IDG Sales, Salesforce OAuth | **qiko-backend** |

Keep contracts aligned when changing request/response shapes for Studio features.

---

## Notes

- Prefer **pnpm** (lockfile + `packageManager` field). Avoid mixing with `npm install` unless you know you need `package-lock.json` for a specific pipeline.
- CORS must allow the Vite origin when the API is on another host.
- Never commit real secrets (`.env.stage` / `.env.live` belong in local/CI secrets only).
"# qiko-ui" 
