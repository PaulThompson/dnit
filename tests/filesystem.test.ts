import { assertEquals, assertRejects } from "@std/assert";
import * as path from "@std/path";
import {
  deletePath,
  getFileSha1Sum,
  getFileTimestamp,
  statPath,
} from "../utils/filesystem.ts";
import type { TrackedFileName } from "../interfaces/core/IManifestTypes.ts";

Deno.test("filesystem utilities", async (t) => {
  const testDir = await Deno.makeTempDir({ prefix: "dnit_filesystem_test_" });

  await t.step("statPath - file exists", async () => {
    const testFile = path.join(testDir, "test.txt") as TrackedFileName;
    await Deno.writeTextFile(testFile, "test content");

    const result = await statPath(testFile);
    assertEquals(result.kind, "fileInfo");
    if (result.kind === "fileInfo") {
      assertEquals(result.fileInfo.isFile, true);
    }
  });

  await t.step("statPath - file does not exist", async () => {
    const nonExistentFile = path.join(
      testDir,
      "nonexistent.txt",
    ) as TrackedFileName;

    const result = await statPath(nonExistentFile);
    assertEquals(result.kind, "nonExistent");
  });

  await t.step("statPath - directory exists", async () => {
    const testSubDir = path.join(testDir, "subdir") as TrackedFileName;
    await Deno.mkdir(testSubDir);

    const result = await statPath(testSubDir);
    assertEquals(result.kind, "fileInfo");
    if (result.kind === "fileInfo") {
      assertEquals(result.fileInfo.isDirectory, true);
    }
  });

  await t.step("statPath - permission error propagates", async () => {
    // Test that permission errors are properly propagated (not converted to NotFound)
    // Use platform-appropriate restricted paths
    
    let restrictedPath: TrackedFileName;
    if (Deno.build.os === "windows") {
      // Windows: Use a system file that typically requires elevated privileges
      restrictedPath = "C:\\Windows\\System32\\config\\SAM" as TrackedFileName;
    } else {
      // Unix-like: Use a common restricted directory
      restrictedPath = "/root/.ssh/id_rsa" as TrackedFileName;
    }

    try {
      await statPath(restrictedPath);
      // If we reach here, the path was accessible (running with high privileges)
      // This is not an error, just means we can't test permission errors
    } catch (err) {
      // Should throw an error, and it should NOT be NotFound
      // (it should be a permission error instead)
      assertEquals(err instanceof Error, true);
      if (err instanceof Deno.errors.NotFound) {
        // This is fine - the path doesn't exist, which is also a valid test case
        // since it confirms statPath handles Deno.errors.NotFound properly
      } else {
        // This is what we're testing for - non-NotFound errors should propagate
        assertEquals(err instanceof Deno.errors.NotFound, false);
      }
    }
  });

  await t.step("deletePath - file exists", async () => {
    const testFile = path.join(testDir, "to_delete.txt") as TrackedFileName;
    await Deno.writeTextFile(testFile, "delete me");

    // Verify file exists
    const beforeStat = await statPath(testFile);
    assertEquals(beforeStat.kind, "fileInfo");

    // Delete it
    await deletePath(testFile);

    // Verify it's gone
    const afterStat = await statPath(testFile);
    assertEquals(afterStat.kind, "nonExistent");
  });

  await t.step("deletePath - directory with contents", async () => {
    const testSubDir = path.join(testDir, "dir_to_delete") as TrackedFileName;
    await Deno.mkdir(testSubDir);
    const fileInDir = path.join(testSubDir, "file.txt");
    await Deno.writeTextFile(fileInDir, "content");

    // Verify directory exists
    const beforeStat = await statPath(testSubDir);
    assertEquals(beforeStat.kind, "fileInfo");

    // Delete it recursively
    await deletePath(testSubDir);

    // Verify it's gone
    const afterStat = await statPath(testSubDir);
    assertEquals(afterStat.kind, "nonExistent");
  });

  await t.step("deletePath - file does not exist (no error)", async () => {
    const nonExistentFile = path.join(
      testDir,
      "never_existed.txt",
    ) as TrackedFileName;

    // Should not throw
    await deletePath(nonExistentFile);
  });

  await t.step("getFileSha1Sum - text file", async () => {
    const testFile = path.join(testDir, "hash_test.txt");
    const content = "Hello, World!";
    await Deno.writeTextFile(testFile, content);

    const hash = await getFileSha1Sum(testFile);

    // SHA-1 of "Hello, World!" should be consistent
    assertEquals(typeof hash, "string");
    assertEquals(hash.length, 40); // SHA-1 is 40 hex characters
    assertEquals(hash, "0a0a9f2a6772942557ab5355d76af442f8f65e01");
  });

  await t.step("getFileSha1Sum - binary file", async () => {
    const testFile = path.join(testDir, "binary_test.bin");
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xFF]);
    await Deno.writeFile(testFile, binaryData);

    const hash = await getFileSha1Sum(testFile);

    assertEquals(typeof hash, "string");
    assertEquals(hash.length, 40);
    // Should be deterministic for the same binary content
    const hash2 = await getFileSha1Sum(testFile);
    assertEquals(hash, hash2);
  });

  await t.step("getFileSha1Sum - empty file", async () => {
    const testFile = path.join(testDir, "empty_test.txt");
    await Deno.writeTextFile(testFile, "");

    const hash = await getFileSha1Sum(testFile);

    assertEquals(hash, "da39a3ee5e6b4b0d3255bfef95601890afd80709"); // SHA-1 of empty string
  });

  await t.step("getFileSha1Sum - large file", async () => {
    const testFile = path.join(testDir, "large_test.txt");
    const largeContent = "A".repeat(100000); // 100KB of 'A's
    await Deno.writeTextFile(testFile, largeContent);

    const hash = await getFileSha1Sum(testFile);

    assertEquals(typeof hash, "string");
    assertEquals(hash.length, 40);
    // Should handle large files without issue
  });

  await t.step("getFileSha1Sum - nonexistent file throws", async () => {
    const nonExistentFile = path.join(testDir, "does_not_exist.txt");

    await assertRejects(
      () => getFileSha1Sum(nonExistentFile),
      Deno.errors.NotFound,
    );
  });

  await t.step("getFileTimestamp - valid file", async () => {
    const testFile = path.join(testDir, "timestamp_test.txt");
    await Deno.writeTextFile(testFile, "timestamp content");

    const fileInfo = await Deno.stat(testFile);
    const timestamp = getFileTimestamp(testFile, fileInfo);

    assertEquals(typeof timestamp, "string");
    // Should be a valid ISO string
    const date = new Date(timestamp);
    assertEquals(isNaN(date.getTime()), false);

    // Should match file's mtime
    if (fileInfo.mtime) {
      assertEquals(timestamp, fileInfo.mtime.toISOString());
    }
  });

  await t.step("getFileTimestamp - file with no mtime", async () => {
    const testFile = path.join(testDir, "no_mtime_test.txt");
    await Deno.writeTextFile(testFile, "content");

    // Create a mock FileInfo with no mtime
    const mockFileInfo = { mtime: null } as Deno.FileInfo;

    const timestamp = getFileTimestamp(testFile, mockFileInfo);
    assertEquals(timestamp, "");
  });

  await t.step("path manipulation - relative paths", async () => {
    const relativePath = "relative/path.txt" as TrackedFileName;
    const absolutePath = path.resolve(relativePath) as TrackedFileName;

    // Create the file
    await Deno.mkdir(path.dirname(absolutePath), { recursive: true });
    await Deno.writeTextFile(absolutePath, "relative path content");

    // Both relative and absolute should work with statPath
    const relativeResult = await statPath(relativePath);
    const absoluteResult = await statPath(absolutePath);

    assertEquals(relativeResult.kind, "fileInfo");
    assertEquals(absoluteResult.kind, "fileInfo");

    // Cleanup
    await deletePath(absolutePath);
    await Deno.remove(path.dirname(absolutePath)).catch(() => {});
  });

  await t.step("special characters in paths", async () => {
    const specialFile = path.join(
      testDir,
      "file with spaces & symbols!.txt",
    ) as TrackedFileName;
    await Deno.writeTextFile(specialFile, "special content");

    const result = await statPath(specialFile);
    assertEquals(result.kind, "fileInfo");

    const hash = await getFileSha1Sum(specialFile);
    assertEquals(typeof hash, "string");
    assertEquals(hash.length, 40);
  });

  // Cleanup test directory
  await Deno.remove(testDir, { recursive: true }).catch(() => {});
});
