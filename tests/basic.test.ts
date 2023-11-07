import {
  asyncFiles,
  execBasic,
  runAlways,
  task,
  TrackedFile,
  trackFile,
} from "../dnit.ts";

import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

import { Manifest } from "../manifest.ts";
import { path } from "../deps.ts";

Deno.test("basic test", async () => {
  const tasksDone: { [key: string]: boolean } = {};

  const taskA = task({
    name: "taskA",
    description: "taskA",
    action: () => {
      console.log("taskA");
      tasksDone["taskA"] = true;
    },
    uptodate: runAlways,
  });

  const taskB = task({
    name: "taskB",
    description: "taskB",
    action: () => {
      console.log("taskB");
      tasksDone["taskB"] = true;
    },
    deps: [taskA],
    uptodate: runAlways,
  });

  const ctx = await execBasic(["taskB"], [taskA, taskB], new Manifest(""));
  await ctx.getTaskByName("taskB")?.exec(ctx);

  assertEquals(tasksDone["taskA"], true);
  assertEquals(tasksDone["taskB"], true);
});

/* Something flaky with this test
Deno.test("task up to date", async () => {
  const testDir = path.join(".test", uuid.v4.generate());
  await Deno.mkdir(testDir, { recursive: true });

  const tasksDone: { [key: string]: boolean } = {};

  const testFile: TrackedFile = file({
    path: path.join(testDir, "testFile.txt"),
  });
  await Deno.writeTextFile(testFile.path, uuid.v4.generate());

  const taskA = task({
    name: "taskA",
    description: "taskA",
    action: () => {
      console.log("taskA");
      tasksDone["taskA"] = true;
    },
    deps: [
      testFile,
    ],
  });

  // Setup:
  const manifest = new Manifest(""); // share manifest to simulate independent runs:

  {
    const ctx = await execBasic([], [taskA], manifest);

    // run once beforehand to setup manifest
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], true);
    tasksDone["taskA"] = false; // clear to reset
  }

  {
    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], false); // didn't run because of up-to-date
  }

  {
    /// Test: make not-up-to-date again
    tasksDone["taskA"] = false;
    await Deno.writeTextFile(testFile.path, uuid.v4.generate());

    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], true); // runs because of not up-to-date
  }

  await Deno.remove(testDir, { recursive: true });
});
*/

Deno.test("async file deps test", async () => {
  function genTrackedFiles(): Promise<TrackedFile[]> {
    return new Promise<TrackedFile[]>((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 1000);
    });
  }

  const tasksDone: { [key: string]: boolean } = {};

  const taskA = task({
    name: "taskA",
    description: "taskA",
    action: () => {
      console.log("taskA");
      tasksDone["taskA"] = true;
    },
    uptodate: runAlways,
  });

  const taskB = task({
    name: "taskB",
    description: "taskB",
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

  console.log("tempDir", tempDir);

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
