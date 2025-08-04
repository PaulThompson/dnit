# Hello World Example

This is a simple example demonstrating basic dnit usage.

## Setup

From the dnit project root, navigate to this example:

```bash
cd example
```

## Usage

List available tasks:

```bash
deno run --allow-read --allow-write --allow-run ../main.ts list
```

Create the hello world message:

```bash
deno run --allow-read --allow-write --allow-run ../main.ts hello
```

Display the message:

```bash
deno run --allow-read --allow-write --allow-run ../main.ts show
```

Clean up:

```bash
deno run --allow-read --allow-write --allow-run ../main.ts cleanup
```

## What This Demonstrates

- **Task definition**: How to create tasks with `task()`
- **File tracking**: Using `trackFile()` to track dependencies and targets
- **Task dependencies**: The `show` task depends on `hello.txt` existing
- **File I/O**: Reading and writing files in task actions
- **Error handling**: Graceful handling of missing files in cleanup

## Key Concepts

1. **Tasks** are defined with names, descriptions, and actions
2. **Dependencies** ensure tasks run in the correct order
3. **Targets** are files that tasks produce
4. **Tracking** helps dnit determine when tasks need to re-run
