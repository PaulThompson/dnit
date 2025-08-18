import { assertEquals, assertStringIncludes } from "@std/assert";
import { execCli, runAlways, task } from "../mod.ts";

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

  let output = "";

  // run cli with no arg to test the 'list' feature on no args.
  await execCli([], [testTask], {
    stdout: (text: string) => {
      output += text;
    },
  });

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
  let output = "";

  const result = await execCli(["nonExistentTask"], [], {
    stderr: (text: string) => {
      output += text;
    },
  });
  
  assertEquals(result.success, false);
  assertStringIncludes(output, "Task nonExistentTask not found");
});

Deno.test("CLI - execCli handles task execution errors", async () => {
  const failingTask = task({
    name: "failingTask", 
    description: "A task that throws an error",
    action: () => {
      throw new Error("Task execution failed");
    },
    uptodate: runAlways,
  });

  try {
    await execCli(["failingTask"], [failingTask]);
    // Should not reach here - execCli should throw
    assertEquals(false, true, "execCli should have thrown an error");
  } catch (error) {
    // Verify the error was thrown as expected
    assertStringIncludes((error as Error).message, "Task execution failed");
  }
});
