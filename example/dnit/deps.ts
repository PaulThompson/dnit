import {
  exec,
  file,
  task,
} from "https://deno.land/x/dnit@dnit-v1.12.6/dnit.ts";
import * as flags from "https://deno.land/std@0.92.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.92.0/path/mod.ts";
import * as log from "https://deno.land/std@0.92.0/log/mod.ts";
import * as fs from "https://deno.land/std@0.92.0/fs/mod.ts";
import * as hash from "https://deno.land/std@0.92.0/hash/mod.ts";

export { exec, file, flags, fs, hash, log, path, task };
