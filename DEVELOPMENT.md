# Paham Kalori — Developer Guide

This document covers the project **structure**, **technology stack**, **architecture** and **workflow** for engineers maintaining or contributing to the codebase. If you are an end user, see the main [`README.md`](./README.md) instead.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend + API (monolith)** | Next.js 16 (App Router) + React 19 + Tailwind CSS + shadcn-style UI + dark mode |
| **API runtime** | Hono (Node.js) mounted as Next.js route handlers (`hono/vercel`) |
| **Database** | PostgreSQL hosted on **Neon** (serverless), accessed via Prisma ORM + `@prisma/adapter-pg` |
| **Auth** | NextAuth v5 (beta) on the client, custom JWT (HS256 via `jose`) + bcrypt on the server |
| **AI** | Google **Gemini** (`@google/generative-ai`) for food recognition, calorie/nutrition estimates & chat (Server-Sent Events) |
| **Shared code** | `@pk/core` workspace package (entities, constants, error types) |
| **Build / Deploy** | Vercel — single project `paham-kalori` (Next.js); `/api/*` is handled in-process in the same project |

## Monorepo Structure

```text
paham-kalori/
├── frontend/            # Only app (Next.js UI + Hono API via route handlers)
│   ├── src/
│   │   ├── app/         # App Router: login, register, scan, dashboard, history, chat, profil
│   │   │   └── api/     # Route handlers:
│   │   │       ├── auth/[...nextauth]/   NextAuth (session/callback)
│   │   │       ├── auth/login|check-email  Hono auth endpoint overrides
│   │   │       ├── [...path]/            catch-all → Hono (onboarding, food, metrics, dashboard, chat, etc.)
│   │   │       └── health/               health check
│   │   ├── server/      # Hono backend source:
│   │   │   ├── app.ts         # Hono app, CORS, route mounting
│   │   │   ├── ai/gemini.ts   # Gemini wrapper (SSE chat / image)
│   │   │   ├── auth/jwt.ts    # HS256 sign/verify
│   │   │   ├── db/prisma.ts   # Prisma client + Neon adapter
│   │   │   ├── middleware/    # auth, require-profile guards
│   │   │   ├── routes/        # auth, register, onboarding, food, metrics, dashboard, chat, nutrition
│   │   │   ├── services/      # business logic (auth, metric, nutrition, chat)
│   │   │   └── repositories/  # data access (user, profile, food, chat)
│   │   ├── data/auth/         # NextAuth config
│   │   └── lib/               # client hooks, api-cache, image helpers, nutrition-stats, profile-local
│   ├── prisma/
│   │   ├── schema.prisma      # models: User, Profile, FoodEntry, Chat
│   │   └── prisma.config.ts   # Prisma CLI config (schema + datasource)
│   ├── public/                # static assets
│   ├── next.config.ts         # transpilePackages + serverExternalPackages (prisma/pg)
│   └── vercel.json            # framework Next.js, build = prisma generate && next build
│
├── shared/                # @pk/core workspace package (types, errors, constants)
├── package.json           # npm workspaces (frontend, shared)
└── .env / .env.local      # DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, FRONTEND_URL
```

## Deployment (Vercel — single project)

| Project | URL | Root | Purpose |
|---|---|---|---|
| `paham-kalori` | `https://paham-kalori.vercel.app` | frontend | Single project: UI + API (Hono route handlers) |

There is no separate backend project. The `@pk/core` workspace is installed from the monorepo; the Prisma Client is generated at build time.

## Architecture & Workflow

```text
                       Browser
                         │
                         ▼
        +-------------------------------------------+
        |           Next.js (Vercel)                 |
        |  UI: login/register/scan/dashboard/…        |
        |  Route handlers /api/* → Hono (in-process) |
        |    ├─ auth / register                       |
        |    ├─ onboarding / food / metrics           |
        |    ├─ dashboard (combined: food+metrics)    |
        |    ├─ chat (SSE stream)                     |
        |    └─ nutrition/analyze                     |
        |  Api call → Prisma → Neon PostgreSQL        |
        |             → Gemini (food analysis/chat)   |
        +-------------------------------------------+
```

The browser only ever talks to the single origin. `/api/*` requests are handled by route handlers that mount the Hono app in-process — **no external hop**, so only one serverless function per request (instead of frontend→API twice).

### Client-side data cache

To keep page-to-page navigation fast, the pages call a shared cache helper (`src/lib/client/api-cache.ts`) that memoizes GET responses for 60 seconds:

- **Dashboard** & **Statistics** fetch everything in **one** request to `GET /api/dashboard?profileId=…&from=…&to=…`, which returns `{ entries, metrics, goal }`.
- **Profile** fetches `/api/metrics` through the same cache.
- The cache is invalidated whenever data changes (scan save/edit, history delete/edit) so dashboards never show stale numbers.

### Request flow (food scan example)

```text
Browser │            Next.js (route handler → Hono)        │   Neon / Gemini
────────┴───────────────────────────────────────────────┴─────────────────
  user uploads/snap
  a food photo      │
        │──────────────────────► /api/food          (Hono)
        │                             │  nutritionService ─► Gemini
        │                             │                    ◄── calorie/nutrition JSON
        │                             └── saved FoodEntry (Neon)
        │◄──── saved entry ───────────┘
```

## Workflow & Environments

### Local development
```bash
npm install            # install workspace (frontend + shared)
npm run dev            # next dev (frontend) — Hono API active via route handlers
```
- Only the `frontend` env is needed; Next reads `frontend/.env.local` (for local dev, fill it in or symlink it from the root `.env`):
  - `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `FRONTEND_URL`.
- No separate Hono server on port 4000 anymore.

### Database schema sync
```bash
npm run db:push        # Prisma db push → Neon
```

### Build & lint
```bash
npm run build          # prisma generate && next build
npm run lint           # eslint + tsc --noEmit (frontend)
```

### Deploy to Vercel (single project)
```bash
npx vercel --prod --yes --scope acme-22b3     # run from repo root (project Root Directory = frontend)
```

### End-to-end verification
```bash
curl https://paham-kalori.vercel.app/api/health                    # → 200 "ok"
curl -X POST .../api/auth/check-email -d '{"email":"x@y.z"}'        # → {"exists":false}
curl .../api/food                                                   # → 401 without a session
```

## Key Environment Variables

| Variable | Where it's used | Example |
|---|---|---|
| `DATABASE_URL` | frontend → Prisma ↔ Neon | `postgresql://user:pass@host.neon.tech/db?sslmode=require` |
| `AUTH_SECRET` | NextAuth + JWT signing | 64-char hex |
| `GEMINI_API_KEY` | Gemini calls (primary) | `AIza...` |
| `GEMINI_API_KEY_2` | (optional) fallback — used automatically when key 1 hits quota/429 | `AIza...` |
| `GEMINI_MODEL` | Gemini model id | `gemini-flash-latest` |
| `FRONTEND_URL` | CORS header (harmless now) | `https://paham-kalori.vercel.app` |
| `AUTH_TRUST_HOST` | NextAuth behind Vercel | `true` |
| `PORT` | (optional) local server | `4000` |

> `BACKEND_URL` is no longer used — removed from the rewrite & NextAuth (login goes through the in-process service).