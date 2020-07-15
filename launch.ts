/// Convenience util to launch a user's dnit.ts

import {flags, log, fs, path} from './deps.ts';

type UserSource = {
  baseDir: string;
  mainSrc: string;
  importmap: string|null;
};

function findUserSource(dir: string) : UserSource|null {
  if(!fs.existsSync(dir)) {
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
  return findUserSource(path.join(dir,'..'));
}

export async function launch(logger: log.Logger) : Promise<Deno.ProcessStatus> {
  const args = flags.parse(Deno.args);

  const userSource = findUserSource(Deno.cwd());
  if(userSource !== null) {
    logger.info('running source:' + userSource.mainSrc);
    logger.info('running wd:' + userSource.baseDir);
    logger.info('running importmap:' + userSource.importmap);

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
