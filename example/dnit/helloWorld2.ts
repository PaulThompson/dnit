import { task, fs } from "./deps.ts";
import { delay } from "https://deno.land/std/async/delay.ts";
import { msg } from "./helloWorld.ts";
export const helloWorld2 = task({
  name: 'helloWorld2',
  action: async () => {
    const msgStr = await fs.readFileStr(msg.path);
    console.log(msgStr);
  },
  deps: [
    msg
  ],
  uptodate: () => true
});
