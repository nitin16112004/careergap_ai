import type { NextFunction, Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";
import { HttpError } from "../utils/http-error";

export const dashboardController = {
  async summary(request: Request, response: Response, next: NextFunction) {
    try {
      const userId = request.auth?.userId ?? request.user?.userId;
      if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
      response.json({ success: true, data: await dashboardService.getSummary(userId) });
    } catch (error) {
      next(error);
    }
  },
};
