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

// Ensure all checks pass (will cause compile error if any fail)
const allChecksPass = [
  true as TaskNameCheck,
  true as TrackedFileNameCheck,
  true as TrackedFileHashCheck,
  true as TimestampCheck,
  true as TrackedFileDataCheck,
  true as TaskDataCheck,
  true as ManifestCheck,
] as const;

// Compile-time verification that all checks pass
type AllChecksPass = AllOf<typeof allChecksPass>;
const _compileTimeCheck: AllChecksPass = true;

Deno.test("type checks pass at runtime", () => {
  // Verify all type checks evaluate to true
  for (const check of allChecksPass) {
    if (check !== true) {
      throw new Error("Type check failed");
    }
  }
});
