import { Task, type TaskParams } from "./task.ts";
import { type FileParams, TrackedFile } from "./file/TrackedFile.ts";
import {
  type GenTrackedFiles,
  TrackedFilesAsync,
} from "./file/TrackedFilesAsync.ts";

/** Generate a task */
export function task(taskParams: TaskParams): Task {
  const task = new Task(taskParams);
  return task;
}

/** Generate a trackedfile for tracking */
export function file(fileParams: FileParams | string): TrackedFile {
  if (typeof fileParams === "string") {
    return new TrackedFile({ path: fileParams });
  }
  return new TrackedFile(fileParams);
}

export function trackFile(fileParams: FileParams | string): TrackedFile {
  return file(fileParams);
}

export function asyncFiles(gen: GenTrackedFiles): TrackedFilesAsync {
  return new TrackedFilesAsync(gen);
}
