# Backend Foundation Setup

## Architecture

The backend is a TypeScript Express modular monolith. Routes are versioned under
`/api/v1` and will later delegate to controllers, services, and repositories. The
AI service remains a separate Python FastAPI process, while BullMQ workers handle
slow or failure-prone work outside the request path.

Supabase is the authoritative database, Auth, Storage, and pgvector platform.
The server uses a service-only Supabase client for database/storage adapters and a
separate anon client for Supabase session verification. Row Level Security remains
the source of truth for user ownership; the backend must never trust a frontend
user ID.

Redis provides distributed cache and rate-limit state. BullMQ uses the same Redis
deployment for future queues. Queue definitions exist now, but no business jobs or
workers are implemented in this foundation phase.

## Folder structure

```text
backend/
├── src/
│   ├── config/          # typed env, Supabase, Redis
│   ├── database/        # Supabase database adapter and checks
│   ├── middleware/      # auth, validation, logger, CORS, security, limits
│   ├── routes/          # health and /api/v1 module boundaries
│   ├── controllers/     # health controller; feature controllers are later
│   ├── services/        # cache boundary and future domain services
│   ├── repositories/    # future persistence boundaries
│   ├── utils/           # shared HTTP errors
│   ├── validators/      # future Zod schemas
│   ├── types/           # shared and Express request types
│   ├── jobs/            # BullMQ queue definitions only
│   └── app.ts           # Express composition
├── Dockerfile
├── package.json
└── tsconfig.json
```

Prepared API modules are `/api/v1/auth`, `/users`, `/profile`, `/resume`,
`/roadmap`, `/ai`, `/notifications`, and `/admin`. They intentionally return a
not-implemented foundation response until their documented feature phases.

## Run locally

1. Copy the example variables and fill in local Supabase and Redis values without
   committing secrets:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Install and build:

   ```powershell
   cd backend
   npm install
   npm run build
   npm start
   ```

3. Or run in watch mode:

   ```powershell
   npm run dev
   ```

Redis can be started with `docker compose up redis`. The root Compose file also
contains a backend service for the foundation image.

## Environment variables

Required by the backend:

- `NODE_ENV` (`development`, `test`, or `production`)
- `PORT`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the frontend)
- `REDIS_URL`

Optional foundation settings include `AI_SERVICE_URL`, `LOG_LEVEL`,
`RATE_LIMIT_WINDOW_MS`, and `LOGIN_RATE_LIMIT_PER_IP`. No custom JWT secret is
used; Supabase Auth owns sessions and JWT verification.

## Health checks

- `GET /api/health` - backend liveness
- `GET /api/health/db` - Supabase database probe
- `GET /api/health/redis` - Redis ping
- `GET /api/health/ai-service` - AI service probe

Dependency probes return `503` with a safe error code when unavailable and do not
expose credentials or provider error details.

## Testing and pending implementation

```powershell
npm run typecheck
npm run build
Invoke-WebRequest http://localhost:5000/api/health
```

This phase does not implement signup/login flows, resume parsing, AI/RAG,
roadmaps, reminders, payments, admin APIs, or business queue workers. Those are
subsequent documented phases.
