import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import type { ExecContext } from "./execContext.ts";
import type { TaskInterface } from "./taskInterface.ts";

export interface TaskContext {
  logger: log.Logger;
  task: TaskInterface;
  args: Args;
  exec: ExecContext;
}

export function taskContext(
  ctx: ExecContext,
  task: TaskInterface,
): TaskContext {
  return {
    logger: ctx.taskLogger,
    task,
    args: ctx.args,
    exec: ctx,
  };
}
