import { type Args, parseArgs } from "@std/cli/parse-args";
import { Manifest } from "../manifest.ts";
import { ExecContext } from "../core/execContext.ts";
import type { Task } from "../core/task.ts";
import { builtinTasks } from "./builtinTasks.ts";
import { createConsoleLoggers } from "./logging.ts";
import type { ILoggers } from "../interfaces/core/ICoreInterfaces.ts";
import { showHelp } from "./utils.ts";

export type ExecResult = {
  success: boolean;
};

// Initialize execution context with logging, manifest, and registered tasks.
export async function execContextInit(
  args: Args,
  tasks: Task[],
  overrides?: Partial<ExecContext>,
): Promise<ExecContext> {
  /// directory of user's entrypoint source as discovered by 'launch' util:
  const dnitDir = args["dnitDir"] || "./dnit";

  const manifest = new Manifest(dnitDir);

  const ctx = await execContextInitBasicArgs(args, tasks, manifest, overrides);
  return ctx;
}

// Execute a specific task by name, handling manifest load/save and error reporting.
export async function executeRequestedTask(
  ctx: ExecContext,
  requestedTaskName: string,
) {
  try {
    /// Load manifest (dependency tracking data)
    await ctx.manifest.load();

    /// Find the requested task:
    const requestedTask = ctx.taskRegister.get(requestedTaskName);
    if (requestedTask !== undefined) {
      /// Execute the requested task:
      await requestedTask.exec(ctx);
      /// Save manifest (dependency tracking data)
      await ctx.manifest.save();
      return { success: true };
    } else {
      ctx.taskLogger.error(`Task ${requestedTaskName} not found`);
      return { success: false };
    }
  } catch (err) {
    ctx.taskLogger.error("Error", err);
    throw err;
  }
}

// get requested task name from args
export function getRequestedTaskName(args: Args) {
  const positionalArgs = args["_"];
  if (positionalArgs.length > 0) {
    return `${positionalArgs[0]}`;
  }

  // default to show the list for no args
  return "list";
}

/** Execute given commandline args and array of items (task & trackedfile) */
export async function execCli(
  cliArgs: string[],
  tasks: Task[],
  overrides?: Partial<ExecContext>,
): Promise<ExecResult> {
  const args = parseArgs(cliArgs);

  // Handle --help flag early
  if (args["help"]) {
    const ctx = await execContextInit(args, tasks, overrides);
    showHelp(ctx);
    return { success: true };
  }

  const ctx = await execContextInit(args, tasks, overrides);

  const requestedTaskName: string = getRequestedTaskName(args);
  const result = await executeRequestedTask(ctx, requestedTaskName);
  return result;
}

// Create execution context from parsed args with tasks registered and setup methods called.
export async function execContextInitBasicArgs(
  args: Args,
  tasks: Task[],
  manifest: Manifest,
  overrides?: Partial<ExecContext>,
): Promise<ExecContext> {
  // Extract loggers and other overrides
  const defaultLoggers = createConsoleLoggers();
  const {
    internalLogger = defaultLoggers.internalLogger,
    taskLogger = defaultLoggers.taskLogger,
    userLogger = defaultLoggers.userLogger,
    cliLogger = defaultLoggers.cliLogger,
    ...otherOverrides
  } = overrides || {};

  const loggers: ILoggers = {
    internalLogger,
    taskLogger,
    userLogger,
    cliLogger,
  };
  const ctx = new ExecContext(manifest, args, loggers);

  // Apply other overrides if any
  Object.assign(ctx, otherOverrides);

  // register given tasks:
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));

  /// register built-in tasks:
  for (const t of builtinTasks) {
    ctx.taskRegister.set(t.name, t);
  }

  // execute setup on all tasks:
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
  overrides?: Partial<ExecContext>,
): Promise<ExecContext> {
  const args = parseArgs(cliArgs);
  const ctx = await execContextInitBasicArgs(args, tasks, manifest, overrides);
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
