-- RAG v1.2 vector retrieval contract.
-- Keeps knowledge-base reads behind a service-role-only RPC and records
-- query embeddings for observability/reproducibility.

alter table public.rag_queries
  add column if not exists query_embedding vector(1536),
  add column if not exists retrieved_document_scores jsonb not null default '[]'::jsonb,
  add column if not exists latency_ms integer,
  add column if not exists error_code text;

create or replace function public.match_knowledge_base_documents(
  query_embedding vector(1536),
  match_count integer default 8,
  match_threshold double precision default 0.15
)
returns table (
  id uuid,
  title text,
  category text,
  source_url text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    document.id,
    document.title,
    document.category,
    document.source_url,
    document.content,
    document.metadata,
    (1 - (document.embedding <=> query_embedding))::double precision as similarity
  from public.knowledge_base_documents as document
  where document.is_active = true
    and document.embedding is not null
    and (1 - (document.embedding <=> query_embedding)) >= greatest(0, least(match_threshold, 1))
  order by document.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_knowledge_base_documents(vector, integer, double precision) from public;
revoke all on function public.match_knowledge_base_documents(vector, integer, double precision) from anon;
revoke all on function public.match_knowledge_base_documents(vector, integer, double precision) from authenticated;
grant execute on function public.match_knowledge_base_documents(vector, integer, double precision) to service_role;
