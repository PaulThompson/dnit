import { flags, path, log, fs, hash } from "./deps.ts";

import { textTable } from "./textTable.ts";

import * as A from "./adl-gen/dnit/manifest.ts";
import { Manifest, TaskManifest } from "./manifest.ts";

class ExecContext {
  /// All tasks by name
  taskRegister = new Map<A.TaskName, Task>();

  /// Tasks by target
  targetRegister = new Map<A.TrackedFileName, Task>();

  /// Done or up-to-date tasks
  doneTasks = new Set<Task>();

  /// In progress tasks
  inprogressTasks = new Set<Task>();

  logger = log.getLogger("dnit");

  constructor(
    /// loaded hash manifest
    readonly manifest: Manifest,
    /// commandline args
    readonly args: flags.Args,
  ) {}

  getTaskByName(name: A.TaskName): Task | undefined {
    return this.taskRegister.get(name);
  }
}

export interface TaskContext {
  logger: log.Logger;
  task: Task;
  args: flags.Args;
}

export interface LoggerCtx {
  logger: log.Logger;
}

function taskContext(ctx: ExecContext, task: Task): TaskContext {
  return {
    logger: ctx.logger,
    task,
    args: ctx.args,
  };
}

export type Action = (ctx: TaskContext) => Promise<void> | void;

export type IsUpToDate = (ctx: TaskContext) => Promise<boolean> | boolean;
export type GetFileHash = (
  filename: A.TrackedFileName,
) => Promise<A.TrackedFileHash> | A.TrackedFileHash;
export type GetFileTimestamp = (
  filename: A.TrackedFileName,
) => Promise<A.Timestamp> | A.Timestamp;

/** User definition of a task */
export type TaskParams = {
  /// Name: (string) - The key used to initiate a task
  name: A.TaskName;

  /// Description (string) - Freeform text description shown on help
  description?: string;

  /// Action executed on execution of the task (async or sync)
  action: Action;

  /// Optional list of explicit task dependencies
  task_deps?: Task[];

  /// Optional list of explicit file dependencies
  file_deps?: TrackedFile[];

  /// Optional list of task or file dependencies
  deps?: (Task | TrackedFile)[];

  /// Targets (files which will be produced by execution of this task)
  targets?: TrackedFile[];

  /// Custom up-to-date definition - Can be used to make a task *less* up to date.  Eg; use uptodate: runAlways  to run always on request regardless of dependencies being up to date.
  uptodate?: IsUpToDate;
};

/// Convenience function: an up to date always false to run always
export const runAlways: IsUpToDate = async () => false;

function isTask(dep: Task | TrackedFile): dep is Task {
  return dep instanceof Task;
}
function isTrackedFile(dep: Task | TrackedFile): dep is TrackedFile {
  return dep instanceof TrackedFile;
}

export class Task {
  public name: A.TaskName;
  public description?: string;
  public action: Action;
  public task_deps: Set<Task>;
  public file_deps: Set<TrackedFile>;
  public targets: Set<TrackedFile>;

  public taskManifest: TaskManifest | null = null;
  public uptodate?: IsUpToDate;

  constructor(taskParams: TaskParams) {
    this.name = taskParams.name;
    this.action = taskParams.action;
    this.description = taskParams.description;
    this.task_deps = new Set(
      this.getTaskDeps(taskParams.task_deps, taskParams.deps),
    );
    this.file_deps = new Set(
      this.getTrackedFiles(taskParams.file_deps, taskParams.deps),
    );
    this.targets = new Set(taskParams.targets || []);
    this.uptodate = taskParams.uptodate;
  }

  private getTaskDeps(
    task_deps?: Task[],
    deps?: (Task | TrackedFile)[],
  ): Task[] {
    return (task_deps || []).concat((deps || []).filter(isTask));
  }
  private getTrackedFiles(
    file_deps?: TrackedFile[],
    deps?: (Task | TrackedFile)[],
  ): TrackedFile[] {
    return (file_deps || []).concat((deps || []).filter(isTrackedFile));
  }

  async setup(ctx: ExecContext): Promise<void> {
    for (const t of this.targets) {
      ctx.targetRegister.set(t.path, this);
    }

    this.taskManifest = ctx.manifest.tasks.getOrInsert(
      this.name,
      new TaskManifest({
        lastExecution: null,
        trackedFiles: [],
      }),
    );
  }

  async exec(ctx: ExecContext): Promise<void> {
    if (ctx.doneTasks.has(this)) {
      return;
    }
    if (ctx.inprogressTasks.has(this)) {
      return;
    }

    ctx.inprogressTasks.add(this);

    // add task dep on the task that makes the file if its a target
    for (const fd of this.file_deps) {
      const t = ctx.targetRegister.get(fd.path);
      if (t !== undefined) {
        this.task_deps.add(t);
      }
    }

    await this.execDependencies(ctx);

    let actualUpToDate = true;

    actualUpToDate = actualUpToDate && await this.checkFileDeps(ctx);
    ctx.logger.info(`${this.name} checkFileDeps ${actualUpToDate}`);

    actualUpToDate = actualUpToDate && await this.targetsExist(ctx);
    ctx.logger.info(`${this.name} targetsExist ${actualUpToDate}`);

    if (this.uptodate !== undefined) {
      actualUpToDate = actualUpToDate &&
        await this.uptodate(taskContext(ctx, this));
    }
    ctx.logger.info(`${this.name} uptodate ${actualUpToDate}`);

    if (actualUpToDate) {
      ctx.logger.info(`--- ${this.name}`);
    } else {
      ctx.logger.info(`starting ${this.name}`);
      await this.action(taskContext(ctx, this));
      ctx.logger.info(`completed ${this.name}`);

      {
        /// recalc & save data of deps:
        this.taskManifest?.setExecutionTimestamp();
        let promisesInProgress: Promise<void>[] = [];
        for (const fdep of this.file_deps) {
          const p = fdep.getFileData(ctx).then((x) => {
            this.taskManifest?.setFileData(fdep.path, x);
          });
          promisesInProgress.push(p);
        }
        await Promise.all(promisesInProgress);
      }
    }

    ctx.doneTasks.add(this);
    ctx.inprogressTasks.delete(this);
  }

  private async targetsExist(ctx: ExecContext): Promise<boolean> {
    const tex = await Promise.all(
      Array.from(this.targets).map(async (tf) => tf.exists(ctx)),
    );
    // all exist: NOT some NOT exist
    return !tex.some((t) => !t);
  }

  private async checkFileDeps(ctx: ExecContext): Promise<boolean> {
    let fileDepsUpToDate = true;
    let promisesInProgress: Promise<void>[] = [];

    const taskManifest = this.taskManifest;
    if (taskManifest === null) {
      throw new Error(`Invalid null taskManifest on ${this.name}`);
    }

    for (const fdep of this.file_deps) {
      const p = fdep.getFileDataOrCached(
        ctx,
        taskManifest.getFileData(fdep.path),
      )
        .then((r) => {
          taskManifest.setFileData(fdep.path, r.tData);
          return r.upToDate;
        })
        .then((uptodate) => {
          fileDepsUpToDate = fileDepsUpToDate && uptodate;
        });

      promisesInProgress.push(p.then(() => {}));
    }
    await Promise.all(promisesInProgress);
    promisesInProgress = [];
    return fileDepsUpToDate;
  }

  private async execDependencies(ctx: ExecContext) {
    let promisesInProgress: Promise<void>[] = [];
    for (const dep of this.task_deps) {
      if (!ctx.doneTasks.has(dep) && !ctx.inprogressTasks.has(dep)) {
        promisesInProgress.push(dep.exec(ctx));
      }
    }
    await Promise.all(promisesInProgress);
    promisesInProgress = [];
  }
}

export class TrackedFile {
  path: A.TrackedFileName = "";
  #getHash: GetFileHash;
  #getTimestamp: GetFileTimestamp;

  constructor(fileParams: FileParams) {
    this.path = path.posix.resolve(fileParams.path);
    this.#getHash = fileParams.getHash || getFileHash;
    this.#getTimestamp = fileParams.getTimestamp || getFileTimestamp;
  }

  async exists(lc: LoggerCtx) {
    lc.logger.info(`checking exists ${this.path}`);
    return fs.exists(this.path);
  }

  async getHash(lc: LoggerCtx) {
    if (!await this.exists(lc)) {
      return "";
    }

    lc.logger.info(`checking hash on ${this.path}`);
    return this.#getHash(this.path);
  }

  async getTimestamp(lc: LoggerCtx) {
    if (!await this.exists(lc)) {
      return "";
    }

    lc.logger.info(`checking timestamp on ${this.path}`);
    return this.#getTimestamp(this.path);
  }

  /// whether this is up to date w.r.t. the given TrackedFileData
  async isUpToDate(
    ctx: ExecContext,
    tData: A.TrackedFileData | undefined,
  ): Promise<boolean> {
    if (tData === undefined) {
      return false;
    }
    const mtime = await this.getTimestamp(ctx);
    if (mtime === tData.timestamp) {
      return true;
    }
    const hash = await this.getHash(ctx);
    return hash === tData.hash;
  }

  /// Recalculate timestamp and hash data
  async getFileData(ctx: ExecContext): Promise<A.TrackedFileData> {
    return {
      hash: await this.getHash(ctx),
      timestamp: await this.getTimestamp(ctx),
    };
  }

  /// return given tData if up to date or re-calculate
  async getFileDataOrCached(
    ctx: ExecContext,
    tData: A.TrackedFileData | undefined,
  ): Promise<{
    tData: A.TrackedFileData;
    upToDate: boolean;
  }> {
    if (tData !== undefined && await this.isUpToDate(ctx, tData)) {
      return {
        tData,
        upToDate: true,
      };
    }
    return {
      tData: await this.getFileData(ctx),
      upToDate: false,
    };
  }
}

export async function getFileHash(
  filename: string,
): Promise<A.TrackedFileHash> {
  const data = await Deno.readFile(filename);
  const hashsha1 = hash.createHash("sha1");
  hashsha1.update(data);
  const hashInHex = hashsha1.toString();
  return hashInHex;
}

export async function getFileTimestamp(filename: string): Promise<A.Timestamp> {
  try {
    const stat = await Deno.lstat(filename);
    const mtime = stat.mtime;
    return mtime?.toISOString() || "";
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return "";
    }
    throw err;
  }
}

/** User params for a tracked file */
export type FileParams = {
  /// File path
  path: string;

  /// Optional function for how to hash the file.   Defaults to the sha1 hash of the file contents.
  /// A file is out of date if the file timestamp and the hash are different than that in the task manifest
  getHash?: GetFileHash;

  /// Optional function for how to get the file timestamp.   Defaults to the actual file timestamp
  getTimestamp?: GetFileTimestamp;
};

/** Generate a trackedfile for tracking */
export function file(fileParams: FileParams | string): TrackedFile {
  if (typeof fileParams === "string") {
    return new TrackedFile({ path: fileParams });
  }
  return new TrackedFile(fileParams);
}

/** Generate a task */
export function task(taskParams: TaskParams): Task {
  const task = new Task(taskParams);
  return task;
}

function showTaskList(ctx: ExecContext) {
  console.log(
    textTable(
      ["Name", "Description"],
      Array.from(ctx.taskRegister.values()).map((t) => ([
        t.name,
        t.description || "",
      ])),
    ),
  );
}

class StdErrHandler extends log.handlers.ConsoleHandler {
  log(msg: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(msg + "\n"));
  }
}

export async function setupLogging() {
  await log.setup({
    handlers: {
      stderr: new StdErrHandler("DEBUG"),
    },

    loggers: {
      dnit: {
        level: "WARNING",
        handlers: ["stderr"],
      },

      tasks: {
        level: "INFO",
        handlers: ["stderr"],
      },
    },
  });
}

/** Convenience access to a setup logger for tasks */
export function getLogger(): log.Logger {
  return log.getLogger("tasks");
}

export type ExecResult = {
  success: boolean;
};

/** Execute given commandline args and array of items (task & trackedfile) */
export async function exec(
  cliArgs: string[],
  tasks: Task[],
): Promise<ExecResult> {
  const args = flags.parse(cliArgs);

  await setupLogging();
  const intLogger = log.getLogger("dnit");

  const dnitDir = args["dnitDir"] || "./dnit";
  delete args["dnitDir"];

  const ctx = new ExecContext(new Manifest(dnitDir), args);
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));

  if (args["verbose"] !== undefined) {
    ctx.logger.levelName = "INFO";
  }

  let taskName: string | null = null;
  const positionalArgs = args["_"];
  if (positionalArgs.length > 0) {
    taskName = `${positionalArgs[0]}`;
  }

  if (taskName === null) {
    intLogger.error("no task name given");
    showTaskList(ctx);
    return { success: false };
  }

  if (taskName === "list") {
    showTaskList(ctx);
    return { success: true };
  }

  try {
    await ctx.manifest.load();

    await Promise.all(
      Array.from(ctx.taskRegister.values()).map((t) => t.setup(ctx)),
    );
    const task = ctx.taskRegister.get(taskName);
    if (task !== undefined) {
      await task.exec(ctx);
    } else {
      ctx.logger.error(`task ${taskName} not found`);
    }
    await ctx.manifest.save();
    return { success: true };
  } catch (err) {
    intLogger.error("Error", err);
    throw err;
  }
}

/// No-frills setup of an ExecContext (mainly for testing)
export async function execBasic(
  cliArgs: string[],
  tasks: Task[],
  manifest: Manifest,
): Promise<ExecContext> {
  const args = flags.parse(cliArgs);
  const ctx = new ExecContext(manifest, args);
  tasks.forEach((t) => ctx.taskRegister.set(t.name, t));
  await Promise.all(
    Array.from(ctx.taskRegister.values()).map((t) => t.setup(ctx)),
  );
  return ctx;
}
