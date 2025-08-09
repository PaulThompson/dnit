# Comparison: Current files.md vs Reorganise Branch

## Major Structural Changes

The current version represents a significant refactoring with the following key
differences:

### 1. Interface Segregation (NEW in current)

The current version introduces a dedicated `/interfaces/` directory with:

- `/interfaces/core/ITask.ts` - Task-related interfaces
- `/interfaces/core/IContext.ts` - Execution context interface
- `/interfaces/core/IManifest.ts` - Manifest persistence interfaces
- `/interfaces/core/ITrackedFile.ts` - File tracking interfaces
- `/interfaces/cli/ILogger.ts` - Logging interfaces
- `/interfaces/utils/IFileSystem.ts` - File system operation interfaces

**Reorganise branch**: No separate interface definitions - all types were in
implementation files.

### 2. File Organization Changes

#### Core Module Split

**Current version**:

- `/core/execContext.ts` - Execution context implementation
- `/core/taskInterface.ts` - Minimal task interface (breaks circular deps)
- `/core/TaskContext.ts` - Task context utilities
- `/core/file/TrackedFile.ts` - File tracking moved to subdirectory
- `/core/file/TrackedFilesAsync.ts` - Async files in subdirectory

**Reorganise branch**:

- `/core/context.ts` - Combined execution and task context
- `/core/task.ts` - Contained Task, TrackedFile, and TrackedFilesAsync all in
  one file

#### CLI Organization

**Current version**:

- `/cli/cli.ts` - Main CLI logic
- `/cli/builtinTasks.ts` - Separated built-in tasks
- `/cli/logging.ts` - Logging configuration
- `/cli/utils.ts` - CLI utilities

**Reorganise branch**:

- `/cli.ts` - Everything in one file

### 3. New/Modified Files

**New in current**:

- `/REFACTORING_PLAN.md` - Documentation of refactoring goals
- `/mod.ts` - Clean module exports organized by category
- `/dnit.ts` becomes legacy compatibility layer (was main export)
- `/cli.ts` becomes re-export file (was implementation)

**Removed/Not mentioned in current**:

- `/deps.ts` - Centralized dependencies (likely integrated elsewhere)

### 4. Type System Improvements

**Current version**:

- Interfaces defined separately from implementations
- Clear `I` prefix convention for interfaces (ITask, IContext, etc.)
- Better separation between user-facing types and internal types

**Reorganise branch**:

- Types and implementations mixed in same files
- Less clear separation of concerns

### 5. Key Architectural Improvements (listed in current)

1. **Interface Segregation**: Clear separation between interfaces and
   implementations
2. **Module Organization**: Related functionality grouped in subdirectories
3. **Dependency Inversion**: Core modules depend on interfaces, not concrete
   implementations
4. **Single Responsibility**: Each file has a focused purpose
5. **Type Safety**: Comprehensive type definitions with Zod validation
6. **Testability**: Clean interfaces enable easier testing and mocking

## Summary

The current version represents a major refactoring focused on:

- Better separation of concerns through interfaces
- More granular file organization
- Cleaner dependency management
- Improved testability and maintainability

The reorganise branch had a simpler, more monolithic structure with larger files
containing multiple responsibilities. The refactoring splits these into focused
modules with clear interfaces, making the codebase more modular and easier to
understand/test.
