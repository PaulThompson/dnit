import { AsyncQueue } from "../utils/asyncQueue.ts";

import { assert } from "@std/assert";

class TestHelper {
  static numInProgress = 0;
  static maxInProgress = 0;

  static incrementInProgress() {
    TestHelper.numInProgress += 1;
    TestHelper.maxInProgress = Math.max(TestHelper.maxInProgress, TestHelper.numInProgress);
  }

  static decrementInProgress() {
    TestHelper.numInProgress -= 1;
  }

  static reset() {
    TestHelper.numInProgress = 0;
    TestHelper.maxInProgress = 0;
  }

  action = () => {
    TestHelper.incrementInProgress();
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        TestHelper.decrementInProgress();
        resolve();
      }, 10);
    });
  };
}

Deno.test("async queue", async () => {
  for (let concurrency = 1; concurrency <= 32; concurrency *= 2) {
    TestHelper.reset();

    const numTasks = concurrency * 10;
    const asyncQueue = new AsyncQueue(concurrency);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < numTasks; ++i) {
      const th = new TestHelper();
      promises.push(asyncQueue.schedule(th.action));
      //promises.push(th.action()); // equivalent code but without the asyncQueue (runs them all in parallel)
    }
    await Promise.all(promises);
    console.log(`maxInProgress: ${TestHelper.maxInProgress}`);
    assert(TestHelper.maxInProgress <= concurrency);
  }
});
