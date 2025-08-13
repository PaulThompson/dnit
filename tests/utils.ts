import * as path from "@std/path";

export async function createTempDir(): Promise<{ dirPath: string; cleanup: () => Promise<void> }> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_" });
  
  return {
    dirPath: tempDir,
    cleanup: async () => {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (err) {
        // Ignore NotFound errors - directory may already be cleaned up
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    },
  };
}

export async function createFileInDir(
  dirPath: string,
  fileName: string,
  content: string,
): Promise<string> {
  const filePath = path.join(dirPath, fileName);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

