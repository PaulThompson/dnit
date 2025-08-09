# Dnit File Structure Documentation (Refactored Architecture)

## Overview

This refactored version of Dnit introduces a cleaner separation of concerns
with:

- Interface definitions in `/interfaces/` for better abstraction
- Core functionality split into focused modules
- CLI components organized in `/cli/` directory
- File tracking separated into `/core/file/` subdirectory

## Interface Definitions

### `/interfaces/core/ITask.ts`

**Purpose:** Core task-related interface definitions.

**Primary Types:**

- `ITask`: Main task execution interface
- `ITaskContext`: Context passed to task actions
- `IAction`: Task action function type
- `IIsUpToDate`: Up-to-date check function type

### `/interfaces/core/IContext.ts`

**Purpose:** Execution context interface.

**Primary Types:**

- `IExecContext`: Main execution context interface with:
  - Task and target registries
  - Task tracking sets (done, in-progress)
  - Async queue for concurrency
  - Logger instances
  - Manifest and CLI args access

### `/interfaces/core/IManifest.ts`

**Purpose:** Manifest persistence interfaces.

**Primary Types:**

- `IManifest`: Root manifest interface
- `ITaskManifest`: Per-task manifest interface with:
  - Execution timestamp tracking
  - File data management
  - Serialization methods

### `/interfaces/core/ITrackedFile.ts`

**Purpose:** File tracking interfaces.

**Primary Types:**

- `ITrackedFile`: File dependency tracking interface
- `ITrackedFilesAsync`: Async file generator interface

### `/interfaces/cli/ILogger.ts`

**Purpose:** Logging interfaces (if present).

### `/interfaces/utils/IFileSystem.ts`

**Purpose:** File system operation interfaces (if present).

## Core Module Files

### `/core/types.ts`

**Purpose:** Core type definitions and Zod schemas.

**Primary Types:**

- `TaskName`, `TrackedFileName`, `TrackedFileHash`, `Timestamp`
- `TrackedFileData`: File hash and timestamp
- `TaskData`: Task execution data
- `Manifest`: Root manifest type

**Schemas:**

- Zod schemas for all types with validation

### `/core/execContext.ts`

**Purpose:** Concrete implementation of execution context.

**Primary Class:**

- `ExecContext`: Implements `IExecContext`
  - Manages task and target registries
  - Tracks execution state
  - Provides async queue for concurrency
  - Configures logging based on verbosity

### `/core/taskInterface.ts`

**Purpose:** Task interface to break circular dependencies.

**Primary Type:**

- `TaskInterface`: Minimal task interface used by ExecContext

### `/core/TaskContext.ts`

**Purpose:** Task context utilities.

**Primary Types:**

- `TaskContext`: Interface for context passed to actions
- `taskContext()`: Factory function to create context

### `/core/task.ts`

**Purpose:** Core task implementation.

**Primary Class:**

- `Task`: Main task class implementing `TaskInterface`

**Types:**

- `TaskParams`: User-facing task definition
- `Action`: Task action function
- `IsUpToDate`: Up-to-date checker
- `Dep`: Union type for dependencies

**Functions:**

- `task()`: Create a task
- `runAlways`: Force task execution

**Key Features:**

- Dependency management (tasks, files, async files)
- Target file tracking
- Up-to-date checking
- Manifest integration

### `/core/taskManifest.ts`

**Purpose:** Task-specific manifest data.

**Primary Class:**

- `TaskManifest`: Implements `ITaskManifest`
  - Tracks file data per task
  - Manages execution timestamps
  - Serialization support

### `/core/file/TrackedFile.ts`

**Purpose:** File dependency tracking implementation.

**Primary Class:**

- `TrackedFile`: Concrete file tracking
  - Path resolution
  - Hash/timestamp calculation
  - Up-to-date checking
  - Task association

**Types:**

- `FileParams`: File configuration
- `GetFileHash`: Custom hasher type
- `GetFileTimestamp`: Custom timestamp getter

**Functions:**

- `file()`, `trackFile()`: Create tracked files
- `isTrackedFile()`: Type guard

### `/core/file/TrackedFilesAsync.ts`

**Purpose:** Async file generation support.

**Primary Class:**

- `TrackedFilesAsync`: Wrapper for async file generators

**Types:**

- `GenTrackedFiles`: File generator function type

**Functions:**

- `asyncFiles()`: Create async file dependencies
- `isTrackedFileAsync()`: Type guard

## CLI Components

### `/cli/cli.ts`

**Purpose:** Main CLI execution logic.

**Primary Functions:**

- `execCli()`: Main entry point for CLI execution
- `execBasic()`: Simplified execution for testing
- `main()`: Convenience wrapper for user scripts

**Types:**

- `ExecResult`: Execution result type

**Key Features:**

- Task registration and setup
- Manifest loading/saving
- Error handling

### `/cli/builtinTasks.ts`

**Purpose:** Built-in task definitions.

**Exported Tasks:**

- `clean`: Remove tracked target files
- `list`: Display available tasks
- `tabcompletion`: Generate bash completion

### `/cli/logging.ts`

**Purpose:** Logging configuration and handlers.

**Classes:**

- `StdErrPlainHandler`: Plain text stderr output
- `StdErrHandler`: Colored stderr output

**Functions:**

- `setupLogging()`: Configure logging system
- `getLogger()`: Get user logger instance

### `/cli/utils.ts`

**Purpose:** CLI utility functions.

**Functions:**

- `showTaskList()`: Display task list
- `echoBashCompletionScript()`: Generate bash completion

## Entry Points and Main Files

### `/main.ts`

**Purpose:** Primary dnit executable entry point.

**Key Features:**

- Version display
- Logging setup
- User script launching

### `/mod.ts`

**Purpose:** Clean module exports organized by category.

**Exports:**

- Core types and interfaces
- Task and file implementations
- CLI utilities
- Manifest handling

### `/dnit.ts`

**Purpose:** Legacy compatibility re-export.

**Note:** Re-exports everything from `mod.ts` for backward compatibility

### `/cli.ts`

**Purpose:** CLI re-export for compatibility.

**Exports:** Re-exports from `/cli/` subdirectory

## Data Persistence

### `/manifest.ts`

**Purpose:** Root manifest management.

**Primary Class:**

- `Manifest`: Implements `IManifest`
  - File persistence
  - Schema validation
  - Task manifest management

## Utilities

### `/launch.ts`

**Purpose:** User script discovery and execution.

**Types:**

- `UserSource`: Found script information

**Functions:**

- `findUserSource()`: Recursive script search
- `launch()`: Execute user scripts
- `checkValidDenoVersion()`: Version validation

**Key Features:**

- Searches for `dnit/main.ts` or `dnit/dnit.ts`
- Import map support
- Version checking via `.denoversion`

### `/asyncQueue.ts`

**Purpose:** Concurrent task execution management.

**Primary Class:**

- `AsyncQueue<TArgs, TResult>`: Generic queue implementation

### `/textTable.ts`

**Purpose:** Text table formatting for CLI output.

**Function:**

- `textTable()`: Format data as aligned table

### `/utils.ts`

**Purpose:** General utilities (if present).

### `/utils/filesystem.ts`

**Purpose:** File system operations.

**Functions:**

- `statPath()`: Safe file stats
- `deletePath()`: Recursive deletion
- `getFileSha1Sum()`: SHA1 calculation
- `getFileTimestamp()`: Modification time
- Additional path and glob utilities

### `/utils/git.ts`

**Purpose:** Git integration utilities.

### `/utils/process.ts`

**Purpose:** Process execution utilities.

### `/version.ts`

**Purpose:** Version information.

**Export:**

- `version`: Current dnit version string

## Configuration Files

### `/deno.json`

**Purpose:** Deno configuration.

**Contents:**

- Package metadata
- Import mappings for @std libraries
- Formatter settings

### `/deno.lock`

**Purpose:** Dependency lock file.

### `/REFACTORING_PLAN.md`

**Purpose:** Documentation of refactoring goals and progress.

## Test Files

### `/tests/basic.test.ts`

**Purpose:** Core functionality tests.

**Test Coverage:**

- Task dependencies
- Async file dependencies
- Target creation and cleaning

### `/tests/asyncQueue.test.ts`

**Purpose:** Async queue tests.

## Example and Tool Directories

### `/example/`

**Purpose:** Working example project.

### `/dnit/`

**Purpose:** Dnit's own build configuration.

### `/tools/`

**Purpose:** Additional tooling.

## Key Architectural Improvements

1. **Interface Segregation**: Clear separation between interfaces and
   implementations
2. **Module Organization**: Related functionality grouped in subdirectories
3. **Dependency Inversion**: Core modules depend on interfaces, not concrete
   implementations
4. **Single Responsibility**: Each file has a focused purpose
5. **Type Safety**: Comprehensive type definitions with Zod validation
6. **Testability**: Clean interfaces enable easier testing and mocking
