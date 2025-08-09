import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import type * as log from "@std/log";
import type { Args } from "@std/cli/parse-args";
import {
  execBasic,
  type IExecContext,
  type IManifest,
  Task,
  type TaskName,
  TrackedFile,
} from "../mod.ts";
import { Manifest } from "../manifest.ts";
import { runAlways } from "../core/task.ts";
import type { TaskContext } from "../core/TaskContext.ts";

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
async function createTempFile(
  content: string,
  fileName = "test_file.txt",
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_uptodate_test_" });
  const filePath = path.join(tempDir, fileName);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Test helper to cleanup temp directory
async function cleanup(filePath: string) {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

// Helper to wait for file timestamp to change
async function waitForTimestampChange(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

Deno.test("UpToDate - file modification detection by hash", async () => {
  const tempFile = await createTempFile("original content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "hashTestTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  await task.setup(ctx);

  // First run - should execute because no previous manifest data
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should skip because file hasn't changed
  await task.exec(ctx);
  assertEquals(taskRunCount, 1); // Should not increment

  // Modify file content
  await waitForTimestampChange();
  await Deno.writeTextFile(tempFile, "modified content");

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should execute because file content changed
  await task.exec(ctx);
  assertEquals(taskRunCount, 2); // Should increment

  await cleanup(tempFile);
});

Deno.test("UpToDate - timestamp-based change detection", async () => {
  const tempFile = await createTempFile("timestamp test");

  // Create a TrackedFile with a custom hash function that includes timestamp
  const timestampBasedHash = (_filePath: string, stat: Deno.FileInfo) => {
    // Use timestamp as the "hash" for change detection
    return stat.mtime?.toISOString() || "no-mtime";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: timestampBasedHash,
  });

  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "timestampTestTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  await task.setup(ctx);

  // First run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Get the current file data
  const initialFileData = await trackedFile.getFileData(ctx);

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run with no changes - should not run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1); // Should not increment

  // Rewrite the same content but this will change the timestamp
  await waitForTimestampChange();
  await Deno.writeTextFile(tempFile, "timestamp test"); // Same content, new timestamp

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should detect timestamp change via custom hash function
  const newFileData = await trackedFile.getFileData(ctx);
  assertEquals(initialFileData.hash !== newFileData.hash, true); // Different timestamp-based "hash"

  // Task should run due to timestamp change
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  await cleanup(tempFile);
});

Deno.test("UpToDate - custom uptodate function execution", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;
  let uptodateCallCount = 0;

  const customUptodate = () => {
    uptodateCallCount++;
    return uptodateCallCount <= 2; // Return true first two times, false after
  };

  const task = new Task({
    name: "customUptodateTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    uptodate: customUptodate,
  });

  await task.setup(ctx);

  // First run - custom uptodate returns true, so task should not run
  await task.exec(ctx);
  assertEquals(uptodateCallCount, 1);
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - custom uptodate returns true again
  await task.exec(ctx);
  assertEquals(uptodateCallCount, 2);
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - custom uptodate returns false, so task should run
  await task.exec(ctx);
  assertEquals(uptodateCallCount, 3);
  assertEquals(taskRunCount, 1);
});

Deno.test("UpToDate - runAlways behavior", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "runAlwaysTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    uptodate: runAlways,
  });

  await task.setup(ctx);

  // First run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should always run
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should always run
  await task.exec(ctx);
  assertEquals(taskRunCount, 3);
});

Deno.test("UpToDate - task execution skipping when up-to-date", async () => {
  const tempFile = await createTempFile("skip test content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const targetFile = await createTempFile("target content");
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "skipTestTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
    targets: [target],
  });

  await task.setup(ctx);

  // First run - should execute
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should skip because:
  // 1. File dependencies haven't changed
  // 2. Targets still exist
  // 3. No custom uptodate function forcing re-run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1); // Should not increment

  await cleanup(tempFile);
  await cleanup(targetFile);
});

Deno.test("UpToDate - task runs when target is deleted", async () => {
  const tempFile = await createTempFile("target deletion test");
  const trackedFile = new TrackedFile({ path: tempFile });
  const targetFile = await createTempFile("target to delete");
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "targetDeletionTask" as TaskName,
    action: () => {
      taskRunCount++;
      // Recreate the target file
      Deno.writeTextFileSync(targetFile, "recreated target");
    },
    deps: [trackedFile],
    targets: [target],
  });

  await task.setup(ctx);

  // First run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Delete the target file
  await Deno.remove(targetFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should execute because target was deleted
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  await cleanup(tempFile);
  await cleanup(targetFile);
});

Deno.test("UpToDate - cross-run manifest state consistency", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_manifest_test_" });
  const tempFile = path.join(tempDir, "consistency_test.txt");
  await Deno.writeTextFile(tempFile, "consistency test");

  const trackedFile = new TrackedFile({ path: tempFile });

  let taskRunCount = 0;

  const taskFactory = () =>
    new Task({
      name: "consistencyTask" as TaskName,
      action: () => {
        taskRunCount++;
      },
      deps: [trackedFile],
    });

  // First run with first manifest
  const manifest1 = new Manifest(tempDir);
  await manifest1.load();
  const task1 = taskFactory();

  const ctx1 = await execBasic(["consistencyTask"], [task1], manifest1);
  const requestedTask1 = ctx1.taskRegister.get("consistencyTask" as TaskName);
  if (requestedTask1) {
    await requestedTask1.exec(ctx1);
  }
  assertEquals(taskRunCount, 1);

  // Save manifest state
  await manifest1.save();

  // Second run with new manifest (simulating new process)
  const manifest2 = new Manifest(tempDir);
  await manifest2.load();
  const task2 = taskFactory();

  const ctx2 = await execBasic(["consistencyTask"], [task2], manifest2);
  const requestedTask2 = ctx2.taskRegister.get("consistencyTask" as TaskName);
  if (requestedTask2) {
    await requestedTask2.exec(ctx2);
  }

  // Should not run again because manifest shows file is unchanged
  assertEquals(taskRunCount, 1);

  // Modify file
  await waitForTimestampChange();
  await Deno.writeTextFile(tempFile, "modified consistency test");

  // Reset done tasks and run again
  ctx2.doneTasks.clear();
  ctx2.inprogressTasks.clear();

  if (requestedTask2) {
    await requestedTask2.exec(ctx2);
  }
  assertEquals(taskRunCount, 2);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("UpToDate - multiple file dependencies change detection", async () => {
  const tempFile1 = await createTempFile("file 1 content", "file1.txt");
  const tempFile2 = await createTempFile("file 2 content", "file2.txt");
  const trackedFile1 = new TrackedFile({ path: tempFile1 });
  const trackedFile2 = new TrackedFile({ path: tempFile2 });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "multiFileTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile1, trackedFile2],
  });

  await task.setup(ctx);

  // First run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - no changes, should not run
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Modify only first file
  await waitForTimestampChange();
  await Deno.writeTextFile(tempFile1, "modified file 1");

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should run because first file changed
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Fourth run - should not run again
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  // Modify second file
  await waitForTimestampChange();
  await Deno.writeTextFile(tempFile2, "modified file 2");

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Fifth run - should run because second file changed
  await task.exec(ctx);
  assertEquals(taskRunCount, 3);

  await cleanup(tempFile1);
  await cleanup(tempFile2);
});

Deno.test("UpToDate - task with no dependencies always up-to-date", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "noDepsTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    // No deps, no targets, no custom uptodate
  });

  await task.setup(ctx);

  // First run - should not run because it's considered up-to-date
  await task.exec(ctx);
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - still should not run
  await task.exec(ctx);
  assertEquals(taskRunCount, 0);
});

Deno.test("UpToDate - task with targets but no dependencies", async () => {
  const targetFile = await createTempFile("target only content");
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "targetOnlyTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    targets: [target],
  });

  await task.setup(ctx);

  // First run - should not run because target exists
  await task.exec(ctx);
  assertEquals(taskRunCount, 0);

  // Delete target
  await Deno.remove(targetFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should run because target was deleted
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  await cleanup(targetFile);
});

Deno.test("UpToDate - custom uptodate with task context access", async () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;
  let contextReceived = false;

  const customUptodate = (taskCtx: TaskContext): boolean => {
    contextReceived = true;
    // Verify we have access to task context
    return !!(taskCtx.task.name === "contextTask" && taskCtx.logger &&
      taskCtx.exec);
  };

  const task = new Task({
    name: "contextTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    uptodate: customUptodate,
  });

  await task.setup(ctx);
  await task.exec(ctx);

  assertEquals(contextReceived, true);
  assertEquals(taskRunCount, 0); // Should NOT run because uptodate returned true (up-to-date)
});

Deno.test("UpToDate - file disappears after initial tracking", async () => {
  const tempFile = await createTempFile("file to disappear");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);

  let taskRunCount = 0;

  const task = new Task({
    name: "disappearingFileTask" as TaskName,
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  await task.setup(ctx);

  // First run - file exists
  await task.exec(ctx);
  assertEquals(taskRunCount, 1);

  // Delete the file
  await Deno.remove(tempFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - file is gone, should trigger re-run
  await task.exec(ctx);
  assertEquals(taskRunCount, 2);

  await cleanup(tempFile);
});
