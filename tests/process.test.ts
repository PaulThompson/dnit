import { assertEquals } from "@std/assert";

import { run } from "../utils/process.ts";

Deno.test("Process - run", async () => {
  const str = await run(["echo", "hello world"]);
  assertEquals(str.trim(), "hello world");
});
