import { z } from "zod";

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

// Flavoring support for nominal typing
const symTaskName = Symbol();
const symTrackedFileName = Symbol();
const symTrackedFileHash = Symbol();
const symTimestamp = Symbol();

type Flavoring<Name> = {
  readonly [K in keyof Name]?: Name[K];
};

type Flavored<T, FlavorT> = T & FlavorT;

// Inferred TypeScript types for manifest data structures with flavoring
export type TaskName = Flavored<string, { [symTaskName]?: never }>;
export type TrackedFileName = Flavored<
  string,
  { [symTrackedFileName]?: never }
>;
export type TrackedFileHash = Flavored<
  string,
  { [symTrackedFileHash]?: never }
>;
export type Timestamp = Flavored<string, { [symTimestamp]?: never }>;
export type TrackedFileData = z.infer<typeof TrackedFileDataSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
