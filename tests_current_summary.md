# Current Tests Directory - Summary

This directory contains the current, well-structured tests for the Dnit
codebase. These tests follow modern testing patterns and are properly organized.

## Test Files Overview

### asyncQueue.test.ts

**Purpose**: Tests the AsyncQueue utility for managing concurrent task execution

- Tests concurrency limits from 1 to 32
- Verifies that maximum in-progress tasks never exceed the concurrency limit
- Uses a TestConcurrency helper class to track concurrent executions

### basic.test.ts

**Purpose**: Tests basic Dnit functionality and core task behaviors

- Tests task dependency execution order
- Tests up-to-date checking with file modifications
- Tests async file dependencies
- Tests target file creation and clean operations

### cli.test.ts

**Purpose**: Tests CLI command execution and error handling

- Tests task execution via execCli
- Tests default list behavior when no arguments provided
- Tests handling of non-existent tasks
- Tests error handling and propagation
- Uses TestLogCapture to verify output

### filesystem.test.ts

**Purpose**: Tests filesystem utility functions

- Tests statPath for files, directories, and non-existent paths
- Tests deletePath for files and directories
- Tests getFileSha1Sum for various file types (text, binary, empty, large)
- Tests getFileTimestamp functionality
- Tests permission error handling
- Tests special characters in paths

### task.test.ts

**Purpose**: Comprehensive tests for Task class functionality

- Tests basic task creation and task() function
- Tests task dependencies (tasks, files, async files)
- Tests task targets and duplicate target detection
- Tests custom uptodate functions
- Tests task execution lifecycle (setup, exec, reset)
- Tests TaskContext creation and usage
- Tests manifest updates for file dependencies
- Tests runAlways behavior

### textTable.test.ts

**Purpose**: Tests text table formatting utility

- Tests basic table rendering with box drawing characters
- Tests empty tables with headers only
- Tests varying column widths and alignments
- Tests special characters and unicode support
- Tests empty cells handling
- Tests consistent formatting across identical inputs

### uptodate.test.ts

**Purpose**: Tests up-to-date checking logic

- Tests file modification detection by hash
- Tests timestamp-based change detection
- Tests custom uptodate function execution
- Tests runAlways behavior
- Tests task execution skipping when up-to-date
- Tests behavior when targets are deleted
- Tests cross-run manifest state consistency
- Tests multiple file dependencies
- Tests tasks with no dependencies
- Tests file disappearance handling

### types.ts

**Purpose**: Compile-time type checking for Zod schemas

- Ensures Zod schemas match TypeScript interfaces
- Uses type-level assertions to catch schema drift
- Tests runtime verification of type checks

## Helper Files

### testLogging.ts

**Purpose**: Test logging utilities

- Provides TestCaptureHandler for capturing log output
- Creates test loggers with stdout/stderr capture
- Returns ILoggers interface for test contexts

### utils.ts

**Purpose**: Common test utilities

- `createTempDir()`: Creates temporary directories with cleanup
- `createFileInDir()`: Creates test files in directories
- Handles cleanup and error cases properly

## Test Organization

The current tests are well-organized with:

1. **Clear separation of concerns** - Each test file focuses on a specific
   module or functionality
2. **Proper test isolation** - Tests use temporary directories and cleanup
3. **Comprehensive coverage** - Tests cover normal cases, edge cases, and error
   conditions
4. **Modern patterns** - Uses async/await, proper assertions, and test utilities
5. **Type safety** - Includes compile-time type checking tests

## Test Count Summary

- **asyncQueue.test.ts**: 1 test (with multiple concurrency levels)
- **basic.test.ts**: 4 tests
- **cli.test.ts**: 4 tests
- **filesystem.test.ts**: 1 test with 15 sub-tests
- **task.test.ts**: 21 tests
- **textTable.test.ts**: 1 test with 11 sub-tests
- **types.ts**: 1 test
- **uptodate.test.ts**: 12 tests

**Total**: Approximately 45 main tests with numerous sub-tests

## Key Differences from tests_junk

1. **Better Organization**: Tests are grouped by functionality rather than
   scattered
2. **Cleaner Code**: No duplicate mocking code, uses shared utilities
3. **Proper Isolation**: Consistent use of temp directories and cleanup
4. **Modern Patterns**: Uses current Deno testing best practices
5. **Type Safety**: Includes compile-time type checking
6. **Less Duplication**: Consolidated related tests into single files
7. **Better Coverage**: More focused on testing actual behavior rather than
   implementation details
