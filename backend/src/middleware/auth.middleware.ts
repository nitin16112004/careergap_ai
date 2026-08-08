import type { NextFunction, Request, Response } from "express";
import { getSupabaseAnonClient } from "../config/supabase";
import { HttpError } from "../utils/http-error";

export const requireSupabaseSession = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const header = request.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new HttpError(401, "Authentication required", "AUTH_REQUIRED");

    const { data, error } = await getSupabaseAnonClient().auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Invalid or expired session", "AUTH_INVALID");

    request.auth = {
      userId: data.user.id,
      email: data.user.email,
      role: String(data.user.app_metadata?.role ?? "user"),
      claims: data.user.app_metadata ?? {},
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
