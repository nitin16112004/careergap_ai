import type { NextFunction, Request, Response } from "express";
import type { RoadmapTaskStatus } from "../types/roadmap";
import { roadmapService } from "../services/roadmap.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
    const userId = request.user?.userId ?? request.auth?.userId;
    if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
    return userId;
};

const roadmapIdFrom = (request: Request): string => {
    const value = request.params.roadmapId;
    if (typeof value !== "string") throw new HttpError(400, "A valid roadmap id is required.", "ROADMAP_ID_INVALID");
    return value;
};

const taskIdFrom = (request: Request): string => {
    const value = request.params.taskId;
    if (typeof value !== "string") throw new HttpError(400, "A valid task id is required.", "ROADMAP_TASK_ID_INVALID");
    return value;
};

export const generateRoadmap = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const { skillAnalysisId, roleId, roleName, targetRole, durationWeeks } = request.body;
        const result = await roadmapService.generate(userIdFrom(request), {
            skillAnalysisId: skillAnalysisId ?? null,
            roleId: roleId ?? null,
            roleName: typeof roleName === "string" ? roleName : undefined,
            targetRole: typeof targetRole === "string" ? targetRole : undefined,
            durationWeeks: typeof durationWeeks === "number" ? durationWeeks : undefined,
        });
        response.status(201).json({ success: true, message: "Roadmap generated successfully.", data: result });
    } catch (error) {
        next(error);
    }
};

export const listRoadmaps = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await roadmapService.list(userIdFrom(request));
        response.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getRoadmap = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await roadmapService.get(userIdFrom(request), roadmapIdFrom(request));
        response.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const updateRoadmap = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await roadmapService.update(userIdFrom(request), roadmapIdFrom(request), request.body);
        response.json({ success: true, message: "Roadmap updated successfully.", data: result });
    } catch (error) {
        next(error);
    }
};

export const deleteRoadmap = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        await roadmapService.delete(userIdFrom(request), roadmapIdFrom(request));
        response.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const updateTaskStatus = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const nextStatus = request.body?.status;
        if (typeof nextStatus !== "string") {
            throw new HttpError(400, "A valid task status is required.", "ROADMAP_TASK_STATUS_INVALID");
        }

        const validStatuses: RoadmapTaskStatus[] = ["pending", "completed", "skipped", "overdue"];
        if (!validStatuses.includes(nextStatus as RoadmapTaskStatus)) {
            throw new HttpError(400, "A valid task status is required.", "ROADMAP_TASK_STATUS_INVALID");
        }

        const result = await roadmapService.updateTaskStatus(userIdFrom(request), roadmapIdFrom(request), taskIdFrom(request), nextStatus as RoadmapTaskStatus);
        response.json({ success: true, message: "Roadmap task status updated.", data: result });
    } catch (error) {
        next(error);
    }
};

export const completeTask = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await roadmapService.completeTask(userIdFrom(request), roadmapIdFrom(request), taskIdFrom(request));
        response.json({ success: true, message: "Roadmap task marked as complete.", data: result });
    } catch (error) {
        next(error);
    }
};

export const roadmapController = {
    generateRoadmap,
    listRoadmaps,
    getRoadmap,
    updateRoadmap,
    deleteRoadmap,
    updateTaskStatus,
    completeTask,
};
