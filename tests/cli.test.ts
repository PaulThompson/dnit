import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { execCli, runAlways, task } from "../mod.ts";
import { createTestLoggers } from "./testLogging.ts";
import type { Args } from "@std/cli/parse-args";

Deno.test("CLI - execCli executes the requested task", async () => {
  let taskRun = false;

  const testTask = task({
    name: "testTask",
    description: "A test task",
    action: () => {
      taskRun = true;
    },
    uptodate: runAlways,
  });

  const result = await execCli(["testTask"], [testTask]);

  assertEquals(result.success, true);
  assertEquals(taskRun, true);
});

Deno.test("CLI - execCli defaults to list task when no args", async () => {
  const testTask = task({
    name: "myTask",
    description: "My test task",
    action: () => {},
  });

  // Setup test logging to capture output
  const logCapture = createTestLoggers();

  // run cli with no arg to test the 'list' feature on no args.
  await execCli([], [testTask], logCapture.loggers);

  const output = logCapture.stdout.output.join("\n");

  assertStringIncludes(output, "myTask");
  assertStringIncludes(output, "My test task");

  // check for all builtin tasks in the list
  assertStringIncludes(output, "clean");
  assertStringIncludes(output, "Clean tracked files");

  assertStringIncludes(output, "list");
  assertStringIncludes(output, "List tasks");

  assertStringIncludes(output, "tabcompletion");
  assertStringIncludes(output, "Generate shell completion script");
});

Deno.test("CLI - execCli handles non-existent task", async () => {
  // Setup test logging to capture output
  const logCapture = createTestLoggers();

  const result = await execCli(["nonExistentTask"], [], logCapture.loggers);

  assertEquals(result.success, false);

  const errorOutput = logCapture.stderr.output.join("\n");
  assertStringIncludes(errorOutput, "Task nonExistentTask not found");
});

Deno.test("CLI - execCli handles task execution errors", async () => {
  // Setup test logging to capture output
  const logCapture = createTestLoggers();

  const failingTask = task({
    name: "failingTask",
    description: "A task that throws an error",
    action: () => {
      throw new Error("Task execution failed");
    },
    uptodate: runAlways,
  });

  try {
    await execCli(["failingTask"], [failingTask], logCapture.loggers);
    // Should not reach here - execCli should throw
    assertEquals(false, true, "execCli should have thrown an error");
  } catch (error) {
    // Verify the error was thrown as expected
    assertStringIncludes((error as Error).message, "Task execution failed");

    // Verify error was logged to stderr
    const errorOutput = logCapture.stderr.output.join("\n");
    assertStringIncludes(errorOutput, "Error");
  }
});

Deno.test("CLI - task receives command-line arguments", async () => {
  let receivedArgs: Args | null = null;

  const testTask = task({
    name: "argTest",
    description: "Test task for arguments",
    action: (ctx) => {
      receivedArgs = ctx.args;
    },
    uptodate: runAlways,
  });

  await execCli(["argTest", "pos1", "pos2", "--flag", "value"], [testTask]);

  assertExists(receivedArgs);
  // Positional args include the task name and additional positional arguments
  assertEquals(receivedArgs["_"], ["argTest", "pos1", "pos2"]);
  assertEquals(receivedArgs["flag"], "value");
});

Deno.test("CLI - task receives named flags", async () => {
  let receivedArgs: Args | null = null;

  const testTask = task({
    name: "flagTest",
    description: "Test task for named flags",
    action: (ctx) => {
      receivedArgs = ctx.args;
    },
    uptodate: runAlways,
  });

  await execCli([
    "flagTest",
    "--verbose",
    "--dry-run",
    "--output",
    "file.txt",
    "--count",
    "42",
  ], [testTask]);

  assertExists(receivedArgs);
  assertEquals(receivedArgs["_"], ["flagTest"]);
  assertEquals(receivedArgs["verbose"], true);
  assertEquals(receivedArgs["dry-run"], true);
  assertEquals(receivedArgs["output"], "file.txt");
  assertEquals(receivedArgs["count"], 42); // parseArgs converts numeric strings to numbers
});

Deno.test("CLI - task receives mixed positional and named arguments", async () => {
  let receivedArgs: Args | null = null;

  const testTask = task({
    name: "mixedTest",
    description: "Test task for mixed arguments",
    action: (ctx) => {
      receivedArgs = ctx.args;
    },
    uptodate: runAlways,
  });

  await execCli([
    "mixedTest",
    "file1.txt",
    "--verbose",
    "file2.txt",
    "--output",
    "result.txt",
    "file3.txt",
  ], [testTask]);

  assertExists(receivedArgs);
  // parseArgs treats "file2.txt" as the value for --verbose flag
  assertEquals(receivedArgs["_"], ["mixedTest", "file1.txt", "file3.txt"]);
  assertEquals(receivedArgs["verbose"], "file2.txt"); // Gets value assigned to flag
  assertEquals(receivedArgs["output"], "result.txt");
});

Deno.test("CLI - task receives arguments with special characters", async () => {
  let receivedArgs: Args | null = null;

  const testTask = task({
    name: "specialTest",
    description: "Test task for special character arguments",
    action: (ctx) => {
      receivedArgs = ctx.args;
    },
    uptodate: runAlways,
  });

  await execCli([
    "specialTest",
    "file with spaces.txt",
    "--message",
    "Hello, World!",
    "--path",
    "/usr/local/bin",
    "another-file.txt",
  ], [testTask]);

  assertExists(receivedArgs);
  assertEquals(receivedArgs["_"], [
    "specialTest",
    "file with spaces.txt",
    "another-file.txt",
  ]);
  assertEquals(receivedArgs["message"], "Hello, World!");
  assertEquals(receivedArgs["path"], "/usr/local/bin");
});

Deno.test("CLI - task receives boolean flags correctly", async () => {
  let receivedArgs: Args | null = null;

  const testTask = task({
    name: "boolTest",
    description: "Test task for boolean flags",
    action: (ctx) => {
      receivedArgs = ctx.args;
    },
    uptodate: runAlways,
  });

  await execCli([
    "boolTest",
    "--enable",
    "--no-cache",
    "--verbose",
    "false", // This will be string "false", not boolean
  ], [testTask]);

  assertExists(receivedArgs);
  assertEquals(receivedArgs["_"], ["boolTest"]);
  assertEquals(receivedArgs["enable"], true);
  assertEquals(receivedArgs["no-cache"], true);
  // When a value follows a flag, it's treated as the flag's value
  assertEquals(receivedArgs["verbose"], "false");
});
