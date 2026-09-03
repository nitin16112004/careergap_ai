import type { NextFunction, Request, Response } from "express";
import { adminAnalyticsService } from "../services/admin-analytics.service";

export const getAdminAnalytics = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    response.json({ success: true, data: await adminAnalyticsService.get() });
  } catch (error) {
    next(error);
  }
};
