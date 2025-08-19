import {
  asyncFiles,
  execBasic,
  runAlways,
  task,
  type TrackedFile,
  trackFile,
} from "../mod.ts";

import { assert, assertFalse } from "@std/assert";

import { Manifest } from "../manifest.ts";
import * as path from "@std/path";
import { createTempDir } from "./utils.ts";

Deno.test("basic test - two tasks with dependency", async () => {
  const tasksDone: { [key: string]: boolean } = {};

  const taskA = task({
    name: "taskA",
    action: () => {
      tasksDone["taskA"] = true;
    },
    uptodate: runAlways,
  });

  const taskB = task({
    name: "taskB",
    action: () => {
      tasksDone["taskB"] = true;
    },
    deps: [taskA],
    uptodate: runAlways,
  });

  const ctx = await execBasic(["taskB"], [taskA, taskB], new Manifest(""));

  // execute starting from taskB
  await ctx.getTaskByName("taskB")?.exec(ctx);

  // assert that both A and B are done:
  assert(tasksDone["taskA"]);
  assert(tasksDone["taskB"]);
});

Deno.test("task up to date", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tasksDone: { [key: string]: boolean } = {};

  const testFile: TrackedFile = trackFile(path.join(dirPath, "testFile.txt"));

  const initialContent = "initial-content-" + crypto.randomUUID();
  await Deno.writeTextFile(testFile.path, initialContent);

  const taskA = task({
    name: "taskA",
    action: () => {
      tasksDone["taskA"] = true;
    },
    deps: [testFile],
  });

  // Setup:
  const manifest = new Manifest(""); // share manifest to simulate independent runs:

  // === FIRST RUN (setup) ===
  {
    const ctx = await execBasic([], [taskA], manifest);

    // run once beforehand to setup manifest
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assert(tasksDone["taskA"]);
    tasksDone["taskA"] = false; // clear to reset
  }

  // === SECOND RUN (should be up to date) ===
  {
    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertFalse(tasksDone["taskA"]); // didn't run because of up-to-date
  }

  // === THIRD RUN (after file modification) ===
  {
    /// Test: make not-up-to-date again
    tasksDone["taskA"] = false;
    assertFalse(tasksDone["taskA"]);

    const newContent = "modified-content-" + crypto.randomUUID();
    await Deno.writeTextFile(testFile.path, newContent);

    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);

    assert(tasksDone["taskA"]); // ran because of not up-to-date
  }

  await cleanup();
});

Deno.test("async file deps test", async () => {
  function genTrackedFiles(): Promise<TrackedFile[]> {
    return new Promise<TrackedFile[]>((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 10);
    });
  }

  const tasksDone: { [key: string]: boolean } = {};

  const taskA = task({
    name: "taskA",
    action: () => {
      console.log("taskA");
      tasksDone["taskA"] = true;
    },
    uptodate: runAlways,
  });

  const taskB = task({
    name: "taskB",
    action: () => {
      console.log("taskB");
      tasksDone["taskB"] = true;
    },
    deps: [taskA, asyncFiles(genTrackedFiles)],
    uptodate: runAlways,
  });

  const ctx = await execBasic(["taskB"], [taskA, taskB], new Manifest(""));
  await ctx.getTaskByName("taskB")?.exec(ctx);

  assert(tasksDone["taskA"]);
  assert(tasksDone["taskB"]);
});

Deno.test("tasks with target and clean", async () => {
  const { dirPath, cleanup } = await createTempDir();

  const exampleTarget1 = trackFile({
    path: path.join(dirPath, "exampleTarget1.txt"),
  });
  const testTask1 = task({
    name: "testTask1",
    description: "Test task to generate (and allow clean) of an example target",
    action: async () => {
      await Deno.writeTextFile(exampleTarget1.path, "example contents");
    },
    targets: [exampleTarget1],
  });

  const exampleTarget2 = trackFile({
    path: path.join(dirPath, "exampleTarget2.txt"),
  });
  const testTask2 = task({
    name: "testTask2",
    description: "Test task to generate (and allow clean) of an example target",
    action: async () => {
      await Deno.writeTextFile(exampleTarget2.path, "example contents");
    },
    targets: [exampleTarget2],
  });

  // precheck nonexists
  assertFalse(await exampleTarget1.exists());
  assertFalse(await exampleTarget2.exists());

  // setup exec ctx
  const ctx = await execBasic([], [testTask1, testTask2], new Manifest(""));

  // run test tasks
  await ctx.getTaskByName("testTask1")?.exec(ctx);
  assert(await exampleTarget1.exists());

  await ctx.getTaskByName("testTask2")?.exec(ctx);
  assert(await exampleTarget2.exists());

  // clean
  await ctx.getTaskByName("clean")?.exec(ctx);

  // check nonexists
  assertFalse(await exampleTarget1.exists());
  assertFalse(await exampleTarget2.exists());

  // clean tempdir
  await cleanup();
});
