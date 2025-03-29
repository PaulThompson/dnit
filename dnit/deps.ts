// refer to own sources for ease of development
import { file, main, runAlways, task, type TaskContext } from "../dnit.ts";
import * as utils from "../utils.ts";

import * as cli from "jsr:@std/cli@1.0.15/parse-args";
import * as fs from "jsr:@std/fs@1.0.15";
import * as semver from "jsr:@std/semver@1.0.4";

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
