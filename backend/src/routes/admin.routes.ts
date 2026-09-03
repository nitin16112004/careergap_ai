import { Router } from "express";
import { getAdminAnalytics } from "../controllers/admin-analytics.controller";
import { adminController } from "../controllers/admin.controller";
import { updateKnowledgeBaseDocument } from "../controllers/admin-knowledge-management.controller";
import { getKnowledgeBaseIndexStatus, reindexKnowledgeBase } from "../controllers/admin-knowledge-base.controller";
import { getQueueOperations, getRuntimeOperations } from "../controllers/admin-operations.controller";
import { adminUserController } from "../controllers/admin-user.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { knowledgeBaseReindexSchema } from "../validators/admin-knowledge-base.validators";
import { adminKnowledgeUpdateSchema } from "../validators/admin-knowledge-management.validators";
import { adminUserRoleSchema } from "../validators/admin-user.validators";
import {
  adminCreateJobRoleSchema,
  adminCreateSkillSchema,
  adminKnowledgeBaseSchema,
  adminRoleSkillSchema,
  adminUpdateJobRoleSchema,
  adminUpdateSkillSchema,
} from "../validators/admin.validators";

export const createAdminRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession, requireAdmin);

  router.get("/analytics", getAdminAnalytics);
  router.get("/users", adminController.users);
  router.get("/users/:userId", adminController.user);
  router.get("/users/:userId/auth-state", adminUserController.authState);
  router.patch("/users/:userId/role", validate(adminUserRoleSchema), adminUserController.changeRole);
  router.post("/users/:userId/disable", adminUserController.disable);
  router.post("/users/:userId/enable", adminUserController.enable);

  router.get("/job-roles", adminController.jobRoles);
  router.post("/job-roles", validate(adminCreateJobRoleSchema), adminController.createJobRole);
  router.put("/job-roles/:roleId", validate(adminUpdateJobRoleSchema), adminController.updateJobRole);
  router.delete("/job-roles/:roleId", adminController.deleteJobRole);
  router.post("/job-roles/:roleId/skills", validate(adminRoleSkillSchema), adminController.assignRoleSkill);
  router.delete("/job-roles/:roleId/skills/:skillId", adminController.removeRoleSkill);

  router.get("/skills", adminController.skills);
  router.post("/skills", validate(adminCreateSkillSchema), adminController.createSkill);
  router.put("/skills/:skillId", validate(adminUpdateSkillSchema), adminController.updateSkill);
  router.delete("/skills/:skillId", adminController.deleteSkill);

  router.get("/knowledge-base", adminController.knowledgeBase);
  router.post("/knowledge-base", validate(adminKnowledgeBaseSchema), adminController.createKnowledgeBase);
  router.put("/knowledge-base/:documentId", validate(adminKnowledgeUpdateSchema), updateKnowledgeBaseDocument);
  router.delete("/knowledge-base/:documentId", adminController.deleteKnowledgeBase);
  router.get("/knowledge-base/index-status", getKnowledgeBaseIndexStatus);
  router.post("/knowledge-base/reindex", validate(knowledgeBaseReindexSchema), reindexKnowledgeBase);

  router.get("/reminders", adminController.reminders);
  router.get("/logs", adminController.logs);
  router.get("/ops/queues", getQueueOperations);
  router.get("/ops/runtime", getRuntimeOperations);

  return router;
};
