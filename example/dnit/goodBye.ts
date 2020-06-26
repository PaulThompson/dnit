import { task } from "./deps.ts";
import { helloWorld } from "./helloWorld.ts";
import { helloWorld2 } from "./helloWorld2.ts";
import { helloWorld3 } from "./helloWorld3.ts";

export const goodbye = task({
  name: 'goodbye',
  action: async () => {
    // use ordinary typescript idiomatically if several actions are required
    const actions = [
      async () => {
        console.log("good world");
      },
      async () => {
        console.log("bye world");
      },
    ];
    for (const action of actions) {
      await action();
    }
  },
  deps: [helloWorld, helloWorld, helloWorld, helloWorld2, helloWorld3, helloWorld]
});
