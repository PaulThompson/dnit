import { type cli, log } from "../deps.ts";
import { version } from "../version.ts";
import { AsyncQueue } from "../asyncQueue.ts";
import type { Manifest } from "../manifest.ts";
import type { TaskName, TrackedFileName } from "./types.ts";
import type { TaskInterface } from "./taskInterface.ts";

export class ExecContext {
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
    readonly args: cli.Args,
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
