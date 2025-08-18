# Test Names from tests_junk Directory

## TaskContext.test.ts (15 tests)

1. "TaskContext - taskContext function creates context"
2. "TaskContext - context uses taskLogger from exec context"
3. "TaskContext - context preserves task reference"
4. "TaskContext - context preserves args reference"
5. "TaskContext - context provides access to exec context"
6. "TaskContext - context works with real Task instance"
7. "TaskContext - context allows logger access"
8. "TaskContext - context allows access to all exec context properties"
9. "TaskContext - context allows task scheduling through exec"
10. "TaskContext - context provides access to manifest"
11. "TaskContext - context allows getTaskByName lookup"
12. "TaskContext - context maintains isolation between different tasks"
13. "TaskContext - interface compliance"

## TrackedFile.test.ts (23 tests)

1. "TrackedFile - basic file creation"
2. "TrackedFile - file() function"
3. "TrackedFile - trackFile() alias"
4. "TrackedFile - isTrackedFile type guard"
5. "TrackedFile - file existence checking"
6. "TrackedFile - non-existent file"
7. "TrackedFile - default hash calculation"
8. "TrackedFile - known hash values"
9. "TrackedFile - custom hash function"
10. "TrackedFile - async custom hash function"
11. "TrackedFile - default timestamp"
12. "TrackedFile - custom timestamp function"
13. "TrackedFile - async custom timestamp function"
14. "TrackedFile - file deletion"
15. "TrackedFile - delete non-existent file"
16. "TrackedFile - getFileData"
17. "TrackedFile - isUpToDate with matching data"
18. "TrackedFile - isUpToDate with changed content"
19. "TrackedFile - isUpToDate with undefined data"
20. "TrackedFile - getFileDataOrCached up to date"
21. "TrackedFile - getFileDataOrCached not up to date"
22. "TrackedFile - task assignment"
23. "TrackedFile - duplicate task assignment throws error"
24. "TrackedFile - path resolution"
25. "TrackedFile - binary file handling"
26. "TrackedFile - large file handling"
27. "TrackedFile - permission denied scenarios"

## TrackedFilesAsync.test.ts (18 tests)

1. "TrackedFilesAsync - basic creation"
2. "TrackedFilesAsync - asyncFiles function"
3. "TrackedFilesAsync - isTrackedFileAsync type guard"
4. "TrackedFilesAsync - sync generator returning empty array"
5. "TrackedFilesAsync - async generator returning empty array"
6. "TrackedFilesAsync - sync generator with files"
7. "TrackedFilesAsync - async generator with files"
8. "TrackedFilesAsync - generator with delayed execution"
9. "TrackedFilesAsync - generator returning mixed file types"
10. "TrackedFilesAsync - generator with file discovery pattern"
11. "TrackedFilesAsync - generator with glob-like pattern"
12. "TrackedFilesAsync - generator error handling"
13. "TrackedFilesAsync - generator returning non-array"
14. "TrackedFilesAsync - generator with network simulation"
15. "TrackedFilesAsync - performance with many files"
16. "TrackedFilesAsync - concurrent access to same generator"
17. "TrackedFilesAsync - memory usage with large result sets"

## cli.test.ts (12 tests)

1. "CLI - builtin clean task with no args cleans all tasks"
2. "CLI - builtin clean task with specific task args"
3. "CLI - builtin tabcompletion task generates bash script"
4. "CLI - execBasic sets up exec context properly"
5. "CLI - showTaskList function with normal output"
6. "CLI - showTaskList function with quiet output"
7. "CLI - showTaskList handles tasks without descriptions"
8. "CLI - execCli handles task execution errors"
9. "CLI - execCli saves manifest after successful execution"
10. "CLI - builtin tasks are always registered"
11. "CLI - task execution with file dependencies"
12. "CLI - concurrent task setup"

## dependencies.test.ts (14 tests)

1. "Dependencies - simple task → task dependencies"
2. "Dependencies - file → task dependencies"
3. "Dependencies - task → file dependencies (target)"
4. "Dependencies - mixed dependency types"
5. "Dependencies - complex dependency chain"
6. "Dependencies - diamond dependency pattern"
7. "Dependencies - circular dependency detection"
8. "Dependencies - dependency ordering with multiple levels"
9. "Dependencies - async file dependencies resolution"
10. "Dependencies - empty dependencies"
11. "Dependencies - task with file dependencies that don't exist"
12. "Dependencies - target registry population during setup"
13. "Dependencies - dependency execution prevents duplicate runs"
14. "Dependencies - task function creates proper dependencies"

## git.test.ts (2 tests + sub-tests)

1. "git utilities" (with 6 sub-tests via t.step):
   - "gitIsClean - basic functionality"
   - "gitLastCommitMessage - returns string"
   - "gitLatestTag - with valid prefix"
   - "gitLatestTag - with non-existent prefix"
   - "fetchTags task - properties"
   - "requireCleanGit task - properties"
   - "requireCleanGit task - with ignore-unclean flag"
   - "requireCleanGit task - behavior depends on git status"
2. "git utilities - error handling" (with 2 sub-tests):
   - "git commands fail gracefully"
   - "regex handling in gitLatestTag"

## launch.test.ts (17 tests)

1. "Launch - parseDotDenoVersionFile parses version requirement"
2. "Launch - parseDotDenoVersionFile handles multiline requirements"
3. "Launch - getDenoVersion returns current deno version"
4. "Launch - checkValidDenoVersion validates version ranges"
5. "Launch - finds main.ts in dnit subdirectory"
6. "Launch - finds dnit.ts in dnit subdirectory"
7. "Launch - finds source in alternative deno/dnit path"
8. "Launch - uses import map when available"
9. "Launch - handles .denoversion file validation success"
10. "Launch - handles .denoversion file validation failure"
11. "Launch - searches parent directories for dnit source"
12. "Launch - returns error when no dnit source found"
13. "Launch - prefers main.ts over dnit.ts"
14. "Launch - prefers import_map.json over .import_map.json"
15. "Launch - passes command line arguments to user script"
16. "Launch - sets correct permissions and flags"
17. "Launch - handles file system boundary correctly"
18. "Launch - stops at root directory"

## manifest.test.ts (12 tests)

1. "Manifest - constructor creates filename path"
2. "Manifest - constructor with custom filename"
3. "Manifest - load non-existent file"
4. "Manifest - save and load empty manifest"
5. "Manifest - save and load with task data"
6. "Manifest - load creates parent directory if needed"
7. "Manifest - load invalid JSON creates fresh manifest"
8. "Manifest - load invalid schema creates fresh manifest"
9. "Manifest - save creates valid JSON structure"
10. "Manifest - multiple save/load cycles preserve data"
11. "Manifest - handles empty tasks object"
12. "Manifest - concurrent access simulation"

## manifestSchemas.test.ts (11 tests)

1. "ManifestSchemas - TaskNameSchema validates strings"
2. "ManifestSchemas - TrackedFileNameSchema validates strings"
3. "ManifestSchemas - TrackedFileHashSchema validates strings"
4. "ManifestSchemas - TimestampSchema validates strings"
5. "ManifestSchemas - TrackedFileDataSchema validates correct structure"
6. "ManifestSchemas - TaskDataSchema validates correct structure"
7. "ManifestSchemas - ManifestSchema validates correct structure"
8. "ManifestSchemas - ManifestSchema handles empty tasks"
9. "ManifestSchemas - ManifestSchema handles complex nested structure"
10. "ManifestSchemas - TaskDataSchema rejects extra fields"
11. "ManifestSchemas - nested validation errors"

## process.test.ts (1 test)

1. "Process - run"

## tabcompletion.test.ts (17 tests)

1. "TabCompletion - echoBashCompletionScript generates valid bash script"
2. "TabCompletion - script contains proper bash syntax"
3. "TabCompletion - script includes sub-commands"
4. "TabCompletion - builtin tabcompletion task works"
5. "TabCompletion - task list integration for completion"
6. "TabCompletion - handles empty task list"
7. "TabCompletion - includes builtin tasks in completion"
8. "TabCompletion - completion script handles special characters"
9. "TabCompletion - script supports multiple completion scenarios"
10. "TabCompletion - script includes proper error handling"
11. "TabCompletion - completion works with user tasks"
12. "TabCompletion - task helper function creates proper task"
13. "TabCompletion - completion script generation is consistent"
14. "TabCompletion - script supports filename completion"
15. "TabCompletion - handles tasks with complex names"
16. "TabCompletion - bash completion variables are properly declared"
17. "TabCompletion - uses proper bash completion helper"

## targets.test.ts (10 tests)

1. "target file creation and validation"
2. "multiple targets per task"
3. "target file conflicts and overwrites"
4. "clean operation functionality"
5. "target tracking in manifest"
6. "target existence validation"
7. "target with subdirectories"
8. "target deletion error handling"
9. "empty targets array"
10. "task without targets"

## taskManifest.test.ts (13 tests)

1. "TaskManifest - constructor with empty data"
2. "TaskManifest - constructor with populated data"
3. "TaskManifest - getFileData returns undefined for non-existent file"
4. "TaskManifest - getFileData returns correct data for existing file"
5. "TaskManifest - setFileData adds new file"
6. "TaskManifest - setFileData updates existing file"
7. "TaskManifest - setExecutionTimestamp sets current time"
8. "TaskManifest - setExecutionTimestamp updates existing timestamp"
9. "TaskManifest - toData returns correct structure"
10. "TaskManifest - toData after modifications"
11. "TaskManifest - round-trip data consistency"
12. "TaskManifest - multiple file operations"
13. "TaskManifest - handles empty tracked files"

## textTable.test.ts (1 test with 12 sub-tests)

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

- **15 test files**
- **Approximately 195 individual test cases** (including sub-tests)
