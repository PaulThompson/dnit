// refer to own sources for ease of development
import { file, main, task, runAlways, type TaskContext } from "../dnit.ts";
import * as utils from "../utils.ts";

import * as cli from "jsr:@std/cli@1.0.15/parse-args";
import * as fs from "https://deno.land/std@0.221.0/fs/mod.ts";
import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";

export { file, cli, fs, main, runAlways, semver, task, utils, type TaskContext };
