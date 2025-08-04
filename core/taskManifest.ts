import type {
  TaskData,
  Timestamp,
  TrackedFileData,
  TrackedFileName,
} from "./types.ts";
import type { ITaskManifest } from "../interfaces/core/IManifest.ts";

export class TaskManifest implements ITaskManifest {
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
