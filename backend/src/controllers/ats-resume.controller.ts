import type { NextFunction, Request, Response } from "express";
import { atsResumeService } from "../services/ats-resume.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
    const userId = request.user?.userId ?? request.auth?.userId;
    if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
    return userId;
};

const resumeIdFrom = (request: Request): string => {
    const value = request.body?.resumeId ?? request.params?.resumeId;
    if (typeof value !== "string") throw new HttpError(400, "A valid resume id is required.", "RESUME_ID_INVALID");
    return value;
};

const generatedResumeIdFrom = (request: Request): string => {
    const value = request.params.generatedResumeId;
    if (typeof value !== "string") throw new HttpError(400, "A valid generated resume id is required.", "GENERATED_RESUME_ID_INVALID");
    return value;
};

export const analyze = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const { targetRole, jobDescription } = request.body;
        const result = await atsResumeService.analyze(userIdFrom(request), resumeIdFrom(request), targetRole, jobDescription);
        response.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const generate = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const { targetRole, jobDescription, versionName } = request.body;
        const result = await atsResumeService.generate(userIdFrom(request), resumeIdFrom(request), targetRole, jobDescription, versionName);
        response.status(201).json({ success: true, message: "ATS resume generated from reviewed resume facts.", data: result });
    } catch (error) {
        next(error);
    }
};

export const listGenerated = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        response.json({ success: true, data: await atsResumeService.getGeneratedList(userIdFrom(request)) });
    } catch (error) {
        next(error);
    }
};

export const getGenerated = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        response.json({ success: true, data: await atsResumeService.getGenerated(userIdFrom(request), generatedResumeIdFrom(request)) });
    } catch (error) {
        next(error);
    }
};

export const updateGenerated = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await atsResumeService.updateGenerated(userIdFrom(request), generatedResumeIdFrom(request), request.body);
        response.json({ success: true, message: "Generated resume updated.", data: result });
    } catch (error) {
        next(error);
    }
};

export const exportPdf = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await atsResumeService.exportGenerated(userIdFrom(request), generatedResumeIdFrom(request), "pdf");
        response.json({ success: true, message: "PDF resume is ready for secure download.", data: result });
    } catch (error) {
        next(error);
    }
};

export const exportDocx = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await atsResumeService.exportGenerated(userIdFrom(request), generatedResumeIdFrom(request), "docx");
        response.json({ success: true, message: "DOCX resume is ready for secure download.", data: result });
    } catch (error) {
        next(error);
    }
};

export const deleteGenerated = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
        await atsResumeService.deleteGenerated(userIdFrom(request), generatedResumeIdFrom(request));
        response.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const atsResumeController = {
    analyze,
    generate,
    listGenerated,
    getGenerated,
    updateGenerated,
    exportPdf,
    exportDocx,
    deleteGenerated,
};
