import type { NextFunction, Request, Response } from "express";
import { onboardingService } from "../services/onboarding.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.auth?.userId ?? request.user?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

export const onboardingController = {
  async getProfile(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ success: true, data: await onboardingService.getProfile(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(request: Request, response: Response, next: NextFunction) {
    try {
      const data = await onboardingService.saveProfile(userIdFrom(request), request.body);
      response.json({ success: true, message: "Profile saved successfully.", data });
    } catch (error) {
      next(error);
    }
  },

  async complete(request: Request, response: Response, next: NextFunction) {
    try {
      const data = await onboardingService.complete(userIdFrom(request), request.body);
      response.json({ success: true, message: "Onboarding completed successfully.", data });
    } catch (error) {
      next(error);
    }
  },
};
