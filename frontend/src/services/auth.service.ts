import { supabase } from "../lib/supabase";
import type { AuthResult } from "../types/auth";
import { apiRequest } from "./api";

const setSessionFromResult = async (result: AuthResult): Promise<void> => {
  if (!result.session) return;
  await supabase.auth.setSession({
    access_token: result.session.accessToken,
    refresh_token: result.session.refreshToken,
  });
};

export const authService = {
  async signup(input: { fullName: string; email: string; password: string; confirmPassword: string }): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>("/auth/signup", { method: "POST", body: JSON.stringify(input) });
    await setSessionFromResult(result);
    return result;
  },

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    await setSessionFromResult(result);
    return result;
  },

  async verifyEmail(input: { email: string; token: string }): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>("/auth/verify-email", { method: "POST", body: JSON.stringify(input) });
    await setSessionFromResult(result);
    return result;
  },

  resendVerification(email: string): Promise<void> {
    return apiRequest<void>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
  },

  forgotPassword(email: string): Promise<void> {
    return apiRequest<void>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },

  resetPassword(password: string, confirmPassword: string): Promise<void> {
    return apiRequest<void>("/auth/reset-password", { method: "POST", body: JSON.stringify({ password, confirmPassword }) });
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch {
      // Clearing the browser session remains safe even if the backend is
      // unreachable or the access token has already expired.
    } finally {
      await supabase.auth.signOut({ scope: "global" });
    }
  },

  me(): Promise<AuthResult> {
    return apiRequest<AuthResult>("/auth/me");
  },
};
