import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "../utils/http-error";

export const validate = (schema: ZodTypeAny): RequestHandler => (request, _response, next) => {
  const result = schema.safeParse({
    body: request.body,
    query: request.query,
    params: request.params,
  });

  if (!result.success) {
    return next(new HttpError(400, "Request validation failed", "VALIDATION_ERROR"));
  }

  request.body = result.data.body;
  request.query = result.data.query;
  request.params = result.data.params;
  return next();
};
