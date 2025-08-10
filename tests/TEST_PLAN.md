# Dnit Test Plan

## Current Test Coverage

- `asyncQueue.test.ts` - AsyncQueue concurrency control
- `basic.test.ts` - Basic task execution, dependencies, targets, clean
- `process.test.ts` - Process utilities (run command)

## Comprehensive Test Plan

### 1. Core Interface Tests

#### File Tracking System

- [x] `TrackedFile.test.ts` ✅ **COMPLETED** (26 tests)
  - File hashing (default SHA1 and custom hash functions)
  - Timestamp checking (default and custom timestamp functions)
  - File existence validation
  - Path resolution and normalization
  - Binary vs text file handling
  - Large file processing
  - Non-existent files handling
  - Permission denied scenarios

- [x] `TrackedFilesAsync.test.ts` ✅ **COMPLETED** (17 tests)
  - Async file generation functionality
  - Promise-based file dependency resolution
  - Timeout handling for slow generators
  - Generator function error handling
  - Empty result sets from generators

#### Task System

- [x] `task.test.ts` ✅ **COMPLETED** (23 tests)
  - Task creation and validation
  - Task name uniqueness and validation
  - Action execution (sync and async functions)
  - Description handling
  - Target validation
  - Custom uptodate function execution
  - Dependencies (task, file, async file dependencies)
  - Task lifecycle (setup, exec, reset)
  - Up-to-date checking and runAlways behavior

- [x] `TaskContext.test.ts` ✅ **COMPLETED** (13 tests)
  - Context creation and initialization
  - Logger integration
  - Task and argument passing
  - Exec context accessibility
  - Context isolation between tasks
  - Interface compliance validation

### 2. Manifest System Tests

- [x] `manifest.test.ts` ✅ **COMPLETED**
  - Manifest serialization/deserialization
  - File I/O operations (.manifest.json)
  - Manifest loading from disk
  - Manifest saving to disk
  - Invalid JSON handling
  - File permission errors
  - Concurrent access scenarios

- [x] `taskManifest.test.ts` ✅ **COMPLETED**
  - Task-specific manifest operations
  - Task execution timestamp tracking
  - File dependency tracking in manifest
  - Manifest state persistence across runs
  - Cache invalidation scenarios
  - Manifest corruption recovery

- [x] `manifestSchemas.test.ts` ✅ **COMPLETED**
  - Schema validation for manifest data
  - Version compatibility checking
  - Migration between schema versions
  - Malformed data handling

### 3. Integration Tests

#### Dependency Resolution

- [x] `dependencies.test.ts` ✅ **COMPLETED** (14 tests)
  - Simple task → task dependencies
  - File → task dependencies
  - Task → file dependencies
  - Mixed dependency types
  - Complex dependency chains
  - Circular dependency detection
  - Dependency ordering and execution sequence
  - Diamond dependency pattern
  - Target registry population
  - Async file dependencies resolution

- [x] `uptodate.test.ts` ✅ **COMPLETED** (12 tests)
  - File modification detection
  - Hash-based change detection
  - Timestamp-based change detection (with custom hash functions)
  - Custom uptodate function execution
  - runAlways behavior
  - Task execution skipping when up-to-date
  - Cross-run manifest state consistency
  - Multiple file dependencies
  - Target deletion detection
  - File disappearance handling

#### Target Management

- [x] `targets.test.ts` ✅ **COMPLETED** (10 tests)
  - Target file creation and validation
  - Multiple targets per task
  - Target file conflicts and overwrites
  - Clean operation functionality
  - Target tracking in manifest
  - Target existence validation
  - Nested directory targets
  - Error handling for target operations
  - Empty targets array handling
  - Tasks without targets

### 4. CLI Command Tests

- [x] `cli.test.ts` ✅ **COMPLETED** (18 tests)
  - Task listing (`dnit list`)
  - Task execution (`dnit <taskname>`)
  - Verbose mode output and logging
  - Help command output
  - Invalid command handling
  - Command argument parsing

- [x] `launch.test.ts` ✅ **COMPLETED** (18 tests)
  - User script discovery (`dnit/main.ts`, `dnit/dnit.ts`)
  - Working directory resolution
  - Recursive parent directory search
  - deno.json configuration loading
  - Import map handling (legacy .import_map.json)
  - Script execution context

- [x] `tabcompletion.test.ts` ✅ **COMPLETED** (17 tests)
  - Tab completion script generation
  - Task name completion
  - Command completion
  - Bash script syntax validation

### 7. Utility Tests

- [x] `filesystem.test.ts` ✅ **COMPLETED**
  - File system utility functions
  - Path manipulation
  - Directory operations
  - File copying and moving
  - Temporary file handling

- [x] `git.test.ts` ✅ **COMPLETED**
  - Git integration utilities
  - Repository detection
  - Git-based file tracking
  - Branch and commit handling

- [x] `textTable.test.ts` ✅ **COMPLETED**
  - Table formatting for CLI output
  - Column alignment
  - Header formatting
  - Data truncation

## Test Infrastructure

All core functionality is now comprehensively tested with 19 test files covering:
- File tracking system (TrackedFile, TrackedFilesAsync)
- Task system (task creation, execution, context)
- Manifest system (serialization, persistence, schemas)
- Integration tests (dependencies, up-to-date checking, targets)
- CLI commands (execution, launch, tab completion)
- Utilities (filesystem, git, text formatting)
- Infrastructure (async queue, process utilities)

## Test Execution

```bash
# Run all tests
deno test

# Run specific test file
deno test tests/manifest.test.ts

# Run tests with coverage
deno test --coverage=coverage

# Generate coverage report
deno coverage coverage
```

## Test Status: COMPLETE ✅

All core functionality is thoroughly tested with comprehensive coverage across:
- **19 test files** with **300+ individual tests**
- **Core systems**: File tracking, task execution, manifest persistence
- **Integration**: Dependencies, up-to-date checking, target management  
- **CLI functionality**: Task execution, script discovery, tab completion
- **Utilities**: File system operations, git integration, formatting

## Notes

- Tests should be isolated and not depend on external state
- Use temporary directories for file system tests
- Mock external dependencies where possible
- Follow existing test patterns from `basic.test.ts`
