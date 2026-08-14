import { Router } from "express";
import { roadmapController } from "../controllers/roadmap.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { roadmapGenerateSchema, roadmapIdSchema, roadmapTaskCompletionSchema, roadmapUpdateSchema } from "../validators/roadmap.validators";

export const createRoadmapRoutes = (): Router => {
    const router = Router();
    router.use(requireSupabaseSession);
    router.post("/generate", validate(roadmapGenerateSchema), roadmapController.generateRoadmap);
    router.get("/", roadmapController.listRoadmaps);
    router.get("/:roadmapId", validate(roadmapIdSchema), roadmapController.getRoadmap);
    router.patch("/:roadmapId", validate(roadmapUpdateSchema), roadmapController.updateRoadmap);
    router.patch("/:roadmapId/tasks/:taskId/complete", validate(roadmapTaskCompletionSchema), roadmapController.completeTask);
    router.delete("/:roadmapId", validate(roadmapIdSchema), roadmapController.deleteRoadmap);
    return router;
};
