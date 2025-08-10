import * as log from "@std/log";
import * as path from "@std/path";
import type {
  Timestamp,
  TrackedFileData,
  TrackedFileHash,
  TrackedFileName,
} from "../../interfaces/core/IManifestTypes.ts";
import {
  deletePath,
  getFileSha1Sum,
  getFileTimestamp,
  statPath,
  type StatResult,
} from "../../utils/filesystem.ts";
import type {
  IExecContext,
  ITask,
} from "../../interfaces/core/ICoreInterfaces.ts";

export type GetFileHash = (
  filename: TrackedFileName,
  stat: Deno.FileInfo,
) => Promise<TrackedFileHash> | TrackedFileHash;

export type GetFileTimestamp = (
  filename: TrackedFileName,
  stat: Deno.FileInfo,
) => Promise<Timestamp> | Timestamp;

/** User params for a tracked file */
export type FileParams = {
  /// File path
  path: string;

  /// Optional function for how to hash the file.   Defaults to the sha1 hash of the file contents.
  /// A file is out of date if the file timestamp and the hash are different than that in the task manifest
  getHash?: GetFileHash;

  /// Optional function for how to get the file timestamp.   Defaults to the actual file timestamp
  getTimestamp?: GetFileTimestamp;
};

export class TrackedFile {
  path: TrackedFileName = "";
  #getHash: GetFileHash;
  #getTimestamp: GetFileTimestamp;

  fromTask: ITask | null = null;

  constructor(fileParams: FileParams) {
    this.path = path.resolve(fileParams.path);
    this.#getHash = fileParams.getHash || getFileSha1Sum;
    this.#getTimestamp = fileParams.getTimestamp || getFileTimestamp;
  }

  private async stat(): Promise<StatResult> {
    log.getLogger("internal").info(`checking file ${this.path}`);
    return await statPath(this.path);
  }

  async delete(): Promise<void> {
    await deletePath(this.path);
  }

  async exists(statInput?: StatResult): Promise<boolean> {
    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }
    return statResult.kind === "fileInfo";
  }

  async getHash(statInput?: StatResult): Promise<TrackedFileHash> {
    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }
    if (statResult.kind !== "fileInfo") {
      return "";
    }

    log.getLogger("internal").info(`checking hash on ${this.path}`);
    return this.#getHash(this.path, statResult.fileInfo);
  }

  async getTimestamp(statInput?: StatResult): Promise<Timestamp> {
    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }
    if (statResult.kind !== "fileInfo") {
      return "";
    }
    return this.#getTimestamp(this.path, statResult.fileInfo);
  }

  /// whether this is up to date w.r.t. the given TrackedFileData
  async isUpToDate(
    _ctx: IExecContext,
    tData: TrackedFileData | undefined,
    statInput?: StatResult,
  ): Promise<boolean> {
    if (tData === undefined) {
      return false;
    }

    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }

    // On Windows, check hash first since timestamp caching can be unreliable
    if (Deno.build.os === "windows") {
      const hash = await this.getHash(statResult);
      return hash === tData.hash;
    }

    // On other platforms, check timestamp first (faster)
    const mtime = await this.getTimestamp(statResult);
    if (mtime === tData.timestamp) {
      return true;
    }
    const hash = await this.getHash(statResult);
    return hash === tData.hash;
  }

  /// Recalculate timestamp and hash data
  async getFileData(
    _ctx: IExecContext,
    statInput?: StatResult,
  ): Promise<TrackedFileData> {
    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }
    return {
      hash: await this.getHash(statResult),
      timestamp: await this.getTimestamp(statResult),
    };
  }

  /// return given tData if up to date or re-calculate
  async getFileDataOrCached(
    ctx: IExecContext,
    tData: TrackedFileData | undefined,
    statInput?: StatResult,
  ): Promise<{
    tData: TrackedFileData;
    upToDate: boolean;
  }> {
    let statResult = statInput;
    if (statResult === undefined) {
      statResult = await this.stat();
    }

    if (tData !== undefined && await this.isUpToDate(ctx, tData, statResult)) {
      return {
        tData,
        upToDate: true,
      };
    }
    return {
      tData: await this.getFileData(ctx, statResult),
      upToDate: false,
    };
  }

  setTask(t: ITask) {
    if (this.fromTask === null) {
      this.fromTask = t;
    } else {
      throw new Error(
        "Duplicate tasks generating TrackedFile as target - " + this.path,
      );
    }
  }

  getTask(): ITask | null {
    return this.fromTask;
  }
}

/** Generate a trackedfile for tracking */
export function file(fileParams: FileParams | string): TrackedFile {
  if (typeof fileParams === "string") {
    return new TrackedFile({ path: fileParams });
  }
  return new TrackedFile(fileParams);
}

export function trackFile(fileParams: FileParams | string): TrackedFile {
  return file(fileParams);
}

export function isTrackedFile(
  dep: unknown,
): dep is TrackedFile {
  return dep instanceof TrackedFile;
}
