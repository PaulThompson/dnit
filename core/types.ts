import { z } from "zod";

// Zod schemas for type validation and inference
export const TaskNameSchema = z.string();
export const TrackedFileNameSchema = z.string();
export const TrackedFileHashSchema = z.string();
export const TimestampSchema = z.string();

export const TrackedFileDataSchema = z.object({
  hash: TrackedFileHashSchema,
  timestamp: TimestampSchema,
});

export const TaskDataSchema = z.object({
  lastExecution: TimestampSchema.nullable(),
  trackedFiles: z.record(TrackedFileNameSchema, TrackedFileDataSchema),
});

export const ManifestSchema = z.object({
  tasks: z.record(TaskNameSchema, TaskDataSchema),
});

// Inferred TypeScript types
export type TaskName = z.infer<typeof TaskNameSchema>;
export type TrackedFileName = z.infer<typeof TrackedFileNameSchema>;
export type TrackedFileHash = z.infer<typeof TrackedFileHashSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type TrackedFileData = z.infer<typeof TrackedFileDataSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
