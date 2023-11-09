import {
  file,
  main,
  task,
} from "https://deno.land/x/dnit@dnit-v1.14.3/dnit.ts";
import * as flags from "https://deno.land/std@0.117.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.117.0/path/mod.ts";
import * as log from "https://deno.land/std@0.117.0/log/mod.ts";
import * as fs from "https://deno.land/std@0.117.0/fs/mod.ts";
import * as hash from "https://deno.land/std@0.117.0/hash/mod.ts";

export { file, flags, fs, hash, log, main, path, task };
