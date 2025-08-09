import type { Flavored } from "../utils/IFlavoring.ts";

/**
 * Core manifest type definitions for dnit's persistence layer.
 *
 * These types define the structure of data that gets serialized to and from
 * the manifest file (.manifest.json) that tracks task execution state and
 * file dependencies.
 */

/**
 * A unique identifier for a task.
 * Flavored to prevent mixing with other string types.
 */
export type TaskName = Flavored<string, "TaskName">;

/**
 * A file path used for tracking file dependencies.
 * Flavored to prevent mixing with other string types.
 */
export type TrackedFileName = Flavored<string, "TrackedFileName">;

/**
 * A hash value representing the content of a tracked file.
 * Flavored to prevent mixing with other string types.
 */
export type TrackedFileHash = Flavored<string, "TrackedFileHash">;

/**
 * An ISO timestamp string representing when something occurred.
 * Flavored to prevent mixing with other string types.
 */
export type Timestamp = Flavored<string, "Timestamp">;

/**
 * Data about a tracked file at a specific point in time.
 * Used to determine if a file has changed since the last task execution.
 */
export interface TrackedFileData {
  /** Hash of the file content (usually SHA-1) */
  hash: TrackedFileHash;
  /** Timestamp when the file was last modified */
  timestamp: Timestamp;
}

/**
 * Execution data for a single task.
 * Contains information about when the task last ran and what files it depends on.
 */
export interface TaskData {
  /** ISO timestamp of when this task was last executed, or null if never run */
  lastExecution: Timestamp | null;
  /** Map of file paths to their tracked data for this task's dependencies */
  trackedFiles: Record<TrackedFileName, TrackedFileData>;
}

/**
 * Root manifest structure that gets serialized to/from .manifest.json.
 * Contains execution state for all tasks in the project.
 */
export interface Manifest {
  /** Map of task names to their execution data */
  tasks: Record<TaskName, TaskData>;
}
