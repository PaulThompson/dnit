import { main } from "./deps.ts";
import { helloWorld } from "./helloWorld.ts";
import { goodbye } from "./goodBye.ts";

const tasks = [
  helloWorld,
  goodbye,
];

main(Deno.args, tasks);

