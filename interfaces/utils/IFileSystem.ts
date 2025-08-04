import type { Timestamp, TrackedFileHash } from "../../core/types.ts";

// File system operations interface
export interface IFileSystem {
  statPath(path: string): Promise<IStatResult>;
  deletePath(path: string): Promise<void>;
  getFileSha1Sum(filename: string): Promise<TrackedFileHash>;
  getFileTimestamp(fileInfo: Deno.FileInfo): Timestamp;
}

// Stat result type
export interface IStatResult {
  kind: "fileInfo" | "dirInfo" | "notFound";
  fileInfo?: Deno.FileInfo;
}
