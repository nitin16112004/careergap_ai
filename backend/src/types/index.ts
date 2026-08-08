export interface AuthContext {
  userId: string;
  email?: string;
  role: string;
  claims: Record<string, unknown>;
}

export interface HealthResult {
  status: "ok" | "degraded";
  service: string;
  details?: string;
}
