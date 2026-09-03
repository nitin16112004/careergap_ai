import { describe, expect, it, vi } from "vitest";

vi.mock("../config/supabase", () => ({
  getSupabaseServiceClient: () => ({
    auth: { admin: { getUserById: vi.fn(), updateUserById: vi.fn() } },
  }),
  getSupabaseStorageClient: () => ({ from: vi.fn() }),
}));

import { adminUserService } from "./admin-user.service";

describe("adminUserService self-lockout protections", () => {
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
});
