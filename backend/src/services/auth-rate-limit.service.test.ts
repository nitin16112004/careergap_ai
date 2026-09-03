import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  connectRedis: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  redis: { isOpen: true } as { isOpen: boolean; incr?: unknown; expire?: unknown; get?: unknown; del?: unknown },
}));

vi.mock("../config/redis", () => ({
  connectRedis: mocked.connectRedis,
  getRedisClient: () => mocked.redis,
}));

import { authRateLimitService } from "./auth-rate-limit.service";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.redis.isOpen = true;
  mocked.redis.incr = mocked.incr;
  mocked.redis.expire = mocked.expire;
  mocked.redis.get = mocked.get;
  mocked.redis.del = mocked.del;
  mocked.connectRedis.mockResolvedValue(mocked.redis);
  mocked.incr.mockResolvedValue(1);
  mocked.expire.mockResolvedValue(true);
  mocked.get.mockResolvedValue("0");
  mocked.del.mockResolvedValue(2);
});

describe("authRateLimitService", () => {
  it("blocks login when either failure counter reaches the five-attempt limit", async () => {
    mocked.get.mockResolvedValueOnce("4").mockResolvedValueOnce("5");

    await expect(authRateLimitService.assertLoginAllowed("User@Example.com", "203.0.113.5")).rejects.toMatchObject({
      statusCode: 429,
      code: "AUTH_LOGIN_RATE_LIMITED",
    });
    expect(mocked.get).toHaveBeenCalledTimes(2);
  });

  it("records a failed login against both email+ip and ip counters with a one-minute TTL", async () => {
    mocked.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await authRateLimitService.recordLoginFailure("user@example.com", "203.0.113.7");

    expect(mocked.incr).toHaveBeenCalledTimes(2);
    expect(mocked.expire).toHaveBeenCalledTimes(2);
    expect(mocked.expire).toHaveBeenNthCalledWith(1, expect.stringMatching(/^auth:login-fail:/), 60);
    expect(mocked.expire).toHaveBeenNthCalledWith(2, expect.stringMatching(/^auth:login-fail:/), 60);
  });

  it("blocks the fourth verification resend inside the ten-minute window", async () => {
    mocked.incr.mockResolvedValueOnce(4).mockResolvedValueOnce(4);

    await expect(authRateLimitService.assertVerificationResendAllowed("user@example.com", "203.0.113.8")).rejects.toMatchObject({
      statusCode: 429,
      code: "AUTH_VERIFICATION_RATE_LIMITED",
    });
    expect(mocked.expire).not.toHaveBeenCalled();
  });

  it("fails open when Redis is unavailable so auth availability is preserved", async () => {
    mocked.connectRedis.mockRejectedValue(new Error("redis down"));
    mocked.redis.isOpen = false;

    await expect(authRateLimitService.recordLoginFailure("user@example.com", "203.0.113.9")).resolves.toBeUndefined();
    await expect(authRateLimitService.assertVerificationResendAllowed("user@example.com", "203.0.113.9")).resolves.toBeUndefined();
    await expect(authRateLimitService.assertLoginAllowed("user@example.com", "203.0.113.9")).resolves.toBeUndefined();
  });

  it("clears both login failure keys after a successful login when Redis is open", async () => {
    await authRateLimitService.clearLoginFailures("user@example.com", "203.0.113.10");

    expect(mocked.del).toHaveBeenCalledTimes(1);
    expect(mocked.del.mock.calls[0][0]).toHaveLength(2);
  });
});
