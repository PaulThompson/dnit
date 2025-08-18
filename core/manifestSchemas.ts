import { z } from "zod";
import type {
  Manifest as _Manifest,
  TaskData as _TaskData,
  TaskName,
  Timestamp,
  TrackedFileData as _TrackedFileData,
  TrackedFileHash,
  TrackedFileName,
} from "../interfaces/core/IManifestTypes.ts";

// Zod schemas for manifest type validation and inference
export const TaskNameSchema: z.ZodString = z.string();
export const TrackedFileNameSchema: z.ZodString = z.string();
export const TrackedFileHashSchema: z.ZodString = z.string();
export const TimestampSchema: z.ZodString = z.string();

export const TrackedFileDataSchema: z.ZodObject<{
  hash: z.ZodString;
  timestamp: z.ZodString;
}> = z.object({
  hash: TrackedFileHashSchema,
  timestamp: TimestampSchema,
});

export const TaskDataSchema: z.ZodObject<{
  lastExecution: z.ZodNullable<z.ZodString>;
  trackedFiles: z.ZodRecord<
    z.ZodString,
    z.ZodObject<{
      hash: z.ZodString;
      timestamp: z.ZodString;
    }>
  >;
}> = z.object({
  lastExecution: TimestampSchema.nullable(),
  trackedFiles: z.record(TrackedFileNameSchema, TrackedFileDataSchema),
});

export const ManifestSchema: z.ZodObject<{
  tasks: z.ZodRecord<
    z.ZodString,
    z.ZodObject<{
      lastExecution: z.ZodNullable<z.ZodString>;
      trackedFiles: z.ZodRecord<
        z.ZodString,
        z.ZodObject<{
          hash: z.ZodString;
          timestamp: z.ZodString;
        }>
      >;
    }>
  >;
}> = z.object({
  tasks: z.record(TaskNameSchema, TaskDataSchema),
});
