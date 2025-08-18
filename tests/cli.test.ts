import { assertEquals, assertStringIncludes } from "@std/assert";
import { execCli, runAlways, task } from "../mod.ts";
import { createTestLoggers } from "./testLogging.ts";

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
