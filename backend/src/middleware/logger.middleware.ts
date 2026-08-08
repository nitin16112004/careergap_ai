import pinoHttp from "pino-http";
import { getEnv } from "../config/env";

export const loggerMiddleware = pinoHttp({
  level: getEnv().LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.otp",
      "req.body.token",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
});
