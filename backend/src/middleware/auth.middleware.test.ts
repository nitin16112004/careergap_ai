import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getUser: vi.fn(),
  touch: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseAnonClient: () => ({ auth: { getUser: mocked.getUser } }),
}));

vi.mock("../services/activity.service", () => ({
  activityService: { touch: mocked.touch },
}));

import { requireSupabaseSession } from "./auth.middleware";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.touch.mockResolvedValue(undefined);
});

const requestWith = (authorization?: string) => ({
  header: (name: string) => name.toLowerCase() === "authorization" ? authorization : undefined,
}) as any;

describe("requireSupabaseSession", () => {
  it("rejects requests without a bearer token", async () => {
    const next = vi.fn();
    await requireSupabaseSession(requestWith(), {} as never, next);

    expect(mocked.getUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: "AUTH_REQUIRED" }));
  });

  it("rejects invalid or expired Supabase sessions", async () => {
    mocked.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    const next = vi.fn();
    await requireSupabaseSession(requestWith("Bearer bad-token"), {} as never, next);

    expect(mocked.getUser).toHaveBeenCalledWith("bad-token");
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: "AUTH_INVALID" }));
  });

  it("hydrates both request auth contexts from a verified Supabase user", async () => {
    mocked.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com", app_metadata: { role: "admin", tenant: "career" } } },
      error: null,
    });
    const request = requestWith("Bearer valid-token");
    const next = vi.fn();

    await requireSupabaseSession(request, {} as never, next);

    expect(request.auth).toMatchObject({ userId: "user-1", role: "admin", accessToken: "valid-token" });
    expect(request.user).toEqual(request.auth);
    expect(request.auth.claims).toEqual({ role: "admin", tenant: "career" });
    expect(mocked.touch).toHaveBeenCalledWith("user-1");
    expect(next).toHaveBeenCalledWith();
  });
});
