import { assertEquals, assertExists, assertThrows } from "@std/assert";
import * as path from "@std/path";
import type * as log from "@std/log";
import type { Args } from "@std/cli/parse-args";
import {
  execBasic,
  file,
  type IExecContext,
  type IManifest,
  Task,
  task,
  type TaskName,
  TrackedFile,
  TrackedFilesAsync,
} from "../mod.ts";
import { Manifest } from "../manifest.ts";
import { type Action, type IsUpToDate, runAlways } from "../core/task.ts";
import { type TaskContext, taskContext } from "../core/TaskContext.ts";

// Mock logger for testing
function createMockLogger(): log.Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    critical: () => {},
  } as unknown as log.Logger;
}

// Mock objects for testing
function createMockExecContext(manifest: IManifest): IExecContext {
  return {
    taskRegister: new Map(),
    targetRegister: new Map(),
    doneTasks: new Set(),
    inprogressTasks: new Set(),
    internalLogger: createMockLogger(),
    taskLogger: createMockLogger(),
    userLogger: createMockLogger(),
    concurrency: 1,
    verbose: false,
    manifest,
    args: { _: [] } as Args,
    getTaskByName: () => undefined,
    schedule: <T>(action: () => Promise<T>) => action(),
  };
}

// Test helper to create temporary files
async function createTempFile(content: string): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_" });
  const filePath = path.join(tempDir, "test_file.txt");
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Test helper to cleanup temp directory
async function cleanup(filePath: string) {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

Deno.test("Task - basic task creation", () => {
  const mockAction: Action = () => {};

  const testTask = new Task({
    name: "testTask" as TaskName,
    description: "A test task",
    action: mockAction,
  });

  assertEquals(testTask.name, "testTask");
  assertEquals(testTask.description, "A test task");
  assertEquals(testTask.action, mockAction);
  assertEquals(testTask.task_deps.size, 0);
  assertEquals(testTask.file_deps.size, 0);
  assertEquals(testTask.async_files_deps.size, 0);
  assertEquals(testTask.targets.size, 0);
});

Deno.test("Task - task() function", () => {
  const mockAction: Action = () => {};

  const testTask = task({
    name: "testTask" as TaskName,
    description: "A test task",
    action: mockAction,
  });

  assertEquals(testTask instanceof Task, true);
  assertEquals(testTask.name, "testTask");
  assertEquals(testTask.description, "A test task");
});

Deno.test("Task - task with dependencies", async () => {
  const tempFile = await createTempFile("dependency content");
  const trackedFile = new TrackedFile({ path: tempFile });

  const depTask = new Task({
    name: "depTask" as TaskName,
    action: () => {},
  });

  const mainTask = new Task({
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

Deno.test("Task - task with targets", async () => {
  const tempFile = await createTempFile("target content");
  const targetFile = new TrackedFile({ path: tempFile });

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    targets: [targetFile],
  });

  assertEquals(testTask.targets.size, 1);
  assertEquals(testTask.targets.has(targetFile), true);

  // Target should have task assigned
  assertEquals(targetFile.getTask(), testTask);

  await cleanup(tempFile);
});

Deno.test("Task - task with TrackedFilesAsync dependencies", () => {
  const generator = async () => {
    const tempFile = await createTempFile("async content");
    return [file(tempFile)];
  };

  const asyncFiles = new TrackedFilesAsync(generator);

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    deps: [asyncFiles],
  });

  assertEquals(testTask.async_files_deps.size, 1);
  assertEquals(testTask.async_files_deps.has(asyncFiles), true);
});

Deno.test("Task - task with custom uptodate function", () => {
  let _uptodateCalled = false;
  const customUptodate: IsUpToDate = () => {
    _uptodateCalled = true;
    return false;
  };

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    uptodate: customUptodate,
  });

  assertEquals(testTask.uptodate, customUptodate);
});

Deno.test("Task - runAlways uptodate helper", () => {
  // Create a mock TaskContext to pass to runAlways
  const mockTaskContext = {} as TaskContext;
  const result = runAlways(mockTaskContext);
  assertEquals(result, false);
});

Deno.test("Task - empty task name is allowed", () => {
  const testTask = new Task({
    name: "" as TaskName,
    action: () => {},
  });

  assertEquals(testTask.name, "");
});

Deno.test("Task - duplicate target assignment throws error", async () => {
  const tempFile = await createTempFile("shared target");
  const sharedTarget = new TrackedFile({ path: tempFile });

  const _task1 = new Task({
    name: "task1" as TaskName,
    action: () => {},
    targets: [sharedTarget],
  });

  // Second task trying to use same target should throw
  assertThrows(
    () =>
      new Task({
        name: "task2" as TaskName,
        action: () => {},
        targets: [sharedTarget],
      }),
    Error,
    "Duplicate tasks generating TrackedFile as target",
  );

  await cleanup(tempFile);
});

Deno.test("Task - setup registers targets", async () => {
  const tempFile = await createTempFile("target content");
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    targets: [targetFile],
  });

  await testTask.setup(ctx);

  assertEquals(ctx.targetRegister.get(targetFile.path), testTask);
  assertExists(testTask.taskManifest);

  await cleanup(tempFile);
});

Deno.test("Task - setup with task dependencies", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const depTask = new Task({
    name: "depTask" as TaskName,
    action: () => {},
  });

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {},
    deps: [depTask],
  });

  await mainTask.setup(ctx);

  // Both tasks should be set up
  assertExists(mainTask.taskManifest);
  assertExists(depTask.taskManifest);
});

Deno.test("Task - exec marks task as done", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCalled = false;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {
      actionCalled = true;
    },
    uptodate: runAlways, // Force it to run
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);

  assertEquals(actionCalled, true);
  assertEquals(ctx.doneTasks.has(testTask), true);
  assertEquals(ctx.inprogressTasks.has(testTask), false);
});

Deno.test("Task - exec skips already done tasks", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCallCount = 0;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {
      actionCallCount++;
    },
    uptodate: runAlways, // Force it to run
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);
  await testTask.exec(ctx); // Second call should be skipped

  assertEquals(actionCallCount, 1);
  assertEquals(ctx.doneTasks.has(testTask), true);
});

Deno.test("Task - exec skips in-progress tasks", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCallCount = 0;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {
      actionCallCount++;
    },
  });

  await testTask.setup(ctx);

  // Manually mark as in-progress
  ctx.inprogressTasks.add(testTask);

  await testTask.exec(ctx);

  assertEquals(actionCallCount, 0);
});

Deno.test("Task - exec with async action", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCompleted = false;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      actionCompleted = true;
    },
    uptodate: runAlways, // Force it to run
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);

  assertEquals(actionCompleted, true);
  assertEquals(ctx.doneTasks.has(testTask), true);
});

Deno.test("Task - exec with uptodate check", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCalled = false;
  let uptodateCalled = false;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {
      actionCalled = true;
    },
    uptodate: () => {
      uptodateCalled = true;
      return true; // Task is up-to-date
    },
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);

  assertEquals(uptodateCalled, true);
  assertEquals(actionCalled, false); // Should not run action if up-to-date
});

Deno.test("Task - exec with runAlways", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  let actionCalled = false;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {
      actionCalled = true;
    },
    uptodate: runAlways,
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);

  assertEquals(actionCalled, true); // Should always run
});

Deno.test("Task - reset cleans targets", async () => {
  const tempFile = await createTempFile("target content");
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    targets: [targetFile],
  });

  await testTask.setup(ctx);

  // Verify file exists
  assertEquals(await targetFile.exists(), true);

  await testTask.reset(ctx);

  // File should be deleted
  assertEquals(await targetFile.exists(), false);

  await cleanup(tempFile);
});

Deno.test("Task - taskContext creation", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
  });

  const tCtx = taskContext(ctx, testTask);

  assertEquals(tCtx.logger, ctx.taskLogger);
  assertEquals(tCtx.task, testTask);
  assertEquals(tCtx.args, ctx.args);
  assertEquals(tCtx.exec, ctx);
});

Deno.test("Task - action receives TaskContext", async () => {
  const manifest = new Manifest("");
  let receivedContext: TaskContext | null = null;

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: (taskCtx) => {
      receivedContext = taskCtx;
    },
    uptodate: runAlways, // Force it to run
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  assertExists(receivedContext);
  const context = receivedContext as TaskContext;
  assertEquals(context.task, testTask);
  assertEquals(context.exec, ctx);
});

Deno.test("Task - exec with file dependencies updates manifest", async () => {
  const tempFile = await createTempFile("dependency content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
    deps: [trackedFile],
  });

  await testTask.setup(ctx);
  await testTask.exec(ctx);

  // Manifest should have file data
  const fileData = testTask.taskManifest?.getFileData(trackedFile.path);
  assertExists(fileData);
  assertEquals(typeof fileData.hash, "string");
  assertEquals(typeof fileData.timestamp, "string");

  await cleanup(tempFile);
});

Deno.test("Task - task with mixed dependency types", async () => {
  const tempFile = await createTempFile("mixed dep content");
  const trackedFile = new TrackedFile({ path: tempFile });

  const depTask = new Task({
    name: "depTask" as TaskName,
    action: () => {},
  });

  const generator = () => {
    return [file(tempFile)];
  };
  const asyncFiles = new TrackedFilesAsync(generator);

  const mainTask = new Task({
    name: "mainTask" as TaskName,
    action: () => {},
    deps: [depTask, trackedFile, asyncFiles],
  });

  assertEquals(mainTask.task_deps.size, 1);
  assertEquals(mainTask.file_deps.size, 1);
  assertEquals(mainTask.async_files_deps.size, 1);

  await cleanup(tempFile);
});

Deno.test("Task - no description is optional", () => {
  const testTask = new Task({
    name: "testTask" as TaskName,
    action: () => {},
  });

  assertEquals(testTask.description, undefined);
});
