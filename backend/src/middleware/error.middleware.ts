import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

export const notFoundMiddleware: RequestHandler = (request) => {
  throw new HttpError(404, `Route not found: ${request.method} ${request.path}`, "ROUTE_NOT_FOUND");
};

export const errorMiddleware: ErrorRequestHandler = (error, request, response, _next) => {
  const knownError = error instanceof HttpError;
  const statusCode = knownError ? error.statusCode : 500;
  const code = knownError ? error.code : "INTERNAL_ERROR";
  const message = knownError && error.expose ? error.message : "Internal server error";
  const requestId = typeof request.id === "string" ? request.id : undefined;

  request.log?.error({ err: error, code, statusCode, requestId }, "request failed");
  response.status(statusCode).json({
    success: false,
    message,
    errorCode: code,
    ...(requestId ? { requestId } : {}),
  });
};
