#!/usr/bin/env -S deno run --allow-read --allow-write

import { parse } from "jsr:@std/path";
import { walk } from "jsr:@std/fs/walk";
import { dirname, isAbsolute, join, relative, resolve } from "jsr:@std/path";

interface ImportInfo {
  source: string;
  line: number;
  column: number;
  isTypeOnly: boolean;
}

interface FileNode {
  path: string;
  imports: ImportInfo[];
  resolvedImports: Set<string>;
}

interface DependencyGraph {
  nodes: Map<string, FileNode>;
  edges: Map<string, Set<string>>;
}

class ImportAnalyzer {
  private graph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
  };
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  async analyzeProject(): Promise<void> {
    console.log(`🔍 Analyzing TypeScript imports in: ${this.rootDir}`);

    // Find all TypeScript files
    const tsFiles: string[] = [];
    for await (
      const entry of walk(this.rootDir, {
        exts: [".ts", ".tsx"],
        skip: [/node_modules/, /\.git/, /dist/, /build/],
      })
    ) {
      if (entry.isFile) {
        tsFiles.push(entry.path);
      }
    }

    console.log(`📁 Found ${tsFiles.length} TypeScript files`);

    // Parse each file for imports
    for (const filePath of tsFiles) {
      await this.parseFileImports(filePath);
    }

    // Resolve import paths
    this.resolveImportPaths();

    console.log(
      `📊 Built dependency graph with ${this.graph.nodes.size} nodes`,
    );
  }

  private async parseFileImports(filePath: string): Promise<void> {
    try {
      const content = await Deno.readTextFile(filePath);
      const imports = this.extractImports(content);

      const node: FileNode = {
        path: filePath,
        imports,
        resolvedImports: new Set(),
      };

      this.graph.nodes.set(filePath, node);
      this.graph.edges.set(filePath, new Set());
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${filePath}: ${error.message}`);
    }
  }

  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split("\n");

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      // Match various import patterns
      const importPatterns = [
        // import { ... } from "..."
        /import\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*from\s*["']([^"']+)["']/g,
        // import "..."
        /import\s*["']([^"']+)["']/g,
        // import type { ... } from "..."
        /import\s+type\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*from\s*["']([^"']+)["']/g,
        // Dynamic import()
        /import\s*\(\s*["']([^"']+)["']\s*\)/g,
        // export { ... } from "..."
        /export\s*(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s*from\s*["']([^"']+)["']/g,
      ];

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const isTypeOnly = line.includes("import type") ||
            line.includes("export type");
          imports.push({
            source: match[1],
            line: lineNum + 1,
            column: match.index || 0,
            isTypeOnly,
          });
        }
      }
    }

    return imports;
  }

  private resolveImportPaths(): void {
    for (const [filePath, node] of this.graph.nodes) {
      const fileDir = dirname(filePath);

      for (const importInfo of node.imports) {
        const resolved = this.resolveImportPath(importInfo.source, fileDir);
        if (resolved) {
          node.resolvedImports.add(resolved);
          this.graph.edges.get(filePath)?.add(resolved);
        }
      }
    }
  }

  private resolveImportPath(
    importPath: string,
    fromDir: string,
  ): string | null {
    // Skip external modules (no relative/absolute path)
    if (
      !importPath.startsWith(".") && !isAbsolute(importPath) &&
      !importPath.startsWith("/")
    ) {
      return null;
    }

    try {
      let resolved: string;

      if (importPath.startsWith(".")) {
        // Relative import
        resolved = resolve(fromDir, importPath);
      } else {
        // Absolute import
        resolved = resolve(
          this.rootDir,
          importPath.startsWith("/") ? importPath.slice(1) : importPath,
        );
      }

      // Try common extensions
      const extensions = ["", ".ts", ".tsx", ".js", ".jsx"];
      for (const ext of extensions) {
        const candidate = resolved + ext;
        try {
          const stat = Deno.statSync(candidate);
          if (stat.isFile) {
            return candidate;
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Try index files
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        const indexFile = join(resolved, `index${ext}`);
        try {
          const stat = Deno.statSync(indexFile);
          if (stat.isFile) {
            return indexFile;
          }
        } catch {
          // Index file doesn't exist, continue
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    const dfs = (node: string): void => {
      if (recursionStack.has(node)) {
        // Found a cycle - extract it from pathStack
        const cycleStart = pathStack.indexOf(node);
        const cycle = pathStack.slice(cycleStart).concat([node]);
        cycles.push(cycle);
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      pathStack.push(node);

      const edges = this.graph.edges.get(node);
      if (edges) {
        for (const neighbor of edges) {
          if (this.graph.nodes.has(neighbor)) {
            dfs(neighbor);
          }
        }
      }

      recursionStack.delete(node);
      pathStack.pop();
    };

    for (const node of this.graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  generateReport(): void {
    console.log("\n📋 IMPORT ANALYSIS REPORT");
    console.log("=========================");

    // Basic stats
    const totalFiles = this.graph.nodes.size;
    const totalImports = Array.from(this.graph.nodes.values())
      .reduce((sum, node) => sum + node.imports.length, 0);
    const resolvedImports = Array.from(this.graph.nodes.values())
      .reduce((sum, node) => sum + node.resolvedImports.size, 0);

    console.log(`\n📊 Statistics:`);
    console.log(`   Files analyzed: ${totalFiles}`);
    console.log(`   Total imports: ${totalImports}`);
    console.log(`   Resolved imports: ${resolvedImports}`);
    console.log(`   External/unresolved: ${totalImports - resolvedImports}`);

    // Detect cycles
    const cycles = this.detectCycles();

    console.log(`\n🔄 Circular Dependencies: ${cycles.length}`);
    if (cycles.length > 0) {
      console.log("   ⚠️  CYCLES DETECTED:");
      cycles.forEach((cycle, index) => {
        console.log(`\n   Cycle ${index + 1}:`);
        const relativeCycle = cycle.map((path) => relative(this.rootDir, path));
        for (let i = 0; i < relativeCycle.length - 1; i++) {
          console.log(`     ${relativeCycle[i]} → ${relativeCycle[i + 1]}`);
        }
      });
    } else {
      console.log("   ✅ No circular dependencies found!");
    }

    // Most connected files
    const nodeConnections = Array.from(this.graph.nodes.entries())
      .map(([path, node]) => ({
        path: relative(this.rootDir, path),
        imports: node.resolvedImports.size,
        importedBy: Array.from(this.graph.edges.values())
          .reduce((count, edges) => count + (edges.has(path) ? 1 : 0), 0),
      }))
      .sort((a, b) => (b.imports + b.importedBy) - (a.imports + a.importedBy));

    console.log(`\n🔗 Most Connected Files:`);
    nodeConnections.slice(0, 10).forEach((node, index) => {
      console.log(
        `   ${
          index + 1
        }. ${node.path} (imports: ${node.imports}, imported by: ${node.importedBy})`,
      );
    });
  }

  async exportGraph(outputPath: string): Promise<void> {
    const graphData = {
      nodes: Array.from(this.graph.nodes.entries()).map(([path, node]) => ({
        id: relative(this.rootDir, path),
        path: path,
        imports: node.imports.length,
        resolvedImports: Array.from(node.resolvedImports).map((p) =>
          relative(this.rootDir, p)
        ),
      })),
      edges: Array.from(this.graph.edges.entries()).flatMap((
        [source, targets],
      ) =>
        Array.from(targets).map((target) => ({
          source: relative(this.rootDir, source),
          target: relative(this.rootDir, target),
        }))
      ),
    };

    await Deno.writeTextFile(outputPath, JSON.stringify(graphData, null, 2));
    console.log(`\n💾 Dependency graph exported to: ${outputPath}`);
  }
}

async function main() {
  const args = Deno.args;
  const rootDir = args[0] || ".";
  const outputFile = args[1] || "dependency-graph.json";

  try {
    const analyzer = new ImportAnalyzer(rootDir);
    await analyzer.analyzeProject();
    analyzer.generateReport();
    await analyzer.exportGraph(outputFile);
  } catch (error) {
    console.error("❌ Error:", error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
