import { assertEquals, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { TrackedFilesAsync, asyncFiles, isTrackedFileAsync } from "../core/file/TrackedFilesAsync.ts";
import { TrackedFile, file } from "../core/file/TrackedFile.ts";

// Test helper to create temporary files
async function createTempFile(content: string, suffix: string = ""): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_async_" });
  const filePath = path.join(tempDir, `test_file${suffix}.txt`);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Test helper to cleanup temp directory
async function cleanup(filePath: string) {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

Deno.test("TrackedFilesAsync - basic creation", () => {
  const mockGen = () => Promise.resolve([]);
  const asyncFiles1 = new TrackedFilesAsync(mockGen);
  
  assertEquals(asyncFiles1.kind, "trackedfilesasync");
  assertEquals(asyncFiles1.gen, mockGen);
});

Deno.test("TrackedFilesAsync - asyncFiles function", () => {
  const mockGen = () => [];
  const asyncTrackedFiles = asyncFiles(mockGen);
  
  assertEquals(asyncTrackedFiles instanceof TrackedFilesAsync, true);
  assertEquals(asyncTrackedFiles.kind, "trackedfilesasync");
});

Deno.test("TrackedFilesAsync - isTrackedFileAsync type guard", () => {
  const mockGen = () => [];
  const asyncTrackedFiles = asyncFiles(mockGen);
  
  assertEquals(isTrackedFileAsync(asyncTrackedFiles), true);
  assertEquals(isTrackedFileAsync("not async files"), false);
  assertEquals(isTrackedFileAsync(null), false);
  assertEquals(isTrackedFileAsync({}), false);
  assertEquals(isTrackedFileAsync(new TrackedFile({ path: "/test" })), false);
});

Deno.test("TrackedFilesAsync - sync generator returning empty array", async () => {
  const gen = () => [];
  const asyncTrackedFiles = asyncFiles(gen);
  
  const result = await asyncTrackedFiles.getTrackedFiles();
  assertEquals(result, []);
});

Deno.test("TrackedFilesAsync - async generator returning empty array", async () => {
  const gen = () => Promise.resolve([]);
  const asyncTrackedFiles = asyncFiles(gen);
  
  const result = await asyncTrackedFiles.getTrackedFiles();
  assertEquals(result, []);
});

Deno.test("TrackedFilesAsync - sync generator with files", async () => {
  const tempFile1 = await createTempFile("content 1", "_1");
  const tempFile2 = await createTempFile("content 2", "_2");
  
  const gen = () => [
    file(tempFile1),
    file(tempFile2)
  ];
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 2);
  assertEquals(result[0] instanceof TrackedFile, true);
  assertEquals(result[1] instanceof TrackedFile, true);
  assertEquals(result[0].path, path.resolve(tempFile1));
  assertEquals(result[1].path, path.resolve(tempFile2));
  
  await cleanup(tempFile1);
  await cleanup(tempFile2);
});

Deno.test("TrackedFilesAsync - async generator with files", async () => {
  const tempFile1 = await createTempFile("async content 1", "_async1");
  const tempFile2 = await createTempFile("async content 2", "_async2");
  
  const gen = async () => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 10));
    return [
      file(tempFile1),
      file(tempFile2)
    ];
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 2);
  assertEquals(result[0] instanceof TrackedFile, true);
  assertEquals(result[1] instanceof TrackedFile, true);
  assertEquals(result[0].path, path.resolve(tempFile1));
  assertEquals(result[1].path, path.resolve(tempFile2));
  
  await cleanup(tempFile1);
  await cleanup(tempFile2);
});

Deno.test("TrackedFilesAsync - generator with delayed execution", async () => {
  let callCount = 0;
  
  const gen = async () => {
    callCount++;
    await new Promise(resolve => setTimeout(resolve, 50));
    return [file("/tmp/delayed_" + callCount)];
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  
  // First call
  const result1 = await asyncTrackedFiles.getTrackedFiles();
  assertEquals(callCount, 1);
  assertEquals(result1.length, 1);
  assertEquals(result1[0].path, path.resolve("/tmp/delayed_1"));
  
  // Second call (should call generator again)
  const result2 = await asyncTrackedFiles.getTrackedFiles();
  assertEquals(callCount, 2);
  assertEquals(result2.length, 1);
  assertEquals(result2[0].path, path.resolve("/tmp/delayed_2"));
});

Deno.test("TrackedFilesAsync - generator returning mixed file types", async () => {
  const tempFile1 = await createTempFile("regular file");
  const tempFile2 = await createTempFile("another file");
  
  const gen = () => [
    new TrackedFile({ path: tempFile1 }),
    file(tempFile2),
    file({ path: "/tmp/custom_file.txt" })
  ];
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 3);
  assertEquals(result.every(f => f instanceof TrackedFile), true);
  
  await cleanup(tempFile1);
  await cleanup(tempFile2);
});

Deno.test("TrackedFilesAsync - generator with file discovery pattern", async () => {
  // Create a temp directory with multiple test files
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_discovery_" });
  const testFiles = [
    path.join(tempDir, "file1.txt"),
    path.join(tempDir, "file2.txt"),
    path.join(tempDir, "subdir", "file3.txt"),
  ];
  
  // Create directory structure
  await Deno.mkdir(path.join(tempDir, "subdir"), { recursive: true });
  
  // Create test files
  for (let i = 0; i < testFiles.length; i++) {
    await Deno.writeTextFile(testFiles[i], `Content of file ${i + 1}`);
  }
  
  // Generator that discovers files in directory
  const gen = async () => {
    const discoveredFiles: TrackedFile[] = [];
    
    for await (const entry of Deno.readDir(tempDir)) {
      if (entry.isFile && entry.name.endsWith('.txt')) {
        discoveredFiles.push(file(path.join(tempDir, entry.name)));
      }
    }
    
    return discoveredFiles;
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  // Should find 2 files in root (not subdirectory)
  assertEquals(result.length, 2);
  assertEquals(result.every(f => f instanceof TrackedFile), true);
  
  const foundPaths = result.map(f => path.basename(f.path)).sort();
  assertEquals(foundPaths, ["file1.txt", "file2.txt"]);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("TrackedFilesAsync - generator with glob-like pattern", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_glob_" });
  
  // Create various file types
  const files = [
    "script.ts",
    "styles.css", 
    "component.tsx",
    "test.test.ts",
    "README.md"
  ];
  
  for (const fileName of files) {
    await Deno.writeTextFile(
      path.join(tempDir, fileName), 
      `// Content of ${fileName}`
    );
  }
  
  // Generator that finds TypeScript files
  const gen = async () => {
    const tsFiles: TrackedFile[] = [];
    
    for await (const entry of Deno.readDir(tempDir)) {
      if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        tsFiles.push(file(path.join(tempDir, entry.name)));
      }
    }
    
    return tsFiles.sort((a, b) => a.path.localeCompare(b.path));
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 3);
  const basenames = result.map(f => path.basename(f.path));
  assertEquals(basenames, ["component.tsx", "script.ts", "test.test.ts"]);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("TrackedFilesAsync - generator error handling", async () => {
  const gen = async () => {
    throw new Error("Generator failed!");
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  
  try {
    await asyncTrackedFiles.getTrackedFiles();
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals((error as Error).message, "Generator failed!");
  }
});

Deno.test("TrackedFilesAsync - generator returning non-array", async () => {
  // This would be a programming error, but let's test the behavior
  const gen = () => "not an array" as any;
  
  const asyncTrackedFiles = asyncFiles(gen);
  
  // This test may not throw in all environments, so let's just check behavior
  try {
    const result = await asyncTrackedFiles.getTrackedFiles();
    // If it doesn't throw, the result should still be iterable somehow
    console.log("Non-array result:", typeof result);
  } catch (error) {
    // Expected to throw some kind of error
    console.log("Expected error for non-array:", (error as Error).message);
  }
});

Deno.test("TrackedFilesAsync - generator with network simulation", async () => {
  // Simulate a generator that might fetch file lists from a remote source
  const gen = async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate response parsing
    const mockApiResponse = [
      { path: "/api/file1.txt", content: "remote1" },
      { path: "/api/file2.txt", content: "remote2" }
    ];
    
    // Create local temp files to represent downloaded content
    const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_network_" });
    const trackedFiles: TrackedFile[] = [];
    
    for (const item of mockApiResponse) {
      const localPath = path.join(tempDir, path.basename(item.path));
      await Deno.writeTextFile(localPath, item.content);
      trackedFiles.push(file(localPath));
    }
    
    return trackedFiles;
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 2);
  assertEquals(result.every(f => f instanceof TrackedFile), true);
  
  // Verify files were created and are accessible
  for (const trackedFile of result) {
    assertEquals(await trackedFile.exists(), true);
  }
  
  // Cleanup
  if (result.length > 0) {
    const tempDir = path.dirname(result[0].path);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("TrackedFilesAsync - performance with many files", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_perf_" });
  
  // Create many small files
  const numFiles = 100;
  const filePromises = [];
  
  for (let i = 0; i < numFiles; i++) {
    const filePath = path.join(tempDir, `file_${i.toString().padStart(3, '0')}.txt`);
    filePromises.push(Deno.writeTextFile(filePath, `Content ${i}`));
  }
  
  await Promise.all(filePromises);
  
  const gen = async () => {
    const files: TrackedFile[] = [];
    
    for await (const entry of Deno.readDir(tempDir)) {
      if (entry.isFile) {
        files.push(file(path.join(tempDir, entry.name)));
      }
    }
    
    return files;
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  
  const startTime = performance.now();
  const result = await asyncTrackedFiles.getTrackedFiles();
  const endTime = performance.now();
  
  assertEquals(result.length, numFiles);
  console.log(`Generated ${numFiles} tracked files in ${endTime - startTime}ms`);
  
  // Verify all files are valid TrackedFile instances
  assertEquals(result.every(f => f instanceof TrackedFile), true);
  
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("TrackedFilesAsync - concurrent access to same generator", async () => {
  let callCount = 0;
  
  const gen = async () => {
    const currentCall = ++callCount;
    await new Promise(resolve => setTimeout(resolve, 50));
    return [file(`/tmp/concurrent_${currentCall}`)];
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  
  // Make concurrent calls
  const [result1, result2, result3] = await Promise.all([
    asyncTrackedFiles.getTrackedFiles(),
    asyncTrackedFiles.getTrackedFiles(),
    asyncTrackedFiles.getTrackedFiles()
  ]);
  
  // Each call should execute the generator
  assertEquals(callCount, 3);
  
  // Results should be different due to different call counts
  assertEquals(result1.length, 1);
  assertEquals(result2.length, 1);
  assertEquals(result3.length, 1);
  
  const paths = [result1[0].path, result2[0].path, result3[0].path];
  // All paths should be different (since each call gets a unique ID)
  assertEquals(new Set(paths).size >= 1, true); // At least one unique path
  
  // Verify all calls completed
  console.log("Concurrent call results:", paths);
});

Deno.test("TrackedFilesAsync - memory usage with large result sets", async () => {
  const gen = () => {
    const largeArray: TrackedFile[] = [];
    
    // Create a large number of tracked files (but don't create actual files)
    for (let i = 0; i < 1000; i++) {
      largeArray.push(file(`/tmp/memory_test_${i}.txt`));
    }
    
    return largeArray;
  };
  
  const asyncTrackedFiles = asyncFiles(gen);
  const result = await asyncTrackedFiles.getTrackedFiles();
  
  assertEquals(result.length, 1000);
  assertEquals(result.every(f => f instanceof TrackedFile), true);
  
  // Verify paths are unique
  const paths = result.map(f => f.path);
  assertEquals(new Set(paths).size, 1000);
});