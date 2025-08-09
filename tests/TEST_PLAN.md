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

- [ ] `task.test.ts`
  - Task creation and validation
  - Task name uniqueness and validation
  - Action execution (sync and async functions)
  - Description handling
  - Target validation
  - Custom uptodate function execution

- [ ] `TaskContext.test.ts`
  - Context creation and initialization
  - Logger integration
  - Task and argument passing
  - Exec context accessibility
  - Context isolation between tasks

### 2. Manifest System Tests

- [ ] `manifest.test.ts`
  - Manifest serialization/deserialization
  - File I/O operations (.manifest.json)
  - Manifest loading from disk
  - Manifest saving to disk
  - Invalid JSON handling
  - File permission errors
  - Concurrent access scenarios

- [ ] `taskManifest.test.ts`
  - Task-specific manifest operations
  - Task execution timestamp tracking
  - File dependency tracking in manifest
  - Manifest state persistence across runs
  - Cache invalidation scenarios
  - Manifest corruption recovery

- [ ] `manifestSchemas.test.ts`
  - Schema validation for manifest data
  - Version compatibility checking
  - Migration between schema versions
  - Malformed data handling

### 3. Integration Tests

#### Dependency Resolution

- [ ] `dependencies.test.ts`
  - Simple task → task dependencies
  - File → task dependencies
  - Task → file dependencies
  - Mixed dependency types
  - Complex dependency chains
  - Circular dependency detection
  - Dependency ordering and execution sequence

- [ ] `uptodate.test.ts`
  - File modification detection
  - Hash-based change detection
  - Timestamp-based change detection
  - Custom uptodate function execution
  - runAlways behavior
  - Task execution skipping when up-to-date
  - Cross-run manifest state consistency

#### Target Management

- [ ] `targets.test.ts`
  - Target file creation and validation
  - Multiple targets per task
  - Target file conflicts and overwrites
  - Clean operation functionality
  - Target tracking in manifest
  - Target existence validation

### 4. CLI Command Tests

- [ ] `cli.test.ts`
  - Task listing (`dnit list`)
  - Task execution (`dnit <taskname>`)
  - Verbose mode output and logging
  - Help command output
  - Invalid command handling
  - Command argument parsing

- [ ] `launch.test.ts`
  - User script discovery (`dnit/main.ts`, `dnit/dnit.ts`)
  - Working directory resolution
  - Recursive parent directory search
  - deno.json configuration loading
  - Import map handling (legacy .import_map.json)
  - Script execution context

- [ ] `tabcompletion.test.ts`
  - Tab completion script generation
  - Task name completion
  - Command completion
  - Bash script syntax validation

### 5. Error Handling and Edge Cases

- [ ] `errorHandling.test.ts`
  - Action function failures and exceptions
  - Dependency resolution failures
  - File system permission errors
  - Disk space issues
  - Network connectivity problems
  - Invalid user script syntax
  - Resource cleanup on failure

- [ ] `edgeCases.test.ts`
  - Empty task lists
  - Tasks with no dependencies
  - Tasks with no targets
  - Very long file paths
  - Special characters in file names
  - Unicode file names and content
  - Symlinks and junction points

### 6. Performance and Scalability Tests

- [ ] `performance.test.ts`
  - Large numbers of tasks (100+, 1000+)
  - Deep dependency trees (10+ levels)
  - Many file dependencies (100+, 1000+)
  - Large file processing
  - Memory usage optimization
  - Execution time benchmarks

- [ ] `concurrency.test.ts`
  - Parallel task execution validation
  - AsyncQueue concurrency limits
  - Resource contention handling
  - Task scheduling fairness
  - Deadlock prevention

### 7. Utility Tests

- [ ] `filesystem.test.ts`
  - File system utility functions
  - Path manipulation
  - Directory operations
  - File copying and moving
  - Temporary file handling

- [ ] `git.test.ts`
  - Git integration utilities
  - Repository detection
  - Git-based file tracking
  - Branch and commit handling

- [ ] `textTable.test.ts`
  - Table formatting for CLI output
  - Column alignment
  - Header formatting
  - Data truncation

### 8. Advanced Integration Tests

- [ ] `realWorld.test.ts`
  - Complete project build scenarios
  - Multi-step compilation pipelines
  - File generation and consumption chains
  - Error recovery and retry scenarios
  - Cross-platform compatibility

- [ ] `configurationHandling.test.ts`
  - deno.json configuration parsing
  - TypeScript compiler options
  - Import map resolution
  - Configuration inheritance
  - Invalid configuration handling

## Test Infrastructure

### Test Utilities

- [ ] `testHelpers.ts` - Common test utilities and fixtures
- [ ] `mockFilesystem.ts` - Mock file system for isolated testing
- [ ] `tempDirectory.ts` - Temporary directory management for tests

### Test Data

- [ ] `fixtures/` directory with sample files, manifests, and configurations
- [ ] `examples/` directory with realistic test scenarios

## Coverage Goals

- **Unit Tests**: 90%+ code coverage for core modules
- **Integration Tests**: All major workflows covered
- **Error Handling**: All error paths tested
- **Performance**: Baseline performance benchmarks established

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

## Priority Implementation Order

1. **High Priority**: Core functionality (manifest, file tracking, task
   execution)
2. **Medium Priority**: CLI commands, error handling
3. **Low Priority**: Performance tests, advanced integration scenarios

## Notes

- Tests should be isolated and not depend on external state
- Use temporary directories for file system tests
- Mock external dependencies where possible
- Follow existing test patterns from `basic.test.ts`
