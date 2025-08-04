import { fs, path } from "./deps.ts";

import {
  ManifestSchema,
  type TaskData,
  type TaskName,
  type Timestamp,
  type TrackedFileData,
  type TrackedFileName,
} from "./types.ts";
export class Manifest {
  readonly filename: string;
  tasks: Record<TaskName, TaskManifest> = {};
  constructor(dir: string, filename: string = ".manifest.json") {
    this.filename = path.join(dir, filename);
  }
  async load() {
    if (await fs.exists(this.filename)) {
      try {
        const jsonText = await Deno.readTextFile(this.filename);
        const json = JSON.parse(jsonText);
        const result = ManifestSchema.safeParse(json);

        if (result.success) {
          for (
            const [taskName, taskData] of Object.entries(result.data.tasks)
          ) {
            this.tasks[taskName] = new TaskManifest(taskData);
          }
        } else {
          console.warn(
            `Manifest file ${this.filename} has invalid schema, creating fresh manifest`,
          );
          await this.save();
        }
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.warn(
          `Failed to parse manifest file ${this.filename}: ${errorMessage}, creating fresh manifest`,
        );
        await this.save();
      }
    }
  }
  async save() {
    if (!await fs.exists(path.dirname(this.filename))) {
      await Deno.mkdir(path.dirname(this.filename), { recursive: true });
    }

    const tasks: Record<TaskName, TaskData> = {};
    for (const [taskName, taskManifest] of Object.entries(this.tasks)) {
      tasks[taskName] = taskManifest.toData();
    }
    const mdata = { tasks };
    await Deno.writeTextFile(this.filename, JSON.stringify(mdata, null, 2));
  }
}
export class TaskManifest {
  public lastExecution: Timestamp | null = null;
  trackedFiles: Record<TrackedFileName, TrackedFileData> = {};
  constructor(data: TaskData) {
    this.trackedFiles = data.trackedFiles;
    this.lastExecution = data.lastExecution;
  }

  getFileData(fn: TrackedFileName): TrackedFileData | undefined {
    return this.trackedFiles[fn];
  }
  setFileData(fn: TrackedFileName, d: TrackedFileData) {
    this.trackedFiles[fn] = d;
  }
  setExecutionTimestamp() {
    this.lastExecution = (new Date()).toISOString();
  }

  toData(): TaskData {
    return {
      lastExecution: this.lastExecution,
      trackedFiles: this.trackedFiles,
    };
  }
}
