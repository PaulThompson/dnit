import { assertEquals } from "@std/assert";
import * as path from "@std/path";
import { findUserSource } from "../launch.ts";
import { createFileInDir, createTempDir } from "./utils.ts";

Deno.test("Discovery - finds main.ts in dnit subdirectory", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create dnit/main.ts
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("test");');

  const result = findUserSource(dirPath, null);

  assertEquals(result?.baseDir, path.resolve(dirPath));
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));
  assertEquals(result?.importmap, null);

  await cleanup();
});

Deno.test("Discovery - finds dnit.ts when no main.ts exists", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create dnit/dnit.ts (no main.ts)
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "dnit.ts", 'console.log("test");');

  const result = findUserSource(dirPath, null);

  assertEquals(result?.baseDir, path.resolve(dirPath));
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "dnit.ts")));
  assertEquals(result?.importmap, null);

  await cleanup();
});

Deno.test("Discovery - finds source in alternative deno/dnit path", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create deno/dnit/main.ts
  const denoDir = path.join(dirPath, "deno");
  const dnitDir = path.join(denoDir, "dnit");
  await Deno.mkdir(denoDir);
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("test");');

  const result = findUserSource(dirPath, null);

  assertEquals(result?.baseDir, path.resolve(dirPath));
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));
  assertEquals(result?.importmap, null);

  await cleanup();
});

Deno.test("Discovery - prefers main.ts over dnit.ts", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create both main.ts and dnit.ts
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("main");');
  await createFileInDir(dnitDir, "dnit.ts", 'console.log("dnit");');

  const result = findUserSource(dirPath, null);

  // Should prefer main.ts
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));

  await cleanup();
});

Deno.test("Discovery - prefers dnit/ over deno/dnit/ path", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create both dnit/main.ts and deno/dnit/main.ts
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("dnit");');

  const denoDir = path.join(dirPath, "deno");
  const denoDnitDir = path.join(denoDir, "dnit");
  await Deno.mkdir(denoDir);
  await Deno.mkdir(denoDnitDir);
  await createFileInDir(denoDnitDir, "main.ts", 'console.log("deno/dnit");');

  const result = findUserSource(dirPath, null);

  // Should prefer dnit/ over deno/dnit/
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));

  await cleanup();
});

Deno.test("Discovery - searches parent directories", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create dnit/main.ts in root
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("test");');

  // Create a nested subdirectory
  const subDir = path.join(dirPath, "subdir");
  await Deno.mkdir(subDir);

  // Search from subdirectory - should find dnit source in parent
  const result = findUserSource(subDir, null);

  assertEquals(result?.baseDir, path.resolve(dirPath));
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));

  await cleanup();
});

Deno.test("Discovery - searches multiple parent levels", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create dnit/main.ts in root
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "main.ts", 'console.log("test");');

  // Create deeply nested subdirectory
  const deepDir = path.join(dirPath, "a", "b", "c");
  await Deno.mkdir(deepDir, { recursive: true });

  // Search from deep subdirectory - should find dnit source in ancestor
  const result = findUserSource(deepDir, null);

  assertEquals(result?.baseDir, path.resolve(dirPath));
  assertEquals(result?.dnitDir, path.resolve(dnitDir));
  assertEquals(result?.mainSrc, path.resolve(path.join(dnitDir, "main.ts")));

  await cleanup();
});

Deno.test("Discovery - returns null when no dnit source found", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create empty directory structure without any dnit sources
  const subDir = path.join(dirPath, "subdir");
  await Deno.mkdir(subDir);

  const result = findUserSource(subDir, null);

  assertEquals(result, null);

  await cleanup();
});

Deno.test("Discovery - returns null when directory doesn't exist", () => {
  const nonExistentDir = "/path/that/does/not/exist";

  // Should handle non-existent directory gracefully
  try {
    const result = findUserSource(nonExistentDir, null);
    // If it doesn't throw, it should return null
    assertEquals(result, null);
  } catch (error) {
    // It's also acceptable to throw an error for non-existent paths
    assertEquals(error instanceof Deno.errors.NotFound, true);
  }
});

Deno.test("Discovery - handles directory with no source files", async () => {
  const { dirPath, cleanup } = await createTempDir();

  // Create dnit directory but no source files
  const dnitDir = path.join(dirPath, "dnit");
  await Deno.mkdir(dnitDir);
  await createFileInDir(dnitDir, "README.md", "# No source files here");

  const result = findUserSource(dirPath, null);

  assertEquals(result, null);

  await cleanup();
});
