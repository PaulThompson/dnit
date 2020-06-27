import { task, exec, file } from "./deps.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as fs  from "https://deno.land/std/fs/mod.ts";

import { helloWorld } from "./helloWorld.ts";
import { goodbye } from "./goodBye.ts";

const tasks = [
  helloWorld,
  goodbye
];

exec(Deno.args, tasks);
