import {
  type cli,
  file,
  main,
  runAlways,
  semver,
  task,
  type TaskContext,
  utils,
} from "./deps.ts";

import {
  fetchTags,
  gitLastCommitMessage,
  gitLatestTag,
  requireCleanGit,
} from "../utils/git.ts";
import { fs } from "../deps.ts";
import { runConsole } from "../utils.ts";

const tagPrefix = "dnit-v";

async function getNextTagVersion(args: cli.Args): Promise<string | null> {
  const current = await gitLatestTag(tagPrefix);

  type Args = {
    "major"?: true;
    "minor"?: true;
    "patch"?: true;
  };
  const xargs: Args = args as Args;
  const increment: "major" | "minor" | "patch" = args.major
    ? "major"
    : (xargs.minor ? "minor" : ("patch"));
  const next = semver.format(
    semver.increment(semver.parse(current), increment),
  );
  return next;
}

const tag = task({
  name: "tag",
  description: "Run git tag",
  action: async (ctx: TaskContext) => {
    type Args = {
      "major"?: true;
      "minor"?: true;
      "patch"?: true;
      "message"?: string;
      "origin"?: string;
      "dry-run"?: true;
    };

    const next = await getNextTagVersion(ctx.args);

    const args: Args = ctx.args as Args;
    const increment: "major" | "minor" | "patch" = args.major
      ? "major"
      : (args.minor ? "minor" : ("patch"));

    const tagMessage = args.message || `Tag ${increment} to ${next}`;
    const tagName = `${tagPrefix}${next}`;
    const dryRun = args["dry-run"] || false;

    const origin = args.origin || `origin`;

    const gitLastCommit = await gitLastCommitMessage();
    console.log("Last commit: " + gitLastCommit);

    const conf = confirm(
      `Git tag and push ${tagName} with message: ${tagMessage}?`,
    );
    if (conf) {
      const cmds = dryRun ? ["echo"] : [];

      await utils.runConsole(
        cmds.concat(["git", "tag", "-a", "-m", tagMessage, tagName]),
      );
      await utils.runConsole(cmds.concat(["git", "push", origin, tagName]));

      ctx.logger.info(
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
  deps: [
    requireCleanGit,
    fetchTags,
  ],
  uptodate: () => false,
});

async function findReplaceInFile(
  filename: string,
  lineReplacement: (line: string) => string,
): Promise<void> {
  const fileStr = await Deno.readTextFile(filename);
  const replacedFileStr = fileStr.split("\n").map(lineReplacement).join("\n");

  if (replacedFileStr !== fileStr) {
    await Deno.writeTextFile(filename, replacedFileStr);
  }
}

const makeReleaseEdits = task({
  name: "releaseEdits",
  description: "Update readme etc to refer to next release version",
  action: async (ctx: TaskContext) => {
    const nextver = await getNextTagVersion(ctx.args);

    const pattern = new RegExp(`${tagPrefix}[0-9]+\.[0-9]+\.[0-9]+`);

    // find replace in sources 'dnit-v' ->
    for await (
      const entry of fs.walk(".", {
        includeFiles: true,
        includeDirs: false,
        skip: [
          /\.git.*/,
          /.*\.patch/,
        ],
      })
    ) {
      await findReplaceInFile(entry.path, (line) => {
        return line.replace(pattern, `${tagPrefix}${nextver}`);
      });
    }

    // write version.ts:
    await Deno.writeTextFile(
      "./version.ts",
      `export const version = "${nextver}";\n`,
    );

    await runConsole([
      "git",
      "commit",
      "-a",
      "--allow-empty",
      "-m",
      `Commit release edits for ${tagPrefix}${nextver}`,
    ]);
  },
  deps: [
    requireCleanGit,
    fetchTags,
  ],
  uptodate: () => false,
});

const release = task({
  name: "release",
  description: "Steps for a new release",
  action: () => {},
  deps: [
    makeReleaseEdits,
    tag,
  ],
  uptodate: runAlways,
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
    await utils.runConsole(["git", "commit", "-am", "Generated adl"]);
    await utils.runConsole(["git", "revert", "HEAD", "--no-edit"]);
    await utils.runConsole([
      "git",
      "commit",
      "--amend",
      "-m",
      "Revert non desired gen-adl edits",
    ]);
    await utils.runConsole(["git", "format-patch", "-1", "HEAD"]);
    await utils.runConsole([
      "mv",
      "0001-Revert-non-desired-gen-adl-edits.patch",
      "./tools",
    ]);
    await utils.runConsole([
      "git",
      "commit",
      "-am",
      "Updated gen-adl fix patch",
    ]);
  },
  deps: [
    requireCleanGit,
  ],
  uptodate: runAlways,
});

const test = task({
  name: "test",
  description: "Run local unit tests",
  action: async () => {
    await utils.runConsole([
      "deno",
      "test",
      "--allow-read",
      "--allow-write",
    ], {
      cwd: "./tests",
    });
  },
  deps: [],
  uptodate: runAlways,
});

const killTest = task({
  name: "killTest",
  description: "Test what happens when killing via signals",
  action: async () => {
    await utils.runConsole([
      "bash",
      "-c",
      "echo $$; trap '' 2; echo helloworld; sleep 30s; echo done",
    ]);
  },
  deps: [],
  uptodate: runAlways,
});

const sourceCheckEntryPoints: string[] = [
  "main.ts",
  "mod.ts",
  "dnit/main.ts",
];

const check = task({
  name: "check",
  description: "Run local checks",
  action: async () => {
    await Promise.all(sourceCheckEntryPoints.map(async (path) => {
      await utils.runConsole([
        "deno",
        "check",
        path,
      ]);
    }));
  },
  deps: [],
  uptodate: runAlways,
});

const lint = task({
  name: "lint",
  description: "Run local lint",
  action: async () => {
    await Promise.all(sourceCheckEntryPoints.map(async (path) => {
      await utils.runConsole([
        "deno",
        "lint",
        path,
      ]);
    }));
  },
  deps: [],
  uptodate: runAlways,
});

const fmt = task({
  name: "fmt",
  description: "Run local fmt",
  action: async () => {
    await Promise.all(sourceCheckEntryPoints.map(async (path) => {
      await utils.runConsole([
        "deno",
        "fmt",
        path,
      ]);
    }));
  },
  deps: [],
  uptodate: runAlways,
});

const tasks = [
  test,
  genadl,
  tag,
  push,
  updategenadlfix,
  makeReleaseEdits,
  release,
  killTest,
  check,
  lint,
  fmt,
];

main(Deno.args, tasks);
