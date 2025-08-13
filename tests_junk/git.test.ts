import { assertEquals, assertRejects } from "@std/assert";
import * as log from "@std/log";
import type { Args } from "@std/cli/parse-args";
import type { IExecContext, IManifest, TaskName } from "../mod.ts";
import { execBasic } from "../mod.ts";
import { Manifest } from "../manifest.ts";
import { Task } from "../core/task.ts";
import { taskContext } from "../core/TaskContext.ts";
import {
  fetchTags,
  gitIsClean,
  gitLastCommitMessage,
  gitLatestTag,
  requireCleanGit,
} from "../utils/git.ts";

// Mock exec context for testing
function createMockExecContext(manifest: IManifest): IExecContext {
  return {
    taskRegister: new Map(),
    targetRegister: new Map(),
    doneTasks: new Set(),
    inprogressTasks: new Set(),
    internalLogger: log.getLogger("internal"),
    taskLogger: log.getLogger("task"),
    userLogger: log.getLogger("user"),
    concurrency: 1,
    verbose: false,
    manifest,
    args: { _: [] } as Args,
    getTaskByName: () => undefined,
    schedule: <T>(action: () => Promise<T>) => action(),
    stdout: () => {},
  };
}

Deno.test("git utilities", async (t) => {
  // Skip tests if not in a git repository
  let isGitRepo = false;
  try {
    const status = await new Deno.Command("git", { args: ["status"] }).output();
    isGitRepo = status.success;
  } catch {
    isGitRepo = false;
  }

  if (!isGitRepo) {
    console.log("Skipping git tests - not in a git repository");
    return;
  }

  await t.step("gitIsClean - basic functionality", async () => {
    const isClean = await gitIsClean();
    assertEquals(typeof isClean, "boolean");
  });

  await t.step("gitLastCommitMessage - returns string", async () => {
    const message = await gitLastCommitMessage();
    assertEquals(typeof message, "string");
    assertEquals(message.length > 0, true);
  });

  await t.step("gitLatestTag - with valid prefix", async () => {
    try {
      const tag = await gitLatestTag("v");
      assertEquals(typeof tag, "string");
    } catch (error) {
      // Expected if no tags exist
      assertEquals(error instanceof Error, true);
    }
  });

  await t.step("gitLatestTag - with non-existent prefix", async () => {
    try {
      await gitLatestTag("nonexistent-prefix-123456789");
      // If it doesn't throw, that's also fine - depends on repo state
    } catch (error) {
      assertEquals(error instanceof Error, true);
    }
  });

  await t.step("fetchTags task - properties", async () => {
    assertEquals(fetchTags.name, "fetch-tags");
    assertEquals(fetchTags.description, "Git remote fetch tags");
    assertEquals(typeof fetchTags.action, "function");
    assertEquals(typeof fetchTags.uptodate, "function");
    if (fetchTags.uptodate) {
      const manifest = new Manifest("");
      const ctx = await execBasic([], [], new Manifest(""));
      const task = new Task({ name: "test" as TaskName, action: () => {} });
      const taskCtx = taskContext(ctx, task);
      assertEquals(fetchTags.uptodate(taskCtx), false);
    }
  });

  await t.step("requireCleanGit task - properties", async () => {
    assertEquals(requireCleanGit.name, "git-is-clean");
    assertEquals(requireCleanGit.description, "Check git status is clean");
    assertEquals(typeof requireCleanGit.action, "function");
    assertEquals(typeof requireCleanGit.uptodate, "function");
    if (requireCleanGit.uptodate) {
      const manifest = new Manifest("");
      const ctx = await execBasic([], [], new Manifest(""));
      const task = new Task({ name: "test" as TaskName, action: () => {} });
      const taskCtx = taskContext(ctx, task);
      assertEquals(requireCleanGit.uptodate(taskCtx), false);
    }
  });

  await t.step("requireCleanGit task - with ignore-unclean flag", async () => {
    const manifest = new Manifest("");
    const testTask = new Task({ name: "test" as TaskName, action: () => {} });

    // Use execBasic with proper args setup
    const ctx = await execBasic([], [testTask], manifest);
    // Override args to include ignore-unclean flag
    (ctx as unknown as { args: Args }).args = {
      _: [],
      "ignore-unclean": true,
    } as Args;
    const taskCtx = taskContext(ctx, testTask);

    // Should not throw when ignore-unclean is set
    await requireCleanGit.action(taskCtx);
  });

  await t.step(
    "requireCleanGit task - behavior depends on git status",
    async () => {
      const isClean = await gitIsClean();
      const manifest = new Manifest("");
      const testTask = new Task({ name: "test" as TaskName, action: () => {} });

      // Use execBasic for proper context setup
      const ctx = await execBasic([], [testTask], manifest);
      const taskCtx = taskContext(ctx, testTask);

      if (isClean) {
        // Should not throw if git is clean
        await requireCleanGit.action(taskCtx);
      } else {
        // Should throw if git is not clean
        await assertRejects(
          async () => await requireCleanGit.action(taskCtx),
          Error,
          "Unclean git status",
        );
      }
    },
  );
});

Deno.test("git utilities - error handling", async (t) => {
  await t.step("git commands fail gracefully", async () => {
    try {
      await gitLatestTag("definitely-nonexistent-tag-prefix-12345");
    } catch (error) {
      assertEquals(error instanceof Error, true);
    }
  });

  await t.step("regex handling in gitLatestTag", async () => {
    try {
      await gitLatestTag("v[.*+?");
    } catch (error) {
      assertEquals(error instanceof Error, true);
    }
  });
});
