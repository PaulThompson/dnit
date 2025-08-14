import { parseArgs, type Args } from "@std/cli/parse-args";
import { Manifest } from "../manifest.ts";
import { ExecContext } from "../core/execContext.ts";
import type { Task } from "../core/task.ts";
import { builtinTasks } from "./builtinTasks.ts";
import { setupLogging } from "./logging.ts";

export type ExecResult = {
  success: boolean;
};

// Initialize execution context with logging, manifest, and registered tasks.
export async function execContextInit(
  args: Args,
  tasks: Task[]
) : Promise<ExecContext> {
  setupLogging();

  /// directory of user's entrypoint source as discovered by 'launch' util:
  const dnitDir = args["dnitDir"] || "./dnit";
  
  const manifest = new Manifest(dnitDir);
  
  const ctx = await execContextInitBasicArgs(args, tasks, manifest);
  return ctx
}


export async function executeRequestedTask(ctx: ExecContext, requestedTaskName: string) {
  
  try {
    /// Load manifest (dependency tracking data)
    await ctx.manifest.load();

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

// get requested task name from args
function getRequestedTaskName(args: Args) {
  const positionalArgs = args["_"];
  if (positionalArgs.length > 0) {
    return `${positionalArgs[0]}`;
  }

  // default to show the list for no args
  return "list"
}

/** Execute given commandline args and array of items (task & trackedfile) */
export async function execCli(
  cliArgs: string[],
  tasks: Task[],
): Promise<ExecResult> {
  const args = parseArgs(cliArgs);

  const ctx = await execContextInit(args, tasks);

  const requestedTaskName: string = getRequestedTaskName(args);
  const result = await executeRequestedTask(ctx, requestedTaskName);
  return result;
}

export async function execContextInitBasicArgs(
  args: Args,
  tasks: Task[],
  manifest: Manifest,
): Promise<ExecContext> {
  const ctx = new ExecContext(manifest, args);
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));

  /// register built-in tasks:
  for (const t of builtinTasks) {
    ctx.taskRegister.set(t.name, t);
  }

  // execute setup on all tasks
  await Promise.all(
    Array.from(ctx.taskRegister.values()).map((t) =>
      ctx.schedule(() => t.setup(ctx))
    ),
  );
  return ctx;
}

/// No-frills setup of an ExecContext (mainly for testing)
export async function execContextInitBasic(
  cliArgs: string[],
  tasks: Task[],
  manifest: Manifest,
): Promise<ExecContext> {
  const args = parseArgs(cliArgs);
  const ctx = await execContextInitBasicArgs(args, tasks, manifest);
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
