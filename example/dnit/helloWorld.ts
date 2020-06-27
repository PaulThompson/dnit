import { task, exec, file } from "./deps.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as fs  from "https://deno.land/std/fs/mod.ts";

export const msg = file({
  path: './msg.txt'
});

export const helloWorld = task({
  name: 'helloWorld',
  description: "foo",
  action: async () => {
    await Deno.run({
      cmd: ["./writeMsg.sh"],
    }).status();
  },
  deps: [
    file({
      path: "./writeMsg.sh"
    })
  ],
  targets: [
    msg
  ],
  uptodate: () => false
});
