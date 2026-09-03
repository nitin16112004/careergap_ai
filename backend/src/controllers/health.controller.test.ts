import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  database: vi.fn(),
  redis: vi.fn(),
}));

vi.mock("../database/client", () => ({
  checkDatabaseConnection: mocked.database,
}));

vi.mock("../config/redis", () => ({
  checkRedisConnection: mocked.redis,
}));

vi.mock("../config/env", () => ({
  getEnv: () => ({
    AI_SERVICE_URL: "http://ai-service:8000",
    HEALTHCHECK_TIMEOUT_MS: 100,
  }),
}));

import { health, readiness } from "./health.controller";

const responseStub = () => {
  const response: any = {};
  response.status = vi.fn(() => response);
  response.json = vi.fn(() => response);
  return response;
};

const requestStub = () => ({
  log: { warn: vi.fn() },
}) as any;

beforeEach(() => {
  vi.clearAllMocks();
  mocked.database.mockResolvedValue(undefined);
  mocked.redis.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
});

describe("health controller", () => {
  it("returns liveness without touching external dependencies", () => {
    const response = responseStub();
    health(requestStub(), response, vi.fn());

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: "ok",
      service: "backend",
      check: "liveness",
    }));
    expect(mocked.database).not.toHaveBeenCalled();
    expect(mocked.redis).not.toHaveBeenCalled();
  });

  it("returns ready when database, Redis, and AI service are healthy", async () => {
    const request = requestStub();
    const response = responseStub();
    await readiness(request, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: "ok",
      check: "readiness",
      dependencies: expect.objectContaining({
        database: expect.objectContaining({ status: "ok" }),
        redis: expect.objectContaining({ status: "ok" }),
        "ai-service": expect.objectContaining({ status: "ok" }),
      }),
    }));
    expect(request.log.warn).not.toHaveBeenCalled();
  });

  it("returns degraded readiness without leaking dependency errors", async () => {
    mocked.redis.mockRejectedValue(new Error("redis://user:secret@internal-host"));
    const request = requestStub();
    const response = responseStub();
    await readiness(request, response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(503);
    const payload = response.json.mock.calls[0]?.[0];
    expect(payload.status).toBe("degraded");
    expect(payload.dependencies.redis.status).toBe("degraded");
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(request.log.warn).toHaveBeenCalled();
  });
});
