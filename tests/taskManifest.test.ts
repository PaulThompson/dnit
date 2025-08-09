import { assertEquals, assertExists } from "@std/assert";
import { TaskManifest } from "../core/taskManifest.ts";
import type {
  TaskData,
  TrackedFileData,
  TrackedFileName,
} from "../interfaces/core/IManifestTypes.ts";

Deno.test("TaskManifest - constructor with empty data", () => {
  const data: TaskData = {
    lastExecution: null,
    trackedFiles: {},
  };

  const manifest = new TaskManifest(data);

  assertEquals(manifest.lastExecution, null);
  assertEquals(Object.keys(manifest.trackedFiles).length, 0);
});

Deno.test("TaskManifest - constructor with populated data", () => {
  const data: TaskData = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {
      "file1.txt": {
        hash: "abc123",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
      "file2.txt": {
        hash: "def456",
        timestamp: "2023-01-01T00:00:01.000Z",
      },
    },
  };

  const manifest = new TaskManifest(data);

  assertEquals(manifest.lastExecution, "2023-01-01T00:00:00.000Z");
  assertEquals(Object.keys(manifest.trackedFiles).length, 2);
  assertEquals(manifest.getFileData("file1.txt" as TrackedFileName), {
    hash: "abc123",
    timestamp: "2023-01-01T00:00:00.000Z",
  });
});

Deno.test("TaskManifest - getFileData returns undefined for non-existent file", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {},
  });

  assertEquals(
    manifest.getFileData("nonexistent.txt" as TrackedFileName),
    undefined,
  );
});

Deno.test("TaskManifest - getFileData returns correct data for existing file", () => {
  const fileData: TrackedFileData = {
    hash: "xyz789",
    timestamp: "2023-01-01T12:00:00.000Z",
  };

  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {
      "test.txt": fileData,
    },
  });

  assertEquals(manifest.getFileData("test.txt" as TrackedFileName), fileData);
});

Deno.test("TaskManifest - setFileData adds new file", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {},
  });

  const fileData: TrackedFileData = {
    hash: "new123",
    timestamp: "2023-01-01T15:00:00.000Z",
  };

  manifest.setFileData("newfile.txt" as TrackedFileName, fileData);

  assertEquals(
    manifest.getFileData("newfile.txt" as TrackedFileName),
    fileData,
  );
  assertEquals(Object.keys(manifest.trackedFiles).length, 1);
});

Deno.test("TaskManifest - setFileData updates existing file", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {
      "existing.txt": {
        hash: "old123",
        timestamp: "2023-01-01T10:00:00.000Z",
      },
    },
  });

  const newData: TrackedFileData = {
    hash: "new456",
    timestamp: "2023-01-01T11:00:00.000Z",
  };

  manifest.setFileData("existing.txt" as TrackedFileName, newData);

  assertEquals(
    manifest.getFileData("existing.txt" as TrackedFileName),
    newData,
  );
  assertEquals(Object.keys(manifest.trackedFiles).length, 1);
});

Deno.test("TaskManifest - setExecutionTimestamp sets current time", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {},
  });

  const beforeTime = new Date().toISOString();
  manifest.setExecutionTimestamp();
  const afterTime = new Date().toISOString();

  assertExists(manifest.lastExecution);

  // Check that the timestamp is between before and after (allowing for test execution time)
  const executionTime = new Date(manifest.lastExecution);
  const before = new Date(beforeTime);
  const after = new Date(afterTime);

  assertEquals(executionTime >= before, true);
  assertEquals(executionTime <= after, true);
});

Deno.test("TaskManifest - setExecutionTimestamp updates existing timestamp", () => {
  const manifest = new TaskManifest({
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {},
  });

  assertEquals(manifest.lastExecution, "2023-01-01T00:00:00.000Z");

  manifest.setExecutionTimestamp();

  // Should be updated to current time (not the original)
  assertEquals(manifest.lastExecution !== "2023-01-01T00:00:00.000Z", true);
});

Deno.test("TaskManifest - toData returns correct structure", () => {
  const originalData: TaskData = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {
      "file1.txt": {
        hash: "hash1",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
      "file2.txt": {
        hash: "hash2",
        timestamp: "2023-01-01T00:00:01.000Z",
      },
    },
  };

  const manifest = new TaskManifest(originalData);
  const exportedData = manifest.toData();

  assertEquals(exportedData.lastExecution, originalData.lastExecution);
  assertEquals(Object.keys(exportedData.trackedFiles).length, 2);
  assertEquals(
    exportedData.trackedFiles["file1.txt"],
    originalData.trackedFiles["file1.txt"],
  );
  assertEquals(
    exportedData.trackedFiles["file2.txt"],
    originalData.trackedFiles["file2.txt"],
  );
});

Deno.test("TaskManifest - toData after modifications", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {},
  });

  // Add some data
  manifest.setFileData("test.txt" as TrackedFileName, {
    hash: "test123",
    timestamp: "2023-01-01T12:00:00.000Z",
  });
  manifest.setExecutionTimestamp();

  const data = manifest.toData();

  assertExists(data.lastExecution);
  assertEquals(Object.keys(data.trackedFiles).length, 1);
  assertEquals(data.trackedFiles["test.txt"], {
    hash: "test123",
    timestamp: "2023-01-01T12:00:00.000Z",
  });
});

Deno.test("TaskManifest - round-trip data consistency", () => {
  const originalData: TaskData = {
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {
      "file1.txt": {
        hash: "hash1",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
    },
  };

  const manifest1 = new TaskManifest(originalData);
  const exportedData = manifest1.toData();
  const manifest2 = new TaskManifest(exportedData);

  assertEquals(manifest2.lastExecution, originalData.lastExecution);
  assertEquals(
    manifest2.getFileData("file1.txt" as TrackedFileName),
    originalData.trackedFiles["file1.txt"],
  );
});

Deno.test("TaskManifest - multiple file operations", () => {
  const manifest = new TaskManifest({
    lastExecution: null,
    trackedFiles: {},
  });

  // Add multiple files
  manifest.setFileData("file1.txt" as TrackedFileName, {
    hash: "hash1",
    timestamp: "2023-01-01T10:00:00.000Z",
  });
  manifest.setFileData("file2.txt" as TrackedFileName, {
    hash: "hash2",
    timestamp: "2023-01-01T10:01:00.000Z",
  });
  manifest.setFileData("file3.txt" as TrackedFileName, {
    hash: "hash3",
    timestamp: "2023-01-01T10:02:00.000Z",
  });

  // Update one file
  manifest.setFileData("file2.txt" as TrackedFileName, {
    hash: "updated_hash2",
    timestamp: "2023-01-01T11:00:00.000Z",
  });

  assertEquals(Object.keys(manifest.trackedFiles).length, 3);
  assertEquals(
    manifest.getFileData("file1.txt" as TrackedFileName)?.hash,
    "hash1",
  );
  assertEquals(
    manifest.getFileData("file2.txt" as TrackedFileName)?.hash,
    "updated_hash2",
  );
  assertEquals(
    manifest.getFileData("file3.txt" as TrackedFileName)?.hash,
    "hash3",
  );
});

Deno.test("TaskManifest - handles empty tracked files", () => {
  const manifest = new TaskManifest({
    lastExecution: "2023-01-01T00:00:00.000Z",
    trackedFiles: {},
  });

  assertEquals(Object.keys(manifest.trackedFiles).length, 0);
  assertEquals(manifest.getFileData("any.txt" as TrackedFileName), undefined);

  const data = manifest.toData();
  assertEquals(Object.keys(data.trackedFiles).length, 0);
});
