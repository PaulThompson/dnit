import type { Args } from "@std/cli/parse-args";
import { textTable } from "../textTable.ts";
import type { ExecContext } from "../core/execContext.ts";

export function showTaskList(ctx: ExecContext, args: Args) {
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

export function echoBashCompletionScript() {
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
