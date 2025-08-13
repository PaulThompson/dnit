import * as path from "@std/path";

export async function createTempFile(
  content: string,
  fileName = "test_file.txt",
): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "dnit_test_" });
  const filePath = path.join(tempDir, fileName);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

export async function cleanup(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await Deno.remove(dir, { recursive: true });
}

