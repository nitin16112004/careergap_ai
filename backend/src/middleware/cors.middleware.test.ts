import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env", () => ({
  getEnv: () => ({
    NODE_ENV: "production",
    FRONTEND_URL: "https://app.careerguid.example/",
    ALLOWED_ORIGINS: "https://admin.careerguid.example, https://app.careerguid.example",
  }),
}));

import { allowedOrigins } from "./cors.middleware";

describe("allowedOrigins", () => {
  it("normalizes and deduplicates configured production origins", () => {
    expect(allowedOrigins()).toEqual([
      "https://app.careerguid.example",
      "https://admin.careerguid.example",
    ]);
  });

  it("does not automatically allow localhost in production", () => {
    expect(allowedOrigins()).not.toContain("http://localhost:5173");
  });
});
