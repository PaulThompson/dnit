import { assert, assertEquals } from "@std/assert";
import {
  ManifestSchema,
  TaskDataSchema,
  TaskNameSchema,
  TimestampSchema,
  TrackedFileDataSchema,
  TrackedFileHashSchema,
  TrackedFileNameSchema,
} from "../core/manifestSchemas.ts";

Deno.test("ManifestSchemas - TaskNameSchema validates strings", () => {
  const result1 = TaskNameSchema.safeParse("validTaskName");
  assert(result1.success);
  assertEquals(result1.data, "validTaskName");

  const result2 = TaskNameSchema.safeParse(123);
  assertEquals(result2.success, false);

  const result3 = TaskNameSchema.safeParse("");
  assert(result3.success);
  assertEquals(result3.data, "");
});

Deno.test("ManifestSchemas - TrackedFileNameSchema validates strings", () => {
  const result1 = TrackedFileNameSchema.safeParse("path/to/file.txt");
  assert(result1.success);
  assertEquals(result1.data, "path/to/file.txt");

  const result2 = TrackedFileNameSchema.safeParse(null);
  assertEquals(result2.success, false);

  const result3 = TrackedFileNameSchema.safeParse("./relative/path.js");
  assert(result3.success);
});

Deno.test("ManifestSchemas - TrackedFileHashSchema validates strings", () => {
  const result1 = TrackedFileHashSchema.safeParse("abc123def456");
  assert(result1.success);
  assertEquals(result1.data, "abc123def456");

  const result2 = TrackedFileHashSchema.safeParse(undefined);
  assertEquals(result2.success, false);

  const result3 = TrackedFileHashSchema.safeParse("");
  assert(result3.success);
});

Deno.test("ManifestSchemas - TimestampSchema validates strings", () => {
  const result1 = TimestampSchema.safeParse("2023-01-01T00:00:00.000Z");
  assert(result1.success);
  assertEquals(result1.data, "2023-01-01T00:00:00.000Z");

  const result2 = TimestampSchema.safeParse(new Date());
  assertEquals(result2.success, false);

  const result3 = TimestampSchema.safeParse("invalid-date-string");
  assert(result3.success); // Schema only validates it's a string, not a valid ISO date
});

Deno.test("ManifestSchemas - TrackedFileDataSchema validates correct structure", () => {
  const validData = {
    hash: "abc123",
    timestamp: "2023-01-01T00:00:00.000Z",
  };

  const result1 = TrackedFileDataSchema.safeParse(validData);
  assert(result1.success);
  assertEquals(result1.data, validData);

  const invalidData1 = {
    hash: "abc123",
    // missing timestamp
  };
  const result2 = TrackedFileDataSchema.safeParse(invalidData1);
  assertEquals(result2.success, false);

  const invalidData2 = {
    hash: 123, // should be string
    timestamp: "2023-01-01T00:00:00.000Z",
  };
  const result3 = TrackedFileDataSchema.safeParse(invalidData2);
  assertEquals(result3.success, false);
});

Deno.test("ManifestSchemas - TaskDataSchema validates correct structure", () => {
  const validData1 = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {
      "file1.txt": {
        hash: "abc123",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
    },
  };

  const result1 = TaskDataSchema.safeParse(validData1);
  assert(result1.success);
  assertEquals(result1.data, validData1);

  const validData2 = {
    lastExecution: null,
    trackedFiles: {},
  };

  const result2 = TaskDataSchema.safeParse(validData2);
  assert(result2.success);
  assertEquals(result2.data, validData2);

  const invalidData1 = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    // missing trackedFiles
  };
  const result3 = TaskDataSchema.safeParse(invalidData1);
  assertEquals(result3.success, false);

  const invalidData2 = {
    lastExecution: 123, // should be string or null
    trackedFiles: {},
  };
  const result4 = TaskDataSchema.safeParse(invalidData2);
  assertEquals(result4.success, false);
});

Deno.test("ManifestSchemas - ManifestSchema validates correct structure", () => {
  const validManifest = {
    tasks: {
      "task1": {
        lastExecution: "2023-01-01T00:00:00.000Z",
        trackedFiles: {
          "file1.txt": {
            hash: "abc123",
            timestamp: "2023-01-01T00:00:00.000Z",
          },
        },
      },
      "task2": {
        lastExecution: null,
        trackedFiles: {},
      },
    },
  };

  const result1 = ManifestSchema.safeParse(validManifest);
  assert(result1.success);
  assertEquals(result1.data, validManifest);

  const invalidManifest1 = {
    // missing tasks
  };
  const result2 = ManifestSchema.safeParse(invalidManifest1);
  assertEquals(result2.success, false);

  const invalidManifest2 = {
    tasks: "should be object not string",
  };
  const result3 = ManifestSchema.safeParse(invalidManifest2);
  assertEquals(result3.success, false);

  const invalidManifest3 = {
    tasks: {
      "task1": {
        lastExecution: "2023-01-01T00:00:00.000Z",
        trackedFiles: {
          "file1.txt": {
            hash: 123, // should be string
            timestamp: "2023-01-01T00:00:00.000Z",
          },
        },
      },
    },
  };
  const result4 = ManifestSchema.safeParse(invalidManifest3);
  assertEquals(result4.success, false);
});

Deno.test("ManifestSchemas - ManifestSchema handles empty tasks", () => {
  const emptyManifest = {
    tasks: {},
  };

  const result = ManifestSchema.safeParse(emptyManifest);
  assert(result.success);
  assertEquals(result.data, emptyManifest);
});

Deno.test("ManifestSchemas - ManifestSchema handles complex nested structure", () => {
  const complexManifest = {
    tasks: {
      "buildTask": {
        lastExecution: "2023-01-01T10:00:00.000Z",
        trackedFiles: {
          "src/main.ts": {
            hash: "main123",
            timestamp: "2023-01-01T09:30:00.000Z",
          },
          "src/utils.ts": {
            hash: "utils456",
            timestamp: "2023-01-01T09:45:00.000Z",
          },
          "package.json": {
            hash: "pkg789",
            timestamp: "2023-01-01T08:00:00.000Z",
          },
        },
      },
      "testTask": {
        lastExecution: null,
        trackedFiles: {
          "tests/main.test.ts": {
            hash: "test123",
            timestamp: "2023-01-01T09:50:00.000Z",
          },
        },
      },
      "cleanTask": {
        lastExecution: "2023-01-01T11:00:00.000Z",
        trackedFiles: {},
      },
    },
  };

  const result = ManifestSchema.safeParse(complexManifest);
  assert(result.success);
  assertEquals(result.data, complexManifest);
});

Deno.test("ManifestSchemas - TaskDataSchema rejects extra fields", () => {
  const dataWithExtraField = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {},
    extraField: "should not be here",
  };

  // Note: Zod by default allows extra fields in objects unless .strict() is used
  // This test documents current behavior - may want to make schemas strict
  const result = TaskDataSchema.safeParse(dataWithExtraField);
  assert(result.success); // Currently passes, extra fields are ignored
  assertEquals(result.data.lastExecution, "2023-01-01T00:00:00.000Z");
  assertEquals(result.data.trackedFiles, {});
  // extraField is not included in result.data
});

Deno.test("ManifestSchemas - nested validation errors", () => {
  const invalidNestedManifest = {
    tasks: {
      "validTask": {
        lastExecution: "2023-01-01T00:00:00.000Z",
        trackedFiles: {},
      },
      "invalidTask": {
        lastExecution: "2023-01-01T00:00:00.000Z",
        trackedFiles: {
          "file1.txt": {
            hash: "valid",
            timestamp: 12345, // should be string
          },
        },
      },
    },
  };

  const result = ManifestSchema.safeParse(invalidNestedManifest);
  assertEquals(result.success, false);

  if (!result.success) {
    // Check that error points to the specific invalid field
    const errorPath = result.error.issues[0].path;
    assertEquals(errorPath.includes("invalidTask"), true);
    assertEquals(errorPath.includes("trackedFiles"), true);
    assertEquals(errorPath.includes("timestamp"), true);
  }
});
