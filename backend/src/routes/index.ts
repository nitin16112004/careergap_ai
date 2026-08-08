import { Router } from "express";
import { apiRateLimit } from "../middleware/rate-limit.middleware";
import { v1Routes } from "./v1.routes";

export const apiRoutes = Router();
apiRoutes.use("/v1", apiRateLimit, v1Routes);
