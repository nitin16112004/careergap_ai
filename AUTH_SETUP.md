# Authentication Setup

CareerGuid AI authentication uses Supabase Auth as the identity and session
provider. The React client persists the public Supabase session, while the
Express backend verifies the access token and owns protected server behavior.
The Supabase service-role key is backend-only and is never bundled into the
frontend.

## Architecture

```text
React + Supabase Auth client
        |
        | access token (Authorization: Bearer ...)
        v
Express /api/v1/auth/*
        |
        +--> Supabase Auth (sign up, login, verify, reset, refresh)
        +--> Supabase PostgreSQL (profiles, ownership metadata)
        +--> Redis (failed-login and email-request windows)
```

The existing database trigger creates a `profiles` row after `auth.users`
signup. The backend also performs an idempotent profile upsert with
`onboarding_completed = false` so signup remains resilient if a trigger is
delayed. The schema's profile identity column is the same UUID as the Auth
user id.

## Authentication Flows

### Signup and verification

```text
Signup form
  -> POST /api/v1/auth/signup
  -> Supabase Auth creates auth.users row
  -> verification email is delegated to Supabase Auth
  -> profiles row is initialized with onboarding_completed=false
  -> frontend stores the email and shows /verify-email
  -> POST /api/v1/auth/verify-email with a 6-digit OTP
  -> profile.email_verified=true and a session is persisted
```

The verification screen supports a 60-second resend cooldown. Redis also
limits verification requests to three per ten minutes per email and IP.

### Login and protected access

```text
Login form
  -> POST /api/v1/auth/login
  -> Redis checks failed-login counters
  -> Supabase Auth returns access + refresh tokens
  -> frontend calls supabase.auth.setSession(...)
  -> Supabase client persists and refreshes the browser session
  -> protected routes send the access token to Express
  -> requireSupabaseSession verifies the token with Supabase Auth
```

Five failed attempts per minute are limited per IP and per email/IP identity.
Successful attempts clear those counters, and no low global login cap is
applied; the API supports the documented minimum of 100 successful logins per
minute.

### Password recovery

```text
POST /api/v1/auth/forgot-password
  -> Supabase sends a reset link to /reset-password
  -> Supabase client detects the recovery session in the URL
  -> POST /api/v1/auth/reset-password with the bearer session
  -> backend updates the password through Supabase Admin API
  -> frontend clears the session and returns to /login
```

Forgot-password requests are rate limited to three per fifteen minutes per
email and IP. Responses do not reveal whether an email exists.

## API Reference

All routes are under `/api/v1/auth` and return `{ success, data, message }` on
success or the backend's safe `{ success: false, message, errorCode }` shape
on failure.

| Method and route | Auth | Purpose |
| --- | --- | --- |
| `POST /signup` | Public | Create Auth user, trigger verification, initialize profile |
| `POST /login` | Public | Email/password login and session payload |
| `POST /verify-email` | Public | Verify a Supabase signup OTP |
| `POST /resend-verification` | Public | Resend verification email with Redis protection |
| `POST /forgot-password` | Public | Send a generic password-reset response |
| `POST /reset-password` | Bearer session | Update password through Supabase Admin API |
| `POST /refresh` | Public | Exchange a refresh token for a new session |
| `POST /logout` | Bearer session | Revoke the current Supabase session |
| `GET /me` | Bearer session | Return verified user and profile metadata |

Representative request bodies:

```json
{ "fullName": "Ada Lovelace", "email": "ada@example.com", "password": "...", "confirmPassword": "..." }
```

```json
{ "email": "ada@example.com", "password": "..." }
```

```json
{ "email": "ada@example.com", "token": "123456" }
```

## Session Management

- The browser uses `persistSession`, `autoRefreshToken`, and
  `detectSessionInUrl` in the public Supabase client.
- The backend never trusts a frontend user id. `requireSupabaseSession` calls
  Supabase `auth.getUser(accessToken)` and attaches `req.user`/`req.auth`.
- The frontend `AuthProvider` listens for Supabase auth events, loads `/me`,
  and clears local state on logout or an expired session.
- `ProtectedRoute` redirects unauthenticated users to `/login` and preserves
  the requested path in a query parameter.
- Verified users are routed to the documented resume-first onboarding path;
  this release shows a protected next-step placeholder because onboarding is
  intentionally not implemented yet.

## Security Decisions

- Supabase Auth handles password hashing, JWT issuance, email verification,
  and recovery links; no custom JWT or password storage exists.
- Zod validates every auth request body on the backend and every form on the
  frontend.
- Helmet, allowlisted CORS, redacted request logging, secure error responses,
  and Redis-backed abuse windows are enabled by the backend foundation.
- Service-role operations are limited to profile initialization, password
  update, and session revocation on the trusted backend.
- Passwords and full tokens are never logged or returned in error messages.

## Environment And Run Commands

Frontend (`frontend/.env.local`):

```text
VITE_API_URL=http://localhost:5000/api/v1
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
```

Backend (`backend/.env`): use `backend/.env.example` for
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`FRONTEND_URL`, and `REDIS_URL`. The service-role key must remain server-only.

```powershell
cd backend; npm install; npm run dev
cd ..\frontend; npm install; npm run dev
```

## Testing

```powershell
cd backend
npm run check
npm run build

cd ..\frontend
npm run typecheck
npm run build
```

Live Supabase signup/login tests require a configured Supabase project and
Redis instance. The auth implementation intentionally does not include resume
upload, parsing, onboarding forms, dashboard APIs, AI/RAG, roadmaps,
reminders, payments, or admin business workflows.
