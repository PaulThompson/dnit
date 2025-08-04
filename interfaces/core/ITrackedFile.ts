import type {
  Timestamp,
  TrackedFileData,
  TrackedFileHash,
  TrackedFileName,
} from "../../core/types.ts";
import type { IContext } from "./IContext.ts";
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
    ctx: IContext,
    tData: TrackedFileData | undefined,
  ): Promise<boolean>;
  getFileData(ctx: IContext): Promise<TrackedFileData>;
  getFileDataOrCached(
    ctx: IContext,
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
