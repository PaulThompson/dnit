import { parseArgs } from "@std/cli/parse-args";
import { Manifest } from "../manifest.ts";
import { ExecContext } from "../core/execContext.ts";
import type { Task } from "../core/task.ts";
import { builtinTasks } from "./builtinTasks.ts";
import { setupLogging } from "./logging.ts";

export type ExecResult = {
  success: boolean;
};

/** Execute given commandline args and array of items (task & trackedfile) */
export async function execCli(
  cliArgs: string[],
  tasks: Task[],
): Promise<ExecResult> {
  const args = parseArgs(cliArgs);

  setupLogging();

  /// directory of user's entrypoint source as discovered by 'launch' util:
  const dnitDir = args["dnitDir"] || "./dnit";
  delete args["dnitDir"];

  const ctx = new ExecContext(new Manifest(dnitDir), args);

  /// register tasks as provided by user's source:
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));

  /// register built-in tasks:
  for (const t of builtinTasks) {
    ctx.taskRegister.set(t.name, t);
  }

  let requestedTaskName: string | null = null;
  const positionalArgs = args["_"];
  if (positionalArgs.length > 0) {
    requestedTaskName = `${positionalArgs[0]}`;
  }

  if (requestedTaskName === null) {
    requestedTaskName = "list";
  }

  try {
    /// Load manifest (dependency tracking data)
    await ctx.manifest.load();

    /// Run async setup on all tasks:
    await Promise.all(
      Array.from(ctx.taskRegister.values()).map((t) =>
        ctx.asyncQueue.schedule(() => t.setup(ctx))
      ),
    );

    /// Find the requested task:
    const requestedTask = ctx.taskRegister.get(requestedTaskName);
    if (requestedTask !== undefined) {
      /// Execute the requested task:
      await requestedTask.exec(ctx);
    } else {
      ctx.taskLogger.error(`Task ${requestedTaskName} not found`);
    }

    /// Save manifest (dependency tracking data)
    await ctx.manifest.save();

    return { success: true };
  } catch (err) {
    ctx.taskLogger.error("Error", err);
    throw err;
  }
}

/// No-frills setup of an ExecContext (mainly for testing)
export async function execBasic(
  cliArgs: string[],
  tasks: Task[],
  manifest: Manifest,
): Promise<ExecContext> {
  const args = parseArgs(cliArgs);
  const ctx = new ExecContext(manifest, args);
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));

  /// register built-in tasks:
  for (const t of builtinTasks) {
    ctx.taskRegister.set(t.name, t);
  }

  await Promise.all(
    Array.from(ctx.taskRegister.values()).map((t) =>
      ctx.asyncQueue.schedule(() => t.setup(ctx))
    ),
  );
  return ctx;
}

/// main function for use in dnit scripts
export function main(
  cliArgs: string[],
  tasks: Task[],
): void {
  execCli(cliArgs, tasks)
    .then(() => Deno.exit(0))
    .catch((err) => {
      console.error("error in main", err);
      Deno.exit(1);
    });
}
