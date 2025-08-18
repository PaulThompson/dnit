# Tests Junk Directory - Test Summary

This directory contains old test files from an earlier version of the Dnit codebase. These tests have structural issues and are outdated, but provide insights into what functionality was being tested.

## Test Files Overview

### TaskContext.test.ts
**Purpose**: Tests the TaskContext creation and functionality
- Tests creating task contexts from execution contexts
- Verifies context properties (logger, task, args, exec)
- Tests task context isolation between different tasks
- Validates interface compliance
- Tests context access to manifest, task scheduling, and task lookup

### TrackedFile.test.ts
**Purpose**: Tests file tracking functionality for dependency management
- Tests basic file creation and existence checking
- Tests hash calculation (default SHA1 and custom hash functions)
- Tests timestamp tracking (default and custom timestamp functions)
- Tests file deletion capabilities
- Tests up-to-date checking based on file changes
- Tests task assignment to tracked files
- Tests binary and large file handling
- Tests permission handling scenarios

### TrackedFilesAsync.test.ts
**Purpose**: Tests asynchronous file collection functionality
- Tests sync and async generator functions for file discovery
- Tests file pattern matching and directory scanning
- Tests dynamic file list generation
- Tests error handling in generators
- Tests performance with many files
- Tests concurrent access to generators

### cli.test.ts
**Purpose**: Tests CLI functionality and builtin commands
- Tests builtin `clean` task for removing tracked files
- Tests builtin `tabcompletion` task for bash completion
- Tests `list` command with quiet mode
- Tests task execution with file dependencies
- Tests CLI error handling
- Tests manifest saving after execution
- Tests concurrent task setup

### dependencies.test.ts
**Purpose**: Tests dependency resolution and execution order
- Tests task → task dependencies
- Tests file → task dependencies
- Tests mixed dependency types (tasks, files, async files)
- Tests complex dependency chains and diamond patterns
- Tests circular dependency handling
- Tests target registry population
- Tests dependency execution preventing duplicate runs

### git.test.ts
**Purpose**: Tests Git utility functions
- Tests `gitIsClean()` for checking repository status
- Tests `gitLastCommitMessage()` for retrieving commit messages
- Tests `gitLatestTag()` for finding version tags
- Tests `fetchTags` task for fetching remote tags
- Tests `requireCleanGit` task for enforcing clean status
- Tests handling of `--ignore-unclean` flag

### launch.test.ts
**Purpose**: Tests Dnit project discovery and launch process
- Tests finding `main.ts` and `dnit.ts` in dnit subdirectory
- Tests alternative paths (deno/dnit)
- Tests import map discovery and usage
- Tests `.denoversion` file validation
- Tests parent directory traversal for finding dnit source
- Tests permissions and flags setup
- Tests command line argument passing

### manifest.test.ts
**Purpose**: Tests manifest persistence system
- Tests loading and saving manifest files
- Tests handling of non-existent and invalid manifest files
- Tests task data persistence
- Tests multiple save/load cycles
- Tests concurrent access handling (last write wins)
- Tests manifest JSON structure validation

### manifestSchemas.test.ts
**Purpose**: Tests Zod schema validation for manifest data
- Tests TaskNameSchema, TrackedFileNameSchema, TrackedFileHashSchema
- Tests TimestampSchema validation
- Tests TrackedFileDataSchema structure
- Tests TaskDataSchema with lastExecution and trackedFiles
- Tests ManifestSchema complete structure validation
- Tests nested validation errors

### process.test.ts
**Purpose**: Simple test for process execution utility
- Tests `run()` function for executing shell commands
- Minimal test coverage (single test case)

### tabcompletion.test.ts
**Purpose**: Tests bash tab completion functionality
- Tests bash completion script generation
- Tests proper bash syntax and structure
- Tests task list integration for completion
- Tests handling of builtin and user tasks
- Tests script consistency across multiple generations
- Tests filename completion support
- Tests handling of complex task names

### targets.test.ts
**Purpose**: Tests target file management
- Tests target file creation and validation
- Tests multiple targets per task
- Tests target file conflicts and overwrites
- Tests clean operation functionality
- Tests target tracking in manifest
- Tests nested directory targets
- Tests empty targets array handling
- Tests target deletion and recreation

### taskManifest.test.ts
**Purpose**: Tests TaskManifest data structure
- Tests constructor with empty and populated data
- Tests `getFileData()` and `setFileData()` methods
- Tests execution timestamp tracking
- Tests `toData()` serialization
- Tests round-trip data consistency
- Tests multiple file operations
- Tests handling of empty tracked files

### textTable.test.ts
**Purpose**: Tests text table formatting utility
- Tests basic table creation with headers and rows
- Tests empty tables and single column tables
- Tests special characters and unicode support
- Tests empty cells handling
- Tests column alignment and spacing
- Tests consistent formatting
- Tests table structure with box drawing characters

### uptodate.test.ts
**Purpose**: Tests up-to-date checking logic
- Tests file modification detection by hash
- Tests timestamp-based change detection
- Tests custom uptodate function execution
- Tests `runAlways` behavior
- Tests task execution skipping when up-to-date
- Tests behavior when targets are deleted
- Tests cross-run manifest state consistency
- Tests multiple file dependencies
- Tests context access in custom uptodate functions

## Common Issues in These Tests

1. **Import paths**: Many tests use older import patterns that may not match current module structure
2. **Mock objects**: Tests create custom mock objects instead of using proper test utilities
3. **Test isolation**: Some tests may have side effects or depend on global state
4. **File system operations**: Heavy reliance on temporary files without consistent cleanup
5. **Async handling**: Mixed patterns for handling asynchronous operations
6. **Test organization**: Tests are not well-organized by feature or domain

## Recommendations

These tests should be:
1. Migrated to match the current codebase structure
2. Reorganized into feature-specific test suites
3. Updated to use modern testing patterns and utilities
4. Cleaned up to ensure proper test isolation
5. Enhanced with better error handling and edge case coverage

