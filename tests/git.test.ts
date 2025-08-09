import { assertEquals, assertRejects } from "@std/assert";
import {
  fetchTags,
  gitIsClean,
  gitLastCommitMessage,
  gitLatestTag,
  requireCleanGit,
} from "../utils/git.ts";

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

  await t.step("fetchTags task - properties", () => {
    assertEquals(fetchTags.name, "fetch-tags");
    assertEquals(fetchTags.description, "Git remote fetch tags");
    assertEquals(typeof fetchTags.action, "function");
    assertEquals(typeof fetchTags.uptodate, "function");
    if (fetchTags.uptodate) {
      const mockCtx = { logger: { log: () => {} } };
      assertEquals(fetchTags.uptodate(mockCtx), false);
    }
  });

  await t.step("requireCleanGit task - properties", () => {
    assertEquals(requireCleanGit.name, "git-is-clean");
    assertEquals(requireCleanGit.description, "Check git status is clean");
    assertEquals(typeof requireCleanGit.action, "function");
    assertEquals(typeof requireCleanGit.uptodate, "function");
    if (requireCleanGit.uptodate) {
      const mockCtx = { logger: { log: () => {} } };
      assertEquals(requireCleanGit.uptodate(mockCtx), false);
    }
  });

  await t.step("requireCleanGit task - with ignore-unclean flag", async () => {
    const mockCtx = {
      args: { "ignore-unclean": true },
      logger: { log: () => {} },
      task: requireCleanGit,
      execCtx: { getTaskByName: () => null },
    };
    
    // Should not throw when ignore-unclean is set
    await requireCleanGit.action(mockCtx);
  });

  await t.step("requireCleanGit task - behavior depends on git status", async () => {
    const isClean = await gitIsClean();
    const mockCtx = {
      args: {},
      logger: { log: () => {} },
      task: requireCleanGit,
      execCtx: { getTaskByName: () => null },
    };
    
    if (isClean) {
      // Should not throw if git is clean
      await requireCleanGit.action(mockCtx);
    } else {
      // Should throw if git is not clean
      await assertRejects(
        async () => await requireCleanGit.action(mockCtx),
        Error,
        "Unclean git status",
      );
    }
  });
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