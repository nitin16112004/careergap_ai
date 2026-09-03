import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  profileUpdate: vi.fn(),
  profileEq: vi.fn(),
  auditInsert: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../config/supabase", () => ({
  getSupabaseServiceClient: () => ({
    auth: { admin: { getUserById: mocks.getUserById, updateUserById: mocks.updateUserById } },
  }),
  getSupabaseStorageClient: () => ({ from: mocks.from }),
}));

import { adminUserService } from "./admin-user.service";

const authUser = (role: "user" | "admin" = "user") => ({
  id: "user-1",
  email: "user@example.com",
  app_metadata: { role, tenant: "career-guid", featureFlag: "keep-me" },
  banned_until: null,
  last_sign_in_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
});

describe("adminUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileEq.mockResolvedValue({ error: null });
    mocks.profileUpdate.mockReturnValue({ eq: mocks.profileEq });
    mocks.auditInsert.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") return { update: mocks.profileUpdate };
      if (table === "audit_logs") return { insert: mocks.auditInsert };
      return {};
    });
  });

  it("does not allow an admin to demote their own account", async () => {
    await expect(adminUserService.changeRole("admin-1", "admin-1", "user")).rejects.toMatchObject({
      statusCode: 400,
      code: "ADMIN_SELF_LOCKOUT_BLOCKED",
    });
  });

  it("does not allow an admin to disable their own account", async () => {
    await expect(adminUserService.setDisabled("admin-1", "admin-1", true)).rejects.toMatchObject({
      statusCode: 400,
      code: "ADMIN_SELF_LOCKOUT_BLOCKED",
    });
  });

  it("preserves existing auth app metadata when changing a user role", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: authUser("user") }, error: null });
    mocks.updateUserById.mockResolvedValue({ data: { user: authUser("admin") }, error: null });

    await expect(adminUserService.changeRole("admin-1", "user-1", "admin")).resolves.toEqual({
      userId: "user-1",
      role: "admin",
    });

    expect(mocks.updateUserById).toHaveBeenNthCalledWith(1, "user-1", {
      app_metadata: { role: "admin", tenant: "career-guid", featureFlag: "keep-me" },
    });
  });

  it("restores the complete original auth metadata when profile role synchronization fails", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: authUser("user") }, error: null });
    mocks.updateUserById.mockResolvedValue({ data: { user: authUser("admin") }, error: null });
    mocks.profileEq.mockResolvedValue({ error: { message: "database unavailable" } });

    await expect(adminUserService.changeRole("admin-1", "user-1", "admin")).rejects.toMatchObject({
      statusCode: 500,
      code: "ADMIN_USER_ROLE_PROFILE_UPDATE_FAILED",
    });

    expect(mocks.updateUserById).toHaveBeenNthCalledWith(2, "user-1", {
      app_metadata: { role: "user", tenant: "career-guid", featureFlag: "keep-me" },
    });
  });
});
