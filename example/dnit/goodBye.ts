import { task, fs } from "./deps.ts";
import { msg } from "./helloWorld.ts";

export const goodbye = task({
  name: 'goodbye',
  action: async () => {
    // use ordinary typescript idiomatically if several actions are required
    const actions = [
      async () => {
        const txt = await fs.readFileStr(msg.path);
        console.log(txt);
      },
      async () => {
        console.log("...");
      },
    ];
    for (const action of actions) {
      await action();
    }
  },
  deps: [msg]
});
