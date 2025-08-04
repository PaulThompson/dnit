import { cli, log } from "../deps.ts";
import { version } from "../version.ts";
import { AsyncQueue } from "../asyncQueue.ts";
import { Manifest } from "../manifest.ts";
import type { TaskName, TrackedFileName } from "./types.ts";

// Forward declaration for Task - will be resolved when imported
export interface Task {
  name: TaskName;
  exec(ctx: ExecContext): Promise<void>;
}

export class ExecContext {
  /// All tasks by name
  taskRegister: Map<TaskName, Task> = new Map<TaskName, Task>();

  /// Tasks by target
  targetRegister: Map<TrackedFileName, Task> = new Map<TrackedFileName, Task>();

  /// Done or up-to-date tasks
  doneTasks: Set<Task> = new Set<Task>();

  /// In progress tasks
  inprogressTasks: Set<Task> = new Set<Task>();

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

  getTaskByName(name: TaskName): Task | undefined {
    return this.taskRegister.get(name);
  }
}

export interface TaskContext {
  logger: log.Logger;
  task: Task;
  args: cli.Args;
  manifest: Manifest;
}

export function taskContext(ctx: ExecContext, task: Task): TaskContext {
  return {
    logger: ctx.taskLogger,
    task,
    args: ctx.args,
    manifest: ctx.manifest,
  };
}
