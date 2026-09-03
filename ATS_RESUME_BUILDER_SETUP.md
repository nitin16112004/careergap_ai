# ATS Resume Builder Setup

## Overview

The ATS Resume Builder lets an authenticated user:

- pick a target role and optional job description,
- analyze their uploaded resume against ATS keyword alignment,
- generate a role-aware resume version grounded in their existing profile,
- store the generated draft in `generated_resumes`,
- preview the generated content in the frontend before export.

This feature reuses the existing `resumes` and `generated_resumes` tables and keeps all generation logic tied to the user’s actual extracted profile data.

## Backend API

The versioned API lives under `/api/v1/resume-builder`.

Available routes:

- `POST /api/v1/resume-builder/analyze`
- `POST /api/v1/resume-builder/generate`
- `GET /api/v1/resume-builder/generated`
- `GET /api/v1/resume-builder/generated/:generatedResumeId`
- `PATCH /api/v1/resume-builder/generated/:generatedResumeId`
- `DELETE /api/v1/resume-builder/generated/:generatedResumeId`

All routes require an authenticated Supabase session through the project’s existing auth middleware.

## Frontend flow

Routes:

- `/resume-builder`
- `/resume-builder/:id`
- `/resume-builder/:id/preview`

The builder uses the last uploaded resume stored in `sessionStorage` and calls the resume service to analyze and generate a role-adjusted version.

## Safety and factuality guardrails

- The AI summary is generated from the user’s extracted resume data only.
- No fabricated employer names or credentials are inserted.
- The service sanitizes input job descriptions and limits the allowed size to prevent malformed prompts.
- Generated content is owner-checked before read/update/delete operations.

## Local validation

From the repo root:

```powershell
cd backend
npm test -- src/services/ats-resume.service.test.ts
npm run typecheck

cd ../frontend
npm run typecheck
npm run build
```

## Notes

The feature is designed to extend the existing resume parser and onboarding flow without replacing the auth or resume-analysis architecture.
