import type {
  Timestamp,
  TrackedFileData,
  TrackedFileHash,
  TrackedFileName,
} from "../../core/types.ts";
import type { IExecContext } from "./IContext.ts";
import type { ITask } from "./ITask.ts";

// File tracking interface
export interface ITrackedFile {
  path: TrackedFileName;

  // File operations
  delete(): Promise<void>;
  exists(): Promise<boolean>;
  getHash(): Promise<TrackedFileHash>;
  getTimestamp(): Promise<Timestamp>;

  // Tracking operations
  isUpToDate(
    ctx: IExecContext,
    tData: TrackedFileData | undefined,
  ): Promise<boolean>;
  getFileData(ctx: IExecContext): Promise<TrackedFileData>;
  getFileDataOrCached(
    ctx: IExecContext,
    tData: TrackedFileData | undefined,
  ): Promise<{
    tData: TrackedFileData;
    upToDate: boolean;
  }>;

  // Task association
  setTask(t: ITask): void;
  getTask(): ITask | null;
}

// Async file generator interface
export interface ITrackedFilesAsync {
  getTrackedFiles(): Promise<ITrackedFile[]>;
}
