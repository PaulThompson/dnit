import { z } from "zod";

// "Flavoured" nominal typing.
// https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
// We use a symbol for the hidden field to ensure uniqueness
const sym = Symbol();

type Flavored<T extends string, Name extends string> = T & {
  readonly [sym]?: Name;
};

// Helper to create flavored Zod schemas
function flavoredString<Name extends string>(name: Name) {
  return z.string().transform((val): Flavored<string, Name> =>
    val as Flavored<string, Name>
  );
}

// Zod schemas for manifest type validation and inference
export const TaskNameSchema = flavoredString("TaskName");
export const TrackedFileNameSchema = flavoredString("TrackedFileName");
export const TrackedFileHashSchema = flavoredString("TrackedFileHash");
export const TimestampSchema = flavoredString("Timestamp");

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

// Inferred TypeScript types for manifest data structures
export type TaskName = z.infer<typeof TaskNameSchema>;
export type TrackedFileName = z.infer<typeof TrackedFileNameSchema>;
export type TrackedFileHash = z.infer<typeof TrackedFileHashSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type TrackedFileData = z.infer<typeof TrackedFileDataSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
