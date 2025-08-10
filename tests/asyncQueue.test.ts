import { AsyncQueue } from "../utils/asyncQueue.ts";

import { assert } from "@std/assert";

class TestHelper {
  numInProgress = 0;
  maxInProgress = 0;

  incrementInProgress() {
    this.numInProgress += 1;
    this.maxInProgress = Math.max(this.maxInProgress, this.numInProgress);
  }

  decrementInProgress() {
    this.numInProgress -= 1;
  }

  action = () => {
    this.incrementInProgress();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.decrementInProgress();
        resolve();
      }, 10);
    });
  };
}

Deno.test("async queue", async () => {
  for (let concurrency = 1; concurrency <= 32; concurrency *= 2) {
    const ctx = new TestHelper();

    const numTasks = concurrency * 10;
    const asyncQueue = new AsyncQueue(concurrency);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < numTasks; ++i) {
      promises.push(asyncQueue.schedule(ctx.action));
      //promises.push(ctx.action()); // equivalent code but without the asyncQueue (runs them all in parallel)
    }
    await Promise.all(promises);
    console.log(`maxInProgress: ${ctx.maxInProgress}`);
    assert(ctx.maxInProgress <= concurrency);
  }
});
