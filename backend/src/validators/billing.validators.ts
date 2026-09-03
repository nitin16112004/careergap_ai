import { z } from "zod";

export const billingCheckoutSchema = z.object({
  body: z.object({
    planSlug: z.enum(["pro", "premium"]),
    billingCycle: z.enum(["monthly", "yearly"]),
    provider: z.enum(["razorpay", "stripe"]).optional(),
  }),
});

export const razorpayVerificationSchema = z.object({
  body: z.object({
    orderId: z.string().min(1).max(128),
    paymentId: z.string().min(1).max(128),
    signature: z.string().regex(/^[a-f0-9]{64}$/i),
  }),
});
