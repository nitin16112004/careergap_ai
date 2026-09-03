import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getJobCounts: vi.fn(),
  close: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Queue: class {
    getJobCounts = mocked.getJobCounts;
    close = mocked.close;
  },
}));

vi.mock("../config/redis", () => ({
  getBullMqConnection: () => ({ host: "redis", port: 6379 }),
}));

import { operationsService } from "./operations.service";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.getJobCounts.mockResolvedValue({
    wait: 2,
    active: 1,
    completed: 10,
    failed: 3,
    delayed: 4,
    paused: 0,
  });
  mocked.close.mockResolvedValue(undefined);
});

describe("operationsService", () => {
  it("aggregates operational queue and dead-letter counts", async () => {
    const result = await operationsService.queueSummary();

    expect(result.queues.some((queue) => queue.name === "deadLetterQueue")).toBe(true);
    expect(result.queues).toHaveLength(6);
    expect(result.totals).toEqual({
      waiting: 12,
      active: 6,
      completed: 60,
      failed: 18,
      delayed: 24,
      paused: 0,
    });
    expect(mocked.close).toHaveBeenCalledTimes(6);
  });

  it("reports bounded runtime metadata without secrets", () => {
    const result = operationsService.runtimeSummary();

    expect(result.service).toBe("backend");
    expect(result.nodeVersion).toMatch(/^v/);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.memory.rss).toBeGreaterThan(0);
    expect(result.pid).toBeGreaterThan(0);
  });
});
