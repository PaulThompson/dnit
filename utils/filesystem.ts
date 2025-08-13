import { crypto } from "@std/crypto/crypto";
import { Sha1 } from "@std/crypto/sha1";
import type {
  Timestamp,
  TrackedFileHash,
  TrackedFileName,
} from "../interfaces/core/IManifestTypes.ts";

export type StatResult =
  | {
    kind: "fileInfo";
    fileInfo: Deno.FileInfo;
  }
  | {
    kind: "nonExistent";
  };

export async function statPath(path: TrackedFileName): Promise<StatResult> {
  try {
    const fileInfo = await Deno.stat(path);
    return {
      kind: "fileInfo",
      fileInfo,
    };
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return {
        kind: "nonExistent",
      };
    }
    throw err;
  }
}

export async function deletePath(path: TrackedFileName): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (err) {
    // Ignore NotFound errors
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }
}

export async function getFileSha1Sum(
  filename: string,
): Promise<TrackedFileHash> {
  const stat = await Deno.stat(filename);
  const fileSizeThreshold = 1024 * 1024; // 1MB
  const hasher = new Sha1();

  if (stat.size < fileSizeThreshold) {
    const data = await Deno.readFile(filename);
    hasher.update(data);
    return hasher.hex();
  }

  // Use chunked approach for large files
  const file = await Deno.open(filename, { read: true });
  const chunkSize = 64 * 1024; // 64KB chunks
  const buffer = new Uint8Array(chunkSize);

  try {
    let bytesRead = 0;
    while ((bytesRead = await file.read(buffer)) !== null) {
      hasher.update(buffer.slice(0, bytesRead));
    }
  } finally {
    file.close();
  }

  return hasher.hex();
}

export function getFileTimestamp(
  _filename: string,
  stat: Deno.FileInfo,
): Timestamp {
  const mtime = stat.mtime;
  return mtime?.toISOString() || "";
}
