import { assertEquals, assertExists } from "@std/assert";
import * as path from "@std/path";
import * as fs from "@std/fs";
import { Manifest } from "../manifest.ts";
import { TaskManifest } from "../core/taskManifest.ts";
import type { TaskData, TaskName } from "../interfaces/core/IManifestTypes.ts";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_" });
  try {
    return await fn(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

Deno.test("Manifest - constructor creates filename path", () => {
  const manifest = new Manifest("/test/dir");
  assertEquals(manifest.filename, path.join("/test/dir", ".manifest.json"));
});

Deno.test("Manifest - constructor with custom filename", () => {
  const manifest = new Manifest("/test/dir", "custom.json");
  assertEquals(manifest.filename, path.join("/test/dir", "custom.json"));
});

Deno.test("Manifest - load non-existent file", async () => {
  await withTempDir(async (tempDir) => {
    const manifest = new Manifest(tempDir);
    await manifest.load();
    assertEquals(Object.keys(manifest.tasks).length, 0);
  });
});

Deno.test("Manifest - save and load empty manifest", async () => {
  await withTempDir(async (tempDir) => {
    const manifest = new Manifest(tempDir);
    await manifest.save();

    assertExists(await fs.exists(manifest.filename));

    const loadedManifest = new Manifest(tempDir);
    await loadedManifest.load();
    assertEquals(Object.keys(loadedManifest.tasks).length, 0);
  });
});

Deno.test("Manifest - save and load with task data", async () => {
  await withTempDir(async (tempDir) => {
    const manifest = new Manifest(tempDir);
    const taskData: TaskData = {
      lastExecution: "2023-01-01T00:00:00.000Z",
      trackedFiles: {
        "test.txt": {
          hash: "abc123",
          timestamp: "2023-01-01T00:00:00.000Z",
        },
      },
    };

    manifest.tasks["testTask"] = new TaskManifest(taskData);
    await manifest.save();

    const loadedManifest = new Manifest(tempDir);
    await loadedManifest.load();

    assertExists(loadedManifest.tasks["testTask"]);
    assertEquals(
      loadedManifest.tasks["testTask"].lastExecution,
      "2023-01-01T00:00:00.000Z",
    );
    assertEquals(
      loadedManifest.tasks["testTask"].getFileData("test.txt"),
      {
        hash: "abc123",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
    );
  });
});

Deno.test("Manifest - load creates parent directory if needed", async () => {
  await withTempDir(async (tempDir) => {
    const nestedDir = path.join(tempDir, "nested", "deep");
    const manifest = new Manifest(nestedDir);
    await manifest.save();

    assertExists(await fs.exists(manifest.filename));
    assertExists(await fs.exists(nestedDir));
  });
});

Deno.test("Manifest - load invalid JSON creates fresh manifest", async () => {
  await withTempDir(async (tempDir) => {
    const manifestPath = path.join(tempDir, ".manifest.json");
    await Deno.writeTextFile(manifestPath, "{ invalid json");

    const manifest = new Manifest(tempDir);
    await manifest.load();

    assertEquals(Object.keys(manifest.tasks).length, 0);

    // Should have written a fresh manifest
    const content = await Deno.readTextFile(manifestPath);
    const parsed = JSON.parse(content);
    assertEquals(parsed.tasks, {});
  });
});

Deno.test("Manifest - load invalid schema creates fresh manifest", async () => {
  await withTempDir(async (tempDir) => {
    const manifestPath = path.join(tempDir, ".manifest.json");
    await Deno.writeTextFile(
      manifestPath,
      JSON.stringify({
        invalidField: "should not be here",
        tasks: "should be object not string",
      }),
    );

    const manifest = new Manifest(tempDir);
    await manifest.load();

    assertEquals(Object.keys(manifest.tasks).length, 0);

    // Should have written a fresh manifest
    const content = await Deno.readTextFile(manifestPath);
    const parsed = JSON.parse(content);
    assertEquals(parsed.tasks, {});
  });
});

Deno.test("Manifest - save creates valid JSON structure", async () => {
  await withTempDir(async (tempDir) => {
    const manifest = new Manifest(tempDir);
    const taskData: TaskData = {
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

    manifest.tasks["task1"] = new TaskManifest(taskData);
    manifest.tasks["task2"] = new TaskManifest({
      lastExecution: null,
      trackedFiles: {},
    });

    await manifest.save();

    const content = await Deno.readTextFile(manifest.filename);
    const parsed = JSON.parse(content);

    assertEquals(Object.keys(parsed.tasks).length, 2);
    assertEquals(parsed.tasks.task1.lastExecution, "2023-01-01T00:00:00.000Z");
    assertEquals(parsed.tasks.task1.trackedFiles["file1.txt"].hash, "hash1");
    assertEquals(parsed.tasks.task2.lastExecution, null);
    assertEquals(Object.keys(parsed.tasks.task2.trackedFiles).length, 0);
  });
});

Deno.test("Manifest - multiple save/load cycles preserve data", async () => {
  await withTempDir(async (tempDir) => {
    const manifest1 = new Manifest(tempDir);
    manifest1.tasks["test"] = new TaskManifest({
      lastExecution: "2023-01-01T00:00:00.000Z",
      trackedFiles: {
        "file.txt": {
          hash: "original",
          timestamp: "2023-01-01T00:00:00.000Z",
        },
      },
    });
    await manifest1.save();

    const manifest2 = new Manifest(tempDir);
    await manifest2.load();
    manifest2.tasks["test"].setFileData("file.txt", {
      hash: "updated",
      timestamp: "2023-01-01T00:00:01.000Z",
    });
    await manifest2.save();

    const manifest3 = new Manifest(tempDir);
    await manifest3.load();

    const fileData = manifest3.tasks["test"].getFileData(
      "file.txt",
    );
    assertEquals(fileData?.hash, "updated");
    assertEquals(fileData?.timestamp, "2023-01-01T00:00:01.000Z");
  });
});

Deno.test("Manifest - handles empty tasks object", async () => {
  await withTempDir(async (tempDir) => {
    const manifestPath = path.join(tempDir, ".manifest.json");
    await Deno.writeTextFile(manifestPath, JSON.stringify({ tasks: {} }));

    const manifest = new Manifest(tempDir);
    await manifest.load();

    assertEquals(Object.keys(manifest.tasks).length, 0);
  });
});

Deno.test("Manifest - concurrent access simulation", async () => {
  await withTempDir(async (tempDir) => {
    const manifest1 = new Manifest(tempDir);
    const manifest2 = new Manifest(tempDir);

    // Simulate concurrent writes
    const promises = [
      (async () => {
        manifest1.tasks["task1"] = new TaskManifest({
          lastExecution: "2023-01-01T00:00:00.000Z",
          trackedFiles: {},
        });
        await manifest1.save();
      })(),
      (async () => {
        await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
        manifest2.tasks["task2"] = new TaskManifest({
          lastExecution: "2023-01-01T00:00:01.000Z",
          trackedFiles: {},
        });
        await manifest2.save();
      })(),
    ];

    await Promise.all(promises);

    // Last write wins - manifest2 should have overwritten manifest1
    const finalManifest = new Manifest(tempDir);
    await finalManifest.load();

    // Only task2 should remain (last write wins)
    assertExists(finalManifest.tasks["task2"]);
    assertEquals(Object.keys(finalManifest.tasks).length, 1);
  });
});
