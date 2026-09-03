import pino from "pino";
import { getEnv } from "./env";

const env = getEnv();

export const logger = pino({
  name: "careerguid-ai-backend",
  level: env.LOG_LEVEL,
  base: {
    service: "backend",
    environment: env.NODE_ENV,
  },
  redact: {
    paths: [
      "authorization",
      "cookie",
      "password",
      "otp",
      "token",
      "accessToken",
      "refreshToken",
      "apiKey",
      "secret",
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.otp",
      "req.body.token",
      "req.body.accessToken",
      "req.body.refreshToken",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
});
