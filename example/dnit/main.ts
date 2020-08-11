import { exec } from "./deps.ts";
import { helloWorld } from "./helloWorld.ts";
import { goodbye } from "./goodBye.ts";

const tasks = [
  helloWorld,
  goodbye
];

exec(Deno.args, tasks)
.then(result=>{
  if(!result.success) {
    Deno.exit(1);
  }
});
