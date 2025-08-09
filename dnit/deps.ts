// refer to own sources for ease of development
import { file, main, runAlways, task, type TaskContext } from "../dnit.ts";
import * as utils from "../utils.ts";

import * as cli from "@std/cli/parse-args";
import * as fs from "@std/fs";
import * as semver from "@std/semver";

export {
  cli,
  file,
  fs,
  main,
  runAlways,
  semver,
  task,
  type TaskContext,
  utils,
};
