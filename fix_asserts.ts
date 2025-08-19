#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Script to automatically fix common assertion patterns with more specific assert functions
 */

import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.224.0/path/mod.ts";

interface Replacement {
  pattern: RegExp;
  replace: (match: string, ...args: string[]) => string;
  imports: string[];
  description: string;
}

const replacements: Replacement[] = [
  // Patterns for assert() with comparisons - process these first
  {
    // assert(x <= y) -> assertLessOrEqual(x, y)
    pattern: /assert\s*\(\s*(.+?)\s*<=\s*(.+?)\s*\)/g,
    replace: (match, left, right) => `assertLessOrEqual(${left}, ${right})`,
    imports: ["assertLessOrEqual"],
    description: "Replace <= comparisons with assertLessOrEqual"
  },
  {
    // assert(x >= y) -> assertGreaterOrEqual(x, y)
    pattern: /assert\s*\(\s*(.+?)\s*>=\s*(.+?)\s*\)/g,
    replace: (match, left, right) => `assertGreaterOrEqual(${left}, ${right})`,
    imports: ["assertGreaterOrEqual"],
    description: "Replace >= comparisons with assertGreaterOrEqual"
  },
  {
    // assert(x < y) -> assertLess(x, y)
    pattern: /assert\s*\(\s*([^<]+?)\s*<\s*([^=].+?)\s*\)/g,
    replace: (match, left, right) => `assertLess(${left}, ${right})`,
    imports: ["assertLess"],
    description: "Replace < comparisons with assertLess"
  },
  {
    // assert(x > y) -> assertGreater(x, y)
    pattern: /assert\s*\(\s*([^>]+?)\s*>\s*([^=].+?)\s*\)/g,
    replace: (match, left, right) => `assertGreater(${left}, ${right})`,
    imports: ["assertGreater"],
    description: "Replace > comparisons with assertGreater"
  },
  {
    // assert(x !== null) -> assertExists(x)
    pattern: /assert\s*\(\s*(.+?)\s*!==?\s*null\s*\)/g,
    replace: (match, expr) => `assertExists(${expr})`,
    imports: ["assertExists"],
    description: "Replace null checks with assertExists"
  },
  {
    // assert(x !== undefined) -> assertExists(x)
    pattern: /assert\s*\(\s*(.+?)\s*!==?\s*undefined\s*\)/g,
    replace: (match, expr) => `assertExists(${expr})`,
    imports: ["assertExists"],
    description: "Replace undefined checks with assertExists"
  },
  
  // Patterns for assertEquals with boolean literals
  {
    // assertEquals(x, true) -> assert(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, expr) => `assert(${expr})`,
    imports: ["assert"],
    description: "Replace assertEquals(x, true) with assert"
  },
  {
    // assertEquals(x, false) -> assertFalse(x)
    pattern: /assertEquals\s*\(\s*(.+?)\s*,\s*false\s*\)/g,
    replace: (match, expr) => `assertFalse(${expr})`,
    imports: ["assertFalse"],
    description: "Replace assertEquals(x, false) with assertFalse"
  },
  
  // assertEquals(x.includes(y), true) -> assertStringIncludes(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\.includes\s*\(\s*(.+?)\s*\)\s*,\s*true\s*\)/g,
    replace: (match, expr, substr) => `assertStringIncludes(${expr}, ${substr})`,
    imports: ["assertStringIncludes"],
    description: "Replace .includes() checks with assertStringIncludes"
  },
  
  // assertEquals(x instanceof Y, true) -> assertInstanceOf(x, Y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s+instanceof\s+(.+?)\s*,\s*true\s*\)/g,
    replace: (match, expr, type) => `assertInstanceOf(${expr}, ${type})`,
    imports: ["assertInstanceOf"],
    description: "Replace instanceof checks with assertInstanceOf"
  },
  
  // assertEquals(x instanceof Y, false) -> assertNotInstanceOf(x, Y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s+instanceof\s+(.+?)\s*,\s*false\s*\)/g,
    replace: (match, expr, type) => `assertNotInstanceOf(${expr}, ${type})`,
    imports: ["assertNotInstanceOf"],
    description: "Replace negative instanceof checks with assertNotInstanceOf"
  },
  
  // assertEquals(x !== null, true) -> assert(x !== null)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*!==?\s*null\s*,\s*true\s*\)/g,
    replace: (match, expr) => `assert(${expr} !== null)`,
    imports: ["assert"],
    description: "Replace null checks with assert"
  },
  
  // assertEquals(x !== undefined, true) -> assert(x !== undefined)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*!==?\s*undefined\s*,\s*true\s*\)/g,
    replace: (match, expr) => `assert(${expr} !== undefined)`,
    imports: ["assert"],
    description: "Replace undefined checks with assert"
  },
  
  // assertEquals(x > y, true) -> assertGreater(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*>\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, left, right) => `assertGreater(${left}, ${right})`,
    imports: ["assertGreater"],
    description: "Replace > comparisons with assertGreater"
  },
  
  // assertEquals(x < y, true) -> assertLess(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*<\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, left, right) => `assertLess(${left}, ${right})`,
    imports: ["assertLess"],
    description: "Replace < comparisons with assertLess"
  },
  
  // assertEquals(x >= y, true) -> assertGreaterOrEqual(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*>=\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, left, right) => `assertGreaterOrEqual(${left}, ${right})`,
    imports: ["assertGreaterOrEqual"],
    description: "Replace >= comparisons with assertGreaterOrEqual"
  },
  
  // assertEquals(x <= y, true) -> assertLessOrEqual(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*<=\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, left, right) => `assertLessOrEqual(${left}, ${right})`,
    imports: ["assertLessOrEqual"],
    description: "Replace <= comparisons with assertLessOrEqual"
  },
  
  // assertEquals(!!x, true) -> assert(x)
  {
    pattern: /assertEquals\s*\(\s*!!(.+?)\s*,\s*true\s*\)/g,
    replace: (match, expr) => `assert(${expr})`,
    imports: ["assert"],
    description: "Replace double negation checks with assert"
  },
  
  // assertEquals(!!x, false) -> assertFalse(x)
  {
    pattern: /assertEquals\s*\(\s*!!(.+?)\s*,\s*false\s*\)/g,
    replace: (match, expr) => `assertFalse(${expr})`,
    imports: ["assertFalse"],
    description: "Replace double negation false checks with assertFalse"
  },
  
  // assertEquals(x === y, true) -> assertEquals(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*===\s*(.+?)\s*,\s*true\s*\)/g,
    replace: (match, left, right) => `assertEquals(${left}, ${right})`,
    imports: [],
    description: "Simplify === true comparisons"
  },
  
  // assertEquals(x === y, false) -> assertNotEquals(x, y)
  {
    pattern: /assertEquals\s*\(\s*(.+?)\s*===\s*(.+?)\s*,\s*false\s*\)/g,
    replace: (match, left, right) => `assertNotEquals(${left}, ${right})`,
    imports: ["assertNotEquals"],
    description: "Replace === false comparisons with assertNotEquals"
  }
];

async function fixFile(path: string): Promise<number> {
  let content = await Deno.readTextFile(path);
  let changeCount = 0;
  const neededImports = new Set<string>();
  
  // Apply replacements
  for (const { pattern, replace, imports, description } of replacements) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let matches = 0;
    
    content = content.replace(regex, (match, ...args) => {
      matches++;
      for (const imp of imports) {
        neededImports.add(imp);
      }
      return replace(match, ...args);
    });
    
    if (matches > 0) {
      console.log(`    ${description}: ${matches} replacements`);
      changeCount += matches;
    }
  }
  
  // Update imports if needed
  if (neededImports.size > 0) {
    // Find the import line for @std/assert
    const importRegex = /^import\s*\{([^}]+)\}\s*from\s*["']@std\/assert["'];?$/m;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      // Parse existing imports
      const existingImports = importMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      // Add new imports
      const allImports = new Set(existingImports);
      for (const imp of neededImports) {
        allImports.add(imp);
      }
      
      // Sort imports for consistency
      const sortedImports = Array.from(allImports).sort();
      
      // Create new import statement
      const newImportStatement = `import { ${sortedImports.join(", ")} } from "@std/assert";`;
      
      // Replace the import statement
      content = content.replace(importRegex, newImportStatement);
      
      console.log(`    Updated imports: added ${Array.from(neededImports).join(", ")}`);
    }
  }
  
  // Write back if changes were made
  if (changeCount > 0) {
    await Deno.writeTextFile(path, content);
  }
  
  return changeCount;
}

// Main execution
console.log("🔧 Fixing assertion patterns in test files...\n");

let totalFiles = 0;
let totalChanges = 0;
const filesFixed: string[] = [];

for await (const entry of walk("tests", {
  exts: [".ts"],
  match: [/\.test\.ts$/]
})) {
  const relPath = relative(Deno.cwd(), entry.path);
  console.log(`📄 Processing ${relPath}...`);
  
  const changes = await fixFile(entry.path);
  if (changes > 0) {
    filesFixed.push(relPath);
    totalChanges += changes;
    console.log(`  ✅ Fixed ${changes} assertions\n`);
  } else {
    console.log(`  ⏭️  No changes needed\n`);
  }
  
  totalFiles++;
}

// Summary
console.log("📊 Summary:");
console.log(`  Files processed: ${totalFiles}`);
console.log(`  Files fixed: ${filesFixed.length}`);
console.log(`  Total replacements: ${totalChanges}`);

if (filesFixed.length > 0) {
  console.log("\n📝 Files modified:");
  for (const file of filesFixed) {
    console.log(`  - ${file}`);
  }
  
  console.log("\n✨ Assertions have been improved! Run tests to verify everything still works.");
} else {
  console.log("\n✅ No changes needed - all assertions look good!");
}