import { file, task } from "./deps.ts";

export const msg = file({
  path: "./msg.txt",
});

export const helloWorld = task({
  name: "helloWorld",
  description: "foo",
  action: async () => {

    const cmd = new Deno.Command("sh", {
      args: ["./writeMsg.sh"],
    });
    await cmd.output();
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
