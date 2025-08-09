import type {
  TaskData,
  TaskName,
  Timestamp,
  TrackedFileData,
  TrackedFileName,
} from "./IManifestTypes.ts";

// Manifest persistence interface
export interface IManifest {
  readonly filename: string;
  tasks: Record<TaskName, ITaskManifest>;

  load(): Promise<void>;
  save(): Promise<void>;
}

// Task manifest interface
export interface ITaskManifest {
  lastExecution: Timestamp | null;
  trackedFiles: Record<TrackedFileName, TrackedFileData>;

  getFileData(fn: TrackedFileName): TrackedFileData | undefined;
  setFileData(fn: TrackedFileName, d: TrackedFileData): void;
  setExecutionTimestamp(): void;
  toData(): TaskData;
}
