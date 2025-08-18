import { assertEquals, assertThrows } from "@std/assert";
import * as path from "@std/path";
import {
  execBasic,
  file,
  isTrackedFile,
  type ITask,
  type TaskName,
  type Timestamp,
  TrackedFile,
  type TrackedFileHash,
  trackFile,
} from "../mod.ts";
import { Manifest } from "../manifest.ts";

function createMockTask(name: string): ITask {
  return {
    name: name,
    description: `Mock task ${name}`,
    exec: async () => {},
    setup: async () => {},
    reset: async () => {},
  };
}

// Test helper to create temporary files
async function createTempFile(content: string): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_" });
  const filePath = path.join(tempDir, "test_file.txt");
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Test helper to cleanup temp directory
async function cleanup(filePath: string) {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

Deno.test("TrackedFile - basic file creation", async () => {
  const tempFile = await createTempFile("test content");

  const trackedFile = new TrackedFile({ path: tempFile });

  assertEquals(trackedFile.path, path.resolve(tempFile));
  assertEquals(await trackedFile.exists(), true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - file() function", async () => {
  const tempFile = await createTempFile("test content");

  // Test string parameter
  const trackedFile1 = file(tempFile);
  assertEquals(trackedFile1 instanceof TrackedFile, true);

  // Test object parameter
  const trackedFile2 = file({ path: tempFile });
  assertEquals(trackedFile2 instanceof TrackedFile, true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - trackFile() alias", async () => {
  const tempFile = await createTempFile("test content");

  const trackedFile = trackFile(tempFile);
  assertEquals(trackedFile instanceof TrackedFile, true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - isTrackedFile type guard", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = file(tempFile);

  assertEquals(isTrackedFile(trackedFile), true);
  assertEquals(isTrackedFile("not a tracked file"), false);
  assertEquals(isTrackedFile(null), false);
  assertEquals(isTrackedFile({}), false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - file existence checking", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });

  // File exists
  assertEquals(await trackedFile.exists(), true);

  // Delete file and check again
  await Deno.remove(tempFile);
  assertEquals(await trackedFile.exists(), false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - non-existent file", async () => {
  const nonExistentPath = "/tmp/does_not_exist_" + Date.now() + ".txt";
  const trackedFile = new TrackedFile({ path: nonExistentPath });

  assertEquals(await trackedFile.exists(), false);
  assertEquals(await trackedFile.getHash(), "");
  assertEquals(await trackedFile.getTimestamp(), "");
});

Deno.test("TrackedFile - default hash calculation", async () => {
  const tempFile = await createTempFile("test content for hashing");
  const trackedFile = new TrackedFile({ path: tempFile });

  const hash = await trackedFile.getHash();

  // Should be a SHA1 hash (40 hex characters)
  assertEquals(typeof hash, "string");
  assertEquals(hash.length, 40);
  assertEquals(/^[a-f0-9]+$/.test(hash), true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - known hash values", async () => {
  // Test empty file
  const emptyFile = await createTempFile("");
  const emptyTrackedFile = new TrackedFile({ path: emptyFile });
  const emptyHash = await emptyTrackedFile.getHash();

  // Known SHA1 hash of empty file
  assertEquals(emptyHash, "da39a3ee5e6b4b0d3255bfef95601890afd80709");

  // Test known content
  const helloFile = await createTempFile("hello world");
  const helloTrackedFile = new TrackedFile({ path: helloFile });
  const helloHash = await helloTrackedFile.getHash();

  // Known SHA1 hash of "hello world"
  assertEquals(helloHash, "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed");

  await cleanup(emptyFile);
  await cleanup(helloFile);
});

Deno.test("TrackedFile - custom hash function", async () => {
  const tempFile = await createTempFile("test content");

  const customHashFn = (
    _path: string,
    _stat: Deno.FileInfo,
  ): TrackedFileHash => {
    return "custom_hash_123";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: customHashFn,
  });

  const hash = await trackedFile.getHash();
  assertEquals(hash, "custom_hash_123");

  await cleanup(tempFile);
});

Deno.test("TrackedFile - async custom hash function", async () => {
  const tempFile = await createTempFile("test content");

  const customHashFn = (
    _path: string,
    _stat: Deno.FileInfo,
  ): Promise<TrackedFileHash> => {
    return new Promise((resolve) => {
      queueMicrotask(() => resolve("async_hash_456"));
    });
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getHash: customHashFn,
  });

  const hash = await trackedFile.getHash();
  assertEquals(hash, "async_hash_456");

  await cleanup(tempFile);
});

Deno.test("TrackedFile - default timestamp", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });

  const timestamp = await trackedFile.getTimestamp();

  // Should be ISO timestamp string
  assertEquals(typeof timestamp, "string");
  assertEquals(timestamp.length > 0, true);

  // Should be parseable as date
  const date = new Date(timestamp);
  assertEquals(isNaN(date.getTime()), false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - custom timestamp function", async () => {
  const tempFile = await createTempFile("test content");

  const customTimestampFn = (
    _path: string,
    _stat: Deno.FileInfo,
  ): Timestamp => {
    return "2023-01-01T00:00:00.000Z";
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getTimestamp: customTimestampFn,
  });

  const timestamp = await trackedFile.getTimestamp();
  assertEquals(timestamp, "2023-01-01T00:00:00.000Z");

  await cleanup(tempFile);
});

Deno.test("TrackedFile - async custom timestamp function", async () => {
  const tempFile = await createTempFile("test content");

  const customTimestampFn = (
    _path: string,
    _stat: Deno.FileInfo,
  ): Promise<Timestamp> => {
    return new Promise((resolve) => {
      queueMicrotask(() => resolve("2023-12-31T23:59:59.999Z"));
    });
  };

  const trackedFile = new TrackedFile({
    path: tempFile,
    getTimestamp: customTimestampFn,
  });

  const timestamp = await trackedFile.getTimestamp();
  assertEquals(timestamp, "2023-12-31T23:59:59.999Z");

  await cleanup(tempFile);
});

Deno.test("TrackedFile - file deletion", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });

  // Confirm file exists
  assertEquals(await trackedFile.exists(), true);

  // Delete via TrackedFile
  await trackedFile.delete();

  // Confirm file no longer exists
  assertEquals(await trackedFile.exists(), false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - delete non-existent file", async () => {
  const nonExistentPath = "/tmp/does_not_exist_" + Date.now() + ".txt";
  const trackedFile = new TrackedFile({ path: nonExistentPath });

  // Should not throw error when deleting non-existent file
  await trackedFile.delete();
});

Deno.test("TrackedFile - getFileData", async () => {
  const tempFile = await createTempFile("test content for file data");
  const trackedFile = new TrackedFile({ path: tempFile });
  const ctx = await execBasic([], [], new Manifest(""));

  const fileData = await trackedFile.getFileData();

  assertEquals(typeof fileData.hash, "string");
  assertEquals(fileData.hash.length, 40); // SHA1 hash
  assertEquals(typeof fileData.timestamp, "string");
  assertEquals(fileData.timestamp.length > 0, true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - isUpToDate with matching data", async () => {
  const tempFile = await createTempFile("consistent content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  // Get initial file data
  const initialData = await trackedFile.getFileData();

  // Check if up to date (should be true)
  const upToDate = await trackedFile.isUpToDate(initialData);
  assertEquals(upToDate, true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - isUpToDate with changed content", async () => {
  const tempFile = await createTempFile("original content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  // Get initial file data
  const initialData = await trackedFile.getFileData();

  // Modify file (add small delay to ensure timestamp changes)
  await new Promise((resolve) => setTimeout(resolve, 10));
  await Deno.writeTextFile(tempFile, "modified content");

  // Check if up to date (should be false)
  const upToDate = await trackedFile.isUpToDate(initialData);
  assertEquals(upToDate, false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - isUpToDate with undefined data", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  // Check with undefined data (should be false)
  const upToDate = await trackedFile.isUpToDate(undefined);
  assertEquals(upToDate, false);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - getFileDataOrCached up to date", async () => {
  const tempFile = await createTempFile("cached test content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  const initialData = await trackedFile.getFileData();

  const result = await trackedFile.getFileDataOrCached(ctx, initialData);
  assertEquals(result.upToDate, true);
  assertEquals(result.tData, initialData);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - getFileDataOrCached not up to date", async () => {
  const tempFile = await createTempFile("original cached content");
  const trackedFile = new TrackedFile({ path: tempFile });
  const manifest = new Manifest("");
  const ctx = await execBasic([], [], new Manifest(""));

  const initialData = await trackedFile.getFileData();

  // Modify file (add small delay to ensure timestamp changes)
  await new Promise((resolve) => setTimeout(resolve, 10));
  await Deno.writeTextFile(tempFile, "modified cached content");

  const result = await trackedFile.getFileDataOrCached(ctx, initialData);
  assertEquals(result.upToDate, false);
  assertEquals(result.tData.hash !== initialData.hash, true);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - task assignment", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });

  const mockTask = createMockTask("testTask");

  // Initially no task
  assertEquals(trackedFile.getTask(), null);

  // Set task
  trackedFile.setTask(mockTask);
  assertEquals(trackedFile.getTask(), mockTask);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - duplicate task assignment throws error", async () => {
  const tempFile = await createTempFile("test content");
  const trackedFile = new TrackedFile({ path: tempFile });

  const mockTask1 = createMockTask("testTask1");
  const mockTask2 = createMockTask("testTask2");

  // Set first task (should work)
  trackedFile.setTask(mockTask1);
  assertEquals(trackedFile.getTask(), mockTask1);

  // Try to set second task (should throw)
  assertThrows(
    () => trackedFile.setTask(mockTask2),
    Error,
    "Duplicate tasks generating TrackedFile as target",
  );

  await cleanup(tempFile);
});

Deno.test("TrackedFile - path resolution", async () => {
  const tempFile = await createTempFile("test content");
  const relativePath = path.relative(Deno.cwd(), tempFile);

  const trackedFile = new TrackedFile({ path: relativePath });

  // Should resolve to absolute path
  assertEquals(trackedFile.path, path.resolve(relativePath));
  assertEquals(trackedFile.path, tempFile);

  await cleanup(tempFile);
});

Deno.test("TrackedFile - binary file handling", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_binary_" });
  const binaryFile = path.join(tempDir, "binary_test.bin");

  // Create binary content (PNG header)
  const binaryData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  await Deno.writeFile(binaryFile, binaryData);

  const trackedFile = new TrackedFile({ path: binaryFile });

  assertEquals(await trackedFile.exists(), true);

  const hash = await trackedFile.getHash();
  assertEquals(typeof hash, "string");
  assertEquals(hash.length, 40);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("TrackedFile - large file handling", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_large_" });
  const largeFile = path.join(tempDir, "large_test.txt");

  // Create large content (1MB of repeated text)
  const chunk = "This is a test line for large file handling.\n";
  const largeContent = chunk.repeat(Math.floor(1024 * 1024 / chunk.length));
  await Deno.writeTextFile(largeFile, largeContent);

  const trackedFile = new TrackedFile({ path: largeFile });

  assertEquals(await trackedFile.exists(), true);

  const hash = await trackedFile.getHash();
  assertEquals(typeof hash, "string");
  assertEquals(hash.length, 40);

  const timestamp = await trackedFile.getTimestamp();
  assertEquals(typeof timestamp, "string");
  assertEquals(timestamp.length > 0, true);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("TrackedFile - permission denied scenarios", async () => {
  // Test graceful handling of permission errors across platforms
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_perms_" });

  try {
    const testFile = path.join(tempDir, "test.txt");
    await Deno.writeTextFile(testFile, "test content");

    // Try platform-specific permission restrictions
    let permissionTestSkipped = false;

    if (Deno.build.os === "windows") {
      // Windows: Test with a system path that typically requires elevated privileges
      const restrictedPath = path.join(
        "C:",
        "Windows",
        "System32",
        "config",
        "nonexistent",
      );
      const trackedFile = new TrackedFile({ path: restrictedPath });

      try {
        await trackedFile.exists();
        // If this succeeds without error, test passed
      } catch (error) {
        // Expected: should handle permission error gracefully
        assertEquals(error instanceof Error, true);
      }
    } else {
      // Unix-like: Try to restrict file permissions
      try {
        await Deno.chmod(testFile, 0o000);

        const trackedFile = new TrackedFile({ path: testFile });

        // Test exists() - behavior may vary by platform/privileges
        const exists = await trackedFile.exists();
        assertEquals(typeof exists, "boolean");

        // Test getHash() - should handle permission errors
        try {
          await trackedFile.getHash();
        } catch (error) {
          // Permission error expected in some cases
          assertEquals(error instanceof Error, true);
        }

        // Restore permissions for cleanup
        await Deno.chmod(testFile, 0o644);
      } catch (_chmodError) {
        // chmod failed - likely due to filesystem or privilege restrictions
        permissionTestSkipped = true;
      }
    }

    if (permissionTestSkipped) {
      // Test with completely non-existent path instead
      const nonexistentPath = path.join(
        tempDir,
        "definitely",
        "does",
        "not",
        "exist",
        "file.txt",
      );
      const trackedFile = new TrackedFile({ path: nonexistentPath });

      const exists = await trackedFile.exists();
      assertEquals(exists, false);
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
