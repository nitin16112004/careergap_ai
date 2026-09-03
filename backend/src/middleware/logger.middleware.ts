import { randomUUID } from "node:crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import { logger } from "../config/logger";

const requestIdFrom = (value: string | string[] | undefined): string | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return undefined;
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return undefined;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : undefined;
};

export const loggerMiddleware = pinoHttp({
  logger,
  genReqId: (request, response) => {
    const requestId = requestIdFrom(request.headers["x-request-id"]) ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    return requestId;
  },
  customLogLevel: (_request, response, error) => {
    if (error || response.statusCode >= 500) return "error";
    if (response.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (request) => ({
      id: request.id,
      method: request.method,
      url: request.url,
      remoteAddress: request.remoteAddress,
    }),
    res: (response) => ({ statusCode: response.statusCode }),
    err: pino.stdSerializers.err,
  },
});
