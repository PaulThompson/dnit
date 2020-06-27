import { task } from "./deps.ts";

import { msg, helloWorld } from "./helloWorld.ts";

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
  deps: [helloWorld]
});
