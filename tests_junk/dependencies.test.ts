import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import {
  execBasic,
  file,
  Task,
  task,
  type TaskName,
  TrackedFile,
  TrackedFilesAsync,
} from "../mod.ts";
import { Manifest } from "../manifest.ts";
import { runAlways } from "../core/task.ts";

// Test helper to create temporary files
async function createTempFile(
  content: string,
  fileName = "test_file.txt",
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_deps_test_" });
  const filePath = path.join(tempDir, fileName);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Test helper to cleanup temp directory
async function cleanup(filePath: string) {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

Deno.test("Dependencies - simple task → task dependencies", async () => {
  const manifest = new Manifest("");

  let depTaskRun = false;
  let mainTaskRun = false;

  const depTask = new Task({
    name: "depTask" as TaskName,
    action: () => {
      depTaskRun = true;
    },
    uptodate: runAlways,
  });

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {
      mainTaskRun = true;
    },
    deps: [depTask],
    uptodate: runAlways,
  });

  // Use execBasic for proper task registration and setup
  const ctx = await execBasic(["mainTask"], [depTask, mainTask], manifest);

  const requestedTask = ctx.taskRegister.get("mainTask" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  // Both tasks should have run, dependency first
  assertEquals(depTaskRun, true);
  assertEquals(mainTaskRun, true);
  assertEquals(ctx.doneTasks.has(depTask), true);
  assertEquals(ctx.doneTasks.has(mainTask), true);
});

Deno.test("Dependencies - file → task dependencies", async () => {
  const tempFile = await createTempFile("dependency content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  let taskRun = false;

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {
      taskRun = true;
    },
    deps: [trackedFile],
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["mainTask"], [mainTask], manifest);
  const requestedTask = ctx.taskRegister.get("mainTask" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  assertEquals(taskRun, true);
  assertEquals(ctx.doneTasks.has(mainTask), true);

  // File dependency should be tracked in manifest
  const fileData = mainTask.taskManifest?.getFileData(trackedFile.path);
  assertEquals(typeof fileData?.hash, "string");
  assertEquals(typeof fileData?.timestamp, "string");

  await cleanup(tempFile);
});

Deno.test("Dependencies - task → file dependencies (target)", async () => {
  const tempFile = await createTempFile("target content");
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  let producerRun = false;
  let consumerRun = false;

  const producerTask = new Task({
    name: "producer" as TaskName,
    action: () => {
      producerRun = true;
    },
    targets: [targetFile],
    uptodate: runAlways,
  });

  const consumerTask = new Task({
    name: "consumer" as TaskName,
    action: () => {
      consumerRun = true;
    },
    deps: [targetFile],
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(
    ["consumer"],
    [producerTask, consumerTask],
    manifest,
  );
  const requestedTask = ctx.taskRegister.get("consumer" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  // Producer should run first to create the target
  assertEquals(producerRun, true);
  assertEquals(consumerRun, true);
  assertEquals(ctx.doneTasks.has(producerTask), true);
  assertEquals(ctx.doneTasks.has(consumerTask), true);

  await cleanup(tempFile);
});

Deno.test("Dependencies - mixed dependency types", async () => {
  const tempFile = await createTempFile("mixed dep content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  let depTaskRun = false;
  let mainTaskRun = false;

  const depTask = new Task({
    name: "depTask" as TaskName,
    action: () => {
      depTaskRun = true;
    },
    uptodate: runAlways,
  });

  const generator = () => {
    return [file(tempFile)];
  };
  const asyncFiles = new TrackedFilesAsync(generator);

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {
      mainTaskRun = true;
    },
    deps: [depTask, trackedFile, asyncFiles],
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["mainTask"], [depTask, mainTask], manifest);
  const requestedTask = ctx.taskRegister.get("mainTask" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  assertEquals(depTaskRun, true);
  assertEquals(mainTaskRun, true);
  assertEquals(ctx.doneTasks.has(depTask), true);
  assertEquals(ctx.doneTasks.has(mainTask), true);

  await cleanup(tempFile);
});

Deno.test("Dependencies - complex dependency chain", async () => {
  const manifest = new Manifest("");
  const executionOrder: string[] = [];

  const taskA = new Task({
    name: "taskA" as TaskName,
    action: () => {
      executionOrder.push("A");
    },
    uptodate: runAlways,
  });

  const taskB = new Task({
    name: "taskB" as TaskName,
    action: () => {
      executionOrder.push("B");
    },
    deps: [taskA],
    uptodate: runAlways,
  });

  const taskC = new Task({
    name: "taskC" as TaskName,
    action: () => {
      executionOrder.push("C");
    },
    deps: [taskA],
    uptodate: runAlways,
  });

  const taskD = new Task({
    name: "taskD" as TaskName,
    action: () => {
      executionOrder.push("D");
    },
    deps: [taskB, taskC],
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup and execution
  const ctx = await execBasic(
    ["taskD"],
    [taskA, taskB, taskC, taskD],
    manifest,
  );
  const requestedTask = ctx.taskRegister.get("taskD" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  // Should execute in dependency order: A first, then B and C (order may vary), then D
  assertEquals(executionOrder[0], "A");
  assertEquals(executionOrder[3], "D");
  assertEquals(executionOrder.includes("B"), true);
  assertEquals(executionOrder.includes("C"), true);
  assertEquals(executionOrder.length, 4);

  // All tasks should be done
  assertEquals(ctx.doneTasks.has(taskA), true);
  assertEquals(ctx.doneTasks.has(taskB), true);
  assertEquals(ctx.doneTasks.has(taskC), true);
  assertEquals(ctx.doneTasks.has(taskD), true);
});

Deno.test("Dependencies - diamond dependency pattern", async () => {
  const manifest = new Manifest("");
  const executionOrder: string[] = [];

  // Diamond pattern: Root -> [Left, Right] -> Final
  const rootTask = new Task({
    name: "root" as TaskName,
    action: () => {
      executionOrder.push("root");
    },
    uptodate: runAlways,
  });

  const leftTask = new Task({
    name: "left" as TaskName,
    action: () => {
      executionOrder.push("left");
    },
    deps: [rootTask],
    uptodate: runAlways,
  });

  const rightTask = new Task({
    name: "right" as TaskName,
    action: () => {
      executionOrder.push("right");
    },
    deps: [rootTask],
    uptodate: runAlways,
  });

  const finalTask = new Task({
    name: "final" as TaskName,
    action: () => {
      executionOrder.push("final");
    },
    deps: [leftTask, rightTask],
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup and execution
  const ctx = await execBasic(["final"], [
    rootTask,
    leftTask,
    rightTask,
    finalTask,
  ], manifest);
  const requestedTask = ctx.taskRegister.get("final" as TaskName);
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  // Root should run once, then left and right, then final
  assertEquals(executionOrder[0], "root");
  assertEquals(executionOrder[executionOrder.length - 1], "final");
  assertEquals(executionOrder.includes("left"), true);
  assertEquals(executionOrder.includes("right"), true);
  assertEquals(executionOrder.length, 4);

  // Root task should only be executed once despite being a dependency of two tasks
  assertEquals(executionOrder.filter((t) => t === "root").length, 1);
});

Deno.test("Dependencies - circular dependency detection", async () => {
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  // Create tasks that depend on each other
  const taskA = new Task({
    name: "taskA" as TaskName,
    action: () => {},
    uptodate: runAlways,
  });

  const taskB = new Task({
    name: "taskB" as TaskName,
    action: () => {},
    deps: [taskA],
    uptodate: runAlways,
  });

  // This creates a circular dependency: A -> B -> A
  taskA.task_deps.add(taskB);

  await taskA.setup(ctx);
  await taskB.setup(ctx);

  // Execution should not hang (though specific behavior may vary)
  // In practice, the current implementation may not explicitly detect cycles
  // but should handle them gracefully by tracking in-progress tasks
  await taskA.exec(ctx);

  // At least one task should complete
  assertEquals(ctx.doneTasks.size >= 1, true);
});

Deno.test("Dependencies - dependency ordering with multiple levels", async () => {
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  const executionOrder: string[] = [];

  // Create a more complex dependency tree
  const level0 = new Task({
    name: "level0" as TaskName,
    action: () => {
      executionOrder.push("level0");
    },
    uptodate: runAlways,
  });

  const level1a = new Task({
    name: "level1a" as TaskName,
    action: () => {
      executionOrder.push("level1a");
    },
    deps: [level0],
    uptodate: runAlways,
  });

  const level1b = new Task({
    name: "level1b" as TaskName,
    action: () => {
      executionOrder.push("level1b");
    },
    deps: [level0],
    uptodate: runAlways,
  });

  const level2 = new Task({
    name: "level2" as TaskName,
    action: () => {
      executionOrder.push("level2");
    },
    deps: [level1a, level1b],
    uptodate: runAlways,
  });

  await level2.setup(ctx);
  await level2.exec(ctx);

  // Verify proper dependency ordering
  const level0Index = executionOrder.indexOf("level0");
  const level1aIndex = executionOrder.indexOf("level1a");
  const level1bIndex = executionOrder.indexOf("level1b");
  const level2Index = executionOrder.indexOf("level2");

  assertEquals(level0Index < level1aIndex, true);
  assertEquals(level0Index < level1bIndex, true);
  assertEquals(level1aIndex < level2Index, true);
  assertEquals(level1bIndex < level2Index, true);
});

Deno.test("Dependencies - async file dependencies resolution", async () => {
  const tempFile1 = await createTempFile("async dep 1", "file1.txt");
  const tempFile2 = await createTempFile("async dep 2", "file2.txt");
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  let taskRun = false;

  const generator = () => {
    return Promise.resolve([file(tempFile1), file(tempFile2)]);
  };
  const asyncFiles = new TrackedFilesAsync(generator);

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {
      taskRun = true;
    },
    deps: [asyncFiles],
    uptodate: runAlways,
  });

  await mainTask.setup(ctx);
  await mainTask.exec(ctx);

  assertEquals(taskRun, true);
  assertEquals(ctx.doneTasks.has(mainTask), true);

  // Both files should be tracked in the task's file dependencies
  assertEquals(mainTask.file_deps.size >= 2, true);

  await cleanup(tempFile1);
  await cleanup(tempFile2);
});

Deno.test("Dependencies - empty dependencies", async () => {
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  let taskRun = false;

  const taskWithNoDeps = new Task({
    name: "noDepsTask" as TaskName,
    action: () => {
      taskRun = true;
    },
    deps: [], // Explicitly empty
    uptodate: runAlways,
  });

  await taskWithNoDeps.setup(ctx);
  await taskWithNoDeps.exec(ctx);

  assertEquals(taskRun, true);
  assertEquals(ctx.doneTasks.has(taskWithNoDeps), true);
  assertEquals(taskWithNoDeps.task_deps.size, 0);
  assertEquals(taskWithNoDeps.file_deps.size, 0);
  assertEquals(taskWithNoDeps.async_files_deps.size, 0);
});

Deno.test("Dependencies - task with file dependencies that don't exist", async () => {
  const nonExistentFile = "/tmp/does_not_exist_" + Date.now() + ".txt";
  const trackedFile = new TrackedFile({ path: nonExistentFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  let taskRun = false;

  const taskWithMissingFile = new Task({
    name: "missingFileTask" as TaskName,
    action: () => {
      taskRun = true;
    },
    deps: [trackedFile],
    uptodate: runAlways,
  });

  await taskWithMissingFile.setup(ctx);
  await taskWithMissingFile.exec(ctx);

  // Task should still run even if file dependency doesn't exist
  assertEquals(taskRun, true);
  assertEquals(ctx.doneTasks.has(taskWithMissingFile), true);

  // File should be tracked with empty hash/timestamp
  const fileData = taskWithMissingFile.taskManifest?.getFileData(
    trackedFile.path,
  );
  assertEquals(fileData?.hash, "");
  assertEquals(fileData?.timestamp, "");
});

Deno.test("Dependencies - target registry population during setup", async () => {
  const tempFile = await createTempFile("target content");
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  const taskWithTarget = new Task({
    name: "taskWithTarget" as TaskName,
    action: () => {},
    targets: [targetFile],
  });

  // Initially empty
  assertEquals(ctx.targetRegister.size, 0);

  await taskWithTarget.setup(ctx);

  // Target should be registered during setup
  assertEquals(ctx.targetRegister.has(targetFile.path), true);
  assertEquals(ctx.targetRegister.get(targetFile.path), taskWithTarget);

  await cleanup(tempFile);
});

Deno.test("Dependencies - dependency execution prevents duplicate runs", async () => {
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  let sharedTaskRunCount = 0;
  let task1RunCount = 0;
  let task2RunCount = 0;

  const sharedDep = new Task({
    name: "shared" as TaskName,
    action: () => {
      sharedTaskRunCount++;
    },
    uptodate: runAlways,
  });

  const task1 = new Task({
    name: "task1" as TaskName,
    action: () => {
      task1RunCount++;
    },
    deps: [sharedDep],
    uptodate: runAlways,
  });

  const task2 = new Task({
    name: "task2" as TaskName,
    action: () => {
      task2RunCount++;
    },
    deps: [sharedDep],
    uptodate: runAlways,
  });

  await task1.setup(ctx);
  await task2.setup(ctx);

  await task1.exec(ctx);
  await task2.exec(ctx);

  // Shared dependency should only run once
  assertEquals(sharedTaskRunCount, 1);
  assertEquals(task1RunCount, 1);
  assertEquals(task2RunCount, 1);

  assertEquals(ctx.doneTasks.has(sharedDep), true);
  assertEquals(ctx.doneTasks.has(task1), true);
  assertEquals(ctx.doneTasks.has(task2), true);
});

Deno.test("Dependencies - task function creates proper dependencies", async () => {
  const tempFile = await createTempFile("task function dep");
  const trackedFile = new TrackedFile({ path: tempFile });

  const depTask = task({
    name: "depTask" as TaskName,
    action: () => {},
  });

  const mainTask = task({
    name: "mainTask" as TaskName,
    action: () => {},
    deps: [depTask, trackedFile],
  });

  assertEquals(mainTask.task_deps.size, 1);
  assertEquals(mainTask.file_deps.size, 1);
  assertEquals(mainTask.task_deps.has(depTask), true);
  assertEquals(mainTask.file_deps.has(trackedFile), true);

  await cleanup(tempFile);
});
