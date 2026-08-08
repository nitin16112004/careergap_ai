import { supabase } from "../lib/supabase";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach the authentication service. Please check your connection.", 0, "NETWORK_ERROR");
  }

  const body = await response.json().catch(() => ({})) as { message?: string; errorCode?: string; data?: T };
  if (!response.ok) throw new ApiError(body.message || "Something went wrong. Please try again.", response.status, body.errorCode);
  return (body.data ?? body) as T;
};
