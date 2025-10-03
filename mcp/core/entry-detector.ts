/**
 * Entry point detection and validation
 * Detects and validates SimpleMCP server entry points
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';

/**
 * Detect SimpleMCP entry point from various sources
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
  // 1. If provided, validate it exists and is SimpleMCP
  if (providedEntry) {
    const resolvedPath = resolveEntryPath(providedEntry, basePath);
    await validateSimpleMCPEntry(resolvedPath);
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
        if (await isSimpleMCPFile(mainPath)) {
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
      if (await isSimpleMCPFile(path)) {
        return path;
      }
    }
  }

  throw new Error(
    'No SimpleMCP entry point found. Please provide an entry point or create one of: ' +
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
 * Validate that a file is a valid SimpleMCP entry point
 *
 * Checks:
 * 1. File exists
 * 2. File imports SimpleMCP
 * 3. File instantiates or exports SimpleMCP
 *
 * @param filePath - Absolute path to file
 * @throws Error if validation fails
 */
export async function validateSimpleMCPEntry(filePath: string): Promise<void> {
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

  // Check if file imports SimpleMCP
  const hasImport =
    content.includes('SimpleMCP') ||
    content.includes('simply-mcp') ||
    content.includes('./SimpleMCP') ||
    content.includes('../SimpleMCP');

  if (!hasImport) {
    throw new Error(
      `Entry point does not appear to import SimpleMCP: ${filePath}\n` +
      'Expected: import { SimpleMCP } from "simply-mcp" or similar'
    );
  }

  // Check if file instantiates SimpleMCP
  const hasInstantiation =
    /new\s+SimpleMCP\s*\(/.test(content) ||
    /SimpleMCP\.fromFile\s*\(/.test(content) ||
    /export\s+default.*SimpleMCP/.test(content) ||
    /export\s*\{.*SimpleMCP.*\}/.test(content);

  if (!hasInstantiation) {
    throw new Error(
      `Entry point does not appear to create a SimpleMCP instance: ${filePath}\n` +
      'Expected: new SimpleMCP(...) or SimpleMCP.fromFile(...)'
    );
  }
}

/**
 * Check if a file appears to be a SimpleMCP server
 * Non-throwing version of validateSimpleMCPEntry
 *
 * @param filePath - Path to file
 * @returns True if file appears to be SimpleMCP server
 */
export async function isSimpleMCPFile(filePath: string): Promise<boolean> {
  try {
    await validateSimpleMCPEntry(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract server name from entry point
 * Tries to extract from:
 * 1. SimpleMCP constructor options
 * 2. Filename (fallback)
 *
 * @param filePath - Entry point file path
 * @returns Server name
 */
export async function extractServerName(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');

    // Try to extract name from SimpleMCP constructor
    const nameMatch = /new\s+SimpleMCP\s*\(\s*\{[^}]*name\s*:\s*['"]([^'"]+)['"]/.exec(content);
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
