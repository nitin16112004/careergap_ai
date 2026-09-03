import { Queue } from "bullmq";
import { getBullMqConnection } from "../config/redis";
import { queueNames } from "../jobs/queues";

const operationalQueueNames = [...queueNames, "deadLetterQueue"] as const;

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

const readQueueCounts = async (name: string): Promise<QueueCounts> => {
  const queue = new Queue(name, { connection: getBullMqConnection() });
  try {
    const counts = await queue.getJobCounts("wait", "active", "completed", "failed", "delayed", "paused");
    return {
      waiting: counts.wait ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  } finally {
    await queue.close();
  }
};

export const operationsService = {
  async queueSummary(): Promise<{
    queues: Array<{ name: string; counts: QueueCounts }>;
    totals: QueueCounts;
    generatedAt: string;
  }> {
    const queueCounts = await Promise.all(
      operationalQueueNames.map(async (name) => ({ name, counts: await readQueueCounts(name) })),
    );

    const totals = queueCounts.reduce<QueueCounts>((aggregate, queue) => ({
      waiting: aggregate.waiting + queue.counts.waiting,
      active: aggregate.active + queue.counts.active,
      completed: aggregate.completed + queue.counts.completed,
      failed: aggregate.failed + queue.counts.failed,
      delayed: aggregate.delayed + queue.counts.delayed,
      paused: aggregate.paused + queue.counts.paused,
    }), { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 });

    return {
      queues: queueCounts,
      totals,
      generatedAt: new Date().toISOString(),
    };
  },

  runtimeSummary(): {
    service: string;
    nodeVersion: string;
    uptimeSeconds: number;
    memory: NodeJS.MemoryUsage;
    pid: number;
    generatedAt: string;
  } {
    return {
      service: "backend",
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      pid: process.pid,
      generatedAt: new Date().toISOString(),
    };
  },
};
