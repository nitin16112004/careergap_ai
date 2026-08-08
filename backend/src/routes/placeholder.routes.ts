import { Router } from "express";
import { loginRateLimit } from "../middleware/rate-limit.middleware";
import { HttpError } from "../utils/http-error";

const notImplemented = (moduleName: string) => () => {
  throw new HttpError(501, `${moduleName} module is not implemented yet`, "MODULE_NOT_IMPLEMENTED");
};

export const createPlaceholderRoutes = (moduleName: string): Router => {
  const router = Router();
  router.use(notImplemented(moduleName));
  return router;
};

export const createAuthRoutes = (): Router => {
  const router = Router();
  router.post("/login", loginRateLimit, notImplemented("auth"));
  router.use(notImplemented("auth"));
  return router;
};
