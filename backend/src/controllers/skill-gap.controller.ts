import type { NextFunction, Request, Response } from "express";
import { cacheService } from "../services/cache.service";
import { skillGapService } from "../services/skill-gap.service";
import { HttpError } from "../utils/http-error";

const CATALOG_CACHE_TTL_SECONDS = 300;

const userIdFrom = (request: Request): string => {
  const userId = request.auth?.userId ?? request.user?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

export const skillGapController = {
  async listRoles(_request: Request, response: Response, next: NextFunction) {
    try {
      const data = await cacheService.remember(
        "catalog:job-roles:v1",
        CATALOG_CACHE_TTL_SECONDS,
        () => skillGapService.listJobRoles(),
      );
      response.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async roleSkills(request: Request, response: Response, next: NextFunction) {
    try {
      const roleId = String(request.params.roleId);
      const data = await cacheService.remember(
        `catalog:role-skills:${roleId}:v1`,
        CATALOG_CACHE_TTL_SECONDS,
        () => skillGapService.getRoleSkills(roleId),
      );
      response.json({ success: true, data });
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
