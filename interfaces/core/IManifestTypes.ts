import { z } from "zod";

// "Flavoured" nominal typing.
// https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
// We use a symbol for the hidden field to ensure uniqueness
const sym: unique symbol = Symbol();

type Flavored<T extends string, Name extends string> = T & {
  readonly [sym]?: Name;
};

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

// Inferred TypeScript types for manifest data structures with flavoring
export type TaskName = Flavored<string, "TaskName">;
export type TrackedFileName = Flavored<string, "TrackedFileName">;
export type TrackedFileHash = Flavored<string, "TrackedFileHash">;
export type Timestamp = Flavored<string, "Timestamp">;
export type TrackedFileData = z.infer<typeof TrackedFileDataSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
