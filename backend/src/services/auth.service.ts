import type { Session, User } from "@supabase/supabase-js";
import { getEnv } from "../config/env";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "../config/supabase";
import type { AuthContext } from "../types";
import { HttpError } from "../utils/http-error";
import type {
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "../validators/auth.validators";
import { authRateLimitService } from "./auth-rate-limit.service";
import { emailService } from "./email.service";

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string | null;
  onboarding_completed: boolean;
  email_verified: boolean;
  role: string;
}

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email?: string;
    emailConfirmedAt?: string | null;
  };
  session: AuthSessionPayload | null;
  profile: AuthProfile | null;
  requiresVerification?: boolean;
}

const authRedirectUrl = (): string => `${getEnv().FRONTEND_URL}/verify-email`;
const resetRedirectUrl = (): string => `${getEnv().FRONTEND_URL}/reset-password`;

const safeAuthError = (error: unknown): HttpError => {
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  if (message.includes("already registered") || message.includes("already exists")) {
    return new HttpError(409, "This email is already registered. Please login.", "AUTH_EMAIL_EXISTS");
  }
  if (message.includes("invalid login credentials") || message.includes("invalid email or password")) {
    return new HttpError(401, "Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
  }
  if (message.includes("email not confirmed")) {
    return new HttpError(403, "Please verify your email before logging in.", "AUTH_EMAIL_UNVERIFIED");
  }
  if (message.includes("password") || message.includes("token") || message.includes("otp") || message.includes("verification") || message.includes("expired")) {
    return new HttpError(400, "The authentication request could not be completed.", "AUTH_REQUEST_INVALID");
  }
  return new HttpError(502, "Authentication service is temporarily unavailable.", "AUTH_PROVIDER_UNAVAILABLE");
};

const userSummary = (user: User): AuthResult["user"] => ({
  id: user.id,
  email: user.email,
  emailConfirmedAt: user.email_confirmed_at,
});

const sessionSummary = (session: Session | null): AuthSessionPayload | null => session ? {
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: session.expires_at,
  expiresIn: session.expires_in,
  tokenType: session.token_type,
} : null;

const getProfile = async (userId: string): Promise<AuthProfile | null> => {
  const { data, error } = await getSupabaseServiceClient()
    .from("profiles")
    .select("id,email,full_name,onboarding_completed,email_verified,role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HttpError(502, "Profile service is temporarily unavailable.", "PROFILE_UNAVAILABLE");
  return data as AuthProfile | null;
};

const ensureProfile = async (user: User, fullName: string): Promise<AuthProfile | null> => {
  const { data, error } = await getSupabaseServiceClient()
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      onboarding_completed: false,
      email_verified: Boolean(user.email_confirmed_at),
    }, { onConflict: "id" })
    .select("id,email,full_name,onboarding_completed,email_verified,role")
    .single();
  if (error) throw new HttpError(502, "Profile could not be initialized.", "PROFILE_INITIALIZATION_FAILED");
  return data as AuthProfile;
};

const resultFor = (user: User, session: Session | null, profile: AuthProfile | null): AuthResult => ({
  user: userSummary(user),
  session: sessionSummary(session),
  profile,
  ...(user.email_confirmed_at ? {} : { requiresVerification: true }),
});

export const authService = {
  async signup(input: SignupInput): Promise<AuthResult> {
    const { data, error } = await getSupabaseAnonClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    if (error) throw safeAuthError(error);
    if (!data.user) throw new HttpError(502, "Account could not be created.", "AUTH_SIGNUP_FAILED");
    if (!data.user.identities?.length) throw new HttpError(409, "This email is already registered. Please login.", "AUTH_EMAIL_EXISTS");

    const profile = await ensureProfile(data.user, input.fullName);
    await emailService.sendVerification({ recipient: input.email, displayName: input.fullName });
    return resultFor(data.user, data.session, profile);
  },

  async login(input: LoginInput, ip: string): Promise<AuthResult> {
    await authRateLimitService.assertLoginAllowed(input.email, ip);
    const { data, error } = await getSupabaseAnonClient().auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data.user || !data.session) {
      await authRateLimitService.recordLoginFailure(input.email, ip);
      throw safeAuthError(error ?? new Error("Invalid login credentials"));
    }
    await authRateLimitService.clearLoginFailures(input.email, ip);
    const profile = await getProfile(data.user.id);
    return resultFor(data.user, data.session, profile);
  },

  async verifyEmail(input: VerifyEmailInput): Promise<AuthResult> {
    const { data, error } = await getSupabaseAnonClient().auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: "signup",
    });
    if (error || !data.user) throw safeAuthError(error ?? new Error("Invalid verification code"));
    const { error: profileUpdateError } = await getSupabaseServiceClient().from("profiles").update({ email_verified: true }).eq("id", data.user.id);
    if (profileUpdateError) throw new HttpError(502, "Profile verification status could not be updated.", "PROFILE_UPDATE_FAILED");
    const profile = await getProfile(data.user.id);
    return resultFor(data.user, data.session, profile);
  },

  async resendVerification(email: string, ip: string): Promise<void> {
    await authRateLimitService.assertVerificationResendAllowed(email, ip);
    const { error } = await getSupabaseAnonClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) throw safeAuthError(error);
  },

  async forgotPassword(input: ForgotPasswordInput, ip: string): Promise<void> {
    await authRateLimitService.assertPasswordResetAllowed(input.email, ip);
    const { error } = await getSupabaseAnonClient().auth.resetPasswordForEmail(input.email, { redirectTo: resetRedirectUrl() });
    if (error) throw safeAuthError(error);
    await emailService.sendPasswordReset({ recipient: input.email });
  },

  async resetPassword(userId: string, input: ResetPasswordInput): Promise<void> {
    const { error } = await getSupabaseServiceClient().auth.admin.updateUserById(userId, { password: input.password });
    if (error) throw safeAuthError(error);
  },

  async refresh(input: RefreshInput): Promise<AuthResult> {
    const { data, error } = await getSupabaseAnonClient().auth.refreshSession({ refresh_token: input.refreshToken });
    if (error || !data.user) throw safeAuthError(error ?? new Error("Invalid refresh token"));
    const profile = await getProfile(data.user.id);
    return resultFor(data.user, data.session, profile);
  },

  async logout(accessToken: string): Promise<void> {
    const { error } = await getSupabaseServiceClient().auth.admin.signOut(accessToken, "global");
    if (error) throw new HttpError(502, "Logout could not be completed.", "AUTH_LOGOUT_FAILED");
  },

  async me(auth: AuthContext): Promise<AuthResult> {
    const { data, error } = await getSupabaseAnonClient().auth.getUser(auth.accessToken);
    if (error || !data.user) throw new HttpError(401, "Invalid or expired session.", "AUTH_INVALID");
    const profile = await getProfile(data.user.id);
    return resultFor(data.user, null, profile);
  },
};
