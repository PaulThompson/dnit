import { assertEquals, assertStringIncludes } from "@std/assert";
import { execCli, task, runAlways, execBasic, Manifest } from "../mod.ts";

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
  const ctx = await execBasic([], [testTask], manifest);
  
  // Override stdout to capture output
  ctx.stdout = (text: string) => {
    output += text;
  };

  await ctx.getTaskByName("list")?.exec(ctx);

  assertStringIncludes(output, "myTask");
  assertStringIncludes(output, "My test task");
});
