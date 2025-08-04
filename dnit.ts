// Main dnit module - exports everything for backward compatibility
export * from "./core/types.ts";
export { ExecContext, type TaskContext, taskContext } from "./core/context.ts";
export { type TaskInterface } from "./core/taskInterface.ts";
export {
  type Action,
  asyncFiles,
  type Dep,
  file,
  type FileParams,
  type GenTrackedFiles,
  type GetFileHash,
  type GetFileTimestamp,
  type IsUpToDate,
  runAlways,
  Task,
  task,
  type TaskParams,
  TrackedFile,
  TrackedFilesAsync,
  trackFile,
} from "./core/task.ts";
export * from "./utils/filesystem.ts";
export {
  execBasic,
  execCli,
  type ExecResult,
  getLogger,
  main,
  setupLogging,
} from "./cli.ts";
export { Manifest, TaskManifest } from "./manifest.ts";
