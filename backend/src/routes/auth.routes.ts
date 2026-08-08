import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "../validators/auth.validators";

export const createAuthRoutes = (): Router => {
  const router = Router();

  router.post("/signup", validate(signupSchema), authController.signup);
  router.post("/login", validate(loginSchema), authController.login);
  router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
  router.post("/resend-verification", validate(resendVerificationSchema), authController.resendVerification);
  router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
  router.post("/refresh", validate(refreshSchema), authController.refresh);
  router.post("/reset-password", requireSupabaseSession, validate(resetPasswordSchema), authController.resetPassword);
  router.post("/logout", requireSupabaseSession, authController.logout);
  router.get("/me", requireSupabaseSession, authController.me);

  return router;
};
