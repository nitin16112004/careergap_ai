export interface AuthContext {
  id: string;
  userId: string;
  email?: string;
  role: string;
  claims: Record<string, unknown>;
  accessToken?: string;
}

export interface HealthResult {
  status: "ok" | "degraded";
  service: string;
  details?: string;
}
