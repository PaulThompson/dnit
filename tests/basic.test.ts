import {
  asyncFiles,
  execBasic,
  runAlways,
  task,
  type TrackedFile,
  trackFile,
} from "../mod.ts";

import { assertEquals } from "@std/assert";

import { Manifest } from "../manifest.ts";
import * as path from "@std/path";

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
  assertEquals(tasksDone["taskA"], true);
  assertEquals(tasksDone["taskB"], true);
});

Deno.test("task up to date", async () => {
  const testDir = await Deno.makeTempDir();
  const tasksDone: { [key: string]: boolean } = {};

  const testFile: TrackedFile = trackFile(path.join(testDir, "testFile.txt"));

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
    assertEquals(tasksDone["taskA"], true);
    tasksDone["taskA"] = false; // clear to reset
  }

  // === SECOND RUN (should be up to date) ===
  {
    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], false); // didn't run because of up-to-date
  }

  // === THIRD RUN (after file modification) ===
  {
    /// Test: make not-up-to-date again
    tasksDone["taskA"] = false;
    assertEquals(tasksDone["taskA"], false);

    const newContent = "modified-content-" + crypto.randomUUID();
    await Deno.writeTextFile(testFile.path, newContent);

    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);

    assertEquals(tasksDone["taskA"], true); // ran because of not up-to-date
  }

  await Deno.remove(testDir, { recursive: true });
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

  assertEquals(tasksDone["taskA"], true);
  assertEquals(tasksDone["taskB"], true);
});

Deno.test("tasks with target and clean", async () => {
  const tempDir = await Deno.makeTempDir();

  const exampleTarget1 = trackFile({
    path: path.join(tempDir, "exampleTarget1.txt"),
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
    path: path.join(tempDir, "exampleTarget2.txt"),
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
  assertEquals(await exampleTarget1.exists(), false);
  assertEquals(await exampleTarget2.exists(), false);

  // setup exec ctx
  const ctx = await execBasic([], [testTask1, testTask2], new Manifest(""));

  // run test tasks
  await ctx.getTaskByName("testTask1")?.exec(ctx);
  assertEquals(await exampleTarget1.exists(), true);

  await ctx.getTaskByName("testTask2")?.exec(ctx);
  assertEquals(await exampleTarget2.exists(), true);

  // clean
  await ctx.getTaskByName("clean")?.exec(ctx);

  // check nonexists
  assertEquals(await exampleTarget1.exists(), false);
  assertEquals(await exampleTarget2.exists(), false);

  // clean tempdir
  await Deno.remove(tempDir, { recursive: true });
});
