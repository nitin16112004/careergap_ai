# RAG Roadmap Setup

## Goal

Generate a user-owned, retrieval-grounded career roadmap from the real person profile, target role, skill analysis, and trusted knowledge-base content already defined in the platform schema.

## Architecture

- Frontend uses the authenticated React + TypeScript app to render the protected roadmap experience from `/roadmap` and `/roadmap/:roadmapId`.
- Frontend calls the protected backend endpoint at `/api/v1/roadmap/generate` and the task update routes at `/api/v1/roadmap/:roadmapId/tasks/:taskId` and `/api/v1/roadmap/:roadmapId/tasks/:taskId/complete`.
- Express verifies the Supabase bearer token using the existing auth middleware.
- The backend loads the user profile and latest skill analysis, then retrieves relevant knowledge-base documents from `knowledge_base_documents`.
- The roadmap generation uses the user's real profile and missing skills only; it never invents personal facts like education, company names, projects, or certifications.
- The backend validates the generated structure before saving to `roadmaps`, `roadmap_weeks`, and `roadmap_tasks`.
- RAG metadata is stored in `rag_queries` and remains tied to the user.
- Task completion persists status changes and recalculates `roadmaps.progress_percentage` from the uploaded task set before returning the refreshed roadmap payload.

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
- `PATCH /:roadmapId/tasks/:taskId` for status updates (`pending`, `completed`, `skipped`, `overdue`)
- `PATCH /:roadmapId/tasks/:taskId/complete` for the simpler completion shortcut
- `DELETE /:roadmapId`

## Frontend roadmap experience

- Authenticated users can open the roadmap page at `/roadmap`.
- The page loads the user's latest roadmap and renders the week/task breakdown.
- Each task supports a completion action that sends the authenticated task-status update to the backend.
- Progress recalculation is driven by the total completed tasks and updates the roadmap summary without a page reload.
- The page includes empty, loading, and failure states matching the documented user guidance.

## Progress calculation and ownership

- `roadmaps.progress_percentage` is recalculated as `completed_tasks / total_tasks * 100` at the roadmap level.
- The backend enforces ownership by confirming both the roadmap and the task belong to the authenticated user before updating either record.
- The same rule is enforced through Supabase RLS policies and server-side route validation.
- The response includes the refreshed roadmap payload so the frontend can update the UI immediately after a task status change.

## Local validation

```powershell
cd backend
npx vitest run src/services/roadmap.service.test.ts
npm run typecheck
npm run build

cd ../frontend
npm run typecheck
npm run build
```

This roadmap feature does not implement weekly reminder emails, payments, job marketplace, or dashboard expansion. It stays intentionally focused on the retrieval-grounded roadmap generation flow and the user-owned task progress experience.
