import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

type KnowledgeUpdate = {
  title?: string;
  category?: string;
  content?: string;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
};

export const adminKnowledgeManagementService = {
  async update(actorUserId: string, documentId: string, input: KnowledgeUpdate) {
    const client = getSupabaseStorageClient();
    const current = await client.from("knowledge_base_documents")
      .select("id,title,category,source_url,content,metadata,is_active")
      .eq("id", documentId)
      .maybeSingle();
    if (current.error) throw new HttpError(500, "Unable to load knowledge-base document.", "ADMIN_KB_LOAD_FAILED", false);
    if (!current.data) throw new HttpError(404, "Knowledge-base document not found.", "ADMIN_KB_NOT_FOUND");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.category !== undefined) patch.category = input.category;
    if (input.sourceUrl !== undefined) patch.source_url = input.sourceUrl;
    if (input.metadata !== undefined) patch.metadata = input.metadata;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.content !== undefined && input.content !== current.data.content) {
      patch.content = input.content;
      patch.embedding = null;
    }

    const { data, error } = await client.from("knowledge_base_documents")
      .update(patch)
      .eq("id", documentId)
      .select("id,title,category,source_url,content,metadata,is_active,created_by,created_at,updated_at")
      .single();
    if (error || !data) throw new HttpError(400, "Unable to update knowledge-base document.", "ADMIN_KB_UPDATE_FAILED");

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_user_id: actorUserId,
      action: "knowledge_base.updated",
      entity_type: "knowledge_base_document",
      entity_id: documentId,
      old_data: current.data,
      new_data: data,
    });
    if (auditError) throw new HttpError(500, "Knowledge document updated but audit log could not be saved.", "ADMIN_AUDIT_LOG_FAILED", false);
    return data;
  },
};
