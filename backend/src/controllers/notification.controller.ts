import type { NextFunction, Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const notificationIdFrom = (request: Request): string => {
  const value = request.params.notificationId;
  if (typeof value !== "string") throw new HttpError(400, "A valid notification id is required.", "NOTIFICATION_ID_INVALID");
  return value;
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
      const data = await notificationService.markRead(userIdFrom(request), notificationIdFrom(request));
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
