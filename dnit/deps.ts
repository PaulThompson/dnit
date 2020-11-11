// refer to own sources for ease of development
import { task, exec, file } from "../dnit.ts";
import * as utils from "../utils.ts";

import * as flags from "https://deno.land/std@0.77.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.77.0/path/mod.ts";
import * as log from "https://deno.land/std@0.77.0/log/mod.ts";
import * as fs from "https://deno.land/std@0.77.0/fs/mod.ts";
import * as hash from "https://deno.land/std@0.77.0/hash/mod.ts";
import * as semver from "https://deno.land/x/semver@v1.0.0/mod.ts";

export {
  task,
  exec,
  file,
  flags,
  log,
  fs,
  hash,
  path,
  utils,
  semver,
};
