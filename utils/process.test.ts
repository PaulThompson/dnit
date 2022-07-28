import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";

import { processPipe, run } from "./process.ts";

Deno.test("Process - piping", async () => {
  const str = await processPipe({
    in: "null",
    out: "piped",
    inp: null,
    cmds: [
      {
        cmd: ["echo", "hello world"],
      },
      {
        cmd: ["cat"],
      },
      {
        cmd: ["cat"],
      },
      {
        cmd: ["cat"],
      },
    ],
  });

  assertEquals(str.trim(), "hello world");
});

Deno.test("Process - stdin stdout", async () => {
  const str = await processPipe({
    in: "piped",
    out: "piped",
    inp: "hello world",
    cmds: [
      {
        cmd: ["cat"],
      },
      {
        cmd: ["cat"],
      },
    ],
  });

  assertEquals(str, "hello world");
});

Deno.test("Process - inherit", async () => {
  const str = await processPipe({
    in: "piped",
    out: "inherit",
    inp: "hello world",
    cmds: [
      {
        cmd: ["cat"],
      },
      {
        cmd: ["cat"],
      },
    ],
  });

  // output went to parent process stdout
  assertEquals(str, null);
});

Deno.test("Process - run", async () => {
  const str = await run(["echo", "hello world"]);
  assertEquals(str.trim(), "hello world");
});
