import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import type { TaskName, TrackedFileName } from "../../core/types.ts";
import type { ITask } from "./ITask.ts";
import type { IManifest } from "./IManifest.ts";

// Execution context interface
export interface IExecContext {
  // Task registry
  readonly taskRegister: Map<TaskName, ITask>;
  readonly targetRegister: Map<TrackedFileName, ITask>;

  // Task tracking
  readonly doneTasks: Set<ITask>;
  readonly inprogressTasks: Set<ITask>;

  // Async queue for concurrent operations
  // deno-lint-ignore no-explicit-any
  readonly asyncQueue: any; // AsyncQueue type

  // Logging
  readonly internalLogger: log.Logger;
  readonly taskLogger: log.Logger;
  readonly userLogger: log.Logger;

  // Data
  readonly manifest: IManifest;
  readonly args: Args;

  // Methods
  getTaskByName(name: TaskName): ITask | undefined;
}
