# Resume Upload And Parser Setup

## Scope

This feature implements the resume-first onboarding foundation only. It uploads
a user-owned PDF or DOCX, saves metadata, queues parsing, extracts an editable
profile draft, and renders the review screen. It does not save the final
onboarding profile, build an ATS resume, generate a roadmap, run RAG, or add
dashboard, payment, or reminder features.

## Architecture

- `frontend/` contains the protected upload and review routes.
- `backend/` owns authentication, file validation, signed URLs, resume
  metadata, rate limiting, and BullMQ job creation.
- `ai-service/` is a FastAPI boundary for deterministic text extraction and
  structured parsing. Future LLM and RAG adapters can sit behind `app.parser`.
- Supabase Storage keeps private files in the `resumes` bucket under
  `{user_id}/{resume_id}.{pdf|docx}`. Existing Storage RLS policies enforce the
  user-id path prefix.
- Supabase PostgreSQL stores the existing `resumes` metadata and parsed JSON.
- Redis and BullMQ run the asynchronous `resumeParsingQueue` worker.

## Upload And Queue Flow

1. The protected `/onboarding/upload-resume` page accepts a PDF or DOCX up to
   5 MB and reports client-side validation errors before sending it.
2. `POST /api/v1/resumes/upload` repeats file extension, MIME type, file size,
   and binary-signature validation. It checks the authenticated user against a
   Redis limit of 10 uploads per hour.
3. The backend writes the private object, saves `resumes` metadata, and marks
   it as the active resume only after metadata is durable.
4. `POST /api/v1/resumes/process/:resumeId` verifies ownership, changes the
   record to `processing`, and adds a job to `resumeParsingQueue`.
5. `npm run worker` downloads the private object using server credentials and
   sends the file to the FastAPI service. The worker saves parsed JSON and
   extracted skills on success. BullMQ retries failures three times before the
   resume record becomes `failed`.
6. The frontend polls the owned record, then navigates to
   `/onboarding/review-profile` when parsing completes.

The pre-existing schema calls the initial persisted state `pending`; it is the
equivalent of the requested uploaded and awaiting-processing state. The full
state machine is `pending`, `processing`, `completed`, and `failed`.

## APIs

All API endpoints require a valid Supabase bearer token and operate only on the
authenticated user's records.

### `POST /api/v1/resumes/upload`

Accepts multipart form data with one `file` field. The file must be a PDF or
DOCX no larger than 5 MB. Returns `201` with the stored resume metadata and a
15-minute signed URL. A new upload does not queue parsing on its own so an
existing stored file can be retried through the explicit process endpoint.

### `POST /api/v1/resumes/process/:resumeId`

Creates an asynchronous parsing job for an owned, non-completed resume. Returns
`202` with its processing status.

### `GET /api/v1/resumes/:resumeId`

Returns owned resume metadata, parsing status, extracted data, and a fresh
short-lived signed URL.

### `PATCH /api/v1/resumes/:resumeId`

Saves the editable review draft with `extractedData`, optional `extractedText`,
and optional `extractedSkills`. This endpoint does not complete onboarding or
write profile fields.

## AI Service

`POST /parse-resume` accepts a multipart `file`, or a `text` form field for
local parser checks. The service repeats PDF/DOCX, 5 MB, and binary-signature
validation for file input. It extracts PDF or DOCX text and returns JSON with:

```json
{
  "name": "",
  "email": "",
  "phone": "",
  "city": "",
  "skills": [],
  "education": [],
  "experience": [],
  "projects": [],
  "linkedin": "",
  "github": "",
  "portfolio": ""
}
```

## Local Development And Checks

1. Configure the existing backend and frontend `.env` files with Supabase,
   Redis, AI service URL, and frontend URL values. Never expose the Supabase
   service role key in frontend configuration.
2. Start Redis, then run `npm run dev` in `backend/` and `npm run worker` in a
   second backend terminal.
3. Run the FastAPI service with `uvicorn app.main:app --reload --port 8000`
   from `ai-service/` after installing `requirements.txt`.
4. Run `npm run dev` in `frontend/` and open the protected onboarding route.

Local automated checks:

```powershell
cd backend; npm test; npm run check
cd ..\frontend; npm test; npm run check; npm run build
cd ..\ai-service; python -m unittest discover -s tests
```

The backend service tests mock Supabase Storage and BullMQ. Live Storage,
Redis, queue-worker, and authentication integration still require configured
Supabase and Redis environments.
