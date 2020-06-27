import {flags, path, log, fs, hash} from './deps.ts';

import { textTable } from "./textTable.ts";

import * as A from './adl-gen/dnt/manifest.ts';
import { Manifest, TaskManifest } from "./manifest.ts";
import {launch} from './launch.ts';

class ExecContext {
  /// loaded hash manifest
  manifest = new Manifest();

  /// All tasks by name
  taskRegister = new Map<A.TaskName, Task>();

  /// Tasks by target
  targetRegister = new Map<A.TrackedFileName, Task>();

  /// Done or up-to-date tasks
  doneTasks = new Set<Task>();

  /// In progress tasks
  inprogressTasks = new Set<Task>();

  logger = log.getLogger("dnit");
};

export type Action = () => Promise<void>|void;
export type IsUpToDate = () => Promise<boolean>|boolean;
export type GetFileHash = (filename: A.TrackedFileName) => Promise<A.TrackedFileHash>|A.TrackedFileHash;
export type GetFileTimestamp = (filename: A.TrackedFileName) => Promise<A.Timestamp>|A.Timestamp;

export type TaskParams = {
  name: A.TaskName;
  description?: string;
  action: Action;
  task_deps?: Task[];
  file_deps?: TrackedFile[];
  deps?: (Task|TrackedFile)[];
  targets?: TrackedFile[];
  uptodate?: IsUpToDate;
};

/// Convenience function: an up to date always false to run always
export const runAlways : IsUpToDate = async ()=>false;

function isTask(dep: Task|TrackedFile) : dep is Task {
  return dep instanceof Task;
}
function isTrackedFile(dep: Task|TrackedFile) : dep is TrackedFile {
  return dep instanceof TrackedFile;
}

export class Task {
  name: A.TaskName;
  description?: string;
  action: Action;
  task_deps: Set<Task>;
  file_deps: Set<TrackedFile>;
  targets: Set<TrackedFile>;

  taskManifest : TaskManifest|null = null;
  uptodate?: IsUpToDate;

  constructor(taskParams: TaskParams) {
    this.name = taskParams.name;
    this.action = taskParams.action;
    this.description = taskParams.description;
    this.task_deps = new Set(this.getTaskDeps(taskParams.task_deps, taskParams.deps));
    this.file_deps = new Set(this.getTrackedFiles(taskParams.file_deps, taskParams.deps));
    this.targets = new Set(taskParams.targets || []);
    this.uptodate = taskParams.uptodate;
  }



  private getTaskDeps(task_deps?: Task[], deps?: (Task|TrackedFile)[]) : Task[] {
    return (task_deps || []).concat( (deps || []).filter(isTask) );
  }
  private getTrackedFiles(file_deps?: TrackedFile[], deps?: (Task|TrackedFile)[]) : TrackedFile[] {
    return (file_deps || []).concat( (deps || []).filter(isTrackedFile) );
  }

  async setup(ctx: ExecContext) : Promise<void> {
    for(const t of this.targets) {
      ctx.targetRegister.set(t.path, this);
    }

    this.taskManifest = ctx.manifest.tasks.getOrInsert(this.name, new TaskManifest({
      trackedFiles: []
    }));
  }

  async exec(ctx: ExecContext): Promise<void> {
    if(ctx.doneTasks.has(this)) {
      return;
    }
    if(ctx.inprogressTasks.has(this)) {
      return;
    }

    ctx.inprogressTasks.add(this);

    // add task dep on the task that makes the file if its a target
    for(const fd of this.file_deps) {
      const t = ctx.targetRegister.get(fd.path);
      if(t!==undefined) {
        this.task_deps.add(t);
      }
    }

    await this.execDependencies(ctx);

    let actualUpToDate = true;

    actualUpToDate = actualUpToDate && await this.checkFileDeps(ctx);
    ctx.logger.info(`${this.name} checkFileDeps ${actualUpToDate}`);

    actualUpToDate = actualUpToDate && await this.targetsExist(ctx);
    ctx.logger.info(`${this.name} targetsExist ${actualUpToDate}`);

    if(this.uptodate !== undefined) {
      actualUpToDate = actualUpToDate && await this.uptodate();
    }
    ctx.logger.info(`${this.name} uptodate ${actualUpToDate}`);

    if(actualUpToDate) {
      ctx.logger.info(`--- ${this.name}`);
    } else {
      ctx.logger.info(`starting ${this.name}`);
      await this.action();
      ctx.logger.info(`completed ${this.name}`);

      {
        /// recalc & save data of deps:
        let promisesInProgress: Promise<void>[] = [];
        for (const fdep of this.file_deps) {
          const p = fdep.getFileData(ctx).then(x=>{
            this.taskManifest?.setFileData(fdep.path, x);
          });
        }
        await Promise.all(promisesInProgress);
      }
    }

    ctx.doneTasks.add(this);
    ctx.inprogressTasks.delete(this);
  }

  private async targetsExist(ctx: ExecContext) : Promise<boolean> {
    const tex = await Promise.all( Array.from(this.targets).map(async tf=>tf.exists(ctx)));
    // all exist: NOT some NOT exist
    return !tex.some(t=>!t);
  }

  private async checkFileDeps(ctx: ExecContext) : Promise<boolean> {
    let fileDepsUpToDate = true;
    let promisesInProgress: Promise<void>[] = [];

    const taskManifest = this.taskManifest!;

    for (const fdep of this.file_deps) {
      const p = fdep.getFileDataOrCached(ctx, taskManifest.getFileData(fdep.path))
      .then(r=>{
        taskManifest.setFileData(fdep.path, r.tData);
        return r.upToDate;
      })
      .then(uptodate => {
        fileDepsUpToDate = fileDepsUpToDate && uptodate;
      });

      promisesInProgress.push(p.then(() => { }));
    }
    await Promise.all(promisesInProgress);
    promisesInProgress = [];
    return fileDepsUpToDate;
  }

  private async execDependencies(ctx : ExecContext) {
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
  gethash: GetFileHash = filehash;

  constructor(fileParams : FileParams) {
    this.path = path.posix.resolve(fileParams.path);
    this.gethash = fileParams.gethash || filehash;
  }

  async getTimestamp() : Promise<A.Timestamp> {
    try {
      const stat = await Deno.lstat(this.path);
      const mtime = stat.mtime;
      return mtime?.toISOString() || "";
    }
    catch(err) {
      if(err instanceof Deno.errors.NotFound) {
        return "";
      }
      throw err;
    }
  }

  async exists(ctx: ExecContext) {
    ctx.logger.info(`checking exists ${this.path}`);
    return fs.exists(this.path);
  }

  async getHash(ctx: ExecContext) {
    if(!await this.exists(ctx)) {
      return "";
    }

    ctx.logger.info(`checking hash on ${this.path}`);
    return this.gethash(this.path);
  }

  /// whether this is up to date w.r.t. the given TrackedFileData
  async isUpToDate(ctx: ExecContext, tData: A.TrackedFileData|undefined) : Promise<boolean> {
    if(tData === undefined) {
      return false;
    }
    const mtime = await this.getTimestamp();
    if(mtime === tData.timestamp) {
      return true;
    }
    const hash = await this.getHash(ctx);
    return hash === tData.hash;
  }

  /// Recalculate timestamp and hash data
  async getFileData(ctx: ExecContext) : Promise<A.TrackedFileData> {
    return {
      hash: await this.getHash(ctx),
      timestamp: await this.getTimestamp()
    };
  }

  /// return given tData if up to date or re-calculate
  async getFileDataOrCached(ctx: ExecContext, tData: A.TrackedFileData|undefined) : Promise<{
    tData: A.TrackedFileData,
    upToDate: boolean
  }> {
    if(tData !== undefined && await this.isUpToDate(ctx, tData)) {
      return {
        tData,
        upToDate: true
      };
    }
    return {
      tData: await this.getFileData(ctx),
      upToDate: false
    };
  }
};

export const filehash = async (filename:string)=>{
  const str = await fs.readFileStr(filename);
  const hashsha1 = hash.createHash("sha1");
  hashsha1.update(str);
  const hashInHex = hashsha1.toString();
  return hashInHex;
}

export type FileParams = {
  path: string;
  gethash?: GetFileHash;
};

/** Generate a trackedfile for tracking */
export function file(fileParams: FileParams) : TrackedFile {
  return new TrackedFile(fileParams);
}

/** Generate a task */
export function task(taskParams: TaskParams): Task {
  const task = new Task(taskParams);
  // taskRegister.set(task.name, task);
  return task;
}

function showTaskList(ctx : ExecContext) {
  console.log(textTable(['Name','Description'], Array.from(ctx.taskRegister.values()).map(t=>([
    t.name,
    t.description||""
  ]))));
}

function register( tasks: Task[] ) : ExecContext {
  const ctx = new ExecContext();
  tasks.forEach(t=>ctx.taskRegister.set(t.name, t));

  return ctx;
}

/** Execute given commandline args and array of items (task & trackedfile) */
export async function exec(cliArgs: string[], tasks: Task[]) : Promise<void> {
  const args = flags.parse(cliArgs);

  const ctx = register(tasks);
  ctx.logger.level = log.LogLevels.WARNING;

  if(args["verbose"] !== undefined) {
    ctx.logger.level = log.LogLevels.INFO;
  }

  let taskName : string|null = null;
  const positionalArgs = args["_"];
  if(positionalArgs.length > 0) {
    taskName = `${positionalArgs[0]}`;
  }

  if(taskName===null) {
    ctx.logger.error("no task name given");
    showTaskList(ctx);
    Deno.exit(1);
  }


  if(taskName==='list') {
    showTaskList(ctx);
    return;
  }

  await ctx.manifest.load();

  await Promise.all(Array.from(ctx.taskRegister.values()).map(t=>t.setup(ctx)));

  const task = ctx.taskRegister.get(taskName);
  if(task !== undefined) {
    await task.exec(ctx);
  } else {
    ctx.logger.error(`task ${taskName} not found`);
  }

  await ctx.manifest.save();

  return;
}

// On execute of dnt as main, execute the user dnit.ts script
if(import.meta.main) {
  launch().then(st=>{
    Deno.exit(st.code);
  });
}
