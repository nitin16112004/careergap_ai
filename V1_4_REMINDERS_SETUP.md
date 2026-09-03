# CareerGuid AI — Version 1.4 Progress & Reminder Automation

Version 1.4 adds durable roadmap progress status, weekly reminder scheduling, transactional reminder email delivery, in-app notifications, reminder preferences, and reminder history.

This phase is intentionally built on the Version 1.3 production-hardening branch. It does not add billing/payment enforcement or a full admin UI.

## Architecture

The reminder flow is asynchronous:

```text
Authenticated activity
  -> throttled profiles.last_activity_at update

BullMQ weeklyReminderQueue Job Scheduler
  -> weekly reminder scan
  -> active roadmap + current progress + reminder preferences
  -> deterministic reminder selection and dedupe
  -> reminder_logs + notifications + email_logs
  -> emailQueue
  -> email worker
  -> transactional email provider
  -> reminder/email delivery state
```

The weekly scanner never sends an email directly. Email delivery is handled by a dedicated BullMQ worker so provider latency, retries, and final failures do not block the scheduler.

## Reminder Rules

The scheduler evaluates each eligible user once per scan and selects at most one reminder using this priority:

1. **Inactive user** — no recorded authenticated activity for at least `REMINDER_INACTIVE_DAYS`.
2. **Weekly pending task** — the active roadmap's current week has unfinished tasks.
3. **Motivational** — actual roadmap progress is behind the calculated checkpoint or overdue work exists.

The master email preference must be enabled, and each reminder category also has its own preference toggle.

### Duplicate prevention

Reminder logs use deterministic `dedupe_key` values plus a PostgreSQL unique index. This protects against duplicate scheduler execution, worker retries, and concurrent scans.

Typical keys:

```text
inactive:<user-id>:<iso-week>
weekly:<roadmap-id>:<week-id>
motivational:<roadmap-id>:<week-id>
```

The existing schema-level weekly reminder uniqueness remains in place as an additional guard.

## Progress Contract

`GET /api/v1/roadmap/:roadmapId/progress` returns the canonical progress summary used by the dashboard, roadmap UI, and reminder logic:

- total tasks
- completed tasks
- pending tasks
- skipped tasks
- overdue tasks
- current roadmap week
- current-week pending and overdue counts
- actual progress percentage
- expected checkpoint percentage
- `behindSchedule`

Overdue state is calculated from due dates without requiring a background mutation of task rows.

## Migration

Apply:

```text
supabase/migrations/202609040003_reminder_automation.sql
```

It adds:

- `profiles.last_activity_at`
- `reminder_preferences`
- durable reminder dedupe/reason/metadata fields
- reminder linkage on notifications and email logs
- reminder preference RLS
- scheduler-only reminder log creation policy

Normal authenticated users can read their own reminder history and manage their own preferences, but they cannot forge scheduler reminder logs through direct RLS access.

## Runtime Services

The root Compose stack now includes:

- `email-worker`
- `reminder-scheduler`

Run directly from `backend/` when needed:

```bash
npm run email-worker
npm run reminder-scheduler
```

Production compiled commands:

```bash
npm run email-worker:start
npm run reminder-scheduler:start
```

The scheduler uses BullMQ Job Scheduler state stored in Redis. Do not run an external cron that also invokes the same reminder scan unless it is deliberately coordinated; PostgreSQL dedupe prevents duplicate reminders, but redundant scheduling adds needless load.

## Environment

Required reminder variables are documented in `.env.example`.

### Email provider

```text
EMAIL_PROVIDER=resend
EMAIL_PROVIDER_BASE_URL=https://api.resend.com
EMAIL_PROVIDER_API_KEY=<secret>
EMAIL_FROM=CareerGuid AI <verified-sender@example.com>
```

`EMAIL_PROVIDER=console` exists only for local development. Production fails closed when the console provider is selected.

### Scheduler

```text
REMINDER_CRON_PATTERN=0 0 9 * * 1
REMINDER_CRON_TIMEZONE=UTC
REMINDER_INACTIVE_DAYS=7
REMINDER_SCAN_BATCH_SIZE=500
REMINDER_EMAIL_JOB_ATTEMPTS=3
ACTIVITY_TOUCH_INTERVAL_SECONDS=300
```

The default cron expression means Monday at 09:00 in the configured scheduler timezone.

## Delivery Reliability

The email worker uses BullMQ retries with exponential backoff.

After the provider accepts a message, the worker stores a short-lived Redis delivery receipt before updating PostgreSQL. If PostgreSQL synchronization fails after the provider succeeded, a retry can repair `email_logs` and `reminder_logs` without sending the same email again.

Exhausted delivery failures are written to the Version 1.3 `deadLetterQueue` with reminder/email identifiers for operational investigation.

## APIs

### User

```text
GET /api/v1/reminders/status
GET /api/v1/reminders/preferences
PUT /api/v1/reminders/preferences
GET /api/v1/reminders/logs

GET /api/v1/notifications
PATCH /api/v1/notifications/read-all
PATCH /api/v1/notifications/:notificationId/read

GET /api/v1/roadmap/:roadmapId/progress
```

### Admin / scheduler operations

```text
POST /api/v1/reminders/check-weekly
GET /api/v1/reminders/logs/:userId
```

These routes require an authenticated admin. Normal users cannot manually trigger reminder scans.

## Frontend

Version 1.4 adds:

- `/settings` reminder preferences
- reminder delivery history
- in-app notification history
- exact `/roadmap/:roadmapId` routing
- dashboard overdue/reminder/unread status
- behind-schedule roadmap banner
- current-week pending/overdue checkpoint data
- last reminder date and reason

The normal user does not need to press a "send reminder" button. Automation remains scheduler-driven.

## Local Validation

Repository CI validates TypeScript, tests, production builds, Docker images, Compose configuration, and edge Nginx syntax. That does not prove real transactional delivery.

A live Version 1.4 validation requires:

1. Apply the v1.4 Supabase migration.
2. Configure a real Redis instance used by backend, scheduler, and email worker.
3. Configure a verified Resend sender and API key.
4. Start the backend, scheduler, and email worker.
5. Use an account with an active roadmap and pending work.
6. Trigger the admin weekly check or wait for the configured scheduler time.
7. Verify one reminder log, one notification, one email log, and one provider delivery.
8. Trigger the same scan again and verify no duplicate reminder/email is created.
9. Verify failed provider delivery retries and then appears in dead-letter monitoring after exhaustion.
10. Verify disabling email reminders prevents new delivery jobs.

No provider credentials, production email domains, or secrets should be committed to this repository.
