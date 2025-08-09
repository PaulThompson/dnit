# Dnit - A typescript (deno) based task runner

Dnit is a task runner based on typescript and Deno. It uses typescript variables
for tasks and dependencies and is aimed at larger projects with tasks split
across many files or shared between projects.

## Installation:

### Pre-Requisites

- [Deno](https://deno.land/#installation)
- Requires deno v2.1 or greater

### Install

It is recommended to use `deno install` to install the tool, which provides a
convenient entrypoint script and aliases the permission flags.

```
deno install --global --allow-read --allow-write --allow-run -f --name dnit jsr:@dnit/dnit@2.0.0/main
```

Install latest from JSR:

```
deno install --global --allow-read --allow-write --allow-run -f --name dnit jsr:@dnit/dnit/main
```

Install from source checkout:

```
deno install --global --allow-read --allow-write --allow-run -f --name dnit ./main.ts
```

- Read, Write and Run permissions are required in order to operate on files and
  execute tasks.

## Example

See the [example/](./example/) directory for a complete working hello world
example.

## Sample Usage

```ts
import { file, main, task } from "jsr:@dnit/dnit@2.0.0";

/// A file to be tracked as a target and dependency:
export const msg = file({
  path: "./msg.txt",
});

/// A task definition.  No side effect is incurred by creating a task.
export const helloWorld = task({
  name: "helloWorld",
  description: "foo",
  action: async () => { /// Actions are typescript async ()=> Promise<void> functions.
    const command = new Deno.Command("./writeMsg.sh");
    const { code } = await command.output();
    if (code !== 0) throw new Error(`Command failed with code ${code}`);
  },
  deps: [
    file({
      path: "./writeMsg.sh",
    }),
  ],
  targets: [
    msg,
  ],
});

export const goodbye = task({
  name: "goodbye",
  action: async () => {
    // use ordinary typescript idiomatically if several actions are required
    const actions = [
      async () => {
        const txt = await Deno.readTextFile(msg.path);
        console.log(txt);
      },
      async () => {
        console.log("...");
      },
    ];
    for (const action of actions) {
      await action();
    }
  },
  deps: [msg], /// Dependency added as a typescript variable
  ///   Dependencies can be file dependency or task dependencies.
});

/// Register cmdline args & tasks with the tool.
main(Deno.args, [helloWorld, goodbye]);
```

## Sample Usage - CLI

- List tasks available:

```
dnit list
```

- Execute a task by name:

```
dnit helloWorld
```

- Verbose logging:

```
dnit list --verbose
```

In verbose mode the tool logs to stderr (fd #2)

## Tasks and Files in Detail

Files are tracked by the exported
`export function file(fileParams: FileParams) : TrackedFile`

```ts
/** User params for a tracked file */
export type FileParams = {
  /// File path
  path: string;

  /// Optional function for how to hash the file.   Defaults to the sha1 hash of the file contents.
  /// A file is out of date if the file timestamp and the hash are different than that in the task manifest
  getHash?: GetFileHash;

  /// Optional function for how to get the file timestamp. Defaults to the actual file timestamp
  getTimestamp?: GetFileTimestamp;
};
```

`TrackedFile` objects are used in tasks, either as targets or dependencies.

Tasks are created by the exported `function task(taskParams: TaskParams): Task`

```ts
/** User definition of a task */
export type TaskParams = {
  /// Name: (string) - The key used to initiate a task
  name: string;

  /// Description (string) - Freeform text description shown on help
  description?: string;

  /// Action executed on execution of the task (async or sync)
  action: Action;

  /// Optional list of task or file dependencies
  deps?: Dep[];

  /// Targets (files which will be produced by execution of this task)
  targets?: TrackedFile[];

  /// Custom up-to-date definition - Can be used to make a task *less* up to date.  Eg; use uptodate: runAlways  to run always on request regardless of dependencies being up to date.
  uptodate?: IsUpToDate;
};

/// The kinds of supported dependencies.
export type Dep = Task | TrackedFile | TrackedFilesAsync;
```

Tasks are passed to the exported
`export function main(cliArgs: string[], tasks: Task[]) : Promise<void>` This
exposes the tasks for execution by the CLI and executes them according to the
`cliArgs` passed in.

```ts
main(Deno.args, tasks);
```

## Larger Scale use of tasks

This tool aims to support "large" projects with many tasks and even sharing task
definitions across projects.

- Tasks and dependencies are typescript variables, can be imported/exported and
  used. This makes a large project of tasks and dependencies easy to navigate in
  a typescript IDE.
- User scripts are required to reside in a `dnit` directory. This provides a
  place to have a (deno) typescript tree for the task scripting, which
  encourages tasks to be separated into modules and generally organised as a
  typescript project tree.
- User scripts can use a `deno.json` file in the `dnit` directory for
  configuration (import maps, TypeScript options, etc). For legacy
  compatibility, standalone `import_map.json` or `.import_map.json` files are
  also supported.
- The main `dnit` tool can be executed on its own (see section on
  [Installation](#Installation) above)

## Launching the tool

The `dnit` tool searches for a user script to execute, in order to support the
[abovementioned](#Larger-Scale-use-of-tasks) directory of sources.

- When `dnit` is the main it runs the `launch` function to run the user's
  scripts.
- It starts from the current working directory and runs `findUserSource`
- `findUserSource` looks for subdirectory `dnit` and looks for sources `main.ts`
  or `dnit.ts`
  - Deno will automatically discover and use any `deno.json` file in the `dnit`
    directory or parent directories
  - For legacy compatibility, it also looks for `import_map.json` or
    `.import_map.json` to use as the import map
  - If found then it changes working directory and executes the user script.
  - If not found then it recurses into `findUserSource` in the parent directory.

Eg: with a file layout:

```
repo
  dnit
    main.ts
    deno.json
  src
    project.ts
  package.json
  tsconfig.json
```

Executing `dnit` anywhere in a subdirectory of `repo` will execute the
`main.ts`. Any relative paths used for dependencies and targets will resolve
relative to the `repo` root, since it is where the subdirectory and file
`dnit/main.ts` was found.

Note that the other directories can contain (non-deno) typescript project(s) and
having the (deno) typescript sources in a nominal `dnit` tree helps prevent
confusion between the two.

## Tab Completion

For those using the tool under bash, simply execute

`dnit tabcompletion`

This will output a bash completion script that can be sourced in the current
shell to provide tab completion for the relevant dnit tasks.

or run `source <(dnit tabcompletion)` to generate and source the tab completion
in current shell.

# References:

- https://pydoit.org/
  - A task runner written in python.
- https://deno.land/x/drake/
  - A deno task runner
- https://deno.land/x/dunner
  - A deno task runner
