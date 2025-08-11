#!/usr/bin/env deno run -A

import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import { execBasic, task, type TrackedFile, trackFile } from "./mod.ts";
import { Manifest } from "./manifest.ts";

/**
 * Debug script to test Windows-specific timing issues with file modification detection
 */

async function debugTimingIssue() {
  console.log("=== Debug Windows Timing Issue ===");
  console.log("Platform:", Deno.build.os);
  console.log("Arch:", Deno.build.arch);

  const testDir = path.join(".debug", crypto.randomUUID());
  await Deno.mkdir(testDir, { recursive: true });

  console.log("Test directory:", testDir);

  const tasksDone: { [key: string]: boolean } = {};

  const testFile: TrackedFile = trackFile({
    path: path.join(testDir, "testFile.txt"),
  });

  console.log("Test file path:", testFile.path);

  // Write initial content
  await Deno.writeTextFile(testFile.path, crypto.randomUUID());
  console.log("Initial file created");

  // Get initial file stats
  const initialStat = await Deno.stat(testFile.path);
  console.log("Initial mtime:", initialStat.mtime?.toISOString());
  console.log("Initial size:", initialStat.size);

  const initialHash = await testFile.getHash();
  const initialTimestamp = await testFile.getTimestamp();
  console.log("Initial hash:", initialHash);
  console.log("Initial timestamp:", initialTimestamp);

  const taskA = task({
    name: "taskA",
    description: "taskA",
    action: () => {
      console.log("taskA executing");
      tasksDone["taskA"] = true;
    },
    deps: [testFile],
  });

  // Setup: share manifest to simulate independent runs
  const manifest = new Manifest("");

  console.log("\n=== First execution (should run) ===");
  {
    const ctx = await execBasic([], [taskA], manifest);

    // run once beforehand to setup manifest
    await ctx.getTaskByName("taskA")?.exec(ctx);
    assertEquals(tasksDone["taskA"], true);
    console.log("First run completed, taskA executed:", tasksDone["taskA"]);
    tasksDone["taskA"] = false; // clear to reset
  }

  console.log("\n=== Second execution (should not run - up to date) ===");
  {
    const ctx = await execBasic([], [taskA], manifest);

    // Check file data before execution
    const fileDataBefore = await testFile.getFileData();
    console.log("File data before second run:");
    console.log("  Hash:", fileDataBefore.hash);
    console.log("  Timestamp:", fileDataBefore.timestamp);

    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    console.log("Second run completed, taskA executed:", tasksDone["taskA"]);

    if (tasksDone["taskA"] !== false) {
      console.log("ERROR: Task ran when it should have been up-to-date!");
      // Let's debug what happened
      const manifestData = manifest.tasks["taskA"];
      console.log("Manifest data:");
      console.log("  Last execution:", manifestData?.lastExecution);
      console.log(
        "  Tracked files:",
        Object.keys(manifestData?.trackedFiles || {}),
      );

      const fileDataInManifest = manifestData?.trackedFiles[testFile.path];
      if (fileDataInManifest) {
        console.log("  File data in manifest:");
        console.log("    Hash:", fileDataInManifest.hash);
        console.log("    Timestamp:", fileDataInManifest.timestamp);
      }

      const currentFileData = await testFile.getFileData();
      console.log("  Current file data:");
      console.log("    Hash:", currentFileData.hash);
      console.log("    Timestamp:", currentFileData.timestamp);

      console.log(
        "  Hash match:",
        fileDataInManifest?.hash === currentFileData.hash,
      );
      console.log(
        "  Timestamp match:",
        fileDataInManifest?.timestamp === currentFileData.timestamp,
      );
    }

    assertEquals(
      tasksDone["taskA"],
      false,
      "Task should not run - should be up to date",
    );
  }

  console.log("\n=== Third execution after file modification (should run) ===");
  {
    // Wait a bit to ensure timestamp changes
    console.log("Waiting for timestamp precision...");
    await new Promise((resolve) => setTimeout(resolve, 50)); // Wait 50ms

    tasksDone["taskA"] = false;
    const newContent = crypto.randomUUID();
    console.log("Writing new content:", newContent);
    await Deno.writeTextFile(testFile.path, newContent);

    // Check new file stats
    const newStat = await Deno.stat(testFile.path);
    console.log("New mtime:", newStat.mtime?.toISOString());
    console.log("New size:", newStat.size);
    console.log(
      "Mtime changed:",
      initialStat.mtime?.getTime() !== newStat.mtime?.getTime(),
    );

    const newHash = await testFile.getHash();
    const newTimestamp = await testFile.getTimestamp();
    console.log("New hash:", newHash);
    console.log("New timestamp:", newTimestamp);
    console.log("Hash changed:", initialHash !== newHash);
    console.log("Timestamp changed:", initialTimestamp !== newTimestamp);

    const ctx = await execBasic([], [taskA], manifest);

    // Test: Run taskA again
    await ctx.getTaskByName("taskA")?.exec(ctx);
    console.log("Third run completed, taskA executed:", tasksDone["taskA"]);
    assertEquals(
      tasksDone["taskA"],
      true,
      "Task should run - file was modified",
    );
  }

  await Deno.remove(testDir, { recursive: true });
  console.log("\n=== Test completed successfully ===");
}

if (import.meta.main) {
  await debugTimingIssue();
}
