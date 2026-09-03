# Supabase Database Foundation

Supabase PostgreSQL is the authoritative relational database, Supabase Auth is
the identity source, Supabase Storage holds files, and pgvector prepares the
future RAG search layer. MongoDB is not used.

## Structure

```text
supabase/
├── migrations/
├── seed/
├── functions/
├── seed.sql
└── README.md
```

`seed.sql` remains at the Supabase CLI standard location. The `seed/` and
`functions/` directories are reserved for future seed modules and Edge
Functions; no business function is implemented in this phase.

## Migrations

- `migrations/202606290001_foundation_schema.sql` creates extensions, enums,
  domain tables, indexes, and the Auth profile trigger.
- `migrations/202606290002_rls_storage_policies.sql` enables RLS and creates
  user, admin, and Storage ownership policies.
- `migrations/202608080001_schema_hardening.sql` adds the explicit
  `user_roles` mapping, timestamp coverage, parent-child roadmap constraint,
  lifecycle indexes, and role RLS policies.

The migrations create the schema only. Resume uploads, AI parsing, RAG
generation, reminders, and payments remain future application features.

## Apply With Supabase CLI

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

For a local Supabase instance:

```powershell
supabase start
supabase db reset
```

`supabase db reset` applies migrations in timestamp order and then runs the
root `seed.sql` file.

## Storage Buckets

The Storage migration prepares these buckets without uploading files:

- `resumes` (private, PDF/DOCX, 5 MB limit)
- `generated-resumes` (private, PDF/DOCX)
- `knowledge-base-files` (private, admin-managed)
- `template-previews` (public previews, admin-managed)

User-owned object paths start with the auth user id inside the bucket, for
example `{user_id}/{resume_id}.pdf` in `resumes`.

## Security Boundary

RLS derives ownership from `auth.uid()` and nested roadmap relationships.
Admin policies use the Supabase Auth `app_metadata.role` claim through the
`public.is_admin()` helper. The service role is intended only for trusted
backend or worker processes and must never be exposed to clients.
