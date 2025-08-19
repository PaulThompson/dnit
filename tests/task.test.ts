import { assert, assertEquals, assertExists, assertFalse, assertGreater, assertInstanceOf, assertRejects, assertThrows } from "@std/assert";
import {
  execBasic,
  file,
  Task,
  task,
  TrackedFile,
  TrackedFilesAsync,
} from "../mod.ts";
import { detectCircularDependencies, type CircularDependency } from "../core/task.ts";
import { Manifest } from "../manifest.ts";
import { type Action, type IsUpToDate, runAlways } from "../core/task.ts";
import { type TaskContext, taskContext } from "../core/TaskContext.ts";
import { createFileInDir, createTempDir } from "./utils.ts";

Deno.test("Task - basic task creation", () => {
  const testAction: Action = () => {};

  const testTask = new Task({
    name: "testTask",
    description: "A test task",
    action: testAction,
  });

  assertEquals(testTask.name, "testTask");
  assertEquals(testTask.description, "A test task");
  assertEquals(testTask.action, testAction);
  assertEquals(testTask.task_deps.size, 0);
  assertEquals(testTask.file_deps.size, 0);
  assertEquals(testTask.async_files_deps.size, 0);
  assertEquals(testTask.targets.size, 0);
});

Deno.test("Task - task() function", () => {
  const testAction: Action = () => {};

  const testTask = task({
    name: "testTask",
    description: "A test task",
    action: testAction,
  });

  assertInstanceOf(testTask, Task);
  assertEquals(testTask.name, "testTask");
  assertEquals(testTask.description, "A test task");
});

Deno.test("Task - task with dependencies", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "dependency content",
  );
  const trackedFile = new TrackedFile({ path: tempFile });

  const depTask = new Task({
    name: "depTask",
    action: () => {},
  });

  const mainTask = new Task({
    name: "mainTask",
    action: () => {},
    deps: [depTask, trackedFile],
  });

  assertEquals(mainTask.task_deps.size, 1);
  assertEquals(mainTask.file_deps.size, 1);
  assert(mainTask.task_deps.has(depTask));
  assert(mainTask.file_deps.has(trackedFile));

  await cleanup();
});

Deno.test("Task - task with targets", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "target content",
  );
  const targetFile = new TrackedFile({ path: tempFile });

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    targets: [targetFile],
  });

  assertEquals(testTask.targets.size, 1);
  assert(testTask.targets.has(targetFile));

  // Target should have task assigned
  assertEquals(targetFile.getTask(), testTask);

  await cleanup();
});

Deno.test("Task - task with TrackedFilesAsync dependencies", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "async content",
  );

  const generator = async () => {
    // await something to make it actually async
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    return [file(tempFile)];
  };

  const asyncFiles = new TrackedFilesAsync(generator);

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    deps: [asyncFiles],
  });

  assertEquals(testTask.async_files_deps.size, 1);
  assert(testTask.async_files_deps.has(asyncFiles));

  await cleanup();
});

Deno.test("Task - task with custom uptodate function", () => {
  let uptodateCalled = false;
  const customUptodate: IsUpToDate = () => {
    uptodateCalled = true;
    return false;
  };

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    uptodate: customUptodate,
  });

  assertEquals(testTask.uptodate, customUptodate);
  assertFalse(uptodateCalled); // Should not be called during task creation
});

Deno.test("Task - runAlways uptodate helper", () => {
  // Create a mock TaskContext to pass to runAlways
  const mockTaskContext = {} as TaskContext;
  const result = runAlways(mockTaskContext);
  assertFalse(result);
});

Deno.test("Task - empty task name is allowed", () => {
  const testTask = new Task({
    name: "",
    action: () => {},
  });

  assertEquals(testTask.name, "");
});

Deno.test("Task - duplicate target assignment throws error", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "shared target",
  );
  const sharedTarget = new TrackedFile({ path: tempFile });

  const _task1 = new Task({
    name: "task1",
    action: () => {},
    targets: [sharedTarget],
  });

  // Second task trying to use same target should throw
  assertThrows(
    () =>
      new Task({
        name: "task2",
        action: () => {},
        targets: [sharedTarget],
      }),
    Error,
    "Duplicate tasks generating TrackedFile as target",
  );

  await cleanup();
});

Deno.test("Task - setup registers targets", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "target content",
  );
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    targets: [targetFile],
  });

  const ctx = await execBasic([], [testTask], manifest);

  assertEquals(ctx.targetRegister.get(targetFile.path), testTask);
  assertExists(testTask.taskManifest);

  await cleanup();
});

Deno.test("Task - setup with task dependencies", async () => {
  const manifest = new Manifest("");

  const depTask = new Task({
    name: "depTask",
    action: () => {},
  });

  const mainTask = new Task({
    name: "mainTask",
    action: () => {},
    deps: [depTask],
  });

  await execBasic([], [mainTask, depTask], manifest);

  // Both tasks should be set up
  assertExists(mainTask.taskManifest);
  assertExists(depTask.taskManifest);
});

Deno.test("Task - exec marks task as done", async () => {
  const manifest = new Manifest("");
  let actionCalled = false;

  const testTask = new Task({
    name: "testTask",
    action: () => {
      actionCalled = true;
    },
    uptodate: runAlways, // Force it to run
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  assert(actionCalled);
  assert(ctx.doneTasks.has(testTask));
  assertFalse(ctx.inprogressTasks.has(testTask));
});

Deno.test("Task - exec skips already done tasks", async () => {
  const manifest = new Manifest("");
  let actionCallCount = 0;

  const testTask = new Task({
    name: "testTask",
    action: () => {
      actionCallCount++;
    },
    uptodate: runAlways, // Force it to run
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);
  await testTask.exec(ctx); // Second call should be skipped

  assertEquals(actionCallCount, 1);
  assert(ctx.doneTasks.has(testTask));
});

Deno.test("Task - exec skips in-progress tasks", async () => {
  const manifest = new Manifest("");
  let actionCallCount = 0;

  const testTask = new Task({
    name: "testTask",
    action: () => {
      actionCallCount++;
    },
  });

  const ctx = await execBasic([], [testTask], manifest);

  // Manually mark as in-progress
  ctx.inprogressTasks.add(testTask);

  await testTask.exec(ctx);

  assertEquals(actionCallCount, 0);
});

Deno.test("Task - exec with async action", async () => {
  const manifest = new Manifest("");
  let actionCompleted = false;

  const testTask = new Task({
    name: "testTask",
    action: async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      actionCompleted = true;
    },
    uptodate: runAlways, // Force it to run
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  assert(actionCompleted);
  assert(ctx.doneTasks.has(testTask));
});

Deno.test("Task - exec with uptodate check", async () => {
  const manifest = new Manifest("");
  let actionCalled = false;
  let uptodateCalled = false;

  const testTask = new Task({
    name: "testTask",
    action: () => {
      actionCalled = true;
    },
    uptodate: () => {
      uptodateCalled = true;
      return true; // Task is up-to-date
    },
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  assert(uptodateCalled);
  assertFalse(actionCalled); // Should not run action if up-to-date
});

Deno.test("Task - exec with runAlways", async () => {
  const manifest = new Manifest("");
  let actionCalled = false;

  const testTask = new Task({
    name: "testTask",
    action: () => {
      actionCalled = true;
    },
    uptodate: runAlways,
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  assert(actionCalled); // Should always run
});

Deno.test("Task - reset cleans targets", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "target content",
  );
  const targetFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    targets: [targetFile],
  });

  const ctx = await execBasic([], [testTask], manifest);

  // Verify file exists
  assert(await targetFile.exists());

  await testTask.reset(ctx);

  // File should be deleted
  assertFalse(await targetFile.exists());

  await cleanup();
});

Deno.test("Task - taskContext creation", async () => {
  const manifest = new Manifest("");

  const testTask = new Task({
    name: "testTask",
    action: () => {},
  });

  const ctx = await execBasic([], [testTask], manifest);
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
    name: "testTask",
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
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "dependency content",
  );
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  const testTask = new Task({
    name: "testTask",
    action: () => {},
    deps: [trackedFile],
  });

  const ctx = await execBasic([], [testTask], manifest);
  await testTask.exec(ctx);

  // Manifest should have file data
  const fileData = testTask.taskManifest?.getFileData(trackedFile.path);
  assertExists(fileData);
  assertEquals(typeof fileData.hash, "string");
  assertEquals(typeof fileData.timestamp, "string");

  await cleanup();
});

Deno.test("Task - task with mixed dependency types", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "mixed dep content",
  );
  const trackedFile = new TrackedFile({ path: tempFile });

  const depTask = new Task({
    name: "depTask",
    action: () => {},
  });

  const generator = () => {
    return [file(tempFile)];
  };
  const asyncFiles = new TrackedFilesAsync(generator);

  const mainTask = new Task({
    name: "mainTask",
    action: () => {},
    deps: [depTask, trackedFile, asyncFiles],
  });

  assertEquals(mainTask.task_deps.size, 1);
  assertEquals(mainTask.file_deps.size, 1);
  assertEquals(mainTask.async_files_deps.size, 1);

  await cleanup();
});

Deno.test("Task - description is optional", () => {
  const testTask = new Task({
    name: "testTask",
    action: () => {},
  });

  assertEquals(testTask.description, undefined);
});

Deno.test("Task - circular dependency detection A->B->C->A", async () => {
  const manifest = new Manifest("");

  const taskA = new Task({
    name: "taskA",
    action: () => console.log("Running task A"),
  });

  const taskB = new Task({
    name: "taskB",
    action: () => console.log("Running task B"),
    deps: [taskA],
  });

  const taskC = new Task({
    name: "taskC",
    action: () => console.log("Running task C"),
    deps: [taskB],
  });

  // Create circular dependency: A depends on C
  taskA.task_deps.add(taskC);

  // Try to execute taskA which should trigger circular dependency
  const ctx = await execBasic([], [taskA, taskB, taskC], manifest);

  await assertRejects(
    () => taskA.exec(ctx),
    Error,
    "Circular dependency detected: taskA -> taskC -> taskB -> taskA",
  );
});

Deno.test("Task - self-referencing task", async () => {
  const manifest = new Manifest("");

  const selfTask = new Task({
    name: "selfTask",
    action: () => console.log("Running self task"),
  });

  // Make task depend on itself
  selfTask.task_deps.add(selfTask);

  const ctx = await execBasic([], [selfTask], manifest);

  await assertRejects(
    () => selfTask.exec(ctx),
    Error,
    "Circular dependency detected: selfTask -> selfTask",
  );
});

Deno.test("Task - circular dependency A->B->A", async () => {
  const manifest = new Manifest("");

  const taskA = new Task({
    name: "taskA",
    action: () => console.log("Running task A"),
  });

  const taskB = new Task({
    name: "taskB", 
    action: () => console.log("Running task B"),
    deps: [taskA],
  });

  // Create circular dependency: A depends on B
  taskA.task_deps.add(taskB);

  const ctx = await execBasic([], [taskA, taskB], manifest);

  await assertRejects(
    () => taskA.exec(ctx),
    Error,
    "Circular dependency detected: taskA -> taskB -> taskA",
  );
});

// Direct tests for detectCircularDependencies function

Deno.test("detectCircularDependencies - no circular dependency", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
    deps: [taskA],
  });

  const result = detectCircularDependencies(taskB);
  assertEquals(result, null);
});

Deno.test("detectCircularDependencies - self-referencing task", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  // Make task depend on itself
  taskA.task_deps.add(taskA);

  const result = detectCircularDependencies(taskA);
  assertExists(result);
  assertEquals(result!.cycle.length, 2);
  assertEquals(result!.cycle[0].name, "taskA");
  assertEquals(result!.cycle[1].name, "taskA");
});

Deno.test("detectCircularDependencies - simple A->B->A cycle", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
    deps: [taskA],
  });

  // Create circular dependency: A depends on B
  taskA.task_deps.add(taskB);

  const result = detectCircularDependencies(taskA);
  assertExists(result);
  assertEquals(result!.cycle.length, 3);
  assertEquals(result!.cycle[0].name, "taskA");
  assertEquals(result!.cycle[1].name, "taskB");
  assertEquals(result!.cycle[2].name, "taskA");
});

Deno.test("detectCircularDependencies - complex A->B->C->A cycle", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
    deps: [taskA],
  });

  const taskC = new Task({
    name: "taskC",
    action: () => {},
    deps: [taskB],
  });

  // Create circular dependency: A depends on C
  taskA.task_deps.add(taskC);

  const result = detectCircularDependencies(taskA);
  assertExists(result);
  assertEquals(result!.cycle.length, 4);
  assertEquals(result!.cycle[0].name, "taskA");
  assertEquals(result!.cycle[1].name, "taskC");
  assertEquals(result!.cycle[2].name, "taskB");
  assertEquals(result!.cycle[3].name, "taskA");
});

Deno.test("detectCircularDependencies - task with no dependencies", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const result = detectCircularDependencies(taskA);
  assertEquals(result, null);
});

Deno.test("detectCircularDependencies - linear chain no cycle", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
    deps: [taskA],
  });

  const taskC = new Task({
    name: "taskC",
    action: () => {},
    deps: [taskB],
  });

  const taskD = new Task({
    name: "taskD",
    action: () => {},
    deps: [taskC],
  });

  const result = detectCircularDependencies(taskD);
  assertEquals(result, null);
});

Deno.test("detectCircularDependencies - multiple dependencies no cycle", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
  });

  const taskC = new Task({
    name: "taskC",
    action: () => {},
    deps: [taskA, taskB],
  });

  const result = detectCircularDependencies(taskC);
  assertEquals(result, null);
});

Deno.test("detectCircularDependencies - diamond dependency no cycle", () => {
  const taskA = new Task({
    name: "taskA",
    action: () => {},
  });

  const taskB = new Task({
    name: "taskB",
    action: () => {},
    deps: [taskA],
  });

  const taskC = new Task({
    name: "taskC",
    action: () => {},
    deps: [taskA],
  });

  const taskD = new Task({
    name: "taskD",
    action: () => {},
    deps: [taskB, taskC],
  });

  const result = detectCircularDependencies(taskD);
  assertEquals(result, null);
});
