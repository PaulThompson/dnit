/// Convenience util to launch a user's dnit.ts

import {flags, log, fs} from './deps.ts';

function findUserSource(args: flags.Args) : string|null {
  const defaultSources = [
    'dnit.ts',      // default in present directory
    'dnit/main.ts', // subdirectory (preferred so that subdir is a deno only typescript tree)
    'dnit/dnit.ts', // subdirectory (alternate)
  ];

  for(const sourceName of defaultSources) {
    if(fs.existsSync(sourceName)) {
      return sourceName;
    }
  }

  log.error(`no dnit source found.  Use ${defaultSources.join(' or ')} or provide on commandline`);
  return null;
}

export async function launch() : Promise<Deno.ProcessStatus> {
  const args = flags.parse(Deno.args);

  const userSource = findUserSource(args);
  if(userSource !== null) {
    log.info('running source:' + userSource);

    const proc = Deno.run({
      cmd: ["deno", "run", "--unstable", "--allow-read", "--allow-write", "--allow-run", userSource].concat(Deno.args),
    });

    const status = await proc.status();
    return status;
  }
  else {
    return {
      success: false,
      code: 1
    };
  }
}
