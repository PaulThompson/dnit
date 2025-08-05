import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import type { TaskName } from "../../core/types.ts";
import type { IExecContext } from "./IContext.ts";

// Main task execution interface
export interface ITask {
  name: TaskName;
  description?: string;
  exec(ctx: IExecContext): Promise<void>;
  setup(ctx: IExecContext): Promise<void>;
  reset(ctx: IExecContext): Promise<void>;
}

// Task execution context passed to actions
export interface ITaskContext {
  logger: log.Logger;
  task: ITask;
  args: Args;
  exec: IExecContext;
}

// Task action function type
export type IAction = (ctx: ITaskContext) => Promise<void> | void;

// Task up-to-date check function type
export type IIsUpToDate = (ctx: ITaskContext) => Promise<boolean> | boolean;
