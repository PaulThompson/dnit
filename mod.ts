// Main dnit module - clean exports organized by category

// Core types
export * from "./interfaces/core/IManifestTypes.ts";
export * from "./interfaces/utils/IFlavoring.ts";
export type {
  IAction,
  IExecContext,
  IIsUpToDate,
  ITask,
  ITaskContext,
} from "./interfaces/core/ICoreInterfaces.ts";
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
// TaskInterface now exported as ITask above
export { type TaskContext, taskContext } from "./core/TaskContext.ts";

// CLI utilities
export {
  execCli,
  execContextInitBasic as execBasic,
  type ExecResult,
  main,
} from "./cli/cli.ts";
export { getLogger, setupLogging } from "./cli/logging.ts";

// Manifest handling
export { Manifest } from "./manifest.ts";

// Utilities
export * from "./utils/filesystem.ts";
