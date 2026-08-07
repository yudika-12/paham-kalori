# Paham Kalori — Developer Guide

This document covers the project **structure**, **technology stack**, **architecture** and **workflow** for engineers maintaining or contributing to the codebase. If you are an end user, see the main [`README.md`](./README.md) instead.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS + shadcn-style UI + dark mode |
| **Backend** | Hono (Node.js) + TypeScript |
| **Database** | PostgreSQL hosted on **Neon** (serverless), accessed via Prisma ORM + `@prisma/adapter-pg` |
| **Auth** | NextAuth v5 (beta) on the client, custom JWT (HS256 via `jose`) + bcrypt on the API |
| **AI** | Google **Gemini** (`@google/generative-ai`) for food recognition, calorie/nutrition estimates & chat (Server-Sent Events) |
| **Shared code** | `@pk/core` workspace package (entities, constants, error types) |
| **Build / Deploy** | Vercel — frontend & backend as two separate projects; backend bundled via `esbuild` (Vercel Build Output API v3) |

## Monorepo Structure

```text
paham-kalori/
├── frontend/            # Next.js web app
│   ├── src/
│   │   ├── app/         # App Router pages: login, register, scan, dashboard, history, chat, profil
│   │   ├── components/  # AppShell (navbar/layout), theme-provider
│   │   ├── data/auth/   # NextAuth config (uses BACKEND_URL for credentials auth)
│   │   └── lib/         # client hooks, image helpers, nutrition-stats, profile-local
│   ├── public/          # static assets (icons removed)
│   └── next.config.ts   # rewrites /api/* calls to the backend service
│
├── backend/             # Hono REST API
│   ├── api/index.ts     # Vercel entrypoint → exports handle(app) for each HTTP method
│   ├── src/
│   │   ├── app.ts       # Hono app, CORS, route mounting, error handler
│   │   ├── ai/gemini.ts       # Gemini model wrapper (SSE chat / image estimate)
│   │   ├── auth/jwt.ts        # HS256 sign/verify
│   │   ├── db/prisma.ts        # Prisma client + Neon adapter
│   │   ├── middleware/         # auth, require-profile guards
│   │   ├── routes/             # auth, register, onboarding, food, metrics, chat, nutrition
│   │   ├── services/           # business logic (auth, metric, nutrition, chat)
│   │   └── repositories/       # data access (user, profile, food, chat)
│   ├── prisma/
│   │   ├── schema.prisma    # models: User, Profile, FoodEntry, Chat
│   │   └── prisma.config.ts
│   ├── scripts/
│   │   ├── bundle.mjs      # esbuild → Vercel Build Output API v3
│   │   ├── dev.sh          # local dev launcher (Neon, no local Postgres)
│   │   └── open-browser.js # auto-open :3000 during dev
│   ├── api/ & vercel.json  # Vercel deployment settings
│   │
├── shared/                # @pk/core workspace package (types, errors, constants)
├── package.json            # npm workspaces (frontend, backend, shared)
└── .env / .env.local       # DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, FRONTEND_URL, BACKEND_URL
```

## Deployed Projects (Vercel)

| Project | URL | Root | Purpose |
|---|---|---|---|
| `paham-kalori` | `https://paham-kalori.vercel.app` | frontend | Public web app (framework: Next.js) |
| `paham-kalori-api` | `https://paham-kalori-api.vercel.app` | backend | Hono API (built with `bundle.mjs`) |

## Architecture & Workflow

```text
                          +---------------------------+
                          |      Next.js Frontend     |
                          |---------------------------|
                          | login / register / scan   |
                          | dashboard / history / chat|
                          +-------------+-------------+
                                        |
                          rewrites /api/* (next.config.ts)
                          +------------+-------------+
                                        |
                                        v
        +-------------------------------------------------------------+
        |                         Hono Backend                         |
        |-------------------------------------------------------------|
        | auth/register (bcrypt + JWT)                                 |
        |   └─> services ─> repositories ─> Prisma ─> Neon PostgreSQL |
        | onboarding            (Profile, calorie target)             |
        | food   (record / estimate)                                  |
        | metrics (BMI/BMR/TDEE stats)                                |
        | nutrition/analyze (Gemini image/response)                   |
        | chat   (Gemini SSE streaming)                               |
        +-----------------+-----------------------+-----------------+
                          |                       |
                    REST/JSON                 SSE stream
                          |                       |
                          v                       v
              +-----------------------+
              |      External      |
              |  Google Gemini API  |  (food/calorie chat analysis)
              +-----------------------+
```

The frontend always talks to Hono through its own `/api/*` rewrites (see `next.config.ts`); the browser never calls the backend origin directly during these rewrites. The backend persists data to **Neon** (PostgreSQL) via Prisma and calls **Gemini** only for food/calorie analysis and chat responses.

### Request flow (food scan example)

```text
Browser │                Next.js /scan            │       Hono backend          │      Neon / Gemini
────────┴─────────────────────────────────────────┴────────────────────────────┴───────────────────
  user uploads/snap
  a food photo        │
        │──────────────────────► /api/food/estimate  (rewritten to API)
        │                             │                              │
        │                             │  POST /api/food/estimate     │
        │                             │      ─► nutritionService ─► Gemini
        │                             │                              │ ◄── calorie/nutrition JSON
        │                             │◄──── saved entry ─────────────│
        │  ── saved FoodEntry ───┤
```

## Workflow & Environments

### Local development
```bash
npm install            # install all workspaces
npm run dev            # starts backend (tsx) + frontend (next), auto-opens browser
```
- Requires `.env` / `.env.local` populated (DATABASE_URL points at Neon, plus AUTH_SECRET, GEMINI_API_KEY, FRONTEND_URL, BACKEND_URL).
- No local Postgres needed — the app talks straight to Neon.

### Database schema sync
```bash
npm run db:push        # push Prisma schema to Neon
```

### Build & lint
```bash
npm run build          # build frontend (Next.js)
npm run lint           # type-check frontend & backend
```

### Backend bundle for Vercel
```bash
cd backend && node scripts/bundle.mjs    # generates .vercel/output (Build Output API v3)
npx vercel deploy --prebuilt --prod --scope acm...   --token ...   # deploy API
```

### Frontend deploy for Vercel
```bash
npx vercel --prod --scope <team> --token <token>   # run from repo root
```

### End-to-end verification
```bash
curl https://paham-kalori-api.vercel.app/health        # → 200 "ok"
curl -X POST .../api/auth/check-email                  # → {"exists":false}
curl -X POST .../api/auth/login                        # → user JSON / 401
```

## Key Environment Variables

| Variable | Where it's used | Example |
|---|---|---|
| `DATABASE_URL` | backend → Prisma ↔ Neon | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `AUTH_SECRET` | `next-auth.ts`, backend JWT signing | 64-char hex |
| `GEMINI_API_KEY` | backend Gemini calls | `AIza...` |
| `GEMINI_MODEL` | backend Gemini model id | `gemini-flash-latest` |
| `FRONTEND_URL` | backend CORS origin | `https://paham-kalori.vercel.app` |
| `BACKEND_URL` | frontend rewrites (`next.config.ts`) | `https://paham-kalori-api.vercel.app` |
| `AUTH_TRUST_HOST` | NextAuth behind Vercel | `true` |
| `PORT` | local backend server | `4000` |