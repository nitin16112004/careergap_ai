import type { NextFunction, Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

export const notificationController = {
  async list(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await notificationService.list(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async markRead(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notificationService.markRead(userIdFrom(request), request.params.notificationId);
      response.json({ success: true, message: "Notification marked as read.", data });
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllRead(userIdFrom(request));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
