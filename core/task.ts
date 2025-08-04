import { log } from "../deps.ts";
import type { TaskName, TrackedFileData, TrackedFileName } from "./types.ts";
import { TaskManifest } from "./taskManifest.ts";
import type { ExecContext } from "./context.ts";
import type { TaskContext, TaskInterface } from "./taskInterface.ts";
import { taskContext } from "./taskInterface.ts";
import { TrackedFile } from "./file/TrackedFile.ts";
import { TrackedFilesAsync } from "./file/TrackedFilesAsync.ts";

export type Action = (ctx: TaskContext) => Promise<void> | void;
export type IsUpToDate = (ctx: TaskContext) => Promise<boolean> | boolean;

/** User definition of a task */
export type TaskParams = {
  /// Name: (string) - The key used to initiate a task
  name: TaskName;

  /// Description (string) - Freeform text description shown on help
  description?: string;

  /// Action executed on execution of the task (async or sync)
  action: Action;

  /// Optional list of task or file dependencies
  deps?: Dep[];

  /// Targets (files which will be produced by execution of this task)
  targets?: TrackedFile[];

  /// Custom up-to-date definition - Can be used to make a task *less* up to date.  Eg; use uptodate: runAlways  to run always on request regardless of dependencies being up to date.
  uptodate?: IsUpToDate;
};

/// The kinds of supported dependencies.
export type Dep = Task | TrackedFile | TrackedFilesAsync;

/// Convenience function: an up to date always false to run always
export const runAlways: IsUpToDate = () => false;

function isTask(dep: Task | TrackedFile | TrackedFilesAsync): dep is Task {
  return dep instanceof Task;
}
function isTrackedFile(
  dep: Task | TrackedFile | TrackedFilesAsync,
): dep is TrackedFile {
  return dep instanceof TrackedFile;
}
function isTrackedFileAsync(
  dep: Task | TrackedFile | TrackedFilesAsync,
): dep is TrackedFilesAsync {
  return dep instanceof TrackedFilesAsync;
}

export class Task implements TaskInterface {
  public name: TaskName;
  public description?: string;
  public action: Action;
  public task_deps: Set<Task>;
  public file_deps: Set<TrackedFile>;
  public async_files_deps: Set<TrackedFilesAsync>;
  public targets: Set<TrackedFile>;

  public taskManifest: TaskManifest | null = null;
  public uptodate?: IsUpToDate;

  constructor(taskParams: TaskParams) {
    this.name = taskParams.name;
    this.action = taskParams.action;
    this.description = taskParams.description;
    this.task_deps = new Set(
      this.getTaskDeps(taskParams.deps || []),
    );
    this.file_deps = new Set(
      this.getTrackedFiles(taskParams.deps || []),
    );
    this.async_files_deps = new Set(
      this.getTrackedFilesAsync(taskParams.deps || []),
    );
    this.targets = new Set(taskParams.targets || []);
    this.uptodate = taskParams.uptodate;

    for (const f of this.targets) {
      f.setTask(this);
    }
  }

  private getTaskDeps(
    deps: (Task | TrackedFile | TrackedFilesAsync)[],
  ): Task[] {
    return deps.filter(isTask);
  }
  private getTrackedFiles(
    deps: (Task | TrackedFile | TrackedFilesAsync)[],
  ): TrackedFile[] {
    return deps.filter(isTrackedFile);
  }
  private getTrackedFilesAsync(
    deps: (Task | TrackedFile | TrackedFilesAsync)[],
  ): TrackedFilesAsync[] {
    return deps.filter(isTrackedFileAsync);
  }

  async setup(ctx: ExecContext): Promise<void> {
    if (this.taskManifest === null) {
      for (const t of this.targets) {
        ctx.targetRegister.set(t.path, this);
      }

      this.taskManifest = this.getOrCreateTaskManifest(ctx);

      // ensure preceding tasks are setup too
      for (const taskDep of this.task_deps) {
        await taskDep.setup(ctx);
      }
      for (const fDep of this.file_deps) {
        const fDepTask = fDep.getTask();
        if (fDepTask !== null) {
          await fDepTask.setup(ctx);
        }
      }
    }
  }

  async exec(ctx: ExecContext): Promise<void> {
    if (ctx.doneTasks.has(this)) {
      return;
    }
    if (ctx.inprogressTasks.has(this)) {
      return;
    }

    ctx.inprogressTasks.add(this);

    // evaluate async file_deps (useful if task depends on a glob of the filesystem)
    for (const afd of this.async_files_deps) {
      const fileDeps = await afd.getTrackedFiles();
      for (const fd of fileDeps) {
        this.file_deps.add(fd);
      }
    }

    // add task dep on the task that makes the file if its a target
    for (const fd of this.file_deps) {
      const t = ctx.targetRegister.get(fd.path);
      if (t !== undefined && t instanceof Task) {
        this.task_deps.add(t);
      }
    }

    await this.execDependencies(ctx);

    let actualUpToDate = true;

    actualUpToDate = actualUpToDate && await this.checkFileDeps(ctx);
    ctx.internalLogger.info(`${this.name} checkFileDeps ${actualUpToDate}`);

    actualUpToDate = actualUpToDate && await this.targetsExist(ctx);
    ctx.internalLogger.info(`${this.name} targetsExist ${actualUpToDate}`);

    if (this.uptodate !== undefined) {
      actualUpToDate = actualUpToDate &&
        await this.uptodate(taskContext(ctx, this));
    }
    ctx.internalLogger.info(`${this.name} uptodate ${actualUpToDate}`);

    if (actualUpToDate) {
      ctx.taskLogger.info(`--- ${this.name}`);
    } else {
      // suppress logging the task "{-- name --}" for the list task
      const logTaskScope = this.name !== "list";
      if (logTaskScope) ctx.taskLogger.info(`{-- ${this.name}`);
      await this.action(taskContext(ctx, this));
      if (logTaskScope) ctx.taskLogger.info(`--} ${this.name}`);

      {
        /// recalc & save data of deps:
        this.taskManifest?.setExecutionTimestamp();
        const promisesInProgress: Promise<void>[] = [];
        for (const fdep of this.file_deps) {
          promisesInProgress.push(
            ctx.asyncQueue.schedule(async () => {
              const trackedFileData = await fdep.getFileData(ctx);
              this.taskManifest?.setFileData(fdep.path, trackedFileData);
            }),
          );
        }
        await Promise.all(promisesInProgress);
      }
    }

    ctx.doneTasks.add(this);
    ctx.inprogressTasks.delete(this);
  }

  async reset(ctx: ExecContext): Promise<void> {
    await this.cleanTargets(ctx);
  }

  private async cleanTargets(ctx: ExecContext): Promise<void> {
    await Promise.all(
      Array.from(this.targets).map(async (tf) => {
        try {
          await ctx.asyncQueue.schedule(() => tf.delete());
        } catch (err) {
          ctx.taskLogger.error(`Error scheduling deletion of ${tf.path}`, err);
        }
      }),
    );
  }

  private async targetsExist(ctx: ExecContext): Promise<boolean> {
    const tex = await Promise.all(
      Array.from(this.targets).map((tf) =>
        ctx.asyncQueue.schedule(() => tf.exists())
      ),
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
      promisesInProgress.push(
        ctx.asyncQueue.schedule(async () => {
          const r = await fdep.getFileDataOrCached(
            ctx,
            taskManifest.getFileData(fdep.path),
          );
          taskManifest.setFileData(fdep.path, r.tData);
          fileDepsUpToDate = fileDepsUpToDate && r.upToDate;
        }),
      );
    }
    await Promise.all(promisesInProgress);
    promisesInProgress = [];
    return fileDepsUpToDate;
  }

  private getOrCreateTaskManifest(ctx: ExecContext): TaskManifest {
    if (!ctx.manifest.tasks[this.name]) {
      ctx.manifest.tasks[this.name] = new TaskManifest({
        lastExecution: null,
        trackedFiles: {},
      });
    }
    return ctx.manifest.tasks[this.name];
  }

  private async execDependencies(ctx: ExecContext) {
    for (const dep of this.task_deps) {
      if (!ctx.doneTasks.has(dep) && !ctx.inprogressTasks.has(dep)) {
        await dep.exec(ctx);
      }
    }
  }
}
