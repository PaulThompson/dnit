import { task, exec, log, utils, semver } from "./deps.ts";
import { TaskContext, file, runAlways } from "../dnit.ts";

import {
  requireCleanGit,
  fetchTags,
  gitLatestTag,
  gitLastCommitMessage,
} from "../utils/git.ts";
import { confirmation } from "../utils/io.ts";

const tagPrefix = "dnit-v";

const tag = task({
  name: "tag",
  description: "Run git tag",
  action: async (ctx: TaskContext) => {
    const current = await gitLatestTag(tagPrefix);

    type Args = {
      "major"?: true;
      "minor"?: true;
      "patch"?: true;
      "message"?: string;
      "origin"?: string;
      "dry-run"?: true;
    };
    const args: Args = ctx.args as Args;
    const increment: "major" | "minor" | "patch" = args.major
      ? "major"
      : (args.minor ? "minor" : ("patch"));
    const next = semver.inc(current, increment);

    const tagMessage = args.message || `Tag ${increment} to ${next}`;
    const tagName = `${tagPrefix}${next}`;
    const dryRun = args["dry-run"] || false;

    const origin = args.origin || `origin`;

    const gitLastCommit = await gitLastCommitMessage();
    console.log("Last commit: " + gitLastCommit);

    const conf = await confirmation(
      `Git tag and push ${tagMessage} tagName?`,
      false,
    );
    if (conf) {
      const cmds = dryRun ? ["echo"] : [];

      await utils.runConsole(
        cmds.concat(["git", "tag", "-a", "-m", tagMessage, tagName]),
      );
      await utils.runConsole(cmds.concat(["git", "push", origin, tagName]));
      log.info(
        `${
          dryRun ? "(dry-run) " : ""
        }Git tagged and pushed ${tagPrefix}${next}`,
      );
    } else {
      throw new Error("Aborted");
    }

    if (dryRun) {
      throw new Error("Dry run");
    }
  },
  deps: [
    requireCleanGit,
    fetchTags,
  ],
  uptodate: () => false,
});

const push = task({
  name: "push",
  description: "Run git push",
  action: async () => {
    await utils.runConsole(["git", "push", "origin", "main"]);
  },
  uptodate: () => false,
});

const genadl = task({
  name: "genadl",
  description: "Code generate from ADL definition",
  action: async () => {
    await utils.runConsole(["./tools/gen-adl.sh"]);
    await utils.runConsole(
      ["git", "apply", "./tools/0001-Revert-non-desired-gen-adl-edits.patch"],
    );
  },
  targets: [
    file({ path: "./adl-gen/dnit/manifest.ts" }),
  ],
  deps: [
    file({ path: "./adl/manifest.adl" }),
    file({ path: "./tools/0001-Revert-non-desired-gen-adl-edits.patch" }),
  ],
});

const updategenadlfix = task({
  name: "updategenadlfix",
  description: "Update the patch that fixes the generated code",
  action: async () => {
    await utils.runConsole(["./tools/gen-adl.sh"]);
    await utils.runConsole(["git","commit","-am","Generated adl"]);
    await utils.runConsole(["git","revert","HEAD","--no-edit"]);
    await utils.runConsole(["git","commit","--amend","-m","Revert non desired gen-adl edits"]);
    await utils.runConsole(["git","format-patch","-1","HEAD"]);
    await utils.runConsole(["mv","0001-Revert-non-desired-gen-adl-edits.patch","./tools"]);
    await utils.runConsole(["git","commit","-am","Updated gen-adl fix patch"]);
  },
  deps: [
    requireCleanGit,
  ],
  uptodate: runAlways
});

const tasks = [
  genadl,
  tag,
  push,
  updategenadlfix
];

exec(Deno.args, tasks)
  .then((result) => {
    if (!result.success) {
      Deno.exit(1);
    }
  });
