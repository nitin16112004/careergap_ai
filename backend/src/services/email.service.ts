export type AuthEmailKind = "welcome" | "verification" | "password_reset";

export interface AuthEmailRequest {
  kind: AuthEmailKind;
  recipient: string;
  displayName?: string;
}

export interface AuthEmailResult {
  provider: "supabase-auth";
  delegated: true;
  kind: AuthEmailKind;
}

/**
 * Auth email delivery is delegated to Supabase Auth for this phase. Keeping a
 * provider-neutral boundary here lets a later worker add branded templates
 * without coupling controllers to an email vendor.
 */
export const emailService = {
  async send(request: AuthEmailRequest): Promise<AuthEmailResult> {
    return { provider: "supabase-auth", delegated: true, kind: request.kind };
  },
  sendWelcome(request: Omit<AuthEmailRequest, "kind">) {
    return this.send({ ...request, kind: "welcome" });
  },
  sendVerification(request: Omit<AuthEmailRequest, "kind">) {
    return this.send({ ...request, kind: "verification" });
  },
  sendPasswordReset(request: Omit<AuthEmailRequest, "kind">) {
    return this.send({ ...request, kind: "password_reset" });
  },
};
