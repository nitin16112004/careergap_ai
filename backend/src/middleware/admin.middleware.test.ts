import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseStorageClient: () => ({ from: mocked.from }),
}));

import { requireAdmin } from "./admin.middleware";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.from.mockReturnValue({ select: mocked.select });
  mocked.select.mockReturnValue({ eq: mocked.eq });
  mocked.eq.mockReturnValue({ maybeSingle: mocked.maybeSingle });
});

describe("requireAdmin", () => {
  it("rejects a non-admin JWT before any database lookup", async () => {
    const next = vi.fn();
    await requireAdmin({ user: { userId: "user-1", role: "user" } } as never, {} as never, next);

    expect(mocked.from).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "ADMIN_REQUIRED" }));
  });

  it("rejects a stale admin JWT after the current profile role has been demoted", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: { role: "user" }, error: null });
    const next = vi.fn();

    await requireAdmin({ user: { userId: "admin-1", role: "admin" } } as never, {} as never, next);

    expect(mocked.from).toHaveBeenCalledWith("profiles");
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "ADMIN_REQUIRED" }));
  });

  it("allows a JWT admin whose current server-side profile role is still admin", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    const next = vi.fn();

    await requireAdmin({ user: { userId: "admin-1", role: "admin" } } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith();
  });
});
