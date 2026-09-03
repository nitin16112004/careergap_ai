import { Router } from "express";
import { skillGapController } from "../controllers/skill-gap.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { analysisIdSchema, analyzeSkillGapSchema, roleIdSchema } from "../validators/skill-gap.validators";

export const createJobRoleRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.get("/", skillGapController.listRoles);
  router.get("/:roleId/skills", validate(roleIdSchema), skillGapController.roleSkills);
  return router;
};

export const createSkillGapRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.post("/analyze", validate(analyzeSkillGapSchema), skillGapController.analyze);
  router.get("/latest", skillGapController.latest);
  router.get("/:analysisId", validate(analysisIdSchema), skillGapController.get);
  return router;
};
