import { z } from "zod";
import type {
  Manifest,
  TaskData,
  TaskName,
  Timestamp,
  TrackedFileData,
  TrackedFileHash,
  TrackedFileName,
} from "../interfaces/core/IManifestTypes.ts";
import type {
  ManifestSchema,
  TaskDataSchema,
  TaskNameSchema,
  TimestampSchema,
  TrackedFileDataSchema,
  TrackedFileHashSchema,
  TrackedFileNameSchema,
} from "../core/manifestSchemas.ts";

/**
 * Compile-time type assertions to ensure Zod schemas match their respective TypeScript interfaces.
 * These checks will cause TypeScript compilation to fail if the schemas diverge from the types.
 */

// Utility types for bidirectional checking
type And<A extends boolean, B extends boolean> = A extends true ? B extends true ? true : false : false;
type AllOf<T extends readonly boolean[]> = T[number] extends true ? true : false;
type Equivalent<A, B> = And<A extends B ? true : false, B extends A ? true : false>;

// Type checks using utility types
type TaskNameCheck = Equivalent<z.infer<typeof TaskNameSchema>, TaskName>;
type TrackedFileNameCheck = Equivalent<z.infer<typeof TrackedFileNameSchema>, TrackedFileName>;
type TrackedFileHashCheck = Equivalent<z.infer<typeof TrackedFileHashSchema>, TrackedFileHash>;
type TimestampCheck = Equivalent<z.infer<typeof TimestampSchema>, Timestamp>;
type TrackedFileDataCheck = Equivalent<z.infer<typeof TrackedFileDataSchema>, TrackedFileData>;
type TaskDataCheck = Equivalent<z.infer<typeof TaskDataSchema>, TaskData>;
type ManifestCheck = Equivalent<z.infer<typeof ManifestSchema>, Manifest>;

// Type-level check - will cause compile error if any check fails
type AllChecks = {
  taskName: TaskNameCheck;
  trackedFileName: TrackedFileNameCheck;
  trackedFileHash: TrackedFileHashCheck;
  timestamp: TimestampCheck;
  trackedFileData: TrackedFileDataCheck;
  taskData: TaskDataCheck;
  manifest: ManifestCheck;
};

const allChecks: AllChecks = {
  taskName: true,
  trackedFileName: true,
  trackedFileHash: true,
  timestamp: true,
  trackedFileData: true,
  taskData: true,
  manifest: true,
};

// Ensure all checks pass using AllOf
type AllChecksPass = AllOf<[AllChecks[keyof AllChecks]]>;
const passed: AllChecksPass = true as const;

Deno.test("type checks pass at runtime", () => {
  // Verify all type checks passed at compile time
  if (!passed) {
    throw new Error("Type checks failed");
  }
});
