import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address").transform((value) => value.toLowerCase());
const password = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

export const signupSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
    email,
    password,
    confirmPassword: password,
  }).refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const loginSchema = z.object({
  body: z.object({ email, password }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email,
    token: z.string().trim().length(6, "Verification code must be 6 digits").regex(/^\d{6}$/, "Verification code must be 6 digits"),
  }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1, "Refresh token is required") }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const resetPasswordSchema = z.object({
  body: z.object({ password, confirmPassword: password }).refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
  query: z.record(z.unknown()).default({}),
  params: z.record(z.unknown()).default({}),
});

export const resendVerificationSchema = forgotPasswordSchema;

export type SignupInput = z.infer<typeof signupSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>["body"];
export type RefreshInput = z.infer<typeof refreshSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
