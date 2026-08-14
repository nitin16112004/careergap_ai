import { Router } from "express";
import { createPlaceholderRoutes } from "./placeholder.routes";
import { createAuthRoutes } from "./auth.routes";
import { createResumeRoutes } from "./resume.routes";
import { createAtsResumeRoutes } from "./ats-resume.routes";

export const v1Routes = Router();
v1Routes.use("/auth", createAuthRoutes());
v1Routes.use("/users", createPlaceholderRoutes("users"));
v1Routes.use("/profile", createPlaceholderRoutes("profile"));
v1Routes.use("/resumes", createResumeRoutes());
v1Routes.use("/resume-builder", createAtsResumeRoutes());
v1Routes.use("/resume", createPlaceholderRoutes("resume"));
v1Routes.use("/roadmap", createPlaceholderRoutes("roadmap"));
v1Routes.use("/ai", createPlaceholderRoutes("ai"));
v1Routes.use("/notifications", createPlaceholderRoutes("notifications"));
v1Routes.use("/admin", createPlaceholderRoutes("admin"));
