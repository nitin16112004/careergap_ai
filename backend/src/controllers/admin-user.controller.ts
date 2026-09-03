import type { NextFunction, Request, Response } from "express";
import { adminUserService } from "../services/admin-user.service";
import { HttpError } from "../utils/http-error";

const actorIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const targetIdFrom = (request: Request): string => {
  const raw = request.params.userId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) throw new HttpError(400, "A valid user id is required.", "ADMIN_USER_ID_REQUIRED");
  return value;
};

export const adminUserController = {
  async authState(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await adminUserService.authState(targetIdFrom(request)) });
    } catch (error) { next(error); }
  },

  async changeRole(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminUserService.changeRole(actorIdFrom(request), targetIdFrom(request), request.body.role);
      response.json({ success: true, message: "User role updated. New JWT sessions will use the updated role.", data });
    } catch (error) { next(error); }
  },

  async disable(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminUserService.setDisabled(actorIdFrom(request), targetIdFrom(request), true);
      response.json({ success: true, message: "User access disabled.", data });
    } catch (error) { next(error); }
  },

  async enable(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminUserService.setDisabled(actorIdFrom(request), targetIdFrom(request), false);
      response.json({ success: true, message: "User access restored.", data });
    } catch (error) { next(error); }
  },
};
