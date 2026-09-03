import { Router } from "express";
import { resumeController } from "../controllers/resume.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { uploadResumeFile } from "../middleware/resume-upload.middleware";
import { validate } from "../middleware/validate.middleware";
import { resumeIdParamsSchema, resumePatchSchema } from "../validators/resume.validators";

export const createResumeRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.post("/upload", uploadResumeFile, resumeController.upload);
  router.post("/process/:resumeId", validate(resumeIdParamsSchema), resumeController.process);
  router.get("/:resumeId", validate(resumeIdParamsSchema), resumeController.get);
  router.patch("/:resumeId", validate(resumePatchSchema), resumeController.update);
  return router;
};
