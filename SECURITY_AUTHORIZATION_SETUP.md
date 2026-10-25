# Security authorization update

Branch base: `dev`. This patch covers billing database writes, profile security
state, current admin authorization, disabled-account API access, and npm security
updates. It does not deploy or migrate a hosted Supabase project automatically.

## Database contract

Apply all existing migrations, then
`supabase/migrations/202610240001_security_authorization.sql` using the trusted
Supabase migration role (`postgres`) on an isolated staging project first.

- Profiles, user_roles, subscriptions, payment_transactions, usage_counters and
  billing_webhook_events are server-owned for writes. The migration removes all
  write-capable RLS policies and revokes table and column privileges from PUBLIC,
  anon and authenticated. Ordinary users retain only the existing permitted reads.
- Backend profile/onboarding/admin/billing writes already use the service-role
  client, so the frontend continues using the existing authenticated API routes.
  Direct browser Supabase table writes to those tables are intentionally denied.
- `is_admin()` reads current `auth.users.raw_app_meta_data.role`, current profile
  role and `banned_until`. A stale token's admin claim is insufficient. Both stored
  roles must be admin, and the account must not be banned.
- The function is SECURITY DEFINER with an empty search_path and qualified names;
  keep it owned by the trusted migration role. This avoids recursive profile RLS
  and does not grant callers direct access to auth.users.
- Existing admin policies on job roles, knowledge, audit and Storage now reuse
  this live authorization decision. Billing RPC execution remains service-only.
- Bootstrap admins through trusted Supabase administration and a trusted profile
  role update; do not let users set their own roles. Existing admins need both
  role sources synchronized before this migration is applied.

The API additionally rejects accounts whose current Auth user has a future
`banned_until`, even if the provider still resolves an existing access token.

## Dependency compatibility

Zod is upgraded to v4, Multer to a patched v2, and vulnerable compatible lockfile
dependencies are refreshed. Frontend React Router is upgraded to v7 with a
Zod-v4-compatible React Hook Form resolver. Record schemas now specify string key
schemas explicitly. The Express 5 validation middleware safely installs parsed
query values instead of assigning to a getter, and preserves params/query for
body-only validators.

No force/legacy-peer-deps overrides or relaxed audit thresholds are used.

## Automated verification

Run in both backend and frontend:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm audit --package-lock-only --audit-level=high
npm audit --package-lock-only --omit=dev --audit-level=high
```

Backend tests include a real PostgreSQL engine (PGlite) that executes the migration
against a minimal Supabase-like fixture. The fixture installs original repository
RLS policies, proves an owner subscription write was possible, applies the patch
twice and checks denied writes, table/column grants, owner reads, trusted service
updates, forged claims, stale-token demotion, bans and direct Storage policies.
It requires no hosted credentials. Additional real HTTP tests exercise Express 5
validation and Zod record/query/parameter behavior. These tests run in Product CI.

PGlite does not emulate hosted Supabase Auth, PostgREST or Storage HTTP services.
Before production, repeat with test accounts on staging:

1. Sign up, verify, upload and save onboarding via the API; verify reads persist.
2. With an ordinary user's token, direct subscription insert, plan/expiry update,
   usage reset, payment insert, profile role/verification/onboarding flag updates
   and user_roles writes must fail. Owner history reads must still work and another
   user's records must not be returned.
3. Confirm captured sandbox payments and server-side usage accounting still work.
4. Retain an admin JWT, demote that account through the admin API, and immediately
   attempt API, database and knowledge-base Storage admin mutations with the old
   JWT. All must fail. Repeat after disabling an admin.
5. Verify both valid admins and service-role jobs retain their intended access.

Deploy the backend patch and apply the database migration as one reviewed release.
Pushing/merging this branch alone does not change live database permissions.
Do not roll back by restoring the insecure user billing write policies; roll
forward with a corrective migration if an integration incompatibility is found.
