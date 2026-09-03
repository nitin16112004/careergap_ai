import type { Session, User } from "@supabase/supabase-js";

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

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
}
