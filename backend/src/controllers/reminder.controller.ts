import type { NextFunction, Request, Response } from "express";
import { reminderService } from "../services/reminder.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

export const reminderController = {
  async getStatus(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await reminderService.getStatus(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async getPreferences(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await reminderService.getPreferences(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async updatePreferences(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reminderService.updatePreferences(userIdFrom(request), request.body);
      response.json({ success: true, message: "Reminder preferences updated.", data });
    } catch (error) {
      next(error);
    }
  },

  async getLogs(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await reminderService.getLogs(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async getUserLogs(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await reminderService.getLogs(request.params.userId) });
    } catch (error) {
      next(error);
    }
  },

  async checkWeekly(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reminderService.scanAndEnqueue();
      response.status(202).json({ success: true, message: "Reminder scan completed and eligible emails were queued.", data });
    } catch (error) {
      next(error);
    }
  },
};
