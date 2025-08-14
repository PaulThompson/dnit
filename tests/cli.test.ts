import { assertEquals, assertStringIncludes } from "@std/assert";
import { execCli, task, runAlways, Manifest } from "../mod.ts";
import { execContextInitBasicArgs, executeRequestedTask, getRequestedTaskName } from "../cli/cli.ts";
import { parseArgs } from "@std/cli/parse-args";

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
  const manifest = new Manifest("");
  const args = parseArgs([]);
  const ctx = await execContextInitBasicArgs(args, [testTask], manifest);
  
  // Override stdout to capture output
  ctx.stdout = (text: string) => {
    output += text;
  };

  // Execute with empty args (should default to "list")
  const requestedTaskName: string = getRequestedTaskName(args);
  await executeRequestedTask(ctx, requestedTaskName);

  assertStringIncludes(output, "myTask");
  assertStringIncludes(output, "My test task");
});
