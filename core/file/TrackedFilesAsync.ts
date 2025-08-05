import type { TrackedFile } from "./TrackedFile.ts";

export type GenTrackedFiles = () => Promise<TrackedFile[]> | TrackedFile[];

export class TrackedFilesAsync {
  kind: "trackedfilesasync" = "trackedfilesasync";

  constructor(public gen: GenTrackedFiles) {
  }

  async getTrackedFiles(): Promise<TrackedFile[]> {
    return await this.gen();
  }
}

export function asyncFiles(gen: GenTrackedFiles): TrackedFilesAsync {
  return new TrackedFilesAsync(gen);
}
