import { assertEquals, assertStringIncludes } from "@std/assert";
import { execCli, task, runAlways } from "../mod.ts";

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
    }
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
