import type { Args } from "@std/cli/parse-args";
import * as log from "@std/log";
import { version } from "../version.ts";
import { AsyncQueue } from "../asyncQueue.ts";
import type { Manifest } from "../manifest.ts";
import type { TaskName, TrackedFileName } from "./types.ts";
import type { TaskInterface } from "./taskInterface.ts";
import type { IExecContext } from "../interfaces/core/IContext.ts";

export class ExecContext implements IExecContext {
  /// All tasks by name
  taskRegister: Map<TaskName, TaskInterface> = new Map<
    TaskName,
    TaskInterface
  >();

  /// Tasks by target
  targetRegister: Map<TrackedFileName, TaskInterface> = new Map<
    TrackedFileName,
    TaskInterface
  >();

  /// Done or up-to-date tasks
  doneTasks: Set<TaskInterface> = new Set<TaskInterface>();

  /// In progress tasks
  inprogressTasks: Set<TaskInterface> = new Set<TaskInterface>();

  /// Queue for scheduling async work with specified number allowable concurrently.
  // deno-lint-ignore no-explicit-any
  asyncQueue: AsyncQueue<any, any>;

  internalLogger: log.Logger = log.getLogger("internal");
  taskLogger: log.Logger = log.getLogger("task");
  userLogger: log.Logger = log.getLogger("user");

  constructor(
    /// loaded hash manifest
    readonly manifest: Manifest,
    /// commandline args
    readonly args: Args,
  ) {
    if (args["verbose"] !== undefined) {
      this.internalLogger.levelName = "INFO";
    }

    const concurrency = args["concurrency"] || 4;
    this.asyncQueue = new AsyncQueue(concurrency);

    this.internalLogger.info(`Starting ExecContext version: ${version}`);
  }

  getTaskByName(name: TaskName): TaskInterface | undefined {
    return this.taskRegister.get(name);
  }
}
