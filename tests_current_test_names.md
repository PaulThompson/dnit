# Test Names from Current tests/ Directory

## asyncQueue.test.ts (1 test)

1. "async queue"

## basic.test.ts (4 tests)

1. "basic test - two tasks with dependency"
2. "task up to date"
3. "async file deps test"
4. "tasks with target and clean"

## cli.test.ts (4 tests)

1. "CLI - execCli executes the requested task"
2. "CLI - execCli defaults to list task when no args"
3. "CLI - execCli handles non-existent task"
4. "CLI - execCli handles task execution errors"

## filesystem.test.ts (1 test with 15 sub-tests)

1. "filesystem utilities" (with sub-tests via t.step):
   - "statPath - file exists"
   - "statPath - file does not exist"
   - "statPath - directory exists"
   - "statPath - permission error propagates"
   - "deletePath - file exists"
   - "deletePath - directory with contents"
   - "deletePath - file does not exist (no error)"
   - "getFileSha1Sum - text file"
   - "getFileSha1Sum - binary file"
   - "getFileSha1Sum - empty file"
   - "getFileSha1Sum - large file"
   - "getFileSha1Sum - nonexistent file throws"
   - "getFileTimestamp - valid file"
   - "getFileTimestamp - file with no mtime"
   - "special characters in paths"

## task.test.ts (21 tests)

1. "Task - basic task creation"
2. "Task - task() function"
3. "Task - task with dependencies"
4. "Task - task with targets"
5. "Task - task with TrackedFilesAsync dependencies"
6. "Task - task with custom uptodate function"
7. "Task - runAlways uptodate helper"
8. "Task - empty task name is allowed"
9. "Task - duplicate target assignment throws error"
10. "Task - setup registers targets"
11. "Task - setup with task dependencies"
12. "Task - exec marks task as done"
13. "Task - exec skips already done tasks"
14. "Task - exec skips in-progress tasks"
15. "Task - exec with async action"
16. "Task - exec with uptodate check"
17. "Task - exec with runAlways"
18. "Task - reset cleans targets"
19. "Task - taskContext creation"
20. "Task - action receives TaskContext"
21. "Task - exec with file dependencies updates manifest"
22. "Task - task with mixed dependency types"
23. "Task - description is optional"

## textTable.test.ts (1 test with 11 sub-tests)

1. "textTable utilities" (with sub-tests via t.step):
   - "basic table with single row"
   - "empty table with headers only"
   - "multiple rows with varying lengths"
   - "single column table"
   - "table with special characters"
   - "table with empty cells"
   - "large table structure"
   - "column alignment and spacing"
   - "table with numbers and mixed content"
   - "consistent table formatting"
   - "table line structure"

## types.ts (1 test)

1. "type checks pass at runtime"

## uptodate.test.ts (12 tests)

1. "UpToDate - file modification detection by hash"
2. "UpToDate - timestamp-based change detection"
3. "UpToDate - custom uptodate function execution"
4. "UpToDate - runAlways behavior"
5. "UpToDate - task execution skipping when up-to-date"
6. "UpToDate - task runs when target is deleted"
7. "UpToDate - cross-run manifest state consistency"
8. "UpToDate - multiple file dependencies change detection"
9. "UpToDate - task with no dependencies always up-to-date"
10. "UpToDate - task with targets but no dependencies"
11. "UpToDate - custom uptodate with task context access"
12. "UpToDate - file disappears after initial tracking"

## Total Test Count

- **8 test files** (excluding helper files)
- **45 main test cases**
- **26 sub-tests** (via t.step)
- **Total: ~71 individual test cases**

## Comparison with tests_junk

### Coverage Differences

**Better Coverage in Current Tests:**

- AsyncQueue concurrency testing (not in old tests)
- Filesystem utilities (comprehensive new coverage)
- Type checking tests (new)

**Lost Coverage from Old Tests:**

- TrackedFile class (27 tests → integrated into other tests)
- TrackedFilesAsync class (18 tests → reduced coverage)
- Dependencies testing (14 tests → integrated into basic and task tests)
- Git utilities (not in current tests)
- Launch/discovery functionality (not in current tests)
- Manifest persistence (not explicitly tested)
- Tab completion (not in current tests)
- Clean task specifics (integrated into basic tests)

### Consolidation Achieved:

- TaskContext tests merged into task.test.ts
- Manifest tests simplified
- Up-to-date logic consolidated
- CLI tests streamlined
- Target/dependency tests merged
