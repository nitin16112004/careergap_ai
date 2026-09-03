-- Curated first-party seed content for the RAG v1.2 roadmap pipeline.
-- Embeddings remain null here and are generated with the configured provider
-- through POST /api/v1/admin/knowledge-base/reindex.

insert into public.knowledge_base_documents (title, category, source_url, content, metadata)
select seed.title, seed.category, seed.source_url, seed.content, jsonb_build_object('seed_key', seed.seed_key, 'audience', 'career-roadmap')
from (values
  (
    'JavaScript and TypeScript practice path',
    'frontend',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'Build confidence with variables, functions, arrays, objects, asynchronous code, modules, error handling, and browser APIs. For TypeScript, practice explicit domain types, unions, generics, narrowing, and typed API boundaries. Demonstrate progress through small features rather than passive reading: fetch data, transform it, handle loading and failure states, and write tests for edge cases. A job-ready portfolio should show readable code, reusable modules, and clear reasoning about trade-offs.',
    'javascript-typescript'
  ),
  (
    'React frontend engineering practice',
    'frontend',
    'https://react.dev/learn',
    'Practice component composition, state ownership, forms, routing, server communication, accessibility, and testing. Start with a small interface, split it into reusable components, then add loading, empty, success, and error states. Use TypeScript for props and API data. Measure progress by shipping a complete feature with keyboard-accessible controls, semantic HTML, and tests for user-visible behaviour.',
    'react-frontend'
  ),
  (
    'Node.js, Express, and REST API fundamentals',
    'backend',
    'https://nodejs.org/en/learn',
    'A backend roadmap should cover HTTP fundamentals, Express routing, validation, authentication middleware, service boundaries, database access, error handling, logging, and tests. Build APIs around a small domain, validate every external input, keep authorization checks close to data access, and return consistent error contracts. Add integration tests for successful requests, invalid input, unauthenticated access, and ownership violations.',
    'node-express-api'
  ),
  (
    'PostgreSQL data modelling and SQL practice',
    'database',
    'https://www.postgresql.org/docs/',
    'Practice relational modelling before advanced optimization. Define primary keys, foreign keys, nullability, uniqueness, and deletion behaviour deliberately. Write joins, aggregations, transactions, and indexes for realistic queries. Review query plans only after correctness. For Supabase projects, understand how PostgreSQL schema design, Row Level Security, and service-role access interact so user-owned data cannot leak across accounts.',
    'postgresql-data-modelling'
  ),
  (
    'Authentication, JWT, and authorization fundamentals',
    'security',
    'https://supabase.com/docs/guides/auth',
    'Treat authentication and authorization as separate concerns. Authentication establishes who the user is; authorization decides which resources the user may access. Practice verified sessions, expired-token handling, role checks, ownership filters, least-privilege service access, and Row Level Security. Test guest access, normal-user access, cross-user access attempts, and admin-only operations.',
    'auth-authorization'
  ),
  (
    'Redis, caching, queues, and rate limiting',
    'backend',
    'https://redis.io/docs/latest/',
    'Use Redis for short-lived state where appropriate: rate-limit counters, cache entries, and BullMQ queue storage. Learn expiration, cache invalidation, retry behaviour, idempotency, and what happens when Redis is unavailable. For background work, design jobs with explicit payloads, retry limits, observable status, and final failure handling rather than hiding slow work inside synchronous HTTP requests.',
    'redis-queues'
  ),
  (
    'Docker and deployment practice',
    'devops',
    'https://docs.docker.com/get-started/',
    'Containerize each runtime with a small reproducible image, explicit environment variables, health checks, and no committed secrets. Use Docker Compose locally to connect application, worker, AI service, and Redis. Practice reading container logs, testing health endpoints, rebuilding after dependency changes, and verifying that background workers actually consume their queues.',
    'docker-deployment'
  ),
  (
    'System design foundations for early-career engineers',
    'architecture',
    null,
    'Start system design from requirements, data ownership, APIs, and failure modes rather than memorized diagrams. For each design, state traffic assumptions, critical entities, read/write paths, consistency needs, caching opportunities, background jobs, observability, and security boundaries. Practice explaining why a modular monolith may be preferable before splitting into services, and identify measurable signals that would justify later decomposition.',
    'system-design-foundations'
  ),
  (
    'Python and FastAPI service development',
    'ai',
    'https://fastapi.tiangolo.com/',
    'Practice typed request and response models, validation, dependency boundaries, HTTP error handling, and tests. For AI-facing services, validate model output as untrusted external data, enforce timeouts, avoid logging secrets, and fail clearly when providers are unavailable. Keep deterministic parsing separate from model-backed generation so product behaviour remains understandable and testable.',
    'python-fastapi'
  ),
  (
    'Retrieval augmented generation engineering',
    'ai',
    null,
    'A real RAG pipeline has distinct stages: create an embedding for the user query, retrieve semantically similar documents from a vector index, pass only retrieved context to the language model, validate structured output, and store retrieval metadata for observability. Do not label keyword matching or templates as RAG. Handle empty retrieval explicitly, constrain model references to retrieved documents, and record model names, similarity scores, latency, and failures.',
    'rag-engineering'
  ),
  (
    'Data analysis and machine learning foundations',
    'data',
    null,
    'For data analysis, practice SQL, Python data manipulation, exploratory analysis, clear visual communication, and explaining assumptions. For machine learning, add statistics, evaluation metrics, train-validation separation, feature reasoning, and error analysis before complex models. Portfolio work should make the question, data cleaning, method, evaluation, limitations, and final recommendation easy to inspect.',
    'data-ml-foundations'
  ),
  (
    'Cloud and DevOps operating fundamentals',
    'cloud',
    null,
    'Build operational depth through repeatable deployments, environment separation, CI checks, health probes, logs, metrics, rollback thinking, and least-privilege credentials. Learn how application containers, databases, caches, queues, and external providers fail independently. A useful practice project should include a deployment checklist and at least one tested failure scenario rather than only a successful happy-path deployment.',
    'cloud-devops'
  )
) as seed(title, category, source_url, content, seed_key)
where not exists (
  select 1
  from public.knowledge_base_documents existing
  where existing.metadata ->> 'seed_key' = seed.seed_key
);
