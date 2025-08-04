// Main dnit module - clean exports organized by category

// Core types
export * from "./core/types.ts";
export type {
  IAction,
  IIsUpToDate,
  ITask,
  ITaskContext,
} from "./interfaces/core/ITask.ts";
export type { IContext } from "./interfaces/core/IContext.ts";
export type { IManifest, ITaskManifest } from "./interfaces/core/IManifest.ts";
export type {
  ITrackedFile,
  ITrackedFilesAsync,
} from "./interfaces/core/ITrackedFile.ts";

// Core implementations
export { ExecContext } from "./core/context.ts";
export {
  type Action,
  type Dep,
  type IsUpToDate,
  runAlways,
  Task,
  type TaskParams,
} from "./core/task.ts";
export {
  type FileParams,
  type GetFileHash,
  type GetFileTimestamp,
  TrackedFile,
} from "./core/file/TrackedFile.ts";
export {
  type GenTrackedFiles,
  TrackedFilesAsync,
} from "./core/file/TrackedFilesAsync.ts";
export { TaskManifest } from "./core/taskManifest.ts";

// Factory functions
export { asyncFiles, file, task, trackFile } from "./core/factories.ts";

// Task context utilities
export {
  type TaskContext,
  taskContext,
  type TaskInterface,
} from "./core/taskInterface.ts";

// CLI utilities
export { execBasic, execCli, type ExecResult, main } from "./cli/cli.ts";
export { getLogger, setupLogging } from "./cli/logging.ts";

// Manifest handling
export { Manifest } from "./manifest.ts";

// Utilities
export * from "./utils/filesystem.ts";
