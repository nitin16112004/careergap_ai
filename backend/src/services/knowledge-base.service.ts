import { getEnv } from "../config/env";
import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

type EmbeddingResponse = { embedding: number[]; model: string };
type KnowledgeDocument = { id: string; title: string; category: string; content: string };

const embed = async (input: string): Promise<EmbeddingResponse> => {
  let response: Response;
  try {
    response = await fetch(`${getEnv().AI_SERVICE_URL.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new HttpError(502, "AI service is unavailable while indexing the knowledge base.", "KB_AI_SERVICE_UNAVAILABLE", false);
  }

  const body = await response.json().catch(() => ({})) as { detail?: unknown; embedding?: unknown; model?: unknown };
  if (!response.ok) {
    const detail = typeof body.detail === "string" ? body.detail : `AI service returned HTTP ${response.status}`;
    throw new HttpError(response.status === 503 ? 503 : 502, detail, response.status === 503 ? "KB_PROVIDER_NOT_CONFIGURED" : "KB_EMBEDDING_FAILED", false);
  }
  if (!Array.isArray(body.embedding) || body.embedding.length !== 1536 || !body.embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new HttpError(502, "Embedding provider returned an invalid 1536-dimensional vector.", "KB_EMBEDDING_INVALID", false);
  }
  return { embedding: body.embedding as number[], model: typeof body.model === "string" ? body.model : "unknown" };
};

const documentInput = (document: KnowledgeDocument): string => [
  `Title: ${document.title}`,
  `Category: ${document.category}`,
  document.content.slice(0, 10_000),
].join("\n");

export const knowledgeBaseService = {
  async status(): Promise<{ active: number; indexed: number; pending: number }> {
    const client = getSupabaseStorageClient();
    const [{ count: active, error: activeError }, { count: indexed, error: indexedError }] = await Promise.all([
      client.from("knowledge_base_documents").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("knowledge_base_documents").select("id", { count: "exact", head: true }).eq("is_active", true).not("embedding", "is", null),
    ]);
    if (activeError || indexedError) throw new HttpError(500, "Unable to read knowledge-base index status.", "KB_STATUS_FAILED", false);
    const activeCount = active ?? 0;
    const indexedCount = indexed ?? 0;
    return { active: activeCount, indexed: indexedCount, pending: Math.max(activeCount - indexedCount, 0) };
  },

  async reindex(input: { force?: boolean; limit?: number }): Promise<{ indexed: number; model: string | null; remaining: number }> {
    const force = input.force === true;
    const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
    let query = getSupabaseStorageClient()
      .from("knowledge_base_documents")
      .select("id, title, category, content")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (!force) query = query.is("embedding", null);

    const { data, error } = await query;
    if (error) throw new HttpError(500, "Unable to load knowledge-base documents for indexing.", "KB_LOAD_FAILED", false);
    const documents = (data ?? []) as KnowledgeDocument[];
    let model: string | null = null;

    for (const document of documents) {
      const result = await embed(documentInput(document));
      model = result.model;
      const { error: updateError } = await getSupabaseStorageClient()
        .from("knowledge_base_documents")
        .update({
          embedding: result.embedding,
          metadata: {
            embedding_model: result.model,
            embedding_dimension: result.embedding.length,
            embedded_at: new Date().toISOString(),
          },
        })
        .eq("id", document.id);
      if (updateError) throw new HttpError(500, `Unable to save embedding for knowledge document ${document.id}.`, "KB_EMBEDDING_SAVE_FAILED", false);
    }

    const status = await this.status();
    return { indexed: documents.length, model, remaining: status.pending };
  },
};
