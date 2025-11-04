/**
 * Dependency Extractor - Auto-infer dependencies from source code
 *
 * Analyzes TypeScript/JavaScript files to extract:
 * - NPM package dependencies
 * - Local file imports (components, utilities)
 * - CSS/stylesheet imports
 * - Script imports
 *
 * This eliminates the need for developers to manually specify dependencies
 * in the IUI interface - the compiler reads the code anyway!
 *
 * @module dependency-extractor
 */

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, extname, isAbsolute } from 'path';

/**
 * Categorized dependencies extracted from source code
 */
export interface ExtractedDependencies {
  /**
   * NPM package dependencies (e.g., 'react', 'lodash', 'recharts')
   * Extracted from: import X from 'package-name'
   */
  npmPackages: string[];

  /**
   * Local file imports (e.g., './Button.tsx', '../utils/helper.ts')
   * Extracted from: import X from './file'
   */
  localFiles: string[];

  /**
   * CSS/stylesheet imports (e.g., './styles.css', './theme.scss')
   * Extracted from: import './styles.css'
   */
  stylesheets: string[];

  /**
   * JavaScript imports (non-component)
   * Extracted from: import './script.js'
   */
  scripts: string[];

  /**
   * Dynamic imports detected
   * Extracted from: import('dynamic-package')
   */
  dynamicImports: string[];
}

/**
 * Options for dependency extraction
 */
export interface DependencyExtractionOptions {
  /**
   * Path to the source file being analyzed
   */
  filePath: string;

  /**
   * Source code content (optional, will read from file if not provided)
   */
  sourceCode?: string;

  /**
   * Whether to follow local imports recursively
   * @default false
   */
  recursive?: boolean;

  /**
   * Maximum recursion depth (prevents infinite loops)
   * @default 5
   */
  maxDepth?: number;

  /**
   * Whether to include dev dependencies
   * @default false
   */
  includeDevDeps?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Extract dependencies from a TypeScript/JavaScript file
 *
 * This function parses the source code AST and extracts all import statements,
 * categorizing them into npm packages, local files, stylesheets, and scripts.
 *
 * @param options - Extraction options
 * @returns Categorized dependencies
 *
 * @example
 * ```typescript
 * const deps = extractDependencies({
 *   filePath: './components/Dashboard.tsx'
 * });
 *
 * console.log(deps.npmPackages);  // ['react', 'recharts', 'date-fns']
 * console.log(deps.stylesheets);  // ['./Dashboard.css', './theme.css']
 * ```
 */
export function extractDependencies(
  options: DependencyExtractionOptions
): ExtractedDependencies {
  const {
    filePath,
    sourceCode,
    recursive = false,
    maxDepth = 5,
    verbose = false,
  } = options;

  // Initialize result containers
  const npmPackages = new Set<string>();
  const localFiles = new Set<string>();
  const stylesheets = new Set<string>();
  const scripts = new Set<string>();
  const dynamicImports = new Set<string>();

  // Read source code if not provided
  const code = sourceCode || readSourceFile(filePath);
  if (!code) {
    throw new Error(`Could not read source file: ${filePath}`);
  }

  if (verbose) {
    console.log(`[DependencyExtractor] Analyzing: ${filePath}`);
  }

  // Parse source code into AST
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  // Visit all nodes in the AST
  function visit(node: ts.Node, depth: number = 0) {
    // Stop if max depth reached
    if (depth > maxDepth) {
      return;
    }

    // Import declarations: import X from 'Y'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;
        categorizeImport(importPath, filePath);
      }
    }

    // Export declarations: export { X } from 'Y'
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        categorizeImport(importPath, filePath);
      }
    }

    // Dynamic imports: import('package')
    else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          const importPath = arg.text;
          dynamicImports.add(importPath);
          if (verbose) {
            console.log(`  [Dynamic] ${importPath}`);
          }
        }
      }
    }

    // Recurse through child nodes
    ts.forEachChild(node, (child) => visit(child, depth + 1));
  }

  /**
   * Categorize an import path into the appropriate category
   */
  function categorizeImport(importPath: string, fromFile: string) {
    // Relative or absolute local import
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      const ext = getExtensionFromPath(importPath);

      if (ext === '.css' || ext === '.scss' || ext === '.sass' || ext === '.less') {
        stylesheets.add(importPath);
        if (verbose) {
          console.log(`  [Stylesheet] ${importPath}`);
        }
      } else if (ext === '.js' && !isComponentFile(importPath)) {
        scripts.add(importPath);
        if (verbose) {
          console.log(`  [Script] ${importPath}`);
        }
      } else {
        localFiles.add(importPath);
        if (verbose) {
          console.log(`  [Local] ${importPath}`);
        }

        // Recursively process local files if enabled
        if (recursive) {
          const resolvedPath = resolve(dirname(fromFile), importPath);
          const resolvedWithExt = resolveFileWithExtensions(resolvedPath);
          if (resolvedWithExt && existsSync(resolvedWithExt)) {
            const nestedDeps = extractDependencies({
              filePath: resolvedWithExt,
              recursive: true,
              maxDepth,
              verbose,
            });

            // Merge nested dependencies
            nestedDeps.npmPackages.forEach((pkg) => npmPackages.add(pkg));
            nestedDeps.localFiles.forEach((file) => localFiles.add(file));
            nestedDeps.stylesheets.forEach((css) => stylesheets.add(css));
            nestedDeps.scripts.forEach((js) => scripts.add(js));
          }
        }
      }
    }
    // NPM package (doesn't start with . or /)
    else {
      // Extract package name (handle scoped packages)
      const packageName = extractPackageName(importPath);
      npmPackages.add(packageName);
      if (verbose) {
        console.log(`  [NPM] ${packageName}`);
      }
    }
  }

  // Start visiting from root
  visit(sourceFile);

  if (verbose) {
    console.log(`[DependencyExtractor] Found:
  NPM packages: ${npmPackages.size}
  Local files: ${localFiles.size}
  Stylesheets: ${stylesheets.size}
  Scripts: ${scripts.size}
  Dynamic imports: ${dynamicImports.size}`);
  }

  return {
    npmPackages: Array.from(npmPackages),
    localFiles: Array.from(localFiles),
    stylesheets: Array.from(stylesheets),
    scripts: Array.from(scripts),
    dynamicImports: Array.from(dynamicImports),
  };
}

/**
 * Read source file content
 */
function readSourceFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Get file extension from import path (handles missing extensions)
 */
function getExtensionFromPath(importPath: string): string {
  const ext = extname(importPath);
  if (ext) {
    return ext;
  }

  // Try to resolve with common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'];
  for (const extension of extensions) {
    if (existsSync(importPath + extension)) {
      return extension;
    }
  }

  return '';
}

/**
 * Check if a file is a component file (vs a script)
 */
function isComponentFile(path: string): boolean {
  const ext = getExtensionFromPath(path);
  return ext === '.tsx' || ext === '.jsx' || ext === '.ts';
}

/**
 * Extract package name from import path
 * Handles:
 * - Regular packages: 'lodash' → 'lodash'
 * - Scoped packages: '@org/package' → '@org/package'
 * - Subpath imports: 'lodash/get' → 'lodash'
 * - Scoped subpath: '@org/package/sub' → '@org/package'
 */
function extractPackageName(importPath: string): string {
  if (importPath.startsWith('@')) {
    // Scoped package: @org/package or @org/package/subpath
    const parts = importPath.split('/');
    return `${parts[0]}/${parts[1]}`;
  } else {
    // Regular package: package or package/subpath
    const parts = importPath.split('/');
    return parts[0];
  }
}

/**
 * Resolve file path with common TypeScript/JavaScript extensions
 */
function resolveFileWithExtensions(basePath: string): string | null {
  // Try exact path first
  if (existsSync(basePath)) {
    return basePath;
  }

  // Try with extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const pathWithExt = basePath + ext;
    if (existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }

  // Try index files
  for (const ext of extensions) {
    const indexPath = resolve(basePath, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Extract dependencies from source code string (without file path)
 *
 * Useful for inline component code or testing.
 *
 * @param sourceCode - TypeScript/JavaScript source code
 * @returns Categorized dependencies
 *
 * @example
 * ```typescript
 * const code = `
 *   import React from 'react';
 *   import { Chart } from 'recharts';
 *   import './styles.css';
 * `;
 *
 * const deps = extractDependenciesFromCode(code);
 * // deps.npmPackages: ['react', 'recharts']
 * // deps.stylesheets: ['./styles.css']
 * ```
 */
export function extractDependenciesFromCode(
  sourceCode: string
): ExtractedDependencies {
  return extractDependencies({
    filePath: 'inline.tsx', // Dummy path
    sourceCode,
    recursive: false,
  });
}
