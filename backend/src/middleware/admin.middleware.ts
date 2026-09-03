import type { RequestHandler } from "express";
import { getSupabaseStorageClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export const requireAdmin: RequestHandler = async (request, _response, next) => {
  try {
    const auth = request.user ?? request.auth;
    if (!auth?.userId || auth.role !== "admin") {
      return next(new HttpError(403, "Admin access required", "ADMIN_REQUIRED"));
    }

    const { data, error } = await getSupabaseStorageClient()
      .from("profiles")
      .select("role")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error) {
      return next(new HttpError(503, "Admin authorization state is temporarily unavailable.", "ADMIN_AUTH_STATE_UNAVAILABLE", false));
    }
    if (data?.role !== "admin") {
      return next(new HttpError(403, "Admin access required", "ADMIN_REQUIRED"));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
