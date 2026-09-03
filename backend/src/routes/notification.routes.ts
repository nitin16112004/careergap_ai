import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { notificationIdSchema } from "../validators/notification.validators";

export const createNotificationRoutes = (): Router => {
  const router = Router();
  router.use(requireSupabaseSession);
  router.get("/", notificationController.list);
  router.patch("/read-all", notificationController.markAllRead);
  router.patch("/:notificationId/read", validate(notificationIdSchema), notificationController.markRead);
  return router;
};
