import { assertEquals } from "https://deno.land/std@0.221.0/assert/mod.ts";

import { run } from "./process.ts";

Deno.test("Process - run", async () => {
  const str = await run(["echo", "hello world"]);
  assertEquals(str.trim(), "hello world");
});
