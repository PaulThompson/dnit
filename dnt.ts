import { parse } from "https://deno.land/std/flags/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as fs  from "https://deno.land/std/fs/mod.ts";
import { createHash } from "https://deno.land/std/hash/mod.ts";

import * as A from './adl-gen/dnt/manifest.ts';
import {RESOLVER} from './adl-gen/resolver.ts';
import * as ADL from './adl-gen/runtime/adl.ts';
import * as sys_types from './adl-gen/runtime/sys/types.ts';
import * as J from './adl-gen/runtime/json.ts';
import { ADLMap } from "./ADLMap.ts";

class Manifest {
  readonly filename = ".dnt-manifest.json";
  readonly jsonBinding = J.createJsonBinding(RESOLVER, A.texprManifest());

  tasks: ADLMap<A.TaskName, TaskManifest> = new ADLMap([], (k1,k2)=>k1===k2);

  constructor() {
  }

  async load() {
    if(await fs.exists(this.filename)) {
      const json : J.Json = await fs.readJson(this.filename) as J.Json;
      const mdata = this.jsonBinding.fromJson(json);

      for(const p of mdata.tasks) {
        const taskName : A.TaskName = p.v1;
        const taskData : A.TaskData = p.v2;
        this.tasks.set(taskName, new TaskManifest(taskData));
      }
    }
  }

  async save() {
    const mdata : A.Manifest = {
      tasks: this.tasks.entries().map(p=>({v1: p[0], v2: p[1].toData()}))
    };
    const json = this.jsonBinding.toJson(mdata);
    await fs.writeJson(this.filename, json, {spaces:2});
  }
}

class TaskManifest {
  trackedFiles: ADLMap<A.TrackedFileName, A.TrackedFileData> = new ADLMap([], (k1,k2)=>k1===k2);

  constructor(data: A.TaskData) {
    this.trackedFiles = new ADLMap(data.trackedFiles, (k1,k2)=>k1===k2);
  };

  getFileData(fn: A.TrackedFileName) : A.TrackedFileData|undefined {
    return this.trackedFiles.get(fn);
  }

  setFileData(fn: A.TrackedFileName, d: A.TrackedFileData) {
    const x = this.trackedFiles.set(fn, d);
  }

  toData() : A.TaskData {
    return {
      trackedFiles: this.trackedFiles.toData()
    };
  }
}

const manifest = new Manifest();

/// All tasks by name
const taskRegister = new Map<A.TaskName, Task>();

/// Tasks by target
const targetRegister = new Map<A.TrackedFileName, Task>();

/// Done or up-to-date tasks
const doneTasks = new Set<Task>();

/// In progress tasks
const inprogressTasks = new Set<Task>();

export type Action = () => Promise<void>|void;
export type IsUpToDate = () => Promise<boolean>|boolean;
export type GetFileHash = (filename: A.TrackedFileName) => Promise<A.TrackedFileHash>|A.TrackedFileHash;
export type GetFileTimestamp = (filename: A.TrackedFileName) => Promise<A.Timestamp>|A.Timestamp;

export type TaskParams = {
  name: A.TaskName;
  description?: string;
  actions?: Action[];
  task_deps?: Task[];
  file_deps?: TrackedFile[];
  targets?: TrackedFile[];
  uptodate?: IsUpToDate;
};

/// Convenience function: an up to date always false to run always
export const runAlways : IsUpToDate = async ()=>false;

class Task {
  name: A.TaskName;
  description?: string;
  actions: Action[];
  task_deps: Set<Task>;
  file_deps: Set<TrackedFile>;
  targets: Set<TrackedFile>;

  taskManifest : TaskManifest|null = null;
  uptodate: IsUpToDate;

  constructor(taskParams: TaskParams) {
    this.name = taskParams.name;
    this.actions = taskParams.actions || [];
    this.description = taskParams.description;
    this.task_deps = new Set(taskParams.task_deps || []);
    this.file_deps = new Set(taskParams.file_deps || []);
    this.targets = new Set(taskParams.targets || []);
    this.uptodate = taskParams.uptodate || runAlways;
  }

  async setup() : Promise<void> {
    for(const t of this.targets) {
      targetRegister.set(t.path, this);
    }

    this.taskManifest = manifest.tasks.getOrInsert(this.name, new TaskManifest({
      trackedFiles: []
    }));
  }

  async exec(): Promise<void> {
    if(doneTasks.has(this)) {
      return;
    }
    if(inprogressTasks.has(this)) {
      return;
    }

    inprogressTasks.add(this);

    // add task dep on the task that makes the file if its a target
    for(const fd of this.file_deps) {
      const t = targetRegister.get(fd.path);
      if(t!==undefined) {
        this.task_deps.add(t);
      }
    }

    await this.execDependencies();

    let actualUpToDate = true;

    actualUpToDate = actualUpToDate && await this.checkFileDeps();
    log.info(`${this.name} checkFileDeps ${actualUpToDate}`);

    actualUpToDate = actualUpToDate && await this.targetsExist();
    log.info(`${this.name} targetsExist ${actualUpToDate}`);

    actualUpToDate = actualUpToDate && await this.uptodate();
    log.info(`${this.name} uptodate ${actualUpToDate}`);

    if(actualUpToDate) {
      log.info(`--- ${this.name}`);
    } else {
      log.info(`starting ${this.name}`);
      for (const action of this.actions) {
        await action();
      }
      log.info(`completed ${this.name}`);

      {
        /// recalc & save data of deps:
        let promisesInProgress: Promise<void>[] = [];
        for (const fdep of this.file_deps) {
          const p = fdep.getFileData().then(x=>{
            this.taskManifest?.setFileData(fdep.path, x);
          });
        }
        await Promise.all(promisesInProgress);
      }
    }

    doneTasks.add(this);
    inprogressTasks.delete(this);
  }

  private async targetsExist() : Promise<boolean> {
    const tex = await Promise.all( Array.from(this.targets).map(async tf=>tf.exists()));
    // all exist: NOT some NOT exist
    return !tex.some(t=>!t);
  }

  private async checkFileDeps() : Promise<boolean> {
    let fileDepsUpToDate = true;
    let promisesInProgress: Promise<void>[] = [];

    const taskManifest = this.taskManifest!;

    for (const fdep of this.file_deps) {
      const p = fdep.getFileDataOrCached(taskManifest.getFileData(fdep.path))
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

  private async execDependencies() {
    let promisesInProgress: Promise<void>[] = [];
    for (const dep of this.task_deps) {
      if (!doneTasks.has(dep) && !inprogressTasks.has(dep)) {
        promisesInProgress.push(dep.exec());
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

  async exists() {
    log.info(`checking exists ${this.path}`);
    return fs.exists(this.path);
  }

  async getHash() {
    if(!await this.exists()) {
      return "";
    }

    log.info(`checking hash on ${this.path}`);
    return this.gethash(this.path);
  }

  /// whether this is up to date w.r.t. the given TrackedFileData
  async isUpToDate(tData: A.TrackedFileData|undefined) : Promise<boolean> {
    if(tData === undefined) {
      return false;
    }
    const mtime = await this.getTimestamp();
    if(mtime === tData.timestamp) {
      return true;
    }
    const hash = await this.getHash();
    return hash === tData.hash;
  }

  /// Recalculate timestamp and hash data
  async getFileData() : Promise<A.TrackedFileData> {
    return {
      hash: await this.getHash(),
      timestamp: await this.getTimestamp()
    };
  }

  /// return given tData if up to date or re-calculate
  async getFileDataOrCached(tData: A.TrackedFileData|undefined) : Promise<{
    tData: A.TrackedFileData,
    upToDate: boolean
  }> {
    if(tData !== undefined && await this.isUpToDate(tData)) {
      return {
        tData,
        upToDate: true
      };
    }
    return {
      tData: await this.getFileData(),
      upToDate: false
    };
  }
};

export const filehash = async (filename:string)=>{
  const str = await fs.readFileStr(filename);
  const hash = createHash("sha1");
  hash.update(str);
  const hashInHex = hash.toString();
  return hashInHex;
}

export type FileParams = {
  path: string;
  gethash?: GetFileHash;
};

/** Register a file for tracking */
export function file(fileParams: FileParams) : TrackedFile {
  return new TrackedFile(fileParams);
}

/** Register a task */
export function task(taskParams: TaskParams): Task {
  const task = new Task(taskParams);
  taskRegister.set(task.name, task);
  return task;
}

/** Execute given commandline args */
export async function exec(cliArgs: string[]) : Promise<void> {
  const args = parse(cliArgs);
  const taskName = `${args["_"][0]}`;


  if(taskName==='list') {

    console.log(textTable(['Name','Description'], Array.from(taskRegister.values()).map(t=>([
      t.name,
      t.description||""
    ]))));

    return;
  }

  await manifest.load();

  await Promise.all(Array.from(taskRegister.values()).map(t=>t.setup()));

  const task = taskRegister.get(taskName);
  if(task !== undefined) {
    await task.exec();
  } else {
    log.error(`task ${taskName} not found`);
  }

  await manifest.save();

  return;
}


function textTable(headings: string[], cells: string[][] ) : string {
  const corners = [['┌','┐'],['└','┘']];
  const hbar = '─';
  const vbar = '│';
  const ttop = '┬';
  const tbottom = '┴';
  const cross = '┼';
  const tleft = '├';
  const tright = '┤';

  const maxWidths : number[] = headings.map(t=>t.length);

  for(const row of cells) {
    let colInd = 0;
    for(const col of row) {
      maxWidths[colInd] = Math.max(maxWidths[colInd], col.length);
      ++colInd;
    }
  }

  const output : string[] = [];

  // corner & top bars
  {
    const textrow : string[] = [];
    textrow.push(corners[0][0]);
    textrow.push(maxWidths.map(n=>hbar.repeat(n+2)).join(ttop));
    textrow.push(corners[0][1]);
    output.push(textrow.join(''));
  }

  // mid
  {
    const textrow : string[] = [];
    textrow.push(vbar);
    textrow.push(headings.map((h,i)=>{
      const curLength = h.length;
      const maxWidth = maxWidths[i];
      const curSpaces = (maxWidth - curLength);
      const spaceBefore = Math.floor(curSpaces/2);
      const spaceAfter = curSpaces - spaceBefore;
      return ' '.repeat(1+spaceBefore) + h + ' '.repeat(1+spaceAfter);
    }).join(vbar));
    textrow.push(vbar);
    output.push(textrow.join(''));
  }
  // cross bar
  {
    const textrow : string[] = [];
    textrow.push(tleft);
    textrow.push(maxWidths.map(n=>hbar.repeat(n+2)).join(cross));
    textrow.push(tright);
    output.push(textrow.join(''));
  }

  // cells
  for(const row of cells)
  {
    const textrow : string[] = [];
    textrow.push(vbar);
    textrow.push(row.map((t,i)=>{
      const curLength = t.length;
      const maxWidth = maxWidths[i];
      const curSpaces = (maxWidth - curLength);
      const spaceBefore = Math.floor(curSpaces/2);
      const spaceAfter = curSpaces - spaceBefore;
      return ' '.repeat(1+spaceBefore) + t + ' '.repeat(1+spaceAfter);
    }).join(vbar));
    textrow.push(vbar);
    output.push(textrow.join(''));
  }

  // corner & bottom bars
  {
    const textrow : string[] = [];
    textrow.push(corners[1][0]);
    textrow.push(maxWidths.map(n=>hbar.repeat(n+2)).join(tbottom));
    textrow.push(corners[1][1]);
    output.push(textrow.join(''));
  }


  return output.join('\n');
}

if(import.meta.main) {
  const proc = Deno.run({
    cmd: ["deno", "run", "--unstable", "--allow-read", "--allow-write", "--allow-run", "dnit.ts"].concat(Deno.args),
  });

  proc.status().then(st => {
    Deno.exit(st.code);
  })
}
