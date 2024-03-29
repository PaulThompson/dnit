import { task } from "./deps.ts";
import { msg } from "./helloWorld.ts";

//import { red } from "fmt/colors.ts";

//console.log(red("hello world"));

export const goodbye = task({
  name: "goodbye",
  action: async () => {
    // use ordinary typescript idiomatically if several actions are required
    const actions = [
      async () => {
        const txt = await Deno.readTextFile(msg.path);
        console.log(txt);
      },
    ];
    for (const action of actions) {
      await action();
    }
  },
  deps: [msg],
});
