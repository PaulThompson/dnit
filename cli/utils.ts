import type { Args } from "@std/cli/parse-args";
import { plainTextTable } from "../utils/textTable.ts";
import type { IExecContext } from "../interfaces/core/ICoreInterfaces.ts";

export function showTaskList(ctx: IExecContext, args: Args) {
  if (args["quiet"]) {
    Array.from(ctx.taskRegister.values()).map((task) =>
      ctx.cliLogger.info(task.name)
    );
  } else {
    ctx.cliLogger.info(
      plainTextTable(
        ["Name", "Description"],
        Array.from(ctx.taskRegister.values()).map((t) => [
          t.name,
          t.description || "",
        ]),
      ),
    );
  }
}

function showHelpCommon(logger: { info: (msg: string) => void }) {
  logger.info("dnit - A TypeScript-based task runner for Deno\n");
  
  logger.info("USAGE:");
  logger.info("  dnit [FLAGS] [TASK] [ARGS...]\n");
  
  logger.info("FLAGS:");
  logger.info("  --help        Show this help message");
  logger.info("  --version     Show version information");
  logger.info("  --verbose     Enable verbose logging");
  logger.info("  --quiet       Enable quiet mode (minimal output)\n");
  
  logger.info("Run 'dnit' without arguments to see available tasks.\n");
}

function helpFooter(logger: { info: (msg: string) => void }) {
  logger.info("\nFor more information: https://github.com/PaulThompson/dnit");
}

export function showHelp(ctx: IExecContext) {
  showHelpCommon(ctx.cliLogger);
  
  ctx.cliLogger.info("AVAILABLE TASKS:");
  const tasks = Array.from(ctx.taskRegister.values()).map((t) => [
    t.name,
    t.description || "",
  ]);
  
  if (tasks.length > 0) {
    ctx.cliLogger.info(
      plainTextTable(
        ["Name", "Description"],
        tasks,
      ),
    );
  } else {
    ctx.cliLogger.info("  No tasks found");
  }
  
  helpFooter(ctx.cliLogger);
}

export function showHelpBasic(logger: { info: (msg: string) => void }) {
  showHelpCommon(logger);
  
  logger.info("ERROR:");
  logger.info("  No dnit/ directory found. Create dnit/main.ts with your task definitions");
  logger.info("  to get started.");
  
  helpFooter(logger);
}

export function echoBashCompletionScript(ctx: IExecContext) {
  ctx.cliLogger.info(
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
