# Dnit Test Organization Plan

Prioritized test areas from most critical user-facing functionality to internal
implementation details.

## 1. Core Task Execution (Critical User Functionality)

### 1.1 Basic Task Operations

- ✅ Execute single task
- ✅ Execute task with dependencies (task → task)
- ✅ Execute task with file dependencies (task → file)
- ✅ Execute async task actions
- ✅ Task execution order in dependency chains
- ✅ Diamond dependency pattern execution
- ⚠️ Circular dependency detection and handling
- ✅ Task execution with command-line arguments passed through

### 1.2 Up-to-Date Checking

- ✅ Skip execution when task is up-to-date
- ✅ Re-run when file dependency changes (hash-based)
- ✅ Re-run when file dependency changes (timestamp-based)
- ✅ Re-run when target file is deleted
- ✅ Custom up-to-date functions
- ✅ runAlways behavior (force execution)
- ✅ Multiple file dependencies tracking
- ✅ File disappearance detection
- ✅ Cross-run manifest state persistence

### 1.3 Target Management

- ✅ Create target files
- ✅ Clean target files (clean task)
- ✅ Multiple targets per task
- ✅ Target existence validation
- ✅ Nested directory targets
- ⚠️ Target conflict detection (partially tested)

## 2. CLI Interface (Primary User Interaction)

### 2.1 Command Execution

- ✅ Execute named task from CLI
- ✅ Default to list when no arguments
- ✅ Handle non-existent task errors
- ✅ Handle task execution failures
- ❌ Help command/documentation
- ❌ Verbose/quiet mode flags

### 2.2 Built-in Commands

- ✅ List tasks (with descriptions)
- ✅ List tasks (quiet mode for scripts)
- ⚠️ Clean specific tasks vs all tasks
- ❌ Tab completion generation (removed from current tests)

### 2.3 Error Handling & Reporting

- ✅ Task not found errors
- ✅ Task execution errors
- ❌ File permission errors
- ❌ Manifest corruption recovery
- ❌ Clear error messages with context

## 3. Project Discovery & Setup (User Experience)

### 3.1 Dnit Project Discovery

- ✅ Find dnit directory in current path
- ✅ Find dnit directory in parent paths
- ✅ Support alternative locations (deno/dnit)
- ✅ Handle missing dnit directory gracefully
- ✅ Prefer main.ts over dnit.ts

### 3.2 Source File Discovery

- ❌ Import map discovery and usage
- ❌ Handle missing source files

## 4. File Tracking System (Core Functionality)

### 4.1 TrackedFile Operations

- ✅ Track file by path
- ✅ Check file existence
- ✅ Calculate file hash (SHA-1)
- ✅ Get file timestamp
- ✅ Custom hash functions (size-based with constant timestamp)
- ✅ Custom timestamp functions (extracted from file content with constant hash)
- ✅ Binary file support
- ✅ Large file support
- ❌ Permission denied handling

### 4.2 TrackedFilesAsync Operations

- ✅ Basic async file collection
- ⚠️ Dynamic file discovery (glob patterns)
- ⚠️ Generator error handling
- ❌ Performance with many files
- ❌ Concurrent generator access

### 4.3 File System Utilities

- ✅ Check path existence (file/directory)
- ✅ Delete files and directories
- ✅ SHA-1 hash calculation
- ✅ Timestamp extraction
- ✅ Special characters in paths
- ✅ Permission error propagation

## 5. Dependency Management (Core Functionality)

### 5.1 Dependency Types

- ✅ Task dependencies
- ✅ File dependencies
- ✅ Async file dependencies
- ✅ Mixed dependency types

### 5.2 Dependency Resolution

- ✅ Simple dependency chains
- ✅ Complex/deep dependency trees
- ✅ Diamond dependency patterns
- ✅ Shared dependencies (no duplicate execution)
- ⚠️ Circular dependency handling

## 6. Manifest & Persistence (State Management)

### 6.1 Manifest Operations

- ⚠️ Load manifest from disk
- ⚠️ Save manifest to disk
- ⚠️ Create parent directories as needed
- ❌ Handle corrupt manifest files
- ❌ Manifest schema validation
- ❌ Concurrent access handling

### 6.2 Task State Tracking

- ✅ Track last execution time
- ✅ Track file hashes and timestamps
- ✅ Update manifest after execution
- ❌ Multiple save/load cycles
- ❌ State consistency across runs

## 7. Git Integration (Developer Workflow)

### 7.1 Git Status Operations

- ❌ Check if working directory is clean
- ❌ Get last commit message
- ❌ Get latest tag by prefix

### 7.2 Git Tasks

- ❌ Require clean git status
- ❌ Fetch tags from remote
- ❌ Handle --ignore-unclean flag

## 8. Developer Experience

### 8.1 Tab Completion

- ❌ Generate bash completion script
- ❌ List tasks for completion
- ❌ Handle complex task names
- ❌ Support filename completion

### 8.2 Output Formatting

- ✅ Text table rendering
- ✅ Unicode and special character support
- ✅ Column alignment
- ✅ Empty cell handling

### 8.3 Logging & Debugging

- ✅ Capture log output in tests
- ❌ Verbose mode logging
- ❌ Debug information output
- ❌ Performance metrics

## 9. Internal Implementation (Low Priority)

### 9.1 Task Context

- ✅ Create task context
- ✅ Pass context to actions
- ✅ Access logger from context
- ✅ Access exec context
- ✅ Context isolation between tasks

### 9.2 Async Queue

- ✅ Respect concurrency limits
- ✅ Schedule async operations
- ❌ Queue error handling
- ❌ Queue performance metrics

### 9.3 Type Safety

- ✅ Zod schema validation
- ✅ Type compatibility checks
- ❌ Runtime type validation
- ❌ Schema migration

## Test Coverage Summary

### Well Covered ✅

- Basic task execution
- Up-to-date checking
- File tracking fundamentals
- Simple dependency management
- CLI basic operations
- Output formatting

### Partially Covered ⚠️

- Target management edge cases
- Clean task variations
- Custom file tracking functions
- Manifest persistence
- Circular dependencies

### Missing Coverage ❌

- Git integration
- Tab completion
- Error recovery
- Performance testing
- Concurrent operations
- Developer debugging tools

## Recommendations

### Priority 1: Critical Gaps (User-Facing)

2. **Better Error Messages** - Users need clear feedback when things go wrong
3. **CLI Help/Documentation** - Users need to discover features

### Priority 2: Workflow Integration

1. **Git Integration** - Many workflows depend on git status
2. **Tab Completion** - Improves developer experience significantly

### Priority 3: Robustness

1. **Manifest Corruption Recovery** - Prevents data loss
2. **Permission Error Handling** - Common in real environments
3. **Concurrent Access** - Important for CI/CD scenarios

### Priority 4: Performance & Internals

1. **Large-Scale File Tracking** - Performance with many files
2. **Circular Dependency Detection** - Prevents infinite loops
3. **Schema Migration** - Future-proofing

## Notes on Test Consolidation

The current test suite is better organized but has lost important coverage.
Consider:

1. **Restore Git Tests** - Create `git.test.ts` for git integration
2. **Expand Manifest Tests** - Add corruption and concurrency tests
3. **Add Integration Tests** - Test complete workflows end-to-end
4. **Add Performance Tests** - Benchmark with large projects
