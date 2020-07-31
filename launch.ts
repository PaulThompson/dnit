/// Convenience util to launch a user's dnit.ts

import {flags, log, fs, path} from './deps.ts';

type UserSource = {
  baseDir: string;
  dnitDir: string;
  mainSrc: string;
  importmap: string|null;
};

type FindUserSourceContext = {
  stat: Deno.FileInfo;
  path: string;
}

function findUserSourceContext(dir:string) : FindUserSourceContext {
  const pathParts = dir.split(path.SEP);
  return {
    path: dir,
    stat: Deno.lstatSync(dir),
  };
}

function findUserSource(dir: string, startCtxArg:FindUserSourceContext|null) : UserSource|null {
  const startCtx = (startCtxArg === null) ? findUserSourceContext(dir) : startCtxArg;
  const dirStat = Deno.lstatSync(dir);

  /// Do not cross filesystems (this is how git stops looking for a git dir)
  if(dirStat.dev !== startCtx.stat.dev) {
    return null;
  }

  /// Abort at root:
  if(path.resolve(path.join(dir,'..')) === dir) {
    return null;
  }

  const subdirs = [
    "dnit", // subdirectory (preferred so that subdir is a deno only typescript tree)
  ];

  const defaultSources = [
    'main.ts',
    'dnit.ts',
  ];

  const importmaps = [
    "import_map.json",
    ".import_map.json"    // optionally hidden file
  ]

  for(const subdir of subdirs) {
    for(const sourceName of defaultSources) {

      const res = {
        baseDir: path.resolve(dir),
        dnitDir: path.resolve(path.join(dir, subdir)),
        mainSrc: path.resolve(path.join(dir, subdir, sourceName)),
      };

      if(fs.existsSync(res.mainSrc)) {
        for(const importMapFile of importmaps) {
          const importmap = path.resolve(path.join(dir, subdir, importMapFile));
          if(fs.existsSync(importmap)) {
            return {
              ...res,
              importmap
            };
          }
        }

        return {
          ...res,
          importmap: null
        };
      }
    }
  }

  // recurse to parent directory to find dnit script
  return findUserSource(path.join(dir,'..'), startCtx);
}

export async function launch(logger: log.Logger) : Promise<Deno.ProcessStatus> {
  const args = flags.parse(Deno.args);

  const userSource = findUserSource(Deno.cwd(), null);
  if(userSource !== null) {
    logger.info('running source:' + userSource.mainSrc);
    logger.info('running wd:' + userSource.baseDir);
    logger.info('running importmap:' + userSource.importmap);
    logger.info('running dnitDir:' + userSource.dnitDir);

    Deno.chdir(userSource.baseDir);

    const permissions = [
      "--allow-read",
      "--allow-write",
      "--allow-run"
    ];
    const flags = [
      "--quiet",
      "--unstable",
    ];
    const importmap = userSource.importmap ? [
      "--importmap",
      userSource.importmap
    ] : [];

    const proc = Deno.run({
      cmd: ["deno", "run"]
      .concat(flags)
      .concat(permissions)
      .concat(importmap)
      .concat([userSource.mainSrc])
      .concat(['--dnitDir', userSource.dnitDir])
      .concat(Deno.args),
    });

    const status = await proc.status();
    return status;
  }
  else {
    logger.error('No dnit.ts or dnit directory found)');
    return {
      success: false,
      code: 1
    };
  }
}
