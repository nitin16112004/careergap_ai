import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";

export const createDashboardRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.get("/summary", dashboardController.summary);
  return router;
};
