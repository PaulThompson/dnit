import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import type {
  IExecContext,
  ITask,
} from "../interfaces/core/ICoreInterfaces.ts";

export interface TaskContext {
  logger: log.Logger;
  task: ITask;
  args: Args;
  exec: IExecContext;
}

export function taskContext(ctx: IExecContext, task: ITask): TaskContext {
  return {
    logger: ctx.taskLogger,
    task,
    args: ctx.args,
    exec: ctx,
  };
}
