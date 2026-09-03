import { Router } from "express";
import { getKnowledgeBaseIndexStatus, reindexKnowledgeBase } from "../controllers/admin-knowledge-base.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { knowledgeBaseReindexSchema } from "../validators/admin-knowledge-base.validators";

export const createAdminRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession, requireAdmin);
  router.get("/knowledge-base/index-status", getKnowledgeBaseIndexStatus);
  router.post("/knowledge-base/reindex", validate(knowledgeBaseReindexSchema), reindexKnowledgeBase);
  return router;
};
