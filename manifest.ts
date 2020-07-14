import * as fs  from "https://deno.land/std@0.61.0/fs/mod.ts";

import * as A from './adl-gen/dnt/manifest.ts';
import * as J from './adl-gen/runtime/json.ts';

import { RESOLVER } from './adl-gen/resolver.ts';
import { ADLMap } from "./ADLMap.ts";
export class Manifest {
  readonly filename = ".dnit-manifest.json";
  readonly jsonBinding = J.createJsonBinding(RESOLVER, A.texprManifest());
  tasks: ADLMap<A.TaskName, TaskManifest> = new ADLMap([], (k1, k2) => k1 === k2);
  constructor() {
  }
  async load() {
    if (await fs.exists(this.filename)) {
      const json: J.Json = await fs.readJson(this.filename) as J.Json;
      const mdata = this.jsonBinding.fromJson(json);
      for (const p of mdata.tasks) {
        const taskName: A.TaskName = p.v1;
        const taskData: A.TaskData = p.v2;
        this.tasks.set(taskName, new TaskManifest(taskData));
      }
    }
  }
  async save() {
    const mdata: A.Manifest = {
      tasks: this.tasks.entries().map(p => ({ v1: p[0], v2: p[1].toData() }))
    };
    const json = this.jsonBinding.toJson(mdata);
    await fs.writeJson(this.filename, json, { spaces: 2 });
  }
}
export class TaskManifest {
  trackedFiles: ADLMap<A.TrackedFileName, A.TrackedFileData> = new ADLMap([], (k1, k2) => k1 === k2);
  constructor(data: A.TaskData) {
    this.trackedFiles = new ADLMap(data.trackedFiles, (k1, k2) => k1 === k2);
  }
  ;
  getFileData(fn: A.TrackedFileName): A.TrackedFileData | undefined {
    return this.trackedFiles.get(fn);
  }
  setFileData(fn: A.TrackedFileName, d: A.TrackedFileData) {
    const x = this.trackedFiles.set(fn, d);
  }
  toData(): A.TaskData {
    return {
      trackedFiles: this.trackedFiles.toData()
    };
  }
}
