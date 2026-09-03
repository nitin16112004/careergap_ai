import { getSupabaseServiceClient, getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

type AdminRole = "user" | "admin";

const audit = async (actorUserId: string, action: string, targetUserId: string, oldData: unknown, newData: unknown): Promise<void> => {
  const { error } = await getSupabaseStorageClient().from("audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: "user",
    entity_id: targetUserId,
    old_data: oldData,
    new_data: newData,
  });
  if (error) throw new HttpError(500, "Unable to persist admin audit log.", "ADMIN_AUDIT_LOG_FAILED", false);
};

const requireDifferentUser = (actorUserId: string, targetUserId: string, action: string): void => {
  if (actorUserId === targetUserId) {
    throw new HttpError(400, `You cannot ${action} your own admin account.`, "ADMIN_SELF_LOCKOUT_BLOCKED");
  }
};

export const adminUserService = {
  async authState(userId: string) {
    const { data, error } = await getSupabaseServiceClient().auth.admin.getUserById(userId);
    if (error || !data.user) throw new HttpError(404, "Auth user not found.", "ADMIN_AUTH_USER_NOT_FOUND");
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role: String(data.user.app_metadata?.role ?? "user"),
      appMetadata: { ...(data.user.app_metadata ?? {}) },
      bannedUntil: data.user.banned_until ?? null,
      lastSignInAt: data.user.last_sign_in_at ?? null,
      createdAt: data.user.created_at,
    };
  },

  async changeRole(actorUserId: string, targetUserId: string, role: AdminRole) {
    if (role === "user") requireDifferentUser(actorUserId, targetUserId, "remove admin access from");
    const client = getSupabaseServiceClient();
    const authState = await this.authState(targetUserId);
    const nextAppMetadata = { ...authState.appMetadata, role };
    const { data, error } = await client.auth.admin.updateUserById(targetUserId, {
      app_metadata: nextAppMetadata,
    });
    if (error || !data.user) throw new HttpError(500, "Unable to update auth role.", "ADMIN_USER_ROLE_AUTH_UPDATE_FAILED", false);

    const { error: profileError } = await getSupabaseStorageClient().from("profiles").update({
      role,
      updated_at: new Date().toISOString(),
    }).eq("id", targetUserId);
    if (profileError) {
      await client.auth.admin.updateUserById(targetUserId, { app_metadata: authState.appMetadata }).catch(() => undefined);
      throw new HttpError(500, "Unable to synchronize profile role.", "ADMIN_USER_ROLE_PROFILE_UPDATE_FAILED", false);
    }

    await audit(
      actorUserId,
      "user.role_changed",
      targetUserId,
      { role: authState.role, appMetadata: authState.appMetadata },
      { role, appMetadata: nextAppMetadata },
    );
    return { userId: targetUserId, role };
  },

  async setDisabled(actorUserId: string, targetUserId: string, disabled: boolean) {
    if (disabled) requireDifferentUser(actorUserId, targetUserId, "disable");
    const before = await this.authState(targetUserId);
    const { data, error } = await getSupabaseServiceClient().auth.admin.updateUserById(targetUserId, {
      ban_duration: disabled ? "876000h" : "none",
    });
    if (error || !data.user) throw new HttpError(500, disabled ? "Unable to disable user." : "Unable to enable user.", "ADMIN_USER_STATUS_UPDATE_FAILED", false);
    const next = { disabled, bannedUntil: data.user.banned_until ?? null };
    await audit(actorUserId, disabled ? "user.disabled" : "user.enabled", targetUserId, { bannedUntil: before.bannedUntil }, next);
    return { userId: targetUserId, ...next };
  },
};
