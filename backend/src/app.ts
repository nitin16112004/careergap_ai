import express, { type Request } from "express";
import { getEnv } from "./config/env";
import { corsMiddleware } from "./middleware/cors.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { securityMiddleware } from "./middleware/security.middleware";
import { apiRoutes } from "./routes";
import { healthRoutes } from "./routes/health.routes";

const env = getEnv();
export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? env.TRUST_PROXY_HOPS : 0);
app.use(loggerMiddleware);
app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(express.json({
  limit: "1mb",
  verify: (request, _response, buffer) => {
    const expressRequest = request as Request;
    if (expressRequest.originalUrl.includes("/billing/webhook")) {
      expressRequest.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/", (_request, response) => response.json({ service: "careerguid-ai-backend", status: "ok" }));
app.use("/api", healthRoutes);
app.use("/api", apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
