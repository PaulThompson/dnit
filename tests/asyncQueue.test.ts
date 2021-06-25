import { AsyncQueue } from "../asyncQueue.ts";

import { assert } from "https://deno.land/std@0.99.0/testing/asserts.ts";

class TestHelperCtx {
  numInProgress = 0;
  maxInProgress = 0;
}

class TestHelper {
  started = false;
  completed = false;

  constructor(public ctx: TestHelperCtx) {}

  action = () => {
    this.started = true;
    this.ctx.numInProgress += 1;
    this.ctx.maxInProgress = Math.max(
      this.ctx.maxInProgress,
      this.ctx.numInProgress,
    );
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.completed = true;
        this.ctx.numInProgress -= 1;
        resolve();
      }, 10);
    });
  };
}

Deno.test("async queue", async () => {
  for (let concurrency = 1; concurrency <= 32; concurrency *= 2) {
    const ctx: TestHelperCtx = new TestHelperCtx();

    const numTasks = concurrency * 10;
    const testHelpers: TestHelper[] = [];
    for (let i = 0; i < numTasks; ++i) {
      testHelpers.push(new TestHelper(ctx));
    }

    // deno-lint-ignore no-explicit-any
    const asyncQueue: AsyncQueue<any, any> = new AsyncQueue(concurrency);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < numTasks; ++i) {
      const th = testHelpers[i];
      promises.push(asyncQueue.schedule(th.action));
      //promises.push(th.action()); // equivalent code but without the asyncQueue (runs them all in parallel)
    }
    await Promise.all(promises);
    console.log(`ctx.maxInProgress: ${ctx.maxInProgress}`);
    assert(ctx.maxInProgress <= concurrency);
  }
});
