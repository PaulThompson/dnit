import { cli, log } from "./deps.ts";
import { textTable } from "./textTable.ts";
import { Manifest } from "./manifest.ts";
import { ExecContext } from "./core/context.ts";
import { runAlways, type Task, task } from "./core/task.ts";
import type { TaskContext } from "./core/taskInterface.ts";

function showTaskList(ctx: ExecContext, args: cli.Args) {
  if (args["quiet"]) {
    Array.from(ctx.taskRegister.values()).map((task) => console.log(task.name));
  } else {
    console.log(
      textTable(
        ["Name", "Description"],
        Array.from(ctx.taskRegister.values()).map((t) => [
          t.name,
          t.description || "",
        ]),
      ),
    );
  }
}

function echoBashCompletionScript() {
  console.log(
    "# bash completion for dnit\n" +
      "# auto-generate by `dnit tabcompletion`\n" +
      "\n" +
      "# to activate it you need to 'source' the generated script\n" +
      "# $ source <(dnit tabcompletion)\n" +
      "\n" +
      "_dnit() \n" +
      "{\n" +
      "    local cur prev words cword basetask sub_cmds tasks i dodof\n" +
      "    COMPREPLY=() # contains list of words with suitable completion\n" +
      "    _get_comp_words_by_ref -n : cur prev words cword\n" +
      "    # list of sub-commands\n" +
      '    sub_cmds="list"\n' +
      "\n" +
      "    tasks=$(dnit list --quiet 2>/dev/null)\n" +
      "\n" +
      '    COMPREPLY=( $(compgen -W "${sub_cmds} ${tasks}" -- ${cur}) )\n' +
      "    return 0\n" +
      "}\n" +
      "\n" +
      "\n" +
      "complete -o filenames -F _dnit dnit \n",
  );
}

/// StdErr plaintext handler (no color codes)
class StdErrPlainHandler extends log.BaseHandler {
  constructor(levelName: log.LevelName) {
    super(levelName, {
      formatter: (rec) => rec.msg,
    });
  }

  override log(msg: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(msg + "\n"));
  }
}

/// StdErr handler on top of ConsoleHandler (which uses colors)
class StdErrHandler extends log.ConsoleHandler {
  override log(msg: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(msg + "\n"));
  }
}

export function setupLogging() {
  log.setup({
    handlers: {
      stderr: new StdErrHandler("DEBUG"),
      stderrPlain: new StdErrPlainHandler("DEBUG"),
    },

    loggers: {
      // internals of dnit tooling
      internal: {
        level: "WARN",
        handlers: ["stderrPlain"],
      },

      // basic events eg start of task or task already up to date
      task: {
        level: "INFO",
        handlers: ["stderrPlain"],
      },

      // for user to use within task actions
      user: {
        level: "INFO",
        handlers: ["stderrPlain"],
      },
    },
  });
}

/** Convenience access to a setup logger for tasks */
export function getLogger(): log.Logger {
  return log.getLogger("user");
}

export type ExecResult = {
  success: boolean;
};

const builtinTasks = [
  task({
    name: "clean",
    description: "Clean tracked files",
    action: async (ctx: TaskContext) => {
      const positionalArgs = ctx.args["_"];

      const affectedTasks = positionalArgs.length > 1
        ? positionalArgs.map((arg: unknown) =>
          ctx.exec.taskRegister.get(String(arg))
        )
          .filter((task) => task !== undefined)
        : Array.from(ctx.exec.taskRegister.values());
      if (affectedTasks.length > 0) {
        console.log("Clean tasks:");
        /// Reset tasks
        await Promise.all(
          affectedTasks.map((t) => {
            console.log(`  ${t.name}`);
            ctx.exec.asyncQueue.schedule(() => t.reset(ctx.exec));
          }),
        );
        // await ctx.exec.manifest.save();
      }
    },
    uptodate: runAlways,
  }),

  task({
    name: "list",
    description: "List tasks",
    action: (ctx: TaskContext) => {
      showTaskList(ctx.exec, ctx.args);
    },
    uptodate: runAlways,
  }),

  task({
    name: "tabcompletion",
    description: "Generate shell completion script",
    action: () => {
      // todo: detect shell type and generate appropriate script
      // or add args for shell type
      echoBashCompletionScript();
    },
    uptodate: runAlways,
  }),
];

/** Execute given commandline args and array of items (task & trackedfile) */
export async function execCli(
  cliArgs: string[],
  tasks: Task[],
): Promise<ExecResult> {
  const args = cli.parseArgs(cliArgs);

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
  const args = cli.parseArgs(cliArgs);
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
