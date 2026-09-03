import { Router } from "express";
import { onboardingController } from "../controllers/onboarding.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { onboardingProfileSchema } from "../validators/onboarding.validators";

export const createOnboardingRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.get("/profile", onboardingController.getProfile);
  router.put("/profile", validate(onboardingProfileSchema), onboardingController.updateProfile);
  router.post("/complete", validate(onboardingProfileSchema), onboardingController.complete);
  return router;
};
