import type { NextFunction, Request, Response } from "express";
import { adminKnowledgeManagementService } from "../services/admin-knowledge-management.service";
import { HttpError } from "../utils/http-error";

const actorIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const documentIdFrom = (request: Request): string => {
  const raw = request.params.documentId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) throw new HttpError(400, "A valid document id is required.", "ADMIN_KB_ID_REQUIRED");
  return value;
};

export const updateKnowledgeBaseDocument = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await adminKnowledgeManagementService.update(actorIdFrom(request), documentIdFrom(request), request.body);
    response.json({ success: true, message: "Knowledge-base document updated. Reindex if content changed.", data });
  } catch (error) {
    next(error);
  }
};
