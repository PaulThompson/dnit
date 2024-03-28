/// Short-form run single process: no stdin or sterr - final output as string.
export async function run(
  cmd: string[],
  opts?: Deno.CommandOptions,
): Promise<string> {
  const dcmd = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    ...opts,
    stdout: "piped",
  });

  const { stdout } = await dcmd.output();

  return new TextDecoder().decode(stdout);
}

/// run with stdin, stdout and stderr to parent io
export async function runConsole(
  cmd: string[],
  opts?: Deno.CommandOptions,
): Promise<void> {
  const dcmd = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    ...opts,
    stdin: "inherit",
    stderr: "inherit",
    stdout: "inherit",
  });

  await dcmd.output();
}
