# CareerGuid AI — Phase 17 Deployment

This document is the release contract for the canonical **Phase 17 — Deployment** milestone.

## Release position

Phase 17 starts from the fully integrated and green `dev` head. Production promotion is deliberately staged:

1. implement and validate deployment infrastructure on `feat/phase17-deployment`;
2. merge Phase 17 into `dev` only after Product CI is green;
3. run Product CI on the resulting exact `dev` head;
4. open a release PR from `dev` to `main`;
5. require Product CI to pass on the release PR;
6. merge to `main`;
7. Product CI on `main` must pass;
8. `Release Production Images` publishes immutable GHCR images for that exact main SHA;
9. manually run `Deploy Production` for that exact SHA through the GitHub `production` environment;
10. require public health verification before calling the release deployed.

Repository CI is not proof of live Supabase, Redis, email, payment, LLM, DNS, TLS, or host configuration.

## Chosen production topology

The canonical plan allows Vercel/Netlify for the frontend and Docker hosts for backend/AI. This repository uses one production Docker-host baseline because the application has long-running backend, FastAPI, BullMQ workers, and a scheduler that should not be forced into a serverless lifecycle.

Production services:

- `edge` — Nginx HTTPS edge, only public container;
- `frontend` — immutable production frontend image;
- `backend` — Express API;
- `ai-service` — private FastAPI service;
- `resume-worker` — backend image, resume queue process;
- `roadmap-worker` — backend image, roadmap/RAG queue process;
- `email-worker` — backend image, transactional email queue process;
- `reminder-scheduler` — backend image, weekly reminder scheduler;
- Supabase Cloud — PostgreSQL, Auth, Storage, pgvector;
- managed Redis — Upstash Redis / Redis Cloud or an equivalent TLS-capable managed Redis.

The AI service intentionally remains private. Browser-facing AI operations go through authenticated backend APIs instead of exposing FastAPI directly at `/ai`.

## Production files

- `docker-compose.production.yml` — immutable production runtime topology.
- `infra/nginx/nginx.prod.conf.template` — domain-aware HTTPS reverse proxy.
- `deployment/production.env.example` — production host environment contract with placeholders only.
- `deployment/validate-production-env.sh` — structural and strict preflight validation.
- `scripts/verify-production.sh` — external health validation.
- `.github/workflows/release-images.yml` — publishes backend/frontend/AI images to GHCR after successful Product CI on `main`.
- `.github/workflows/deploy-production.yml` — approval-based deployment of one immutable main SHA.

## 1. Provision external dependencies

Before production deployment, provision and live-validate:

### Supabase Cloud

- apply every migration in order;
- enable required extensions including pgvector;
- verify RLS and storage policies;
- create/verify resume, generated-resume, template/knowledge storage resources required by the application;
- seed canonical roles/skills;
- confirm Auth redirect URLs use the production HTTPS domain;
- confirm service-role credentials are server-only.

### Managed Redis

Use a managed Redis endpoint. Prefer `rediss://` TLS. Confirm connectivity from the Docker host before deployment. Redis is used for rate limiting, BullMQ queues, reminder scheduling, activity throttling and related runtime coordination.

### Email

Use Resend in production. Configure a verified sender/domain and live-test delivery, retries and idempotency.

### AI / embeddings

Configure real LLM and embedding providers/models. Validate provider timeout behavior and RAG embedding dimension compatibility before go-live.

### Billing

Configure either Razorpay or Stripe completely, including webhook secrets and provider-side production webhook URLs. Do not configure a fake success path.

## 2. Domain and TLS

Point the production domain to the Docker host/load balancer. Provision a real TLS certificate before starting the edge service.

The production host `.env.production` must provide:

- `APP_DOMAIN`
- `FRONTEND_URL=https://...`
- `ALLOWED_ORIGINS=https://...`
- `TLS_CERT_FILE`
- `TLS_KEY_FILE`

The Nginx production template redirects HTTP to HTTPS, uses TLS 1.2/1.3, adds HSTS/security headers, forwards request IDs, proxies `/api/` to the backend, and keeps the AI service private.

Certificate issuance/renewal is host/provider responsibility. A typical VPS can use Let's Encrypt/Certbot or a cloud load balancer with managed certificates. Never commit certificate private keys.

## 3. Production host environment

On the production host:

```sh
mkdir -p /opt/careerguid-ai/deployment /opt/careerguid-ai/infra/nginx /opt/careerguid-ai/tls
cp deployment/production.env.example /opt/careerguid-ai/.env.production
```

Replace every placeholder in `.env.production`. The real file stays only on the production host or in a production secret manager.

Validate it before any rollout:

```sh
PRODUCTION_ENV_STRICT=1 sh deployment/validate-production-env.sh .env.production
```

The validator requires HTTPS public/provider URLs, Redis URL shape, Resend in production, and complete credentials for the selected billing provider. Strict mode also rejects documented placeholder values.

## 4. GitHub repository configuration

### Repository secrets for image release

- `PRODUCTION_SUPABASE_URL`
- `PRODUCTION_SUPABASE_ANON_KEY`

These values are compiled into the frontend bundle. The Supabase anon key is public by design; the service-role key is never used in frontend image creation.

### GitHub `production` environment secrets

- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_PRIVATE_KEY`
- `PRODUCTION_SSH_KNOWN_HOSTS`
- `GHCR_USERNAME`
- `GHCR_READ_TOKEN`

`PRODUCTION_SSH_KNOWN_HOSTS` must contain the expected host key. The deploy workflow does not disable SSH host verification.

### GitHub `production` environment/repository variables

- `PRODUCTION_BASE_URL` — for example `https://app.example.com`
- `PRODUCTION_SSH_PORT` — optional, defaults to `22`
- `PRODUCTION_DEPLOY_PATH` — optional, defaults to `/opt/careerguid-ai`

Configure required reviewers on the GitHub `production` environment if the repository plan supports it. The deployment workflow is intentionally manual even after image publication.

## 5. Image release

After a release PR is merged to `main`, Product CI runs on the exact main commit. Only a successful Product CI completion can trigger `Release Production Images` automatically.

The workflow publishes immutable images:

```text
ghcr.io/<owner>/careerguid-ai-backend:<main-sha>
ghcr.io/<owner>/careerguid-ai-frontend:<main-sha>
ghcr.io/<owner>/careerguid-ai-service:<main-sha>
```

It also updates `latest`, but production deployment uses the immutable full SHA. Workers and scheduler reuse the backend image at the same SHA.

## 6. Deploy production

Run **Actions → Deploy Production → Run workflow** from `main` and enter the exact 40-character main SHA whose images were published.

The workflow:

1. verifies the SHA exists and is an ancestor of current `main`;
2. verifies configured production settings;
3. establishes SSH using a pinned known-host entry;
4. uploads only deployment definitions, never the production env file;
5. runs strict environment validation on the server;
6. authenticates the server to GHCR;
7. pulls the exact immutable images;
8. rolls out the Compose stack with `--remove-orphans`;
9. verifies public HTTPS health endpoints;
10. captures `docker compose ps` even when verification fails.

## 7. Required health checks

`scripts/verify-production.sh` requires all of these to succeed:

- `/health` — public edge;
- `/api/health/live` — backend liveness;
- `/api/health/db` — Supabase connectivity;
- `/api/health/redis` — Redis connectivity;
- `/api/health/ai-service` — backend-to-AI connectivity;
- `/api/health/ready` — aggregate readiness.

A production release is not complete if aggregate readiness is degraded.

## 8. Monitoring and operations

At minimum configure:

- uptime monitor for `https://<domain>/health`;
- readiness monitor for `https://<domain>/api/health/ready`;
- alerting on repeated 5xx responses;
- Docker host disk/CPU/memory alerts;
- backend/worker/Nginx log retention and shipping;
- Supabase database/Auth/storage logs;
- managed Redis metrics and connection/eviction alerts;
- provider dashboards for Resend, payment webhooks and AI usage/errors.

Sentry can be added as a hosted error-tracking provider, but no Sentry credential is committed and repository CI must not claim that an external Sentry project is already configured.

## 9. Live release smoke test

After deployment, execute the Phase 16 staging journeys against production-safe test accounts/provider modes where applicable:

1. Signup → Verify Email → Upload Resume → Auto-fill → Dashboard.
2. Profile → Skill Gap → Roadmap → Complete Tasks.
3. Pending roadmap → scheduler/worker → reminder email, then verify duplicate suppression.
4. Profile → ATS Resume → PDF/DOCX download.
5. Free limit → upgrade → signed payment success → subscription/usage entitlement.
6. Admin role/auth-state checks including stale JWT rejection after demotion.
7. One true RAG roadmap with indexed production knowledge.

Do not execute destructive payment or user-access tests against real customer records.

## 10. Rollback

Every image is tagged with its main commit SHA. To roll back, rerun `Deploy Production` with the previous known-good main SHA after confirming those images still exist in GHCR. The same strict environment and health gates apply to rollback.

Database migrations require a separate forward/rollback plan. Do not roll application images back across an incompatible irreversible schema migration without validating database compatibility first.

## Completion rule

Phase 17 is repository-complete when:

- production Compose/Nginx/env/deployment workflows are green in Product CI;
- Phase 17 is merged into `dev` and exact-head dev CI is green;
- the `dev -> main` release PR is green;
- exact main Product CI is green;
- immutable images are successfully published.

Phase 17 is **live-production complete** only when the external environment is provisioned, deployment succeeds, all health checks pass, monitoring is configured, and the production smoke-test checklist is completed. Until then, do not claim the product is deployed.
