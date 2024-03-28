// refer to own sources for ease of development
import { file, main, task } from "../dnit.ts";
import * as utils from "../utils.ts";

import * as flags from "https://deno.land/std@0.221.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.221.0/path/mod.ts";
import * as log from "https://deno.land/std@0.221.0/log/mod.ts";
import * as fs from "https://deno.land/std@0.221.0/fs/mod.ts";
import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";

export { file, flags, fs, log, main, path, semver, task, utils };
