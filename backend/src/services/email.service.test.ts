import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "../config/env";

const baseEnv = {
  FRONTEND_URL: "http://localhost:5173",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  REDIS_URL: "redis://localhost:6379",
  AI_SERVICE_URL: "http://localhost:8000",
};

let emailService: typeof import("./email.service").emailService;

const setBaseEnv = (): void => {
  for (const [key, value] of Object.entries(baseEnv)) vi.stubEnv(key, value);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("EMAIL_PROVIDER", "console");
  vi.stubEnv("EMAIL_PROVIDER_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  resetEnvForTests();
};

beforeAll(async () => {
  setBaseEnv();
  ({ emailService } = await import("./email.service"));
});

beforeEach(() => {
  setBaseEnv();
});

afterAll(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("emailService reminder delivery", () => {
  it("allows console delivery only in non-production environments", async () => {
    const result = await emailService.sendTransactional({
      to: "user@example.com",
      subject: "Reminder",
      html: "<p>Reminder</p>",
      text: "Reminder",
    });

    expect(result.provider).toBe("console");
    expect(result.providerMessageId).toMatch(/^console-/);
  });

  it("fails closed when production is configured with the console provider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    resetEnvForTests();

    await expect(emailService.sendTransactional({
      to: "user@example.com",
      subject: "Reminder",
      html: "<p>Reminder</p>",
      text: "Reminder",
    })).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
      statusCode: 503,
    });
  });

  it("requires transactional provider credentials before calling the network", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    resetEnvForTests();

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(emailService.sendTransactional({
      to: "user@example.com",
      subject: "Reminder",
      html: "<p>Reminder</p>",
      text: "Reminder",
    })).rejects.toMatchObject({ code: "EMAIL_PROVIDER_NOT_CONFIGURED" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("passes a stable idempotency key to the transactional provider", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("EMAIL_PROVIDER_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "CareerGuid AI <reminders@example.com>");
    resetEnvForTests();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "email-123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const result = await emailService.sendTransactional({
      to: "user@example.com",
      subject: "Reminder",
      html: "<p>Reminder</p>",
      text: "Reminder",
      idempotencyKey: "reminder/reminder-log-123",
    });

    expect(result).toEqual({ provider: "resend", providerMessageId: "email-123" });
    const request = fetchSpy.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({ "idempotency-key": "reminder/reminder-log-123" });
    fetchSpy.mockRestore();
  });
});
