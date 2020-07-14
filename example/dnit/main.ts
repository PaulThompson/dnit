import { task, exec, file } from "./deps.ts";
import { helloWorld } from "./helloWorld.ts";
import { goodbye } from "./goodBye.ts";

const tasks = [
  helloWorld,
  goodbye
];

exec(Deno.args, tasks);
