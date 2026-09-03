# Assumptions

1. The active project root is `careergap_ai/` inside the provided workspace path.
2. The source PDFs were originally found in `document/`, not `documentation/`. I mirrored them into `documentation/` to match the requested structure and left the originals untouched.
3. Generated markdown extraction files are safe to regenerate.
4. Supabase is authoritative for database, auth, storage, and vector search. Any MongoDB references inside examples are treated as legacy/example wording, not implementation direction.
5. Phase 0 is limited to documentation understanding, context files, assumptions, build logging, extraction tooling, initial Docker Compose infrastructure, and folder structure. Runnable React, Express, FastAPI, and BullMQ implementations are intentionally deferred.
6. Supabase project URL, keys, Redis URL, email provider, LLM provider, embedding provider, and payment provider are not available yet, so `.env.example` contains placeholders only.
7. Email, LLM, embedding, and payment integrations should stay provider-abstracted until the relevant phase selects concrete providers.
8. No live Supabase project is linked from this environment, and the Supabase CLI is not installed. Phase 1 is implemented as migration and seed files ready to apply once project credentials/tooling are available.
