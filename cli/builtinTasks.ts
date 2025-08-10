import { runAlways, type Task, task } from "../core/task.ts";
import type { TaskContext } from "../core/TaskContext.ts";
import { echoBashCompletionScript, showTaskList } from "./utils.ts";

export const builtinTasks: Task[] = [
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
            return ctx.exec.schedule(() => t.reset(ctx.exec));
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
