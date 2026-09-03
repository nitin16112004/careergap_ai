import type { NextFunction, Request, Response } from "express";
import { knowledgeBaseService } from "../services/knowledge-base.service";

export const getKnowledgeBaseIndexStatus = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    response.json({ success: true, data: await knowledgeBaseService.status() });
  } catch (error) {
    next(error);
  }
};

export const reindexKnowledgeBase = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await knowledgeBaseService.reindex({
      force: request.body.force === true,
      limit: typeof request.body.limit === "number" ? request.body.limit : undefined,
    });
    response.json({ success: true, message: "Knowledge-base embedding batch completed.", data: result });
  } catch (error) {
    next(error);
  }
};
