# ATS Resume Builder v1.1 — Implementation Contract

This branch follows the documented Version 1.1 ATS phase after the MVP backbone.

## Non-negotiable factual-safety rule

The builder may reorder, shorten, format, and highlight facts that already exist in the user's reviewed profile/resume. It must not invent employers, titles, dates, education, projects, certifications, metrics, responsibilities, or experience claims.

If source data is missing, the generated resume should omit that section or expose an explicit editor placeholder outside the persisted factual resume content. It must never persist a fabricated statement as if it came from the user.

## Required v1.1 scope

- ATS analysis against a target role and optional job description.
- Role keyword suggestions separated from facts already present in the resume.
- Factual resume generation from source data only.
- Editable generated resume versions.
- Preview data endpoint/UI.
- Server-side PDF generation and private Supabase Storage upload.
- Server-side DOCX generation and private Supabase Storage upload.
- Signed private download URLs.
- Ownership checks for every generated resume and file operation.
- Tests for factual grounding and export generation.

## Deferred

LLM rewriting/generation remains behind a future AI-service abstraction. When added, structured validation must reject unsupported claims before persistence.
