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

// Basic flavored string type checks
type TaskNameCheck = z.infer<typeof TaskNameSchema> extends string
  ? TaskName extends string ? true : false
  : false;

type TrackedFileNameCheck =
  z.infer<typeof TrackedFileNameSchema> extends string
    ? TrackedFileName extends string ? true : false
    : false;

type TrackedFileHashCheck =
  z.infer<typeof TrackedFileHashSchema> extends string
    ? TrackedFileHash extends string ? true : false
    : false;

type TimestampCheck = z.infer<typeof TimestampSchema> extends string
  ? Timestamp extends string ? true : false
  : false;

// Complex type structure checks
type TrackedFileDataCheck = z.infer<typeof TrackedFileDataSchema> extends TrackedFileData
  ? TrackedFileData extends z.infer<typeof TrackedFileDataSchema> ? true : false
  : false;

type TaskDataCheck = z.infer<typeof TaskDataSchema> extends TaskData
  ? TaskData extends z.infer<typeof TaskDataSchema> ? true : false
  : false;

type ManifestCheck = z.infer<typeof ManifestSchema> extends Manifest
  ? Manifest extends z.infer<typeof ManifestSchema> ? true : false
  : false;

// Ensure all checks pass (will cause compile error if any fail)
const allChecksPass: [
  TaskNameCheck,
  TrackedFileNameCheck,
  TrackedFileHashCheck,
  TimestampCheck,
  TrackedFileDataCheck,
  TaskDataCheck,
  ManifestCheck,
] = [true, true, true, true, true, true, true] as const;

Deno.test("type checks pass at runtime", () => {
  // Verify all type checks evaluate to true
  for (const check of allChecksPass) {
    if (check !== true) {
      throw new Error("Type check failed");
    }
  }
});
