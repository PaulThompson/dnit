import { AsyncQueue } from "../utils/asyncQueue.ts";

import { assertLessOrEqual } from "@std/assert";

class TestConcurrency {
  numInProgress = 0;
  maxInProgress = 0;

  start() {
    this.numInProgress += 1;
    this.maxInProgress = Math.max(this.maxInProgress, this.numInProgress);
  }

  finish() {
    this.numInProgress -= 1;
  }

  action = () => {
    this.start();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.finish();
        resolve();
      }, 10);
    });
  };
}

Deno.test("async queue", async () => {
  for (let concurrency = 1; concurrency <= 32; concurrency *= 2) {
    const ctx = new TestConcurrency();

    const numTasks = concurrency * 10;
    const asyncQueue = new AsyncQueue(concurrency);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < numTasks; ++i) {
      promises.push(asyncQueue.schedule(ctx.action));
    }
    await Promise.all(promises);
    assertLessOrEqual(ctx.maxInProgress, concurrency);
  }
});
