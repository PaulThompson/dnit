/// Convenience util to launch a user's dnit.ts

import * as fs from "@std/fs";
import type * as log from "@std/log";
import * as path from "@std/path";
import { type Args, parseArgs } from "@std/cli/parse-args";
import { showHelpBasic } from "./cli/utils.ts";

type UserSource = {
  baseDir: string;
  dnitDir: string;
  mainSrc: string;
  importmap: string | null;
};

type FindUserSourceContext = {
  stat: Deno.FileInfo;
  path: string;
};

function findUserSourceContext(dir: string): FindUserSourceContext {
  return {
    path: dir,
    stat: Deno.lstatSync(dir),
  };
}

export function findUserSource(
  dir: string,
  startCtxArg: FindUserSourceContext | null,
): UserSource | null {
  const startCtx = (startCtxArg === null)
    ? findUserSourceContext(dir)
    : startCtxArg;
  const dirStat = Deno.lstatSync(dir);

  /// Do not cross filesystems (this is how git stops looking for a git dir)
  if (dirStat.dev !== startCtx.stat.dev) {
    return null;
  }

  /// Abort at root:
  if (path.resolve(path.join(dir, "..")) === dir) {
    return null;
  }

  const subdirs = [
    "dnit", // subdirectory (preferred so that subdir is a deno only typescript tree)
    "deno/dnit", // alternative path
  ];

  const defaultSources = [
    "main.ts",
    "dnit.ts",
  ];

  const importmaps = [
    "import_map.json",
    ".import_map.json", // optionally hidden file
  ];

  for (const subdir of subdirs) {
    for (const sourceName of defaultSources) {
      const res = {
        baseDir: path.resolve(dir),
        dnitDir: path.resolve(path.join(dir, subdir)),
        mainSrc: path.resolve(path.join(dir, subdir, sourceName)),
      };

      if (fs.existsSync(res.mainSrc)) {
        for (const importMapFile of importmaps) {
          const importmap = path.resolve(path.join(dir, subdir, importMapFile));
          if (fs.existsSync(importmap)) {
            return {
              ...res,
              importmap,
            };
          }
        }

        return {
          ...res,
          importmap: null,
        };
      }
    }
  }

  // recurse to parent directory to find dnit script
  return findUserSource(path.join(dir, ".."), startCtx);
}

export async function getDenoVersion(): Promise<string> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "--version",
    ],
    stdout: "piped",
  });

  const { stdout } = await cmd.output();
  const denoVersionStr = new TextDecoder().decode(stdout);
  const regmatch = denoVersionStr.match(/deno[ ]+([0-9.]+)/);
  if (regmatch) {
    return regmatch[1];
  }
  throw new Error("Invalid parse of deno version output");
}

export async function launch(logger: log.Logger): Promise<Deno.CommandStatus> {
  const userSource = findUserSource(Deno.cwd(), null);
  if (userSource !== null) {
    logger.info("running source:" + userSource.mainSrc);
    logger.info("running wd:" + userSource.baseDir);
    logger.info("running importmap:" + userSource.importmap);
    logger.info("running dnitDir:" + userSource.dnitDir);

    const denoVersion = await getDenoVersion();
    logger.info("deno version:" + denoVersion);

    Deno.chdir(userSource.baseDir);

    const permissions = [
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
      "--allow-net",
    ];
    const flags = [
      "--quiet",
    ];
    const importmap = userSource.importmap
      ? [
        "--import-map",
        userSource.importmap,
      ]
      : [];

    const args = [
      "run",
      ...flags,
      ...permissions,
      ...importmap,
      userSource.mainSrc,
      "--dnitDir",
      userSource.dnitDir,
      ...Deno.args,
    ];

    logger.info("running command: deno " + args.join(" "));

    const cmd = new Deno.Command(Deno.execPath(), {
      args,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    const { success, code, signal } = await cmd.output();

    logger.info(
      `command finished success:${success} code:${code} signal:${signal}`,
    );

    return {
      success,
      code,
      signal,
    };
  } else {
    const args: Args = parseArgs(Deno.args);
    if (args["help"] === true) {
      showHelpBasic({ info: console.log });
      return {
        success: true,
        code: 0,
        signal: null,
      };
    }
    
    logger.error("No dnit.ts or dnit directory found");
    return {
      success: false,
      code: 1,
      signal: null,
    };
  }
}
