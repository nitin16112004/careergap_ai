import type { NextFunction, Request, Response } from "express";
import { resumeService } from "../services/resume.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const resumeIdFrom = (request: Request): string => {
  const resumeId = request.params.resumeId;
  if (typeof resumeId !== "string") throw new HttpError(400, "A valid resume id is required.", "RESUME_ID_INVALID");
  return resumeId;
};

export const upload = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await resumeService.upload(userIdFrom(request), request.file);
    response.status(201).json({ success: true, message: "Resume uploaded successfully.", data: resume });
  } catch (error) {
    next(error);
  }
};

export const process = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await resumeService.process(userIdFrom(request), resumeIdFrom(request));
    response.status(202).json({ success: true, message: "Resume parsing job queued.", data: resume });
  } catch (error) {
    next(error);
  }
};

export const get = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await resumeService.get(userIdFrom(request), resumeIdFrom(request));
    response.json({ success: true, data: resume });
  } catch (error) {
    next(error);
  }
};

export const update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const resume = await resumeService.update(userIdFrom(request), resumeIdFrom(request), request.body);
    response.json({ success: true, message: "Resume review saved.", data: resume });
  } catch (error) {
    next(error);
  }
};

export const resumeController = { upload, process, get, update };
