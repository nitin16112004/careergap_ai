import { Router } from "express";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { atsAnalyzeSchema, atsGenerateSchema, atsGeneratedIdSchema, atsUpdateSchema } from "../validators/ats-resume.validators";
import { atsResumeController } from "../controllers/ats-resume.controller";

export const createAtsResumeRoutes = (): Router => {
    const router = Router();
    router.use(requireSupabaseSession);
    router.post("/analyze", validate(atsAnalyzeSchema), atsResumeController.analyze);
    router.post("/generate", validate(atsGenerateSchema), atsResumeController.generate);
    router.get("/generated", atsResumeController.listGenerated);
    router.get("/generated/:generatedResumeId", validate(atsGeneratedIdSchema), atsResumeController.getGenerated);
    router.patch("/generated/:generatedResumeId", validate(atsUpdateSchema), atsResumeController.updateGenerated);
    router.delete("/generated/:generatedResumeId", validate(atsGeneratedIdSchema), atsResumeController.deleteGenerated);
    return router;
};
