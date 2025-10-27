/**
 * Entry point detection and validation
 * Detects and validates interface-driven MCP server entry points
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';
import { isInterfaceFile } from '../server/adapter.js';
import { parseInterfaceFile } from '../server/parser.js';

/**
 * Detect interface-driven server entry point from various sources
 *
 * Priority order:
 * 1. Provided entry point (validated)
 * 2. package.json "main" field
 * 3. Convention-based detection (server.ts, index.ts, etc.)
 *
 * @param providedEntry - Optional explicit entry point
 * @param basePath - Base directory for resolution
 * @returns Absolute path to validated entry point
 * @throws Error if no valid entry point found
 *
 * @example
 * ```typescript
 * const entry = await detectEntryPoint('./server.ts', '/path/to/project');
 * console.log(entry); // '/path/to/project/server.ts'
 * ```
 */
export async function detectEntryPoint(
  providedEntry?: string,
  basePath: string = process.cwd()
): Promise<string> {
  // 1. If provided, validate it exists and is interface-driven server
  if (providedEntry) {
    const resolvedPath = resolveEntryPath(providedEntry, basePath);
    await validateInterfaceEntry(resolvedPath);
    return resolvedPath;
  }

  // 2. Check package.json "main" field
  const pkgPath = join(basePath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      if (pkg.main) {
        const mainPath = resolveEntryPath(pkg.main, basePath);
        if (isInterfaceServerFile(mainPath)) {
          return mainPath;
        }
      }
    } catch (error) {
      // Ignore package.json read errors, continue to convention detection
    }
  }

  // 3. Try conventional names
  const conventions = [
    'server.ts',
    'index.ts',
    'main.ts',
    'src/server.ts',
    'src/index.ts',
    'src/main.ts',
    'server.js',
    'index.js',
    'main.js',
    'src/server.js',
    'src/index.js',
    'src/main.js',
  ];

  for (const file of conventions) {
    const path = join(basePath, file);
    if (existsSync(path)) {
      if (isInterfaceServerFile(path)) {
        return path;
      }
    }
  }

  throw new Error(
    'No interface-driven server entry point found. Please provide an entry point or create one of: ' +
    conventions.slice(0, 6).join(', ')
  );
}

/**
 * Resolve entry path to absolute path
 *
 * @param entryPath - Entry point path (relative or absolute)
 * @param basePath - Base directory for resolution
 * @returns Absolute path to entry point
 */
export function resolveEntryPath(entryPath: string, basePath: string): string {
  if (isAbsolute(entryPath)) {
    return entryPath;
  }
  return resolve(basePath, entryPath);
}

/**
 * Validate that a file is a valid interface-driven entry point
 *
 * Checks:
 * 1. File exists
 * 2. File contains valid interface-driven server (via AST parsing)
 *
 * Note: isInterfaceFile() is synchronous but we keep this async for API consistency.
 *
 * Note on error handling:
 * isInterfaceFile() catches all parsing errors and returns false.
 * This means validateInterfaceEntry() will show generic "not a valid interface-driven server"
 * for both:
 * 1. Valid TypeScript that doesn't match the pattern
 * 2. Invalid TypeScript with syntax errors
 *
 * @param filePath - Absolute path to file
 * @throws Error if validation fails
 */
export async function validateInterfaceEntry(filePath: string): Promise<void> {
  // Check file exists
  try {
    await access(filePath);
  } catch {
    throw new Error(`Entry point does not exist: ${filePath}`);
  }

  // Validate interface-driven server structure
  // Note: isInterfaceFile is synchronous but we keep this async for API consistency
  if (!isInterfaceFile(filePath)) {
    throw new Error(
      `Entry point is not a valid interface-driven server: ${filePath}\n\n` +
      'Expected structure:\n' +
      '  import type { ITool, IServer } from "simply-mcp";\n\n' +
      '  interface MyTool extends ITool { ... }\n' +
      '  interface MyServer extends IServer { name: ...; version: ...; }\n\n' +
      '  export default class implements MyServer {\n' +
      '    myTool: MyTool = async (params) => { ... };\n' +
      '  }\n\n' +
      'The file must have:\n' +
      '  - An interface extending IServer\n' +
      '  - At least one tool interface extending ITool\n' +
      '  - export default class implementing the server interface\n\n' +
      'Learn more: https://github.com/QuantGeekDev/simply-mcp/blob/main/docs/guides/QUICK_START.md'
    );
  }
}

/**
 * Check if a file appears to be an interface-driven server
 * Non-throwing version of validateInterfaceEntry
 *
 * @param filePath - Path to file
 * @returns True if file appears to be interface-driven server
 */
export function isInterfaceServerFile(filePath: string): boolean {
  try {
    return isInterfaceFile(filePath);
  } catch {
    return false;
  }
}

/**
 * Extract server name from entry point
 * Tries to extract from:
 * 1. Interface-driven server definition
 * 2. Filename (fallback)
 *
 * @param filePath - Entry point file path
 * @returns Server name
 */
export async function extractServerName(filePath: string): Promise<string> {
  try {
    // For interface-driven servers, parse the file to get server name
    if (isInterfaceFile(filePath)) {
      const parseResult = parseInterfaceFile(filePath);
      if (parseResult.server?.name) {
        return parseResult.server.name;
      }
    }

    // Fallback: use filename without extension
    const basename = filePath.split('/').pop() || 'server';
    return basename.replace(/\.(ts|js|mjs|cjs)$/, '');
  } catch {
    return 'server';
  }
}

/**
 * Detect if entry point uses TypeScript
 *
 * @param filePath - Entry point file path
 * @returns True if file is TypeScript
 */
export function isTypeScriptEntry(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.mts');
}

/**
 * Detect if entry point uses ESM
 *
 * Checks:
 * 1. File extension (.mjs, .mts)
 * 2. package.json "type": "module"
 * 3. Import/export syntax in file
 *
 * @param filePath - Entry point file path
 * @param basePath - Base directory for package.json lookup
 * @returns True if file uses ESM
 */
export async function isESMEntry(filePath: string, basePath: string): Promise<boolean> {
  // Check file extension
  if (filePath.endsWith('.mjs') || filePath.endsWith('.mts')) {
    return true;
  }

  if (filePath.endsWith('.cjs') || filePath.endsWith('.cts')) {
    return false;
  }

  // Check package.json type field
  const pkgPath = join(basePath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.type === 'module') {
        return true;
      }
      if (pkg.type === 'commonjs') {
        return false;
      }
    } catch {
      // Ignore errors
    }
  }

  // Check file content for import/export syntax
  try {
    const content = await readFile(filePath, 'utf-8');
    const hasESMSyntax =
      /^\s*import\s+/m.test(content) ||
      /^\s*export\s+/m.test(content);
    return hasESMSyntax;
  } catch {
    return false;
  }
}
