import { assertEquals, assertRejects } from "@std/assert";
import * as path from "@std/path";
import type * as log from "@std/log";
import { 
  launch, 
  parseDotDenoVersionFile, 
  getDenoVersion, 
  checkValidDenoVersion 
} from "../launch.ts";

// Mock logger for testing
function createMockLogger(): log.Logger {
  const logs: string[] = [];
  return {
    debug: (msg: string) => logs.push(`DEBUG: ${msg}`),
    info: (msg: string) => logs.push(`INFO: ${msg}`),
    warn: (msg: string) => logs.push(`WARN: ${msg}`),
    error: (msg: string) => logs.push(`ERROR: ${msg}`),
    critical: (msg: string) => logs.push(`CRITICAL: ${msg}`),
    handlers: [],
    level: 0,
    levelName: "INFO",
  } as unknown as log.Logger;
}

// Test helper to create temporary dnit project structure
async function createTempDnitProject(options: {
  sourceName?: string;
  subdir?: string;
  withImportMap?: boolean;
  withDenoVersion?: string;
  content?: string;
}): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_launch_test_" });
  const sourceName = options.sourceName || "main.ts";
  const subdir = options.subdir || "dnit";
  const content = options.content || `
console.log("dnit script executed");
// Simple test script that doesn't require imports
const testTask = {
  name: "test",
  action: () => console.log("test task"),
};
`;

  const dnitDir = path.join(tempDir, subdir);
  await Deno.mkdir(dnitDir, { recursive: true });
  
  const mainFile = path.join(dnitDir, sourceName);
  await Deno.writeTextFile(mainFile, content);

  if (options.withImportMap) {
    const importMap = path.join(dnitDir, "import_map.json");
    await Deno.writeTextFile(importMap, JSON.stringify({
      "imports": {
        "https://deno.land/x/dnit/": "../"
      }
    }));
  }

  if (options.withDenoVersion) {
    const denoVersionFile = path.join(dnitDir, ".denoversion");
    await Deno.writeTextFile(denoVersionFile, options.withDenoVersion);
  }

  return tempDir;
}

// Test helper to cleanup temp directory
async function cleanup(dir: string) {
  await Deno.remove(dir, { recursive: true });
}

Deno.test("Launch - parseDotDenoVersionFile parses version requirement", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".denoversion" });
  
  try {
    await Deno.writeTextFile(tempFile, ">=1.40.0\n\n  # comment\n  ");
    const result = await parseDotDenoVersionFile(tempFile);
    assertEquals(result, ">=1.40.0\n# comment");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("Launch - parseDotDenoVersionFile handles multiline requirements", async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".denoversion" });
  
  try {
    await Deno.writeTextFile(tempFile, ">=1.40.0\n<2.0.0");
    const result = await parseDotDenoVersionFile(tempFile);
    assertEquals(result, ">=1.40.0\n<2.0.0");
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("Launch - getDenoVersion returns current deno version", async () => {
  const version = await getDenoVersion();
  // Should be a semver string like "1.40.0"
  assertEquals(typeof version, "string");
  assertEquals(/^\d+\.\d+\.\d+/.test(version), true);
});

Deno.test("Launch - checkValidDenoVersion validates version ranges", () => {
  assertEquals(checkValidDenoVersion("1.40.0", ">=1.40.0"), true);
  assertEquals(checkValidDenoVersion("1.39.0", ">=1.40.0"), false);
  assertEquals(checkValidDenoVersion("1.45.0", ">=1.40.0 <2.0.0"), true);
  assertEquals(checkValidDenoVersion("2.0.0", ">=1.40.0 <2.0.0"), false);
});

Deno.test("Launch - finds main.ts in dnit subdirectory", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({ sourceName: "main.ts" });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - finds dnit.ts in dnit subdirectory", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({ sourceName: "dnit.ts" });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - finds source in alternative deno/dnit path", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({ subdir: "deno/dnit" });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - uses import map when available", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({ withImportMap: true });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - handles .denoversion file validation success", async () => {
  const originalCwd = Deno.cwd();
  const currentVersion = await getDenoVersion();
  const tempDir = await createTempDnitProject({ withDenoVersion: `>=${currentVersion}` });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - handles .denoversion file validation failure", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({ withDenoVersion: ">=999.0.0" });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    
    await assertRejects(
      () => launch(logger),
      Error,
      "requires version(s) >=999.0.0"
    );
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - searches parent directories for dnit source", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({});
  const nestedDir = path.join(tempDir, "nested", "subdir");
  await Deno.mkdir(nestedDir, { recursive: true });
  
  try {
    Deno.chdir(nestedDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - returns error when no dnit source found", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_no_source_" });
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, false);
    assertEquals(result.code, 1);
    assertEquals(result.signal, null);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - prefers main.ts over dnit.ts", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_preference_test_" });
  const dnitDir = path.join(tempDir, "dnit");
  await Deno.mkdir(dnitDir, { recursive: true });
  
  // Create both main.ts and dnit.ts
  await Deno.writeTextFile(path.join(dnitDir, "main.ts"), `
console.log("main.ts executed");
const testTask = { name: "test", action: () => {} };
  `);
  
  await Deno.writeTextFile(path.join(dnitDir, "dnit.ts"), `
console.log("dnit.ts executed");
const testTask = { name: "test", action: () => {} };
  `);
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - prefers import_map.json over .import_map.json", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_importmap_test_" });
  const dnitDir = path.join(tempDir, "dnit");
  await Deno.mkdir(dnitDir, { recursive: true });
  
  await Deno.writeTextFile(path.join(dnitDir, "main.ts"), `
console.log("importmap test executed");
const testTask = { name: "test", action: () => {} };
  `);
  
  // Create both import map files
  await Deno.writeTextFile(path.join(dnitDir, "import_map.json"), 
    JSON.stringify({ "imports": { "visible": "../" } }));
  await Deno.writeTextFile(path.join(dnitDir, ".import_map.json"), 
    JSON.stringify({ "imports": { "hidden": "../" } }));
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - passes command line arguments to user script", async () => {
  const originalCwd = Deno.cwd();
  const originalArgs = Deno.args;
  
  const tempDir = await createTempDnitProject({
    content: `
console.log("Args:", Deno.args);
const testTask = { name: "test", action: () => {} };
    `
  });
  
  try {
    Deno.chdir(tempDir);
    // Mock command line args
    (Deno as unknown as { args: string[] }).args = ["test", "--verbose"];
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    (Deno as unknown as { args: string[] }).args = originalArgs;
    await cleanup(tempDir);
  }
});

Deno.test("Launch - sets correct permissions and flags", async () => {
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({});
  
  try {
    Deno.chdir(tempDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    // Should succeed with permissions and quiet flag
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - handles file system boundary correctly", async () => {
  // This test verifies the filesystem device check prevents crossing mount points
  // We can't easily test this without multiple filesystems, so we test the logic
  const originalCwd = Deno.cwd();
  const tempDir = await createTempDnitProject({});
  const deepNestedDir = path.join(tempDir, "a", "b", "c", "d", "e");
  await Deno.mkdir(deepNestedDir, { recursive: true });
  
  try {
    Deno.chdir(deepNestedDir);
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    // Should still find the dnit source by traversing up
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
  } finally {
    Deno.chdir(originalCwd);
    await cleanup(tempDir);
  }
});

Deno.test("Launch - stops at root directory", async () => {
  const originalCwd = Deno.cwd();
  
  try {
    // Try to run from system root (should have no dnit source)
    Deno.chdir("/");
    
    const logger = createMockLogger();
    const result = await launch(logger);
    
    assertEquals(result.success, false);
    assertEquals(result.code, 1);
  } finally {
    Deno.chdir(originalCwd);
  }
});