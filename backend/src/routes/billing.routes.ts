import { Router } from "express";
import { billingController } from "../controllers/billing.controller";
import { requireSupabaseSession } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { billingCheckoutSchema, razorpayVerificationSchema } from "../validators/billing.validators";

export const createBillingRoutes = (): Router => {
  const router = Router();

  // Pricing is public and webhook endpoints authenticate through provider signatures.
  router.get("/plans", billingController.plans);
  router.post("/webhook", billingController.webhook);
  router.post("/webhook/:provider", billingController.webhook);

  router.use(requireSupabaseSession);
  router.get("/current-plan", billingController.currentPlan);
  router.get("/history", billingController.history);
  router.post("/create-checkout", validate(billingCheckoutSchema), billingController.createCheckout);
  router.post("/verify-razorpay", validate(razorpayVerificationSchema), billingController.verifyRazorpay);
  router.post("/cancel", billingController.cancel);

  return router;
};
