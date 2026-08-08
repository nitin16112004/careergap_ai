import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (request.auth?.role !== "admin") {
    return next(new HttpError(403, "Admin access required", "ADMIN_REQUIRED"));
  }
  return next();
};
