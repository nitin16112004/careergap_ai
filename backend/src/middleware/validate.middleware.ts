import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/http-error";

export const validate = (schema: ZodType<{ body?: unknown; query?: unknown; params?: unknown }>): RequestHandler => (request, _response, next) => {
  const result = schema.safeParse({
    body: request.body,
    query: request.query,
    params: request.params,
  });

  if (!result.success) {
    return next(new HttpError(400, "Request validation failed", "VALIDATION_ERROR"));
  }

  if (result.data.body !== undefined) request.body = result.data.body;
  // Express 5 exposes query as an inherited getter. Replace it on this request
  // so downstream handlers receive parsed values without assigning to a getter.
  if (result.data.query !== undefined) {
    Object.defineProperty(request, "query", { value: result.data.query, writable: true, configurable: true, enumerable: true });
  }
  if (result.data.params !== undefined) request.params = result.data.params as typeof request.params;
  return next();
};
