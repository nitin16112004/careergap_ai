# RAG Roadmap Setup

## Goal

Generate a user-owned, retrieval-grounded career roadmap from the real person profile, target role, skill analysis, and trusted knowledge-base content already defined in the platform schema.

## Architecture

- Frontend calls the protected backend endpoint at `/api/v1/roadmap/generate`.
- Express verifies the Supabase bearer token using the existing auth middleware.
- The backend loads the user profile and latest skill analysis, then retrieves relevant knowledge-base documents from `knowledge_base_documents`.
- The roadmap generation uses the user's real profile and missing skills only; it never invents personal facts like education, company names, projects, or certifications.
- The backend validates the generated structure before saving to `roadmaps`, `roadmap_weeks`, and `roadmap_tasks`.
- RAG metadata is stored in `rag_queries` and remains tied to the user.

## Required data sources

The roadmap generation is allowed to use only these values:

- `profiles` for the authenticated user name, target role, career goal, and skills
- `skill_analyses` for missing skills, matched skills, and recommended skills
- `knowledge_base_documents` for relevant role and skill content
- `job_roles` for the target role name when necessary

No fake data can be introduced.

## Safety rules

1. Reject generation when the user does not have a target role or at least one missing skill.
2. Reject any generated output containing unsupported personal claims.
3. Reject invalid or empty week/task structure before saving.
4. Keep all roadmap rows owned by the authenticated user and protected by Supabase RLS.
5. Only embed retrieved document identifiers in `rag_queries` and use the actual response summary as metadata.

## Backend endpoints

Protected endpoints under `/api/v1/roadmap`:

- `POST /generate`
- `GET /`
- `GET /:roadmapId`
- `PATCH /:roadmapId`
- `DELETE /:roadmapId`

## Local validation

```powershell
cd backend
npm run test -- --run src/services/roadmap.service.test.ts
npm run typecheck
npm run build
```

This roadmap feature does not implement weekly reminder emails, payments, job marketplace, or dashboard expansion. It stays intentionally focused on the retrieval-grounded roadmap generation flow.
