import type { cli, log } from "../../deps.ts";
import type { TaskName, TrackedFileName } from "../../core/types.ts";
import type { ITask } from "./ITask.ts";
import type { IManifest } from "./IManifest.ts";

// Execution context interface
export interface IContext {
  // Task registry
  taskRegister: Map<TaskName, ITask>;
  targetRegister: Map<TrackedFileName, ITask>;

  // Task tracking
  doneTasks: Set<ITask>;
  inprogressTasks: Set<ITask>;

  // Async queue for concurrent operations
  // deno-lint-ignore no-explicit-any
  asyncQueue: any; // AsyncQueue type

  // Logging
  internalLogger: log.Logger;
  taskLogger: log.Logger;
  userLogger: log.Logger;

  // Data
  manifest: IManifest;
  args: cli.Args;

  // Methods
  getTaskByName(name: TaskName): ITask | undefined;
}
