import { run, runConsole } from "./process.ts";
import { type Task, task } from "../core/task.ts";
import type { TaskContext } from "../core/TaskContext.ts";

export async function gitLatestTag(tagPrefix: string): Promise<string> {
  const describeStr = await run(
    ["git", "describe", "--tags", "--match", `${tagPrefix}*`, "--abbrev=0"],
  );
  const find = new RegExp(`${tagPrefix}(.*)`);
  return describeStr.trim().replace(find, "$1");
}

export function gitLastCommitMessage(): Promise<string> {
  return run(["git", "log", "--pretty=oneline", "--abbrev-commit", "-1"]);
}

export async function gitIsClean(): Promise<boolean> {
  const gitStatus = await run(["git", "status", "--porcelain"]);
  return gitStatus.length === 0;
}

export const fetchTags: Task = task({
  name: "fetch-tags",
  description: "Git remote fetch tags",
  action: async () => {
    await runConsole(["git", "fetch", "--tags"]);
  },
  uptodate: () => false,
});

export const requireCleanGit: Task = task({
  name: "git-is-clean",
  description: "Check git status is clean",
  action: async (ctx: TaskContext) => {
    type Args = {
      "ignore-unclean"?: true;
    };
    const args: Args = ctx.args as Args;
    if (args["ignore-unclean"]) {
      return;
    }
    if (!await gitIsClean()) {
      throw new Error("Unclean git status");
    }
  },
  uptodate: () => false,
});
