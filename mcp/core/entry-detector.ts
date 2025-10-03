/**
 * Entry point detection and validation
 * Detects and validates SimplyMCP server entry points
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';

/**
 * Detect SimplyMCP entry point from various sources
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
  // 1. If provided, validate it exists and is SimplyMCP
  if (providedEntry) {
    const resolvedPath = resolveEntryPath(providedEntry, basePath);
    await validateSimplyMCPEntry(resolvedPath);
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
        if (await isSimplyMCPFile(mainPath)) {
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
      if (await isSimplyMCPFile(path)) {
        return path;
      }
    }
  }

  throw new Error(
    'No SimplyMCP entry point found. Please provide an entry point or create one of: ' +
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
 * Validate that a file is a valid SimplyMCP entry point
 *
 * Checks:
 * 1. File exists
 * 2. File imports SimplyMCP
 * 3. File instantiates or exports SimplyMCP
 *
 * @param filePath - Absolute path to file
 * @throws Error if validation fails
 */
export async function validateSimplyMCPEntry(filePath: string): Promise<void> {
  // Check file exists
  try {
    await access(filePath);
  } catch {
    throw new Error(`Entry point does not exist: ${filePath}`);
  }

  // Read file content
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read entry point: ${filePath}. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Check if file imports SimplyMCP
  const hasImport =
    content.includes('SimplyMCP') ||
    content.includes('simply-mcp') ||
    content.includes('./SimplyMCP') ||
    content.includes('../SimplyMCP');

  if (!hasImport) {
    throw new Error(
      `Entry point does not appear to import SimplyMCP: ${filePath}\n` +
      'Expected: import { SimplyMCP } from "simply-mcp" or similar'
    );
  }

  // Check if file instantiates SimplyMCP
  const hasInstantiation =
    /new\s+SimplyMCP\s*\(/.test(content) ||
    /SimplyMCP\.fromFile\s*\(/.test(content) ||
    /export\s+default.*SimplyMCP/.test(content) ||
    /export\s*\{.*SimplyMCP.*\}/.test(content);

  if (!hasInstantiation) {
    throw new Error(
      `Entry point does not appear to create a SimplyMCP instance: ${filePath}\n` +
      'Expected: new SimplyMCP(...) or SimplyMCP.fromFile(...)'
    );
  }
}

/**
 * Check if a file appears to be a SimplyMCP server
 * Non-throwing version of validateSimplyMCPEntry
 *
 * @param filePath - Path to file
 * @returns True if file appears to be SimplyMCP server
 */
export async function isSimplyMCPFile(filePath: string): Promise<boolean> {
  try {
    await validateSimplyMCPEntry(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract server name from entry point
 * Tries to extract from:
 * 1. SimplyMCP constructor options
 * 2. Filename (fallback)
 *
 * @param filePath - Entry point file path
 * @returns Server name
 */
export async function extractServerName(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Try to extract name from SimplyMCP constructor
    const nameMatch = /new\s+SimplyMCP\s*\(\s*\{[^}]*name\s*:\s*['"]([^'"]+)['"]/.exec(content);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1];
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
