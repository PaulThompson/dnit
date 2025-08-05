// Main dnit module - clean exports organized by category

// Core types
export * from "./core/types.ts";
export type {
  IAction,
  IIsUpToDate,
  ITask,
  ITaskContext,
} from "./interfaces/core/ITask.ts";
export type { IExecContext } from "./interfaces/core/IContext.ts";
export type { IManifest, ITaskManifest } from "./interfaces/core/IManifest.ts";
export type {
  ITrackedFile,
  ITrackedFilesAsync,
} from "./interfaces/core/ITrackedFile.ts";

// Core implementations
export { ExecContext } from "./core/execContext.ts";
export {
  type Action,
  type Dep,
  type IsUpToDate,
  runAlways,
  Task,
  task,
  type TaskParams,
} from "./core/task.ts";
export {
  file,
  type FileParams,
  type GetFileHash,
  type GetFileTimestamp,
  isTrackedFile,
  TrackedFile,
  trackFile,
} from "./core/file/TrackedFile.ts";
export {
  asyncFiles,
  type GenTrackedFiles,
  isTrackedFileAsync,
  TrackedFilesAsync,
} from "./core/file/TrackedFilesAsync.ts";
export { TaskManifest } from "./core/taskManifest.ts";

// Task context utilities
export { type TaskInterface } from "./core/taskInterface.ts";
export { type TaskContext, taskContext } from "./core/TaskContext.ts";

// CLI utilities
export { execBasic, execCli, type ExecResult, main } from "./cli/cli.ts";
export { getLogger, setupLogging } from "./cli/logging.ts";

// Manifest handling
export { Manifest } from "./manifest.ts";

// Utilities
export * from "./utils/filesystem.ts";
