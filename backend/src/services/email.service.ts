import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { HttpError } from "../utils/http-error";

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

export interface TransactionalEmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface TransactionalEmailResult {
  provider: "resend" | "console";
  providerMessageId: string;
}

const EMAIL_TIMEOUT_MS = 15_000;

/**
 * Authentication emails remain delegated to Supabase Auth. Product-generated
 * reminder emails use the transactional provider boundary below so they can be
 * delivered asynchronously from BullMQ without coupling workers to a vendor.
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

  async sendTransactional(input: TransactionalEmailRequest): Promise<TransactionalEmailResult> {
    const env = getEnv();

    if (env.EMAIL_PROVIDER === "console") {
      if (env.NODE_ENV === "production") {
        throw new HttpError(503, "Email provider is not configured.", "EMAIL_PROVIDER_NOT_CONFIGURED", false);
      }
      const providerMessageId = `console-${Date.now()}`;
      logger.info({ providerMessageId, subject: input.subject }, "development email delivery simulated");
      return { provider: "console", providerMessageId };
    }

    if (!env.EMAIL_PROVIDER_API_KEY.trim() || !env.EMAIL_FROM.trim()) {
      throw new HttpError(503, "Email provider credentials are incomplete.", "EMAIL_PROVIDER_NOT_CONFIGURED", false);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
    try {
      const response = await fetch(`${env.EMAIL_PROVIDER_BASE_URL.replace(/\/$/, "")}/emails`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({})) as { id?: unknown };
      if (!response.ok) {
        throw new HttpError(502, "Email provider rejected the message.", "EMAIL_PROVIDER_FAILED", false);
      }

      const providerMessageId = typeof payload.id === "string" && payload.id.trim()
        ? payload.id
        : `resend-${Date.now()}`;
      return { provider: "resend", providerMessageId };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpError(504, "Email provider timed out.", "EMAIL_PROVIDER_TIMEOUT", false);
      }
      throw new HttpError(502, "Email delivery failed.", "EMAIL_PROVIDER_FAILED", false);
    } finally {
      clearTimeout(timeout);
    }
  },
};
