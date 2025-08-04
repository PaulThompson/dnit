import type { cli, log } from "../../deps.ts";
import type { TaskName } from "../../core/types.ts";
import type { IContext } from "./IContext.ts";

// Main task execution interface
export interface ITask {
  name: TaskName;
  description?: string;
  exec(ctx: IContext): Promise<void>;
  setup(ctx: IContext): Promise<void>;
  reset(ctx: IContext): Promise<void>;
}

// Task execution context passed to actions
export interface ITaskContext {
  logger: log.Logger;
  task: ITask;
  args: cli.Args;
  exec: IContext;
}

// Task action function type
export type IAction = (ctx: ITaskContext) => Promise<void> | void;

// Task up-to-date check function type
export type IIsUpToDate = (ctx: ITaskContext) => Promise<boolean> | boolean;
