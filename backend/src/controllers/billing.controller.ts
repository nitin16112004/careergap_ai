import type { NextFunction, Request, Response } from "express";
import type { BillingProvider } from "../types/billing";
import { billingProviderService } from "../services/billing-provider.service";
import { billingService } from "../services/billing.service";
import { HttpError } from "../utils/http-error";

const userIdFrom = (request: Request): string => {
  const userId = request.user?.userId ?? request.auth?.userId;
  if (!userId) throw new HttpError(401, "Authentication required.", "AUTH_REQUIRED");
  return userId;
};

const webhookProviderFrom = (request: Request): BillingProvider => {
  const param = request.params.provider;
  if (param === "razorpay" || param === "stripe") return param;
  if (request.get("stripe-signature")) return "stripe";
  if (request.get("x-razorpay-signature")) return "razorpay";
  throw new HttpError(400, "Billing webhook provider is required.", "BILLING_PROVIDER_REQUIRED");
};

export const billingController = {
  async plans(_request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await billingService.getPlans() });
    } catch (error) {
      next(error);
    }
  },

  async currentPlan(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await billingService.getUsage(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async history(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      response.json({ success: true, data: await billingService.getHistory(userIdFrom(request)) });
    } catch (error) {
      next(error);
    }
  },

  async createCheckout(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const { planSlug, billingCycle, provider } = request.body;
      const data = await billingProviderService.createCheckout(userIdFrom(request), planSlug, billingCycle, provider);
      response.status(201).json({ success: true, message: "Checkout created.", data });
    } catch (error) {
      next(error);
    }
  },

  async verifyRazorpay(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await billingProviderService.verifyRazorpayPayment(userIdFrom(request), request.body);
      response.json({ success: true, message: "Payment verified and plan activated." });
    } catch (error) {
      next(error);
    }
  },

  async cancel(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      await billingProviderService.cancelAtPeriodEnd(userIdFrom(request));
      response.json({ success: true, message: "Your paid plan will remain available until the current period ends." });
    } catch (error) {
      next(error);
    }
  },

  async webhook(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const provider = webhookProviderFrom(request);
      if (!request.rawBody) throw new HttpError(400, "Raw billing webhook body is unavailable.", "BILLING_WEBHOOK_RAW_BODY_REQUIRED");
      const signature = provider === "stripe"
        ? request.get("stripe-signature") ?? ""
        : request.get("x-razorpay-signature") ?? "";
      const eventId = provider === "razorpay" ? request.get("x-razorpay-event-id") ?? undefined : undefined;
      const result = await billingProviderService.handleWebhook(provider, request.rawBody, signature, eventId);
      response.json({ success: true, received: true, duplicate: result.duplicate });
    } catch (error) {
      next(error);
    }
  },
};
