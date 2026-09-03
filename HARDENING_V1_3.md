# CareerGuid AI — Version 1.3 Hardening

Version 1.3 is the scalability, security, observability, and deployment-hardening layer that sits on top of the completed MVP, ATS v1.1, and true RAG v1.2 feature branches.

## Scope

This phase does not add a new user-facing AI feature. It makes the existing product safer to operate, easier to diagnose, and deployable as a multi-service system.

## HTTP and security hardening

The Express API now:

- disables `x-powered-by`
- trusts one reverse-proxy hop in production
- uses Helmet with an API-safe restrictive CSP
- denies framing and removes referrer leakage
- enables HSTS only in production
- keeps CORS restricted to configured frontend origins
- accepts only explicitly allowed methods and headers
- limits JSON/urlencoded bodies to 1 MB
- keeps resume uploads on their separate validated 5 MB contract
- uses finite request/header/keep-alive timeouts
- drains HTTP connections during SIGTERM/SIGINT with a hard shutdown deadline

## Privacy-safe request logging

Every request receives a correlation id through `X-Request-Id`. Valid incoming ids are preserved; otherwise the backend generates a UUID.

Pino HTTP logging redacts:

- authorization headers
- cookies
- API-key headers
- passwords
- OTP values
- access/refresh tokens
- email/phone values in request bodies
- `set-cookie` response headers

Application errors remain correlated without logging secrets or unnecessary personal data.

## Health and readiness

Available endpoints:

- `GET /api/health` — backend liveness
- `GET /api/health/live` — explicit liveness alias
- `GET /api/health/ready` — aggregate database + Redis + AI-service readiness
- `GET /api/health/db`
- `GET /api/health/redis`
- `GET /api/health/ai-service`
- `GET /api/health/scheduler`

Dependency checks are bounded by short timeouts and expose status/latency only, never credentials or raw provider errors.

## Redis and caching

Job-role and role-skill catalog reads use a five-minute namespaced Redis read-through cache.

Cache failures are fail-open for these read-only optimizations: the database remains the source of truth and the product flow continues when Redis caching is temporarily unavailable.

Security rule: Redis is no longer published to the host by the default Docker Compose topology. Production deployments should use an authenticated/TLS Redis URL (for example a managed `rediss://` endpoint) or set a local Redis password plus matching `REDIS_URL`.

## Scheduler foundation

The documented scheduler container now exists as an operational process. In v1.3 it writes a short-lived Redis heartbeat every 30 seconds so deploy/monitoring systems can detect a dead scheduler.

It intentionally does **not** send reminders yet. Version 1.4 will attach weekly reminder scheduling and email-queue jobs to this process instead of pretending reminder automation already exists.

## Production container topology

The root Compose stack contains:

- `nginx` — only default host-exposed edge service
- `frontend` — production Vite build served as an SPA
- `backend` — Express API
- `ai-service` — FastAPI parser/RAG service
- `resume-worker` — BullMQ resume parsing
- `roadmap-worker` — BullMQ RAG roadmap generation
- `scheduler` — scheduler heartbeat/future recurring-job host
- `redis` — queue/cache/rate-limit backend

Backend, frontend, AI service, workers, scheduler, and Redis communicate over the Docker network and are not published to host ports by default.

The edge Nginx:

- forwards `/api/*` to the backend
- forwards all other paths to the frontend
- propagates request ids and proxy headers
- caps request bodies at 6 MB at the edge
- applies finite upstream timeouts
- exposes `/healthz` for container/edge liveness

## CI gates

Product CI now has four independent jobs:

1. Backend — install, typecheck, tests, production build
2. Frontend — install, typecheck, tests, production build
3. AI service — dependency install, Python compile, pytest
4. Infrastructure — Docker Compose validation, Nginx syntax validation, production image builds

The infrastructure job exists to catch configuration drift that language-only tests cannot detect.

## Deployment boundary

Repository CI validates source, configuration, and image builds. It does not prove a live production environment because these remain external runtime inputs:

- real Supabase project and applied migrations
- real Supabase public/service credentials
- production Redis/TLS credentials
- embedding/LLM provider credentials
- DNS/TLS certificate termination
- email provider credentials
- production monitoring/error-tracking provider

No real secrets belong in this repository.

## Next phase

Version 1.4 adds progress/reminder automation: recurring scheduler jobs, pending-task detection, notification/email queue workers, idempotent reminder logs, retries, and user-facing reminder state.
