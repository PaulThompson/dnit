import { assertEquals, assertStringIncludes } from "@std/assert";
import { echoBashCompletionScript, showTaskList } from "../cli/utils.ts";
import { execCli } from "../cli/cli.ts";
import { Task, task } from "../core/task.ts";
import type { TaskName } from "../interfaces/core/IManifestTypes.ts";
import { Manifest } from "../manifest.ts";
import type { Args } from "@std/cli/parse-args";
import type { IExecContext } from "../interfaces/core/ICoreInterfaces.ts";
import * as log from "@std/log";

// Mock exec context for testing
function createMockExecContext(manifest: Manifest): IExecContext {
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
  };
}

// Capture console output
function captureConsole(): {
  logs: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  return {
    logs,
    restore: () => {
      console.log = originalLog;
    },
  };
}

Deno.test("TabCompletion - echoBashCompletionScript generates valid bash script", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should contain bash completion script header
    assertStringIncludes(output, "# bash completion for dnit");
    assertStringIncludes(output, "# auto-generate by `dnit tabcompletion`");

    // Should contain function definition
    assertStringIncludes(output, "_dnit()");
    assertStringIncludes(output, "COMPREPLY=()");

    // Should contain completion logic
    assertStringIncludes(output, "_get_comp_words_by_ref");
    assertStringIncludes(output, "compgen -W");

    // Should contain task discovery command
    assertStringIncludes(output, "dnit list --quiet");

    // Should register the completion function
    assertStringIncludes(output, "complete -o filenames -F _dnit dnit");

    // Should contain usage instructions
    assertStringIncludes(output, "source <(dnit tabcompletion)");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - script contains proper bash syntax", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Check for proper bash function syntax
    assertStringIncludes(output, "_dnit() \n{");
    assertStringIncludes(output, "return 0\n}");

    // Check for proper variable declarations
    assertStringIncludes(output, "local cur prev words cword");

    // Check for proper command substitution
    assertStringIncludes(output, "tasks=$(dnit list --quiet 2>/dev/null)");

    // Check for proper array syntax
    assertStringIncludes(
      output,
      'COMPREPLY=( $(compgen -W "${sub_cmds} ${tasks}" -- ${cur}) )',
    );
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - script includes sub-commands", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should include list as a sub-command
    assertStringIncludes(output, 'sub_cmds="list"');

    // Should combine sub-commands and tasks in completion
    assertStringIncludes(output, '"${sub_cmds} ${tasks}"');
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - builtin tabcompletion task works", async () => {
  const console = captureConsole();

  try {
    const result = await execCli(["tabcompletion"], []);
    assertEquals(result.success, true);

    const output = console.logs.join("\n");
    assertStringIncludes(output, "# bash completion for dnit");
    assertStringIncludes(output, "_dnit()");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - task list integration for completion", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  const console = captureConsole();

  // Create test tasks
  const task1 = new Task({
    name: "build" as TaskName,
    description: "Build the project",
    action: () => {},
  });

  const task2 = new Task({
    name: "test" as TaskName,
    description: "Run tests",
    action: () => {},
  });

  const task3 = new Task({
    name: "deploy" as TaskName,
    description: "Deploy application",
    action: () => {},
  });

  ctx.taskRegister.set("build" as TaskName, task1);
  ctx.taskRegister.set("test" as TaskName, task2);
  ctx.taskRegister.set("deploy" as TaskName, task3);

  try {
    // Test quiet mode (used by completion script)
    showTaskList(ctx, { _: [], quiet: true } as Args);

    const output = console.logs.join("\n");
    assertStringIncludes(output, "build");
    assertStringIncludes(output, "test");
    assertStringIncludes(output, "deploy");

    // Should not contain descriptions or headers in quiet mode
    assertEquals(output.includes("Build the project"), false);
    assertEquals(output.includes("Name"), false);
    assertEquals(output.includes("Description"), false);
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - handles empty task list", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  const console = captureConsole();

  try {
    showTaskList(ctx, { _: [], quiet: true } as Args);
    const output = console.logs.join("\n");

    // Should handle empty task list gracefully
    assertEquals(output, "");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - includes builtin tasks in completion", async () => {
  const console = captureConsole();

  try {
    // Test that builtin tasks are available for completion
    const result = await execCli(["list", "--quiet"], []);
    assertEquals(result.success, true);

    const output = console.logs.join("\n");
    // Should include builtin tasks
    assertStringIncludes(output, "list");
    assertStringIncludes(output, "clean");
    assertStringIncludes(output, "tabcompletion");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - completion script handles special characters", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Check that special bash characters are properly handled
    assertStringIncludes(output, "2>/dev/null"); // Error redirection
    assertStringIncludes(output, "${cur}"); // Variable expansion
    assertStringIncludes(output, "${sub_cmds}"); // Variable expansion
    assertStringIncludes(output, "${tasks}"); // Variable expansion

    // Check for proper quoting
    assertStringIncludes(output, '"${sub_cmds} ${tasks}"');
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - script supports multiple completion scenarios", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should handle current word completion
    assertStringIncludes(output, "cur prev words cword");

    // Should use compgen for word generation
    assertStringIncludes(output, "compgen -W");

    // Should handle partial matches with -- ${cur}
    assertStringIncludes(output, "-- ${cur}");

    // Should set COMPREPLY for bash completion
    assertStringIncludes(output, "COMPREPLY=( $(compgen");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - script includes proper error handling", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should redirect stderr to avoid error messages in completion
    assertStringIncludes(output, "2>/dev/null");

    // Should return 0 for successful completion
    assertStringIncludes(output, "return 0");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - completion works with user tasks", async () => {
  const userTask = new Task({
    name: "customBuild" as TaskName,
    description: "Custom build task",
    action: () => {},
  });

  const console = captureConsole();

  try {
    const result = await execCli(["list", "--quiet"], [userTask]);
    assertEquals(result.success, true);

    const output = console.logs.join("\n");
    // Should include both builtin and user tasks
    assertStringIncludes(output, "customBuild");
    assertStringIncludes(output, "list");
    assertStringIncludes(output, "clean");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - task helper function creates proper task", () => {
  const testTask = task({
    name: "completionTest",
    description: "Test task for completion",
    action: () => {},
  });

  assertEquals(testTask.name, "completionTest");
  assertEquals(testTask.description, "Test task for completion");
  assertEquals(typeof testTask.action, "function");
});

Deno.test("TabCompletion - completion script generation is consistent", () => {
  const console1 = captureConsole();
  let output1: string;

  try {
    echoBashCompletionScript();
    output1 = console1.logs.join("\n");
  } finally {
    console1.restore();
  }

  const console2 = captureConsole();
  let output2: string;

  try {
    echoBashCompletionScript();
    output2 = console2.logs.join("\n");
  } finally {
    console2.restore();
  }

  // Script should be identical on multiple calls
  assertEquals(output1, output2);
});

Deno.test("TabCompletion - script supports filename completion", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should enable filename completion
    assertStringIncludes(output, "complete -o filenames -F _dnit dnit");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - handles tasks with complex names", () => {
  const manifest = new Manifest("");
  const ctx = createMockExecContext(manifest);
  const console = captureConsole();

  const complexTask = new Task({
    name: "build:prod-release" as TaskName,
    description: "Production release build",
    action: () => {},
  });

  ctx.taskRegister.set("build:prod-release" as TaskName, complexTask);

  try {
    showTaskList(ctx, { _: [], quiet: true } as Args);
    const output = console.logs.join("\n");

    assertStringIncludes(output, "build:prod-release");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - bash completion variables are properly declared", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should declare all necessary local variables
    assertStringIncludes(
      output,
      "local cur prev words cword basetask sub_cmds tasks i dodof",
    );

    // Should initialize COMPREPLY
    assertStringIncludes(output, "COMPREPLY=()");
  } finally {
    console.restore();
  }
});

Deno.test("TabCompletion - uses proper bash completion helper", () => {
  const console = captureConsole();

  try {
    echoBashCompletionScript();
    const output = console.logs.join("\n");

    // Should use bash completion helper function
    assertStringIncludes(
      output,
      "_get_comp_words_by_ref -n : cur prev words cword",
    );
  } finally {
    console.restore();
  }
});
