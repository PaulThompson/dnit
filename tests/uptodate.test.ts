import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import { execBasic, Task, TrackedFile } from "../mod.ts";
import { Manifest } from "../manifest.ts";
import { runAlways } from "../core/task.ts";
import { createFileInDir, createTempDir } from "./utils.ts";
import type { TaskContext } from "../core/TaskContext.ts";

Deno.test("UpToDate - file modification detection by hash", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "original content",
  );
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "hashTestTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["hashTestTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("hashTestTask");

  // First run - should execute because no previous manifest data
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should skip because file hasn't changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1); // Should not increment

  // Modify file content
  await Deno.writeTextFile(tempFile, "modified content");

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should execute because file content changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2); // Should increment

  await cleanup();
});

Deno.test("UpToDate - timestamp-based change detection", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "timestamp test",
  );

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
  let taskRunCount = 0;

  const task = new Task({
    name: "timestampTestTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["timestampTestTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("timestampTestTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Get the current file data
  const initialFileData = await trackedFile.getFileData();

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run with no changes - should not run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1); // Should not increment

  // Rewrite the same content but this will change the timestamp
  await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for timestamp to change
  await Deno.writeTextFile(tempFile, "timestamp test"); // Same content, new timestamp

  // Reset done tasks to allow re-execution
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should detect timestamp change via custom hash function
  const newFileData = await trackedFile.getFileData();
  assertEquals(initialFileData.hash !== newFileData.hash, true); // Different timestamp-based "hash"

  // Task should run due to timestamp change
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  await cleanup();
});

Deno.test("UpToDate - custom uptodate function execution", async () => {
  const manifest = new Manifest("");
  let taskRunCount = 0;
  let uptodateCallCount = 0;

  const customUptodate = () => {
    uptodateCallCount++;
    return uptodateCallCount <= 2; // Return true first two times, false after
  };

  const task = new Task({
    name: "customUptodateTask",
    action: () => {
      taskRunCount++;
    },
    uptodate: customUptodate,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["customUptodateTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("customUptodateTask");

  // First run - custom uptodate returns true, so task should not run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(uptodateCallCount, 1);
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - custom uptodate returns true again
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(uptodateCallCount, 2);
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - custom uptodate returns false, so task should run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(uptodateCallCount, 3);
  assertEquals(taskRunCount, 1);
});

Deno.test("UpToDate - runAlways behavior", async () => {
  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "runAlwaysTask",
    action: () => {
      taskRunCount++;
    },
    uptodate: runAlways,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["runAlwaysTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("runAlwaysTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should always run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should always run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 3);
});

Deno.test("UpToDate - task execution skipping when up-to-date", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "skip test content",
  );
  const trackedFile = new TrackedFile({ path: tempFile });
  const targetFile = await createFileInDir(
    dirPath,
    "target_file.txt",
    "target content",
  );
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "skipTestTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
    targets: [target],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["skipTestTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("skipTestTask");

  // First run - should execute
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should skip because:
  // 1. File dependencies haven't changed
  // 2. Targets still exist
  // 3. No custom uptodate function forcing re-run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1); // Should not increment

  await cleanup();
});

Deno.test("UpToDate - task runs when target is deleted", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "target deletion test",
  );
  const trackedFile = new TrackedFile({ path: tempFile });
  const targetFile = await createFileInDir(
    dirPath,
    "target_file.txt",
    "target to delete",
  );
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "targetDeletionTask",
    action: () => {
      taskRunCount++;
      // Recreate the target file
      Deno.writeTextFileSync(targetFile, "recreated target");
    },
    deps: [trackedFile],
    targets: [target],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["targetDeletionTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("targetDeletionTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Delete the target file
  await Deno.remove(targetFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should execute because target was deleted
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  await cleanup();
});

Deno.test("UpToDate - cross-run manifest state consistency", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_manifest_test_" });
  const tempFile = path.join(tempDir, "consistency_test.txt");
  await Deno.writeTextFile(tempFile, "consistency test");

  const trackedFile = new TrackedFile({ path: tempFile });

  let taskRunCount = 0;

  const taskFactory = () =>
    new Task({
      name: "consistencyTask",
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
  const requestedTask1 = ctx1.taskRegister.get("consistencyTask");
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
  const requestedTask2 = ctx2.taskRegister.get("consistencyTask");
  if (requestedTask2) {
    await requestedTask2.exec(ctx2);
  }

  // Should not run again because manifest shows file is unchanged
  assertEquals(taskRunCount, 1);

  // Modify file
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
  const { dirPath, cleanup } = await createTempDir();
  const tempFile1 = await createFileInDir(
    dirPath,
    "file1.txt",
    "file 1 content",
  );
  const tempFile2 = await createFileInDir(
    dirPath,
    "file2.txt",
    "file 2 content",
  );
  const trackedFile1 = new TrackedFile({ path: tempFile1 });
  const trackedFile2 = new TrackedFile({ path: tempFile2 });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "multiFileTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile1, trackedFile2],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["multiFileTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("multiFileTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - no changes, should not run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Modify only first file
  await Deno.writeTextFile(tempFile1, "modified file 1");

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Third run - should run because first file changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Fourth run - should not run again
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Modify second file
  await Deno.writeTextFile(tempFile2, "modified file 2");

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Fifth run - should run because second file changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 3);

  await cleanup();
});

Deno.test("UpToDate - task with no dependencies always up-to-date", async () => {
  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "noDepsTask",
    action: () => {
      taskRunCount++;
    },
    // No deps, no targets, no custom uptodate
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["noDepsTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("noDepsTask");

  // First run - should not run because it's considered up-to-date
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 0);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - still should not run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 0);
});

Deno.test("UpToDate - task with targets but no dependencies", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const targetFile = await createFileInDir(
    dirPath,
    "target_file.txt",
    "target only content",
  );
  const target = new TrackedFile({ path: targetFile });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "targetOnlyTask",
    action: () => {
      taskRunCount++;
    },
    targets: [target],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["targetOnlyTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("targetOnlyTask");

  // First run - should not run because target exists
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 0);

  // Delete target
  await Deno.remove(targetFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - should run because target was deleted
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  await cleanup();
});

Deno.test("UpToDate - custom uptodate with task context access", async () => {
  const manifest = new Manifest("");
  let taskRunCount = 0;
  let contextReceived = false;

  const customUptodate = (taskCtx: TaskContext): boolean => {
    contextReceived = true;
    // Verify we have access to task context
    return !!(taskCtx.task.name === "contextTask" && taskCtx.logger &&
      taskCtx.exec);
  };

  const task = new Task({
    name: "contextTask",
    action: () => {
      taskRunCount++;
    },
    uptodate: customUptodate,
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["contextTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("contextTask");

  if (requestedTask) {
    await requestedTask.exec(ctx);
  }

  assertEquals(contextReceived, true);
  assertEquals(taskRunCount, 0); // Should NOT run because uptodate returned true (up-to-date)
});

Deno.test("UpToDate - custom hash function based on file size", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "size_hash_test.txt",
    "initial content",
  );

  // Custom hash function that uses file size as the "hash"
  const sizeBasedHash = (_filePath: string, stat: Deno.FileInfo) => {
    return stat.size?.toString() || "0";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: sizeBasedHash,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "sizeHashTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["sizeHashTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("sizeHashTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - same content, same size, should not run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Change content but keep same size
  await Deno.writeTextFile(tempFile, "different cont"); // Same length as "initial content"

  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because file timestamp changed (even though size-based hash is same)
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Change to different size
  await Deno.writeTextFile(tempFile, "much longer content than before");

  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because both size (hash) and timestamp changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 3);

  await cleanup();
});

Deno.test("UpToDate - async custom hash function", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "async_hash_test.txt",
    "async test",
  );

  // Async custom hash function that simulates a delayed computation
  const asyncCustomHash = async (filePath: string, _stat: Deno.FileInfo) => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1));
    // Return first few characters of content as "hash"
    const content = await Deno.readTextFile(filePath);
    return content.substring(0, 3);
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: asyncCustomHash,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "asyncHashTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["asyncHashTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("asyncHashTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Change first characters
  await Deno.writeTextFile(tempFile, "different content");

  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because first 3 characters changed from "asy" to "dif"
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  await cleanup();
});

Deno.test("UpToDate - custom hash function error handling", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "error_hash_test.txt",
    "error test",
  );

  let shouldThrow = false;
  const errorProneHash = (_filePath: string, _stat: Deno.FileInfo) => {
    if (shouldThrow) {
      throw new Error("Custom hash function failed");
    }
    return "stable-hash";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: errorProneHash,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "errorHashTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["errorHashTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("errorHashTask");

  // First run - should work
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Enable error and try again
  shouldThrow = true;
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should propagate the error from custom hash function
  try {
    if (requestedTask) {
      await requestedTask.exec(ctx);
    }
    assertEquals(true, false, "Should have thrown an error");
  } catch (error) {
    // The error might be wrapped, so check if the message contains our custom error
    const errorMessage = (error as Error).message;
    if (!errorMessage.includes("Custom hash function failed")) {
      throw error; // Re-throw unexpected errors
    }
  }

  await cleanup();
});

Deno.test("UpToDate - custom timestamp function", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "custom_timestamp_test.txt",
    "timestamp test content",
  );

  let fakeTimestamp = "2023-01-01T00:00:00.000Z";
  
  // Custom timestamp function that returns a controllable timestamp
  const customTimestamp = (_filePath: string, _stat: Deno.FileInfo) => {
    return fakeTimestamp;
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getTimestamp: customTimestamp,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "customTimestampTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["customTimestampTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("customTimestampTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Rewrite file content but keep same custom timestamp
  await Deno.writeTextFile(tempFile, "different content but same timestamp");
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because content hash changed (even though our custom timestamp didn't)
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Keep same content but change custom timestamp
  fakeTimestamp = "2023-12-31T23:59:59.999Z";
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should NOT run because content didn't change (hash is the same)
  // Custom timestamp change alone won't trigger re-run if hash is unchanged
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  await cleanup();
});

Deno.test("UpToDate - async custom timestamp function", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "async_timestamp_test.txt",
    "async timestamp test",
  );

  let timestampSuffix = "001Z";
  
  // Async custom timestamp function 
  const asyncCustomTimestamp = async (_filePath: string, stat: Deno.FileInfo) => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1));
    // Return modified version of actual timestamp
    const baseTime = stat.mtime?.toISOString().slice(0, -4) || "2023-01-01T00:00:00.";
    return baseTime + timestampSuffix;
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getTimestamp: asyncCustomTimestamp,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "asyncTimestampTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["asyncTimestampTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("asyncTimestampTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Change the timestamp suffix
  timestampSuffix = "999Z";
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should NOT run because the actual file content/hash hasn't changed  
  // Custom timestamp change alone doesn't trigger re-run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  await cleanup();
});

Deno.test("UpToDate - custom timestamp function error handling", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "error_timestamp_test.txt",
    "error timestamp test",
  );

  let shouldThrow = false;
  const errorProneTimestamp = (_filePath: string, _stat: Deno.FileInfo) => {
    if (shouldThrow) {
      throw new Error("Custom timestamp function failed");
    }
    return "2023-01-01T00:00:00.000Z";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getTimestamp: errorProneTimestamp,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "errorTimestampTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["errorTimestampTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("errorTimestampTask");

  // First run - should work
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Enable error and try again
  shouldThrow = true;
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should throw when trying to get timestamp
  try {
    if (requestedTask) {
      await requestedTask.exec(ctx);
    }
    assertEquals(true, false, "Should have thrown an error");
  } catch (error) {
    assertEquals((error as Error).message, "Custom timestamp function failed");
  }

  await cleanup();
});

Deno.test("UpToDate - combined custom hash and timestamp functions", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "combined_custom_test.txt",
    "combined test content",
  );

  let customHashValue = "hash-v1";
  let customTimestampValue = "2023-06-01T12:00:00.000Z";
  
  // Custom hash function
  const customHash = (_filePath: string, _stat: Deno.FileInfo) => {
    return customHashValue;
  };

  // Custom timestamp function
  const customTimestamp = (_filePath: string, _stat: Deno.FileInfo) => {
    return customTimestampValue;
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: customHash,
    getTimestamp: customTimestamp,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "combinedCustomTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["combinedCustomTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("combinedCustomTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Change only the hash by modifying the file content  
  await Deno.writeTextFile(tempFile, "changed content to trigger hash change");
  customHashValue = "hash-v2";
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because file content changed (and our custom hash changed)
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  // Change only the timestamp (keep same hash and file content)
  customHashValue = "hash-v2"; // Keep same hash
  customTimestampValue = "2023-06-02T12:00:00.000Z";
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because timestamp changed (this tests if timestamp affects up-to-date)
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 3);

  // Keep both values the same
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should NOT run because both hash and timestamp are unchanged
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 3);

  // Change both at once
  customHashValue = "hash-v3";
  customTimestampValue = "2023-06-03T12:00:00.000Z";
  
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Should run because both changed
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 4);

  await cleanup();
});

Deno.test("UpToDate - mixed async custom hash with sync custom timestamp", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "mixed_async_test.txt",
    "mixed async content",
  );

  let hashCounter = 0;
  const timestampValue = "2023-01-01T00:00:00.000Z";
  
  // Async custom hash function
  const asyncCustomHash = async (_filePath: string, _stat: Deno.FileInfo) => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1));
    hashCounter++;
    return `async-hash-${hashCounter}`;
  };

  // Sync custom timestamp function
  const syncCustomTimestamp = (_filePath: string, _stat: Deno.FileInfo) => {
    return timestampValue;
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: asyncCustomHash,
    getTimestamp: syncCustomTimestamp,
  });

  const manifest = new Manifest("");
  let taskRunCount = 0;

  const task = new Task({
    name: "mixedAsyncTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  const ctx = await execBasic(["mixedAsyncTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get("mixedAsyncTask");

  // First run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);
  assertEquals(hashCounter, 1);

  // Reset and run again - hash will increment, triggering re-run
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);
  assertEquals(hashCounter, 2);

  await cleanup();
});

Deno.test("UpToDate - file disappears after initial tracking", async () => {
  const { dirPath, cleanup } = await createTempDir();
  const tempFile = await createFileInDir(
    dirPath,
    "test_file.txt",
    "file to disappear",
  );
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");

  let taskRunCount = 0;

  const task = new Task({
    name: "disappearingFileTask",
    action: () => {
      taskRunCount++;
    },
    deps: [trackedFile],
  });

  // Use execBasic for proper task setup
  const ctx = await execBasic(["disappearingFileTask"], [task], manifest);
  const requestedTask = ctx.taskRegister.get(
    "disappearingFileTask",
  );

  // First run - file exists
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 1);

  // Delete the file
  await Deno.remove(tempFile);

  // Reset done tasks
  ctx.doneTasks.clear();
  ctx.inprogressTasks.clear();

  // Second run - file is gone, should trigger re-run
  if (requestedTask) {
    await requestedTask.exec(ctx);
  }
  assertEquals(taskRunCount, 2);

  await cleanup();
});
