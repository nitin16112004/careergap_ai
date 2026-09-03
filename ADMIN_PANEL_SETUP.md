# CareerGuid AI — Admin Panel Phase 15

This document records the implementation and live-validation boundary for the documented Phase 15 Admin Panel.

## Branch position

`feat/admin-panel` is intentionally based on `feat/billing-upgrade` and should remain a dependent review phase. Do not flatten or merge it ahead of the billing phase.

## Authorization model

All admin APIs live under `/api/v1/admin` and require both:

1. a valid Supabase JWT through `requireSupabaseSession`; and
2. `app_metadata.role = admin` through `requireAdmin`.

The frontend `ProtectedRoute` independently prevents non-admin profiles from entering `/admin*`, but backend authorization remains authoritative.

Admin access changes use the Supabase Auth Admin API. Profile `role` is synchronized with Auth `app_metadata.role` so UI state and JWT authorization do not intentionally diverge.

Self-lockout protection blocks an admin from:

- demoting their own account to `user`; or
- disabling their own account.

## Admin routes

Frontend:

- `/admin` — canonical dashboard metrics
- `/admin/users` — user search, profile/progress inspection, role and access controls
- `/admin/job-roles` — job-role, canonical-skill, required-skill and priority management
- `/admin/knowledge-base` — curated RAG knowledge management and embedding reindexing
- `/admin/reminders` — reminder delivery history
- `/admin/logs` — audit trail, failed AI jobs and failed email operations

Backend core APIs:

- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:userId`
- `GET /api/v1/admin/users/:userId/auth-state`
- `PATCH /api/v1/admin/users/:userId/role`
- `POST /api/v1/admin/users/:userId/disable`
- `POST /api/v1/admin/users/:userId/enable`
- `GET /api/v1/admin/job-roles`
- `POST /api/v1/admin/job-roles`
- `PUT /api/v1/admin/job-roles/:roleId`
- `DELETE /api/v1/admin/job-roles/:roleId`
- `GET /api/v1/admin/skills`
- `POST /api/v1/admin/skills`
- `PUT /api/v1/admin/skills/:skillId`
- `DELETE /api/v1/admin/skills/:skillId`
- `POST /api/v1/admin/job-roles/:roleId/skills`
- `DELETE /api/v1/admin/job-roles/:roleId/skills/:skillId`
- `GET /api/v1/admin/knowledge-base`
- `POST /api/v1/admin/knowledge-base`
- `PUT /api/v1/admin/knowledge-base/:documentId`
- `DELETE /api/v1/admin/knowledge-base/:documentId`
- `GET /api/v1/admin/knowledge-base/index-status`
- `POST /api/v1/admin/knowledge-base/reindex`
- `GET /api/v1/admin/reminders`
- `GET /api/v1/admin/logs`
- `GET /api/v1/admin/ops/queues`
- `GET /api/v1/admin/ops/runtime`

Existing Version 1.4 admin-only reminder scan remains under `/api/v1/reminders/check-weekly`.

## Dashboard metrics

The `/admin` dashboard follows the Web Flow contract and displays:

- Total Users
- Completed Onboarding
- Resume Uploads
- Roadmaps Generated
- Reminder Emails Sent
- Failed AI Jobs

Operational context additionally exposes active job roles and active paid subscriptions.

## Job-role deletion semantics

The canonical schema uses relational role references. A destructive hard delete can damage historical analysis/roadmap referential meaning. Therefore the admin UI's documented Delete/Disable action is implemented as `is_active = false` for job roles.

This means:

- the role stops being available for normal new selections;
- historical analyses and roadmaps remain interpretable; and
- the admin action remains auditable.

## User access controls

### Change role

Role changes update:

- Supabase Auth `app_metadata.role`; and
- `public.profiles.role`.

The change applies to authorization once the user receives a JWT/session reflecting the new app metadata.

### Disable / enable

Disabling uses Supabase Auth admin ban state rather than a cosmetic profile flag. Enabling removes that ban. This must be validated against the configured Supabase project before production use.

## Knowledge-base integrity

Admins can:

- add manual curated content;
- import text-based files in the browser (`.txt`, `.md`, `.markdown`, `.csv`, `.json`, up to 1 MB);
- edit title/category/source/content;
- delete documents; and
- run the existing protected embedding reindex flow.

PDF/DOCX knowledge documents are **not** silently treated as parsed text by the browser. They require a real extraction/upload pipeline before they should be advertised as supported.

If an existing knowledge document's content changes, its stored `embedding` is cleared. Reindexing is therefore required before the changed document is vector-retrievable, preventing stale vectors from representing new text.

## Auditability

Admin mutations write to `audit_logs`, including:

- job-role create/update/disable;
- skill create/update/delete;
- required-skill mapping changes;
- knowledge document create/update/delete;
- user role changes; and
- user disable/enable actions.

The admin logs UI also surfaces recent failed AI jobs and failed emails.

## UI / accessibility contract

The admin console follows the canonical UI/UX brief:

- dark authenticated sidebar;
- emerald primary actions (`#10B981`, deep state `#047857`);
- off-white application background and white cards;
- labelled form fields;
- keyboard-visible focus states;
- icon-only controls with accessible labels;
- confirmation before destructive/high-impact actions; and
- responsive layout for tablet/mobile widths.

## Repository validation

Product CI must continue to run the existing gates without weakening earlier phases:

- backend high-severity dependency audit, typecheck, tests and production build;
- frontend high-severity dependency audit, typecheck, tests and production build;
- AI dependency consistency, compile and pytest;
- Compose model validation;
- backend/frontend/AI Docker image builds; and
- edge Nginx syntax validation.

Admin regression tests include self-lockout protection.

## Live validation boundary

A green repository CI run does **not** prove a live admin environment. Before release, validate with a real configured Supabase project:

1. Create a test account whose Auth `app_metadata.role` is `admin`.
2. Confirm a normal user receives `403` from every `/api/v1/admin/*` endpoint.
3. Confirm an admin can load dashboard analytics and user details.
4. Promote a disposable test user to admin and verify a refreshed JWT grants admin APIs.
5. Demote that disposable user and verify refreshed JWT access is removed.
6. Disable and re-enable a disposable test user and verify Supabase Auth login/session behavior.
7. Confirm self-demotion and self-disable requests are rejected.
8. Create/edit/disable a job role and verify historical analyses remain intact.
9. Create skills and required-skill mappings and verify normal job-role APIs return the intended active configuration.
10. Create/edit/delete a knowledge document; verify content edits clear the embedding and reindex restores vector availability.
11. Verify reminder history, failed jobs and audit log visibility.
12. Verify admin mutations create appropriate `audit_logs` records.
13. Verify no service-role key or admin provider capability is exposed to the frontend bundle.

Do not mark Phase 15 as live-validated until these checks are performed against the deployed environment.
