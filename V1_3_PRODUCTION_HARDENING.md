# CareerGuid AI — Version 1.3 Production Hardening

## Scope

Version 1.3 hardens the already implemented MVP, ATS, and true-RAG phases for safer production operation. It does not add reminder automation, billing, or a full admin UI; those remain later documented phases.

## Runtime topology

The production-like Docker Compose stack now uses these services:

- `edge` — public Nginx reverse proxy on `APP_PORT` (default `8080`)
- `frontend` — production Vite build served by internal Nginx
- `backend` — Node.js/Express API, internal-only
- `ai-service` — FastAPI parsing/embedding/LLM service, internal-only
- `resume-worker` — BullMQ resume parsing worker
- `roadmap-worker` — BullMQ RAG roadmap worker
- `redis` — password-protected queue/cache/rate-limit service, internal-only

Only `edge` publishes a host port in the default Compose model. Supabase remains externally managed.

The reminder scheduler is intentionally not faked in v1.3. It will be added with the real Version 1.4 reminder workflow.

## Health probes

Backend probes:

- `GET /api/health` — liveness alias
- `GET /api/health/live` — liveness only; no external dependency required
- `GET /api/health/ready` — aggregate DB + Redis + AI service readiness
- `GET /api/health/db`
- `GET /api/health/redis`
- `GET /api/health/ai-service`

Dependency responses include measured latency but do not return provider credentials or internal error details.

Container health checks use liveness probes so temporary Supabase/provider outages do not cause unnecessary backend restart loops. Readiness is intended for deployment/load-balancer gating.

## Request observability

Every backend request gets an `X-Request-Id`:

- a valid incoming ID is preserved
- otherwise a UUID is generated
- the ID is returned in response headers
- API error responses include the same request ID
- structured Pino logs carry the request ID

Sensitive log fields are redacted, including authorization headers, cookies, passwords, OTPs, access/refresh tokens, API-key-like values, and `Set-Cookie` headers.

HTTP log levels are severity-aware:

- success -> `info`
- 4xx -> `warn`
- 5xx / thrown errors -> `error`

## Security hardening

Backend:

- Helmet with API-oriented CSP
- HSTS only in production
- no-referrer policy
- same-origin opener policy
- same-site resource policy
- `x-powered-by` disabled
- configurable trusted-proxy hops
- CORS uses `FRONTEND_URL` plus comma-separated `ALLOWED_ORIGINS`
- localhost origins are added only outside production
- denied CORS origins return explicit `403 / CORS_ORIGIN_DENIED`

Edge Nginx:

- server tokens disabled
- 6 MB edge request-body ceiling (backend resume validation still enforces the 5 MB product limit)
- request IDs forwarded to backend
- proxy timeouts bounded
- framing/content-type/referrer/permissions headers applied

Redis:

- not published to the host in the default Compose topology
- Compose enables `requirepass`
- `rediss://` URLs are supported by backend/BullMQ configuration for managed TLS Redis
- client reconnect uses bounded exponential backoff
- connect timeout is configurable

## Worker reliability

Resume and RAG roadmap workers now include:

- structured Pino logs
- bounded graceful shutdown
- uncaught-exception/unhandled-rejection logging
- bounded AI request timeout for resume parsing
- preserved RAG retry-vs-final-failure semantics
- dead-letter recording for exhausted resume/RAG jobs

The `deadLetterQueue` stores operational failure metadata only; it is not used as an automatic retry source.

## Admin operational APIs

Authenticated admin-only endpoints:

- `GET /api/v1/admin/ops/queues`
  - waiting/active/completed/failed/delayed/paused counts
  - includes `deadLetterQueue`
  - includes aggregated totals
- `GET /api/v1/admin/ops/runtime`
  - Node version
  - process uptime
  - memory usage
  - process ID

These endpoints are intentionally protected by the existing Supabase session + admin-role middleware.

## Configuration

Important v1.3 environment variables:

```dotenv
ALLOWED_ORIGINS=
AI_REQUEST_TIMEOUT_MS=90000
HEALTHCHECK_TIMEOUT_MS=2000
SHUTDOWN_TIMEOUT_MS=10000
TRUST_PROXY_HOPS=1
REDIS_CONNECT_TIMEOUT_MS=5000
REDIS_PASSWORD=change-me
LOG_LEVEL=info
```

Use `rediss://` in `REDIS_URL` when the production Redis provider requires TLS. Never commit real provider, Supabase, Redis, or email credentials.

## Local production-like run

1. Copy `.env.example` to a local untracked environment file.
2. Set real Supabase values.
3. Set a non-default Redis password.
4. Configure RAG providers if AI roadmap mode will be tested.
5. Run:

```bash
docker compose config
docker compose up --build
```

Open `http://localhost:8080` unless `APP_PORT` is changed.

Useful checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/health/live
curl http://localhost:8080/api/health/ready
```

## Horizontal scaling notes

Fixed `container_name` values were removed because they prevent normal Compose service scaling.

Worker services can be scaled independently, for example:

```bash
docker compose up -d --scale resume-worker=2 --scale roadmap-worker=3
```

For backend horizontal scaling in a real production environment, place multiple backend instances behind the deployment platform/load balancer and keep sessions/rate limits/queues distributed through Supabase + Redis. Do not rely on in-memory session state.

## CI gates

Product CI now checks four areas:

### Backend

- `npm ci`
- `npm audit --audit-level=high`
- TypeScript typecheck
- tests
- production build

### Frontend

- `npm ci`
- `npm audit --audit-level=high`
- TypeScript typecheck
- tests
- production build

### AI service

- dependency install
- `pip check`
- Python compile
- pytest

### Infrastructure

- `docker compose config --quiet`
- backend Docker image build
- frontend Docker image build
- AI service Docker image build
- edge Nginx `nginx -t`

Dependabot is configured for backend/frontend npm, AI-service pip, GitHub Actions, and all three Dockerfiles.

## Production deployment checklist

Before declaring a real environment production-ready:

- [ ] all Supabase migrations are applied
- [ ] RLS/storage policies are verified against real users
- [ ] production domains are present in `FRONTEND_URL` / `ALLOWED_ORIGINS`
- [ ] HTTPS terminates at the platform/load balancer/Nginx edge
- [ ] Redis is private and authenticated/TLS-enabled as appropriate
- [ ] embedding and LLM credentials are stored in platform secrets
- [ ] knowledge base is indexed and RAG live validation passes
- [ ] workers are running and failed-job/dead-letter counts are monitored
- [ ] `/api/health/ready` is used by readiness/uptime monitoring
- [ ] backup/recovery policy for Supabase and generated files is documented for the chosen provider
- [ ] alerting is configured for backend 5xx, worker failures, queue backlog, and uptime
- [ ] logs are shipped to the selected production log/error platform

## Validation boundary

Repository CI validates code, tests, dependency thresholds, Docker image builds, Compose syntax, and Nginx syntax. It does **not** prove a live Supabase/provider deployment because real credentials are intentionally absent from CI.

Live production validation still requires an actual environment and real secrets. That distinction must remain explicit in status documentation and PR descriptions.
