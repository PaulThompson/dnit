import { crypto } from "@std/crypto/crypto";
import type {
  Timestamp,
  TrackedFileHash,
  TrackedFileName,
} from "../core/types.ts";

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
  const data = await Deno.readFile(filename);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return hashHex;
}

export function getFileTimestamp(
  _filename: string,
  stat: Deno.FileInfo,
): Timestamp {
  const mtime = stat.mtime;
  return mtime?.toISOString() || "";
}
