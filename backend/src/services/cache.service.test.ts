import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  connectRedis: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock("../config/redis", () => ({
  connectRedis: mocked.connectRedis,
}));

import { cacheService } from "./cache.service";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.connectRedis.mockResolvedValue({
    get: mocked.get,
    set: mocked.set,
    del: mocked.del,
  });
  mocked.get.mockResolvedValue(null);
  mocked.set.mockResolvedValue("OK");
  mocked.del.mockResolvedValue(1);
});

describe("cacheService", () => {
  it("returns cached JSON without calling the database loader", async () => {
    mocked.get.mockResolvedValue(JSON.stringify([{ id: "role-1" }]));
    const loader = vi.fn(async () => [{ id: "role-2" }]);

    const result = await cacheService.remember("catalog:roles", 300, loader);

    expect(result).toEqual([{ id: "role-1" }]);
    expect(loader).not.toHaveBeenCalled();
    expect(mocked.get).toHaveBeenCalledWith("careerguid:cache:catalog:roles");
  });

  it("falls back to the loader when Redis is unavailable", async () => {
    mocked.connectRedis.mockRejectedValue(new Error("redis down"));
    const loader = vi.fn(async () => [{ id: "role-2" }]);

    const result = await cacheService.remember("catalog:roles", 300, loader);

    expect(result).toEqual([{ id: "role-2" }]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("stores loaded JSON with a bounded TTL", async () => {
    const loader = vi.fn(async () => ({ ready: true }));

    await cacheService.remember("health:test", 300, loader);

    expect(mocked.set).toHaveBeenCalledWith(
      "careerguid:cache:health:test",
      JSON.stringify({ ready: true }),
      { EX: 300 },
    );
  });

  it("evicts malformed cached JSON and reloads the source", async () => {
    mocked.get.mockResolvedValue("not-json");
    const loader = vi.fn(async () => ({ fresh: true }));

    const result = await cacheService.remember("catalog:roles", 300, loader);

    expect(result).toEqual({ fresh: true });
    expect(mocked.del).toHaveBeenCalledWith("careerguid:cache:catalog:roles");
  });
});
