import { assertEquals } from "@std/assert";
import { execCli, Manifest, runAlways, Task } from "../mod.ts";

Deno.test("CLI - execCli executes requested task", async () => {
  const _manifest = new Manifest("");
  let taskRun = false;

  const testTask = new Task({
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
