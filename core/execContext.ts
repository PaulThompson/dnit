import type { Args } from "@std/cli/parse-args";
import type * as log from "@std/log";
import { version } from "../version.ts";
import { AsyncQueue } from "../utils/asyncQueue.ts";
import type { Manifest } from "../manifest.ts";
import type {
  TaskName,
  TrackedFileName,
} from "../interfaces/core/IManifestTypes.ts";
import type {
  IExecContext,
  ILoggers,
  ITask,
} from "../interfaces/core/ICoreInterfaces.ts";

export class ExecContext implements IExecContext {
  /// All tasks by name
  taskRegister: Map<TaskName, ITask> = new Map<TaskName, ITask>();

  /// Tasks by target
  targetRegister: Map<TrackedFileName, ITask> = new Map<
    TrackedFileName,
    ITask
  >();

  /// Done or up-to-date tasks
  doneTasks: Set<ITask> = new Set<ITask>();

  /// In progress tasks
  inprogressTasks: Set<ITask> = new Set<ITask>();

  /// Queue for scheduling async work with specified number allowable concurrently.
  asyncQueue: AsyncQueue;

  readonly internalLogger: log.Logger;
  readonly taskLogger: log.Logger;
  readonly userLogger: log.Logger;
  readonly cliLogger: log.Logger;

  constructor(
    /// loaded hash manifest
    readonly manifest: Manifest,
    /// commandline args
    readonly args: Args,
    /// loggers
    loggers: ILoggers,
  ) {
    this.internalLogger = loggers.internalLogger;
    this.taskLogger = loggers.taskLogger;
    this.userLogger = loggers.userLogger;
    this.cliLogger = loggers.cliLogger;
    if (args["verbose"] !== undefined) {
      this.internalLogger.levelName = "INFO";
    }

    const concurrency = args["concurrency"] || 4;
    this.asyncQueue = new AsyncQueue(concurrency);

    this.internalLogger.info(`Starting ExecContext version: ${version}`);
  }

  getTaskByName(name: TaskName): ITask | undefined {
    return this.taskRegister.get(name);
  }

  schedule<T>(action: () => Promise<T>): Promise<T> {
    return this.asyncQueue.schedule(action);
  }


  get concurrency(): number {
    return this.asyncQueue.concurrency || 4;
  }

  get verbose(): boolean {
    return this.args["verbose"] as boolean || false;
  }
}
