import type { cli, log } from "../deps.ts";
import type { TaskName } from "./types.ts";
import type { ExecContext } from "./context.ts";

// Interface for Task - breaks circular dependency between Task and ExecContext
export interface TaskInterface {
  name: TaskName;
  description?: string;
  exec(ctx: ExecContext): Promise<void>;
  setup(ctx: ExecContext): Promise<void>;
  reset(ctx: ExecContext): Promise<void>;
}

export interface TaskContext {
  logger: log.Logger;
  task: TaskInterface;
  args: cli.Args;
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
