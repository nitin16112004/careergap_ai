# CareerGuid AI Frontend

React, TypeScript, and Vite authentication experience for CareerGuid AI.

## Run Locally

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in
`.env.local`. Only the public Supabase URL and anon key belong in this file;
never add `SUPABASE_SERVICE_ROLE_KEY` to frontend environment variables.

## Authentication Routes

- `/login`
- `/signup`
- `/verify-email`
- `/forgot-password`
- `/reset-password`

The frontend uses Supabase Auth for persistent browser sessions and the backend
auth API for server-side validation, profile lookup, rate limits, and protected
operations. Resume onboarding, dashboard, AI, roadmap, payments, and other
product features remain intentionally out of scope for this phase.

## Checks

```powershell
npm run typecheck
npm run build
```
