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
  
  // Use execCli directly with stdout override
  await execCli([], [testTask], {
    stdout: (text: string) => {
      output += text;
    }
  });

  assertStringIncludes(output, "myTask");
  assertStringIncludes(output, "My test task");
});
