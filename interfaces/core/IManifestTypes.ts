import type { Flavored } from "../utils/IFlavoring.ts";

// Core manifest type definitions with flavoring for nominal typing
export type TaskName = Flavored<string, "TaskName">;
export type TrackedFileName = Flavored<string, "TrackedFileName">;
export type TrackedFileHash = Flavored<string, "TrackedFileHash">;
export type Timestamp = Flavored<string, "Timestamp">;

export interface TrackedFileData {
  hash: TrackedFileHash;
  timestamp: Timestamp;
}

export interface TaskData {
  lastExecution: Timestamp | null;
  trackedFiles: Record<TrackedFileName, TrackedFileData>;
}

export interface Manifest {
  tasks: Record<TaskName, TaskData>;
}
