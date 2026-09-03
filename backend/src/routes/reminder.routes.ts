import { Router } from "express";
import { reminderController } from "../controllers/reminder.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { reminderPreferencesUpdateSchema, reminderUserLogsSchema } from "../validators/reminder.validators";

export const createReminderRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);

  router.get("/status", reminderController.getStatus);
  router.get("/preferences", reminderController.getPreferences);
  router.put("/preferences", validate(reminderPreferencesUpdateSchema), reminderController.updatePreferences);
  router.get("/logs", reminderController.getLogs);

  router.post("/check-weekly", requireAdmin, reminderController.checkWeekly);
  router.get("/logs/:userId", requireAdmin, validate(reminderUserLogsSchema), reminderController.getUserLogs);

  return router;
};
