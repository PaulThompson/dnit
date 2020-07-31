/// Process utils from https://github.com/luvies/dunner/blob/master/lib/utils.ts

/**
 * The options for executing a command.
 * This is just the standard `Deno.RunOptions` without the `cmd`
 * property, since this is given in explicitly.
 */
export interface ExecOptions {
  cwd?: string;
  env?: {
    [key: string]: string;
  };
  stdout?: "inherit" | "piped" | "null" | number;
  stderr?: "inherit" | "piped" | "null" | number;
  stdin?: "inherit" | "piped" | "null" | number;
}

/**
 * The result of the command.
 *
 * If stdout or stderr were set to `piped`, then these are set here.
 */
export interface ExecResult<T extends ExecOptions> {
  stdout: T["stdout"] extends "piped" ? string : undefined;
  stderr: T["stderr"] extends "piped" ? string : undefined;
}

async function readAll(
  buf: Deno.Reader | null,
): Promise<string | null> {
  if (buf) {
    const decoder = new TextDecoder();
    return decoder.decode(await Deno.readAll(buf));
  } else {
    return null;
  }
}

export class ExecError extends Error {
  public constructor(cmd: string[], public code: number) {
    super(`Exec failed with ${code} for ${Deno.inspect(cmd)}`);
  }
}

/**
 * Executes a given command.
 * If the command returns a non-zero code, then `ExecError` is thrown.
 *
 * @param cmd The command array to execute (from `Deno.RunOptions`).
 * @param opts Extra options to pass into `Deno.run`.
 * @returns The result of the command.
 */
export async function run<T extends ExecOptions>(
  cmd: string[],
  opts?: T,
): Promise<ExecResult<T>> {
  const proc = Deno.run({ cmd, ...opts });

  try {
    const [res, stdout, stderr] = await Promise.all(
      [proc.status(), readAll(proc.stdout), readAll(proc.stderr)],
    );
    if (!res.success) {
      throw new ExecError(cmd, res.code);
    }

    return {
      stdout,
      stderr,
    } as ExecResult<T>;
  } finally {
    proc.close();
  }
}

/**
 * Executes a command in the current shell.
 *
 * @param cmd The command to execute.
 * @param opts Same as `exec`.
 * @returns The result of the command.
 */
export async function sh<T extends ExecOptions>(
  cmd: string,
  opts?: T,
): Promise<ExecResult<T>> {
  // Derived from https://deno.land/x/drake/lib/utils.ts

  if (Deno.build.os === "windows") {
    const cmdFile = await Deno.makeTempFile(
      { prefix: "task_cmd_", suffix: ".cmd" },
    );

    try {
      await Deno.writeTextFile(cmdFile, `@echo off\n${cmd}`);

      return await run([cmdFile], opts);
    } finally {
      await Deno.remove(cmdFile);
    }
  } else {
    const shell = Deno.env.get("SHELL");
    if (!shell) {
      throw new Error("Cannot determine current shell");
    }

    return run([shell, "-c", cmd], opts);
  }
}

