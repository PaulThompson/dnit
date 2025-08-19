#!/usr/bin/env -S deno run --allow-read

/**
 * Script to analyze test files and identify assertions that could use more specific assert functions
 */

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.224.0/path/mod.ts";

interface AssertIssue {
  file: string;
  line: number;
  code: string;
  suggestion: string;
}

const issues: AssertIssue[] = [];

// Patterns to detect and their suggested improvements
const patterns = [
  // Patterns for assert() with comparisons
  {
    // assert(x <= y) -> assertLessOrEqual(x, y)
    pattern: /assert\s*\(\s*(.+?)\s*<=\s*(.+?)\s*\)/g,
    suggestion: "Use assertLessOrEqual() for better error messages",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertLessOrEqual(${left}, ${right})`;
    }
  },
  {
    // assert(x >= y) -> assertGreaterOrEqual(x, y)
    pattern: /assert\s*\(\s*(.+?)\s*>=\s*(.+?)\s*\)/g,
    suggestion: "Use assertGreaterOrEqual() for better error messages",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertGreaterOrEqual(${left}, ${right})`;
    }
  },
  {
    // assert(x < y) -> assertLess(x, y) (but exclude .has() calls)
    pattern: /assert\s*\(\s*([^<]+?)\s*<\s*(.+?)\s*\)/g,
    suggestion: "Use assertLess() for better error messages",
    getImprovement: (match: string, left: string, right: string) => {
      // Skip if this is a .has() method call
      if (match.includes('.has(')) {
        return null;
      }
      return `assertLess(${left}, ${right})`;
    }
  },
  {
    // assert(x > y) -> assertGreater(x, y) (but exclude .has() calls)
    pattern: /assert\s*\(\s*([^>]+?)\s*>\s*(.+?)\s*\)/g,
    suggestion: "Use assertGreater() for better error messages",
    getImprovement: (match: string, left: string, right: string) => {
      // Skip if this is a .has() method call
      if (match.includes('.has(')) {
        return null;
      }
      return `assertGreater(${left}, ${right})`;
    }
  },
  {
    // assert(x !== null) -> assertExists(x)
    pattern: /assert\s*\(\s*(.+?)\s*!==?\s*null\s*\)/g,
    suggestion: "Use assertExists() for better null/undefined checks",
    getImprovement: (match: string, expr: string) => {
      return `assertExists(${expr})`;
    }
  },
  {
    // assert(x !== undefined) -> assertExists(x)
    pattern: /assert\s*\(\s*(.+?)\s*!==?\s*undefined\s*\)/g,
    suggestion: "Use assertExists() for better null/undefined checks",
    getImprovement: (match: string, expr: string) => {
      return `assertExists(${expr})`;
    }
  },
  // Patterns for assertEquals with boolean literals
  {
    // assertEquals(x, true) -> assert(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assert() for truthy checks",
    getImprovement: (match: string, expr: string) => {
      // Special cases that should use specific assertions
      if (expr.includes('.exists()')) {
        return `assert(${expr})`;
      } else if (expr.includes('.has(')) {
        return `assert(${expr})`;
      } else if (expr.includes('!==') || expr.includes('!=')) {
        return `assert(${expr})`;
      } else if (expr.includes('===') || expr.includes('==')) {
        return `assert(${expr})`;
      }
      return `assert(${expr})`;
    }
  },
  {
    // assertEquals(x, false) -> assertFalse(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*,\s*false\s*\)/g,
    suggestion: "Use assertFalse() for falsy checks",
    getImprovement: (match: string, expr: string) => {
      return `assertFalse(${expr})`;
    }
  },
  // Original patterns
  {
    // assertEquals(x !== null, true) -> assert(x !== null) or assertExists(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*!==?\s*null\s*,\s*true\s*\)/g,
    suggestion: "Use assert() or assertExists() instead",
    getImprovement: (match: string, expr: string) => {
      return `assert(${expr} !== null) or assertExists(${expr})`;
    }
  },
  {
    // assertEquals(x !== undefined, true) -> assert(x !== undefined) or assertExists(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*!==?\s*undefined\s*,\s*true\s*\)/g,
    suggestion: "Use assert() or assertExists() instead",
    getImprovement: (match: string, expr: string) => {
      return `assert(${expr} !== undefined) or assertExists(${expr})`;
    }
  },
  {
    // assertEquals(x === y, true) -> assertEquals(x, y) or assertStrictEquals(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*===\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertEquals() or assertStrictEquals() directly",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertEquals(${left}, ${right}) or assertStrictEquals(${left}, ${right})`;
    }
  },
  {
    // assertEquals(x === y, false) -> assertNotEquals(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*===\s*(.+?)\s*,\s*false\s*\)/g,
    suggestion: "Use assertNotEquals() instead",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertNotEquals(${left}, ${right})`;
    }
  },
  {
    // assertEquals(x > y, true) -> assertGreater(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*>\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertGreater() instead",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertGreater(${left}, ${right})`;
    }
  },
  {
    // assertEquals(x < y, true) -> assertLess(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*<\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertLess() instead",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertLess(${left}, ${right})`;
    }
  },
  {
    // assertEquals(x >= y, true) -> assertGreaterOrEqual(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*>=\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertGreaterOrEqual() instead",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertGreaterOrEqual(${left}, ${right})`;
    }
  },
  {
    // assertEquals(x <= y, true) -> assertLessOrEqual(x, y)
    pattern: /assertEquals\s*\(\s*(.+?)\s*<=\s*(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertLessOrEqual() instead",
    getImprovement: (match: string, left: string, right: string) => {
      return `assertLessOrEqual(${left}, ${right})`;
    }
  },
  // Note: typeof checks are intentionally excluded as they are the appropriate
  // pattern for checking primitive types at runtime in tests
  // e.g., assertEquals(typeof x, "string") is correct for primitives
  {
    // assertEquals(x instanceof Y, true) -> assertInstanceOf(x, Y)
    pattern: /assertEquals\s*\(\s*(.+?)\s+instanceof\s+(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assertInstanceOf() instead",
    getImprovement: (match: string, expr: string, type: string) => {
      return `assertInstanceOf(${expr}, ${type})`;
    }
  },
  {
    // assertEquals(x instanceof Y, false) -> assertNotInstanceOf(x, Y)
    pattern: /assertEquals\s*\(\s*(.+?)\s+instanceof\s+(.+?)\s*,\s*false\s*\)/g,
    suggestion: "Use assertNotInstanceOf() instead",
    getImprovement: (match: string, expr: string, type: string) => {
      return `assertNotInstanceOf(${expr}, ${type})`;
    }
  },
  {
    // assertEquals(!!x, true) -> assert(x)
    pattern: /assertEquals\s*\(\s*!!(.+?)\s*,\s*true\s*\)/g,
    suggestion: "Use assert() instead",
    getImprovement: (match: string, expr: string) => {
      return `assert(${expr})`;
    }
  },
  {
    // assertEquals(!!x, false) -> assertFalse(x)
    pattern: /assertEquals\s*\(\s*!!(.+?)\s*,\s*false\s*\)/g,
    suggestion: "Use assertFalse() instead",
    getImprovement: (match: string, expr: string) => {
      return `assertFalse(${expr})`;
    }
  },
  {
    // assertEquals(str.includes(substr), true) -> assertStringIncludes(str, substr)
    pattern: /assertEquals\s*\(\s*(.+?)\.includes\s*\(\s*(.+?)\s*\)\s*,\s*true\s*\)/g,
    suggestion: "Use assertStringIncludes() or assertArrayIncludes() instead",
    getImprovement: (match: string, str: string, substr: string) => {
      return `assertStringIncludes(${str}, ${substr}) or assertArrayIncludes(${str}, [${substr}])`;
    }
  },
  {
    // assertEquals(regex.test(str), true) -> assertMatch(str, regex)
    pattern: /assertEquals\s*\(\s*(.+?)\.test\s*\(\s*(.+?)\s*\)\s*,\s*true\s*\)/g,
    suggestion: "Use assertMatch() instead",
    getImprovement: (match: string, regex: string, str: string) => {
      return `assertMatch(${str}, ${regex})`;
    }
  }
];

async function analyzeFile(path: string) {
  const content = await Deno.readTextFile(path);
  const lines = content.split('\n');
  
  for (const { pattern, suggestion, getImprovement } of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      let charCount = 0;
      let lineNum = 0;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1; // +1 for newline
        if (charCount > match.index) {
          lineNum = i + 1;
          break;
        }
      }
      
      const improvement = getImprovement(match[0], ...match.slice(1));
      
      // Skip if improvement function returned null (pattern should be ignored)
      if (improvement === null) {
        continue;
      }
      
      issues.push({
        file: relative(Deno.cwd(), path),
        line: lineNum,
        code: match[0].trim(),
        suggestion: `${suggestion}\n  Suggested: ${improvement}`
      });
    }
  }
}

// Main execution
console.log("🔍 Analyzing test files for assertion improvements...\n");

for await (const entry of walk("tests", {
  exts: [".ts"],
  match: [/\.test\.ts$/]
})) {
  await analyzeFile(entry.path);
}

if (issues.length === 0) {
  console.log("✅ No assertion improvements found!");
} else {
  console.log(`Found ${issues.length} potential improvements:\n`);
  
  // Group by file
  const byFile = new Map<string, AssertIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file)!.push(issue);
  }
  
  // Print results
  for (const [file, fileIssues] of byFile) {
    console.log(`📄 ${file}`);
    for (const issue of fileIssues) {
      console.log(`  Line ${issue.line}: ${issue.code}`);
      console.log(`    💡 ${issue.suggestion}`);
      console.log();
    }
  }
  
  // Summary
  console.log("📊 Summary:");
  console.log(`  Total files analyzed: ${byFile.size}`);
  console.log(`  Total improvements suggested: ${issues.length}`);
  
  // Count by suggestion type
  const suggestionCounts = new Map<string, number>();
  for (const issue of issues) {
    const key = issue.suggestion.split('\n')[0];
    suggestionCounts.set(key, (suggestionCounts.get(key) || 0) + 1);
  }
  
  console.log("\n  By suggestion type:");
  for (const [suggestion, count] of suggestionCounts) {
    console.log(`    - ${suggestion}: ${count}`);
  }
}