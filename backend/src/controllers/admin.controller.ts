import type { NextFunction, Request, Response } from "express";
import { adminService } from "../services/admin.service";
import { HttpError } from "../utils/http-error";

const actorIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const idParam = (request: Request, key: string): string => {
  const value = request.params[key];
  if (!value) throw new HttpError(400, `A valid ${key} is required.`, "ADMIN_ID_REQUIRED");
  return value;
};

const numberQuery = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const adminController = {
  async analytics(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.analytics() }); } catch (error) { next(error); }
  },

  async users(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await adminService.listUsers({
        limit: numberQuery(request.query.limit, 50),
        offset: numberQuery(request.query.offset, 0),
        search: typeof request.query.search === "string" ? request.query.search : undefined,
      }) });
    } catch (error) { next(error); }
  },

  async user(request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.getUser(idParam(request, "userId")) }); } catch (error) { next(error); }
  },

  async jobRoles(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.listJobRoles() }); } catch (error) { next(error); }
  },

  async createJobRole(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.createJobRole(actorIdFrom(request), request.body);
      response.status(201).json({ success: true, message: "Job role created.", data });
    } catch (error) { next(error); }
  },

  async updateJobRole(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.updateJobRole(actorIdFrom(request), idParam(request, "roleId"), request.body);
      response.json({ success: true, message: "Job role updated.", data });
    } catch (error) { next(error); }
  },

  async deleteJobRole(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.disableJobRole(actorIdFrom(request), idParam(request, "roleId"));
      response.json({ success: true, message: "Job role disabled without deleting historical user data.", data });
    } catch (error) { next(error); }
  },

  async skills(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.listSkills() }); } catch (error) { next(error); }
  },

  async createSkill(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.createSkill(actorIdFrom(request), request.body);
      response.status(201).json({ success: true, message: "Skill created.", data });
    } catch (error) { next(error); }
  },

  async updateSkill(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.updateSkill(actorIdFrom(request), idParam(request, "skillId"), request.body);
      response.json({ success: true, message: "Skill updated.", data });
    } catch (error) { next(error); }
  },

  async deleteSkill(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteSkill(actorIdFrom(request), idParam(request, "skillId"));
      response.status(204).send();
    } catch (error) { next(error); }
  },

  async assignRoleSkill(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.assignRoleSkill(actorIdFrom(request), idParam(request, "roleId"), request.body);
      response.json({ success: true, message: "Required skill saved for job role.", data });
    } catch (error) { next(error); }
  },

  async removeRoleSkill(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.removeRoleSkill(actorIdFrom(request), idParam(request, "roleId"), idParam(request, "skillId"));
      response.status(204).send();
    } catch (error) { next(error); }
  },

  async knowledgeBase(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.listKnowledgeBase() }); } catch (error) { next(error); }
  },

  async createKnowledgeBase(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.createKnowledgeBase(actorIdFrom(request), request.body);
      response.status(201).json({ success: true, message: "Knowledge-base document created. Reindex before RAG retrieval uses it.", data });
    } catch (error) { next(error); }
  },

  async deleteKnowledgeBase(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteKnowledgeBase(actorIdFrom(request), idParam(request, "documentId"));
      response.status(204).send();
    } catch (error) { next(error); }
  },

  async reminders(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.reminderOverview() }); } catch (error) { next(error); }
  },

  async logs(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try { response.json({ success: true, data: await adminService.logs() }); } catch (error) { next(error); }
  },
};
