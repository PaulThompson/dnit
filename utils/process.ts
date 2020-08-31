import {readAllClose, writeAllClose, copyAllClose} from './io.ts';

/** IO options for stdin/stdout/stderr on Deno.run */
export type IoOption = "inherit" | "piped" | "null";

/** IoOption for each of stdin/stdout/stderr */
export interface IoParams {
  stdout: IoOption;
  stderr: IoOption;
  stdin: IoOption;
};

/** Options for execution of processes */
export type ExecOptions = {
  cwd?: string;
  env?: {
    [key: string]: string;
  };
};

/** Params for execution of processes */
export type ExecParams = {
  cmd: string[],
} & ExecOptions;

export class ExecError extends Error {
  public constructor(params: ExecParams, public code: number) {
    super(`Process ${Deno.inspect(params.cmd)} failed with ${code}`);
  }
}

/** mapping from IoOption to type of data required/expected for stdio */
type ProcessIoValOpts = {
  "piped": string;
  "inherit": null;
  "null": null;
};

type ProcessIoVal<T extends IoOption> = ProcessIoValOpts[T];

/** Run a chain of processes - first and last processes can take or receive either string, inherited or null stdin/stdout. */
export async function processPipe<Inp extends IoOption, Outp extends IoOption>(
  params: {
    in: Inp,  /// Options for first process stdin
    out: Outp /// Options for last process stdout
    stderrs?: "null"|"inherit" /// stderr values either inherit parent process stderr or null (default: null)
    inp: ProcessIoVal<Inp>,  /// First process stdin string / or null.
    cmds: [ExecParams, ...ExecParams[]]   /// Processes' ExecParams  (non-empty)
  }
) : Promise<ProcessIoVal<Outp>> {

  const first = 0;
  const second = 1;
  const last = params.cmds.length - 1;
  const end = params.cmds.length;

  const ioOpts : IoParams[] = params.cmds.map( (_,i)=>({
    // first process has option for input on stdin (mid-pipe processes all use "piped" stdin)
    stdin: i===first ? params.in : "piped",

    // stderrs all null or inherit (defaulting to null)
    stderr: params.stderrs || "null",

    // last process has option for stdout output (mid-pipe processes all use "piped" stdout)
    stdout: i===last ? params.out : "piped"
  }));

  // merge parameters from IoParams and ExecParams
  const runOpts : Deno.RunOptions[] = [...params.cmds];
  for(let i=first; i<end; ++i) {
    runOpts[i] = {...runOpts[i], ...ioOpts[i]};
  }

  /// start the processes:
  const processes = runOpts.map(r=>Deno.run(r));

  let result : ProcessIoVal<Outp> = null as ProcessIoVal<Outp>;

  const ioJobs : Promise<any>[] = [];
  if(params.in === 'piped') {
    /// setup write of first processes stdin - if requested
    const inputStr : string = params.inp as string;
    ioJobs.push( writeAllClose(inputStr, processes[first].stdin!) );
  }
  for(let i=second; i<end; ++i) {
    /// setup copying all data between piped processes
    /// async copies between Deno.Reader and Deno.Writer using Deno.copy
    ioJobs.push( copyAllClose(processes[i-1].stdout!, processes[i].stdin!) );
  }
  if(params.out === 'piped') {
    ioJobs.push(
      /// setup read of last process stdout - if requested
      readAllClose(processes[last].stdout!).then(x=>{
        result = x as ProcessIoVal<Outp>;
      })
    );
  }

  await Promise.all(ioJobs);
  const statuses = await Promise.all(processes.map(p=>p.status()));
  processes.forEach(p=>p.close());

  /// Check processes exit status and throw for first non-success
  for(let i=0; i<statuses.length; ++i) {
    const status = statuses[i];
    if(status.success !== true) {
      throw new ExecError(params.cmds[i], status.code);
    }
  }

  return result;
}

/// Short-form run single process - all other options for stdin, stderr, stdout, cwd and envs available.
export async function runProcess<Inp extends IoOption, Outp extends IoOption>(
  params: {
    in: Inp,  /// Options for stdin
    out: Outp /// Options for stdout
    stderrs?: "null"|"inherit" /// stderr values either inherit parent process stderr or null (default: null)
    inp: ProcessIoVal<Inp>,  /// stdin string / or null.
    cmd: string[],
    opts?: ExecOptions
  },
) : Promise<ProcessIoVal<Outp>> {
  return processPipe({
    in: params.in,
    out: params.out,
    stderrs: params.stderrs,
    inp: params.inp,
    cmds: [
      {
        ...params.opts,
        cmd: params.cmd,
      }
    ]
  });
}

/// Short-form run single process: no stdin or sterr - final output as string.
export async function run(cmd: string[], opts?: ExecOptions) : Promise<string> {
  return runProcess({
    in: "null",
    out: "piped",
    stderrs: "null",
    inp: null,
    cmd,
    opts
  });
}

/// run with stdin, stdout and stderr to parent io
export async function runConsole(cmd: string[], opts?: ExecOptions) : Promise<void> {
  await runProcess({
    in: "inherit",
    out: "inherit",
    stderrs: "inherit",
    inp: null,
    cmd,
    opts
  });
  return;
}
