import {
  asyncFiles,
  execBasic,
  runAlways,
  task,
  type TaskContext,
  type TrackedFile,
  trackFile,
} from "../mod.ts";

import { assertEquals } from "@std/assert";

import { Manifest } from "../manifest.ts";
import * as path from "@std/path";

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

Deno.test("task up to date", async () => {
  const testDir = path.join(".test", crypto.randomUUID());
  await Deno.mkdir(testDir, { recursive: true });

  const tasksDone: { [key: string]: boolean } = {};

  // Custom hash function with verbose logging
  const customGetHash = async (filename: string, _stat: Deno.FileInfo) => {
    const content = await Deno.readTextFile(filename);
    const hash = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(content),
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    console.log(`[HASH] ${filename}: content="${content}" -> hash=${hashHex}`);
    return hashHex;
  };

  // Custom timestamp function with verbose logging
  const customGetTimestamp = (_filename: string, stat: Deno.FileInfo) => {
    const timestamp = stat.mtime?.toISOString() || "";
    console.log(
      `[TIMESTAMP] ${_filename}: ${timestamp} (mtime: ${stat.mtime?.getTime()})`,
    );
    return timestamp;
  };

  const testFile: TrackedFile = trackFile({
    path: path.join(testDir, "testFile.txt"),
    getHash: customGetHash,
    getTimestamp: customGetTimestamp,
  });

  const initialContent = "initial-content-" + crypto.randomUUID();
  console.log(`[INIT] Writing initial content: "${initialContent}"`);
  await Deno.writeTextFile(testFile.path, initialContent);

  // Test now uses the builtin TrackedFile.isUpToDate() logic which has Windows-specific handling

  const taskA = task({
    name: "taskA",
    description: "taskA",
    action: () => {
      console.log("taskA EXECUTED");
      tasksDone["taskA"] = true;
    },
    deps: [testFile],
    // Remove custom uptodate function - use the builtin TrackedFile.isUpToDate() logic
  });

  // Setup:
  const manifest = new Manifest(""); // share manifest to simulate independent runs:

  console.log("\n=== FIRST RUN (setup) ===");
  {
    const ctx = await execBasic([], [taskA], manifest);

    // run once beforehand to setup manifest
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], true);
    tasksDone["taskA"] = false; // clear to reset
  }

  console.log("\n=== SECOND RUN (should be up to date) ===");
  {
    const ctx = await execBasic([], [taskA], manifest);
    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], false); // didn't run because of up-to-date
  }

  console.log("\n=== THIRD RUN (after file modification) ===");
  {
    /// Test: make not-up-to-date again
    tasksDone["taskA"] = false;
    assertEquals(tasksDone["taskA"], false);

    const newContent = "modified-content-" + crypto.randomUUID();
    console.log(`[MODIFY] Writing new content: "${newContent}"`);
    await Deno.writeTextFile(testFile.path, newContent);

    // Small delay to ensure file system operations complete
    await new Promise((resolve) => setTimeout(resolve, 10));

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
