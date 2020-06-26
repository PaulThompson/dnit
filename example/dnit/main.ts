import { task, exec, file } from "./deps.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as fs  from "https://deno.land/std/fs/mod.ts";

import { helloWorld } from "./helloWorld.ts";
import { helloWorld2 } from "./helloWorld2.ts";
import { helloWorld3 } from "./helloWorld3.ts";
import { goodbye } from "./goodBye.ts";

const tasks = [
  helloWorld,
  helloWorld2,
  helloWorld3,
  goodbye
];

exec(Deno.args, tasks);
