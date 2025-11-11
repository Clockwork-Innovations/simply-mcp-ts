/**
 * Bundle Manifest Schema and Utilities
 *
 * Defines the bundle.json schema that stores metadata about archived bundles
 * and provides utilities for reading, writing, and generating manifests.
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Parameter schema metadata for a tool
 */
export interface ParameterSchema {
  /** Parameter type (string, number, boolean, object, array) */
  type: string;
  /** Human-readable description of the parameter */
  description?: string;
  /** Whether this parameter is required */
  required?: boolean;
  /** Minimum value (for number types) */
  min?: number;
  /** Maximum value (for number types) */
  max?: number;
  /** Minimum length (for string types) */
  minLength?: number;
  /** Maximum length (for string types) */
  maxLength?: number;
  /** Regex pattern (for string types) */
  pattern?: string;
  /** Allowed enum values */
  enum?: any[];
  /** Schema for nested object properties (for object types) */
  properties?: Record<string, ParameterSchema>;
  /** Schema for array items (for array types) */
  items?: ParameterSchema;
}

/**
 * Tool schema metadata
 */
export interface ToolSchema {
  /** Tool description */
  description?: string;
  /** Parameter definitions for this tool */
  parameters: {
    [paramName: string]: ParameterSchema;
  };
}

/**
 * Bundle manifest structure stored in bundle.json
 * Contains metadata about an archived MCP server bundle
 */
export interface BundleManifest {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Optional server description */
  description?: string;
  /** Relative path to the server entry point (e.g., 'server.js') */
  entryPoint: string;
  /** List of native dependencies that must be installed (e.g., ['better-sqlite3']) */
  nativeDependencies: string[];
  /** ISO timestamp when bundle was created */
  createdAt: string;
  /** Version of simply-mcp that created this bundle */
  simplyMcpVersion: string;
  /** Tool parameter schemas extracted from AST during bundling */
  toolSchemas?: {
    [toolName: string]: ToolSchema;
  };
}

/**
 * Server metadata extracted from package.json or user input
 */
export interface ServerMetadata {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Optional server description */
  description?: string;
}

/**
 * Generate a bundle manifest from server metadata and dependencies
 *
 * @param serverMetadata - Server name, version, and description
 * @param nativeDeps - List of native module dependencies
 * @param entryPoint - Relative path to server entry point (default: 'server.js')
 * @returns Complete bundle manifest ready to be written
 *
 * @example
 * ```typescript
 * const manifest = generateManifest(
 *   { name: 'my-server', version: '1.0.0', description: 'My MCP server' },
 *   ['better-sqlite3'],
 *   'server.js'
 * );
 * ```
 */
export function generateManifest(
  serverMetadata: ServerMetadata,
  nativeDeps: string[],
  entryPoint: string = 'server.js'
): BundleManifest {
  // Get simply-mcp version from package.json
  const simplyMcpVersion = getSimplyMcpVersion();

  return {
    name: serverMetadata.name,
    version: serverMetadata.version,
    description: serverMetadata.description,
    entryPoint,
    nativeDependencies: nativeDeps,
    createdAt: new Date().toISOString(),
    simplyMcpVersion,
  };
}

/**
 * Read and parse a bundle manifest from bundle.json
 *
 * @param bundleDir - Directory containing the bundle.json file
 * @returns Parsed and validated bundle manifest
 * @throws Error if manifest doesn't exist or is invalid
 *
 * @example
 * ```typescript
 * const manifest = await readManifest('/path/to/bundle');
 * console.log(`Server: ${manifest.name} v${manifest.version}`);
 * ```
 */
export async function readManifest(bundleDir: string): Promise<BundleManifest> {
  const manifestPath = join(bundleDir, 'bundle.json');

  let content: string;
  try {
    content = await readFile(manifestPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read bundle manifest at ${manifestPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let manifest: any;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid JSON in bundle manifest at ${manifestPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Validate required fields
  validateManifest(manifest, manifestPath);

  return manifest as BundleManifest;
}

/**
 * Write a bundle manifest to bundle.json
 *
 * @param bundleDir - Directory to write the bundle.json file
 * @param manifest - Manifest object to write
 * @throws Error if write fails
 *
 * @example
 * ```typescript
 * const manifest = generateManifest(
 *   { name: 'my-server', version: '1.0.0' },
 *   []
 * );
 * await writeManifest('/path/to/bundle', manifest);
 * ```
 */
export async function writeManifest(
  bundleDir: string,
  manifest: BundleManifest
): Promise<void> {
  const manifestPath = join(bundleDir, 'bundle.json');

  // Validate before writing
  validateManifest(manifest, manifestPath);

  try {
    const content = JSON.stringify(manifest, null, 2);
    await writeFile(manifestPath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write bundle manifest to ${manifestPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Validate that a manifest object has all required fields
 *
 * @param manifest - Manifest object to validate
 * @param path - Path to manifest file (for error messages)
 * @throws Error if validation fails
 */
function validateManifest(manifest: any, path: string): void {
  const requiredFields: Array<keyof BundleManifest> = [
    'name',
    'version',
    'entryPoint',
    'nativeDependencies',
    'createdAt',
    'simplyMcpVersion',
  ];

  const missingFields = requiredFields.filter(field => !(field in manifest));

  if (missingFields.length > 0) {
    throw new Error(
      `Invalid bundle manifest at ${path}: missing required fields: ${missingFields.join(', ')}`
    );
  }

  // Type validation
  if (typeof manifest.name !== 'string') {
    throw new Error(`Invalid bundle manifest at ${path}: 'name' must be a string`);
  }

  if (typeof manifest.version !== 'string') {
    throw new Error(`Invalid bundle manifest at ${path}: 'version' must be a string`);
  }

  if (typeof manifest.entryPoint !== 'string') {
    throw new Error(`Invalid bundle manifest at ${path}: 'entryPoint' must be a string`);
  }

  if (!Array.isArray(manifest.nativeDependencies)) {
    throw new Error(
      `Invalid bundle manifest at ${path}: 'nativeDependencies' must be an array`
    );
  }

  if (typeof manifest.createdAt !== 'string') {
    throw new Error(`Invalid bundle manifest at ${path}: 'createdAt' must be a string`);
  }

  if (typeof manifest.simplyMcpVersion !== 'string') {
    throw new Error(`Invalid bundle manifest at ${path}: 'simplyMcpVersion' must be a string`);
  }

  // Validate ISO timestamp format
  if (isNaN(Date.parse(manifest.createdAt))) {
    throw new Error(
      `Invalid bundle manifest at ${path}: 'createdAt' must be a valid ISO timestamp`
    );
  }
}

/**
 * Get the current simply-mcp version from package.json
 *
 * @returns Version string from package.json
 * @throws Error if version cannot be determined
 */
function getSimplyMcpVersion(): string {
  try {
    // Read package.json synchronously from project root
    // Using require works in both CommonJS and ESM contexts after compilation
    const fs = require('fs');
    const path = require('path');

    // Navigate to package.json from src/core/
    // In production (dist/), this will be dist/src/core/, so we go up 3 levels
    // In development (src/), this is src/core/, so we go up 2 levels
    let packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

    // Check if we're in dist/ directory (production)
    if (__dirname.includes('/dist/')) {
      packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.version || typeof packageJson.version !== 'string') {
      throw new Error('package.json does not contain a valid version field');
    }

    return packageJson.version;
  } catch (error) {
    // Fallback to a default version if we can't read package.json
    // This should never happen in production, but provides resilience
    console.warn(
      `Warning: Could not determine simply-mcp version: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 'unknown';
  }
}
