import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import type { TaskName, TrackedFileName } from "./IManifestTypes.ts";
import type { IManifest } from "./IManifest.ts";

// Main task execution interface
export interface ITask {
  name: TaskName;
  description?: string;
  exec(ctx: IExecContext): Promise<void>;
  setup(ctx: IExecContext): Promise<void>;
  reset(ctx: IExecContext): Promise<void>;
}

// Execution context interface
export interface IExecContext {
  // Task registry
  readonly taskRegister: Map<TaskName, ITask>;
  readonly targetRegister: Map<TrackedFileName, ITask>;

  // Task tracking
  readonly doneTasks: Set<ITask>;
  readonly inprogressTasks: Set<ITask>;

  // Logging
  readonly internalLogger: log.Logger;
  readonly taskLogger: log.Logger;
  readonly userLogger: log.Logger;

  // Configuration
  readonly concurrency: number;
  readonly verbose: boolean;

  // Data
  readonly manifest: IManifest;
  readonly args: Args;

  // Methods
  getTaskByName(name: TaskName): ITask | undefined;
  schedule<T>(action: () => Promise<T>): Promise<T>;
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
