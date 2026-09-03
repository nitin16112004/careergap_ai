import type { NextFunction, Request, Response } from "express";
import { skillGapService } from "../services/skill-gap.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.auth?.userId ?? request.user?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

export const skillGapController = {
  async listRoles(_request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ success: true, data: await skillGapService.listJobRoles() });
    } catch (error) {
      next(error);
    }
  },

  async roleSkills(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ success: true, data: await skillGapService.getRoleSkills(String(request.params.roleId)) });
    } catch (error) {
      next(error);
    }
  },

  async analyze(request: Request, response: Response, next: NextFunction) {
    try {
      const data = await skillGapService.analyze(userIdFrom(request), request.body.roleId, request.body.resumeId);
      response.status(201).json({ success: true, message: "Skill gap analysis completed.", data });
    } catch (error) {
      next(error);
    }
  },

  async latest(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ success: true, data: await skillGapService.latest(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async get(request: Request, response: Response, next: NextFunction) {
    try {
      response.json({ success: true, data: await skillGapService.get(userIdFrom(request), String(request.params.analysisId)) });
    } catch (error) {
      next(error);
    }
  },
};
