import {
  execBasic,
  runAlways,
  task,
  trackFile,
} from "../mod.ts";

import { assertEquals } from "@std/assert";
import { Manifest } from "../manifest.ts";
import * as path from "@std/path";

Deno.test("target file creation and validation", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const targetFile = trackFile({
      path: path.join(tempDir, "target.txt"),
    });

    const testTask = task({
      name: "testTask",
      description: "Creates a target file",
      action: async () => {
        await Deno.writeTextFile(targetFile.path, "target content");
      },
      targets: [targetFile],
    });

    // Verify target doesn't exist initially
    assertEquals(await targetFile.exists(), false);

    // Execute task
    const ctx = await execBasic([], [testTask], new Manifest(""));
    await ctx.getTaskByName("testTask")?.exec(ctx);

    // Verify target was created
    assertEquals(await targetFile.exists(), true);
    assertEquals(await Deno.readTextFile(targetFile.path), "target content");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("multiple targets per task", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const target1 = trackFile({
      path: path.join(tempDir, "target1.txt"),
    });
    const target2 = trackFile({
      path: path.join(tempDir, "target2.txt"),
    });
    const target3 = trackFile({
      path: path.join(tempDir, "target3.txt"),
    });

    const multiTargetTask = task({
      name: "multiTargetTask",
      description: "Creates multiple target files",
      action: async () => {
        await Deno.writeTextFile(target1.path, "content 1");
        await Deno.writeTextFile(target2.path, "content 2");
        await Deno.writeTextFile(target3.path, "content 3");
      },
      targets: [target1, target2, target3],
    });

    // Verify targets don't exist initially
    assertEquals(await target1.exists(), false);
    assertEquals(await target2.exists(), false);
    assertEquals(await target3.exists(), false);

    // Execute task
    const ctx = await execBasic([], [multiTargetTask], new Manifest(""));
    await ctx.getTaskByName("multiTargetTask")?.exec(ctx);

    // Verify all targets were created
    assertEquals(await target1.exists(), true);
    assertEquals(await target2.exists(), true);
    assertEquals(await target3.exists(), true);

    assertEquals(await Deno.readTextFile(target1.path), "content 1");
    assertEquals(await Deno.readTextFile(target2.path), "content 2");
    assertEquals(await Deno.readTextFile(target3.path), "content 3");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("target file conflicts and overwrites", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const sharedTarget = trackFile({
      path: path.join(tempDir, "shared.txt"),
    });

    const task1 = task({
      name: "task1",
      description: "First task that creates shared target",
      action: async () => {
        await Deno.writeTextFile(sharedTarget.path, "content from task1");
      },
      targets: [sharedTarget],
      uptodate: runAlways,
    });

    // Create a separate target for task2 to avoid duplicate target error
    const target2 = trackFile({
      path: path.join(tempDir, "target2.txt"),
    });
    
    const task2 = task({
      name: "task2", 
      description: "Second task that creates its own target and overwrites the shared file",
      action: async () => {
        await Deno.writeTextFile(target2.path, "content from task2");
        // Also overwrite the shared file (not as a target)
        await Deno.writeTextFile(sharedTarget.path, "overwritten by task2");
      },
      targets: [target2],
      uptodate: runAlways,
    });

    const ctx = await execBasic([], [task1, task2], new Manifest(""));

    // Run first task
    await ctx.getTaskByName("task1")?.exec(ctx);
    assertEquals(
      await Deno.readTextFile(sharedTarget.path),
      "content from task1",
    );

    // Run second task - creates its target and overwrites shared file
    await ctx.getTaskByName("task2")?.exec(ctx);
    assertEquals(
      await Deno.readTextFile(target2.path),
      "content from task2",
    );
    assertEquals(
      await Deno.readTextFile(sharedTarget.path),
      "overwritten by task2",
    );

    // Test target registry tracking
    assertEquals(ctx.targetRegister.get(sharedTarget.path), task1);
    assertEquals(ctx.targetRegister.get(target2.path), task2);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clean operation functionality", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const target1 = trackFile({
      path: path.join(tempDir, "cleanable1.txt"),
    });
    const target2 = trackFile({
      path: path.join(tempDir, "cleanable2.txt"),
    });

    const task1 = task({
      name: "task1",
      description: "Creates first cleanable target",
      action: async () => {
        await Deno.writeTextFile(target1.path, "cleanable content 1");
      },
      targets: [target1],
    });

    const task2 = task({
      name: "task2",
      description: "Creates second cleanable target",
      action: async () => {
        await Deno.writeTextFile(target2.path, "cleanable content 2");
      },
      targets: [target2],
    });

    const ctx = await execBasic([], [task1, task2], new Manifest(""));

    // Execute tasks to create targets
    await ctx.getTaskByName("task1")?.exec(ctx);
    await ctx.getTaskByName("task2")?.exec(ctx);

    // Verify targets exist
    assertEquals(await target1.exists(), true);
    assertEquals(await target2.exists(), true);

    // Execute clean operation
    const cleanTask = ctx.getTaskByName("clean");
    assertEquals(cleanTask !== undefined, true);
    await cleanTask?.exec(ctx);

    // Verify targets were cleaned
    assertEquals(await target1.exists(), false);
    assertEquals(await target2.exists(), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("target tracking in manifest", async () => {
  const tempDir = await Deno.makeTempDir();
  const manifestPath = path.join(tempDir, ".manifest.json");

  try {
    const target = trackFile({
      path: path.join(tempDir, "tracked-target.txt"),
    });

    const trackedTask = task({
      name: "trackedTask",
      description: "Task with tracked target",
      action: async () => {
        await Deno.writeTextFile(target.path, "tracked content");
      },
      targets: [target],
    });

    const manifest = new Manifest(manifestPath);
    const ctx = await execBasic([], [trackedTask], manifest);

    // Execute task
    await ctx.getTaskByName("trackedTask")?.exec(ctx);

    // Save manifest and verify target is tracked
    await manifest.save();

    // Load fresh manifest and verify persistence
    const freshManifest = new Manifest(manifestPath);
    await freshManifest.load();

    const taskManifest = freshManifest.tasks["trackedTask"];
    assertEquals(taskManifest !== undefined, true);

    // Check if the task was executed (has execution timestamp)
    assertEquals(taskManifest?.lastExecution !== null, true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("target existence validation", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const target = trackFile({
      path: path.join(tempDir, "validation-target.txt"),
    });

    const validationTask = task({
      name: "validationTask",
      description: "Task that should create target",
      action: async () => {
        // Intentionally not creating the target file
        // This tests what happens when a task claims to produce a target but doesn't
      },
      targets: [target],
    });

    const ctx = await execBasic([], [validationTask], new Manifest(""));

    // Execute task - should complete even if target not created
    await ctx.getTaskByName("validationTask")?.exec(ctx);

    // Verify target was not created
    assertEquals(await target.exists(), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("target with subdirectories", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const nestedTarget = trackFile({
      path: path.join(tempDir, "nested", "deep", "target.txt"),
    });

    const nestedTask = task({
      name: "nestedTask",
      description: "Creates target in nested directories",
      action: async () => {
        // Create parent directories
        await Deno.mkdir(path.dirname(nestedTarget.path), { recursive: true });
        await Deno.writeTextFile(nestedTarget.path, "nested content");
      },
      targets: [nestedTarget],
    });

    const ctx = await execBasic([], [nestedTask], new Manifest(""));

    // Execute task
    await ctx.getTaskByName("nestedTask")?.exec(ctx);

    // Verify nested target was created
    assertEquals(await nestedTarget.exists(), true);
    assertEquals(await Deno.readTextFile(nestedTarget.path), "nested content");

    // Test clean operation on nested targets
    await ctx.getTaskByName("clean")?.exec(ctx);
    assertEquals(await nestedTarget.exists(), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("target deletion error handling", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const target = trackFile({
      path: path.join(tempDir, "protected-target.txt"),
    });

    const simpleTask = task({
      name: "simpleTask",
      description: "Creates a target file",
      action: async () => {
        await Deno.writeTextFile(target.path, "deletable content");
      },
      targets: [target],
    });

    const ctx = await execBasic([], [simpleTask], new Manifest(""));

    // Execute task to create target
    await ctx.getTaskByName("simpleTask")?.exec(ctx);
    assertEquals(await target.exists(), true);

    // Clean operation should work without errors
    const cleanTask = ctx.getTaskByName("clean");
    assertEquals(cleanTask !== undefined, true);
    await cleanTask?.exec(ctx);
    
    // Verify target was cleaned
    assertEquals(await target.exists(), false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("empty targets array", async () => {
  const emptyTargetsTask = task({
    name: "emptyTargetsTask",
    description: "Task with empty targets array",
    action: () => {
      // Do nothing
    },
    targets: [],
  });

  const ctx = await execBasic([], [emptyTargetsTask], new Manifest(""));

  // Should execute without issues
  await ctx.getTaskByName("emptyTargetsTask")?.exec(ctx);

  // Clean should also work fine
  await ctx.getTaskByName("clean")?.exec(ctx);
});

Deno.test("task without targets", async () => {
  const noTargetsTask = task({
    name: "noTargetsTask",
    description: "Task without targets property",
    action: () => {
      // Do nothing
    },
    // No targets property
  });

  const ctx = await execBasic([], [noTargetsTask], new Manifest(""));

  // Should execute without issues
  await ctx.getTaskByName("noTargetsTask")?.exec(ctx);

  // Clean should also work fine (nothing to clean)
  await ctx.getTaskByName("clean")?.exec(ctx);
});

