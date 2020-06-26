import { task } from "./deps.ts";
import { delay } from "https://deno.land/std/async/delay.ts";

export const helloWorld3 = task({
  name: 'helloWorld3',
  action: async () => {
    console.log("hello world333");
    await delay(1000);
    console.log("hello world333 done");
  },
  uptodate: () => false
});
