import { assertEquals, assertExists } from "@std/assert";
import * as log from "@std/log";
import type { Args } from "@std/cli/parse-args";
import type { IExecContext, IManifest, TaskName } from "../mod.ts";
import { Manifest } from "../manifest.ts";
import {
  type TaskContext as _TaskContext,
  taskContext,
} from "../core/TaskContext.ts";
import { Task } from "../core/task.ts";
import { execBasic } from "../cli/cli.ts";


// Mock exec context for testing
function createMockExecContext(
  manifest: IManifest,
  overrides: Partial<IExecContext> = {},
): IExecContext {
  return {
    taskRegister: new Map(),
    targetRegister: new Map(),
    doneTasks: new Set(),
    inprogressTasks: new Set(),
    internalLogger: log.getLogger("internal"),
    taskLogger: log.getLogger("task"),
    userLogger: log.getLogger("user"),
    concurrency: 1,
    verbose: false,
    manifest,
    args: { _: [] } as Args,
    getTaskByName: () => undefined,
    schedule: <T>(action: () => Promise<T>) => action(),
    ...overrides,
  };
}

// Mock task for testing
function createMockTask(name: string): Task {
  return new Task({
    name: name as TaskName,
    description: `Mock task ${name}`,
    action: () => {},
  });
}

Deno.test("TaskContext - taskContext function creates context", async () => {
  const manifest = new Manifest("");
  const task = createMockTask("testTask");
  const ctx = await execBasic([], [task], manifest);

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.logger, ctx.taskLogger);
  assertEquals(taskCtx.task, task);
  assertEquals(taskCtx.args, ctx.args);
  assertEquals(taskCtx.exec, ctx);
});

Deno.test("TaskContext - context uses taskLogger from exec context", () => {
  const manifest = new Manifest("");
  const customTaskLogger = log.getLogger("custom");
  const ctx = createMockExecContext(manifest, { taskLogger: customTaskLogger });
  const task = createMockTask("testTask");

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.logger, customTaskLogger);
});

Deno.test("TaskContext - context preserves task reference", async () => {
  const manifest = new Manifest("");
  const task = createMockTask("specificTask");
  const ctx = await execBasic([], [task], manifest);

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.task.name, "specificTask");
  assertEquals(taskCtx.task.description, "Mock task specificTask");
});

Deno.test("TaskContext - context preserves args reference", () => {
  const manifest = new Manifest("");
  const customArgs = { _: ["arg1", "arg2"], flag: true } as Args;
  const ctx = createMockExecContext(manifest, { args: customArgs });
  const task = createMockTask("testTask");

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.args, customArgs);
  assertEquals(taskCtx.args._, ["arg1", "arg2"]);
  assertEquals((taskCtx.args as unknown as { flag: boolean }).flag, true);
});

Deno.test("TaskContext - context provides access to exec context", async () => {
  const manifest = new Manifest("");
  const task = createMockTask("testTask");
  const ctx = await execBasic([], [task], manifest);

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.exec, ctx);
  assertEquals(taskCtx.exec.manifest, manifest);
  assertEquals(taskCtx.exec.concurrency, 4); // execBasic uses default concurrency of 4
  assertEquals(taskCtx.exec.verbose, false);
});

Deno.test("TaskContext - context works with real Task instance", async () => {
  const manifest = new Manifest("");

  const realTask = new Task({
    name: "realTask" as TaskName,
    description: "A real task instance",
    action: () => {},
  });

  const ctx = await execBasic([], [realTask], manifest);
  const taskCtx = taskContext(ctx, realTask);

  assertEquals(taskCtx.task, realTask);
  assertEquals(taskCtx.task.name, "realTask");
  assertEquals(taskCtx.task.description, "A real task instance");
});

Deno.test("TaskContext - context allows logger access", () => {
  const manifest = new Manifest("");
  let loggedMessage = "";

  const mockLogger: log.Logger = {
    debug: () => {},
    info: (msg: string) => {
      loggedMessage = msg;
    },
    warn: () => {},
    error: () => {},
    critical: () => {},
  } as unknown as log.Logger;

  const ctx = createMockExecContext(manifest, { taskLogger: mockLogger });
  const task = createMockTask("testTask");
  const taskCtx = taskContext(ctx, task);

  // Simulate logging from task action
  taskCtx.logger.info("Test message");

  assertEquals(loggedMessage, "Test message");
});

Deno.test("TaskContext - context allows access to all exec context properties", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest, {
    concurrency: 5,
    verbose: true,
  });
  const task = createMockTask("testTask");

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.exec.concurrency, 5);
  assertEquals(taskCtx.exec.verbose, true);
  assertExists(taskCtx.exec.taskRegister);
  assertExists(taskCtx.exec.targetRegister);
  assertExists(taskCtx.exec.doneTasks);
  assertExists(taskCtx.exec.inprogressTasks);
});

Deno.test("TaskContext - context allows task scheduling through exec", async () => {
  const manifest = new Manifest("");
  let scheduledActionRun = false;

  const ctx = createMockExecContext(manifest, {
    schedule: <T>(action: () => Promise<T>) => {
      scheduledActionRun = true;
      return action();
    },
  });

  const task = createMockTask("testTask");
  const taskCtx = taskContext(ctx, task);

  await taskCtx.exec.schedule(() => {
    return Promise.resolve("test result");
  });

  assertEquals(scheduledActionRun, true);
});

Deno.test("TaskContext - context provides access to manifest", () => {
  const manifest = new Manifest("/test/path");
  const ctx = createMockExecContext(manifest);
  const task = createMockTask("testTask");

  const taskCtx = taskContext(ctx, task);

  assertEquals(taskCtx.exec.manifest, manifest);
  assertEquals(taskCtx.exec.manifest.filename.endsWith(".manifest.json"), true);
});

Deno.test("TaskContext - context allows getTaskByName lookup", () => {
  const manifest = new Manifest("");
  const lookupTask = createMockTask("lookupTask");

  const ctx = createMockExecContext(manifest, {
    getTaskByName: (name: TaskName) => {
      return name === "lookupTask" ? lookupTask : undefined;
    },
  });

  const task = createMockTask("testTask");
  const taskCtx = taskContext(ctx, task);

  const foundTask = taskCtx.exec.getTaskByName("lookupTask" as TaskName);
  const notFoundTask = taskCtx.exec.getTaskByName("nonexistent" as TaskName);

  assertEquals(foundTask, lookupTask);
  assertEquals(notFoundTask, undefined);
});

Deno.test("TaskContext - context maintains isolation between different tasks", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  const task1 = createMockTask("task1");
  const task2 = createMockTask("task2");

  const taskCtx1 = taskContext(ctx, task1);
  const taskCtx2 = taskContext(ctx, task2);

  // Different task references
  assertEquals(taskCtx1.task, task1);
  assertEquals(taskCtx2.task, task2);

  // Same exec context
  assertEquals(taskCtx1.exec, taskCtx2.exec);

  // Same logger and args
  assertEquals(taskCtx1.logger, taskCtx2.logger);
  assertEquals(taskCtx1.args, taskCtx2.args);
});

Deno.test("TaskContext - interface compliance", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  const task = createMockTask("testTask");

  const taskCtx = taskContext(ctx, task);

  // Check that the returned object has all required properties
  assertExists(taskCtx.logger);
  assertExists(taskCtx.task);
  assertExists(taskCtx.args);
  assertExists(taskCtx.exec);

  // Check property types
  assertEquals(typeof taskCtx.logger, "object");
  assertEquals(typeof taskCtx.task, "object");
  assertEquals(typeof taskCtx.args, "object");
  assertEquals(typeof taskCtx.exec, "object");
});
