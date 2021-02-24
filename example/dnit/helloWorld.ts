import { file, task } from "./deps.ts";

export const msg = file({
  path: "./msg.txt",
});

export const helloWorld = task({
  name: "helloWorld",
  description: "foo",
  action: async () => {
    await Deno.run({
      cmd: ["./writeMsg.sh"],
    }).status();
  },
  deps: [
    file({
      path: "./writeMsg.sh",
    }),
  ],
  targets: [
    msg,
  ],
});
