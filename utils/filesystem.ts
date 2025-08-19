import { crypto } from "@std/crypto/crypto";
import { encodeHex } from "@std/encoding";
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
  const file = await Deno.open(filename, { read: true });
  const hashBuffer = await crypto.subtle.digest("SHA-1", file.readable);
  return encodeHex(hashBuffer);
}

export function getFileTimestamp(
  _filename: string,
  stat: Deno.FileInfo,
): Timestamp {
  const mtime = stat.mtime;
  return mtime?.toISOString() || "";
}
