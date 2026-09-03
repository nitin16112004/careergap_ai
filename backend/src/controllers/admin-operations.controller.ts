import type { NextFunction, Request, Response } from "express";
import { operationsService } from "../services/operations.service";

export const getQueueOperations = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    response.json({ success: true, data: await operationsService.queueSummary() });
  } catch (error) {
    next(error);
  }
};

export const getRuntimeOperations = (_request: Request, response: Response, next: NextFunction): void => {
  try {
    response.json({ success: true, data: operationsService.runtimeSummary() });
  } catch (error) {
    next(error);
  }
};
