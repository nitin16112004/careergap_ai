import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { getEnv } from "../config/env";

const requestId = (header: string | string[] | undefined): string => {
  const candidate = Array.isArray(header) ? header[0] : header;
  if (candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)) return candidate;
  return randomUUID();
};

export const loggerMiddleware = pinoHttp({
  level: getEnv().LOG_LEVEL,
  genReqId: (request, response) => {
    const id = requestId(request.headers["x-request-id"]);
    response.setHeader("x-request-id", id);
    return id;
  },
  customProps: (request) => ({
    requestId: request.id,
    service: "careerguid-ai-backend",
  }),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "req.body.password",
      "req.body.otp",
      "req.body.token",
      "req.body.accessToken",
      "req.body.refreshToken",
      "req.body.email",
      "req.body.phone",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
  customSuccessMessage: (request, response) => `${request.method} ${request.url} ${response.statusCode}`,
  customErrorMessage: (request, response) => `${request.method} ${request.url} ${response.statusCode}`,
});
