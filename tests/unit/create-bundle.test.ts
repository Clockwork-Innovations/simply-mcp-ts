/**
 * Create Bundle Test Suite
 *
 * Tests the create-bundle command functionality for creating package bundles
 * from existing server files.
 *
 * Test Coverage:
 * - Bundle creation from .ts files
 * - Bundle creation from .js files
 * - Directory structure generation
 * - package.json generation
 * - README.md generation
 * - .env.example generation
 * - Dependency detection
 * - Error handling (missing files, existing directories, invalid file types)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPackageBundleFromEntry } from '../../src/cli/create-bundle.js';

describe('Create Bundle - Basic Functionality', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-create-bundle-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create bundle from .ts file', async () => {
    const sourceFile = join(testDir, 'test-server.ts');
    const outputDir = join(testDir, 'output-ts');

    // Create a simple TypeScript server file
    await writeFile(
      sourceFile,
      `import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'test-server',
  version: '1.0.0',
});

server.start();
`
    );

    // Create bundle
    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'test-server',
      version: '1.0.0',
    });

    // Verify directory structure
    const pkgJsonPath = join(outputDir, 'package.json');
    const readmePath = join(outputDir, 'README.md');
    const envExamplePath = join(outputDir, '.env.example');
    const serverPath = join(outputDir, 'src', 'server.ts');

    expect(await fileExists(pkgJsonPath)).toBe(true);
    expect(await fileExists(readmePath)).toBe(true);
    expect(await fileExists(envExamplePath)).toBe(true);
    expect(await fileExists(serverPath)).toBe(true);
  });

  it('should create bundle from .js file', async () => {
    const sourceFile = join(testDir, 'test-server.js');
    const outputDir = join(testDir, 'output-js');

    // Create a simple JavaScript server file
    await writeFile(
      sourceFile,
      `const { BuildMCPServer } = require('simply-mcp');

const server = new BuildMCPServer({
  name: 'test-server',
  version: '1.0.0',
});

server.start();
`
    );

    // Create bundle
    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'test-server-js',
      version: '1.0.0',
    });

    // Verify directory structure
    const pkgJsonPath = join(outputDir, 'package.json');
    const serverPath = join(outputDir, 'src', 'server.ts');

    expect(await fileExists(pkgJsonPath)).toBe(true);
    expect(await fileExists(serverPath)).toBe(true);
  });

  it('should generate valid package.json with correct fields', async () => {
    const sourceFile = join(testDir, 'pkg-test-server.ts');
    const outputDir = join(testDir, 'output-pkg-json');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'my-awesome-server',
      version: '2.3.4',
      description: 'An awesome MCP server',
      author: 'John Doe',
    });

    // Read and parse package.json
    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.name).toBe('my-awesome-server');
    expect(pkgJson.version).toBe('2.3.4');
    expect(pkgJson.description).toBe('An awesome MCP server');
    expect(pkgJson.author).toBe('John Doe');
    expect(pkgJson.type).toBe('module');
    expect(pkgJson.main).toBe('./src/server.ts');
    expect(pkgJson.bin).toBe('./src/server.ts');
    expect(pkgJson.engines.node).toBe('>=20.0.0');
  });

  it('should detect dependencies from imports', async () => {
    const sourceFile = join(testDir, 'deps-test-server.ts');
    const outputDir = join(testDir, 'output-deps');

    // Create server file with multiple imports
    await writeFile(
      sourceFile,
      `import { BuildMCPServer } from 'simply-mcp';
import axios from 'axios';
import { z } from 'zod';
import * as fs from 'node:fs';

const server = new BuildMCPServer({
  name: 'test',
  version: '1.0.0',
});
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'deps-test',
      version: '1.0.0',
    });

    // Read package.json and check dependencies
    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.dependencies).toHaveProperty('simply-mcp');
    expect(pkgJson.dependencies).toHaveProperty('axios');
    expect(pkgJson.dependencies).toHaveProperty('zod');
    // node:fs should not be in dependencies (it's a built-in module)
    expect(pkgJson.dependencies).not.toHaveProperty('fs');
  });

  it('should handle scoped packages in dependency detection', async () => {
    const sourceFile = join(testDir, 'scoped-deps-server.ts');
    const outputDir = join(testDir, 'output-scoped-deps');

    await writeFile(
      sourceFile,
      `import { Server } from '@modelcontextprotocol/sdk';
import { something } from '@company/package';
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'scoped-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
    expect(pkgJson.dependencies).toHaveProperty('@company/package');
  });

  it('should generate README.md with correct content', async () => {
    const sourceFile = join(testDir, 'readme-test-server.ts');
    const outputDir = join(testDir, 'output-readme');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'readme-test',
      version: '1.0.0',
      description: 'A test server for README',
    });

    const readmePath = join(outputDir, 'README.md');
    const readmeContent = await readFile(readmePath, 'utf-8');

    expect(readmeContent).toContain('# readme-test');
    expect(readmeContent).toContain('A test server for README');
    expect(readmeContent).toContain('npm install');
    expect(readmeContent).toContain('npx simply-mcp run');
  });

  it('should generate .env.example file', async () => {
    const sourceFile = join(testDir, 'env-test-server.ts');
    const outputDir = join(testDir, 'output-env');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'env-test',
      version: '1.0.0',
    });

    const envExamplePath = join(outputDir, '.env.example');
    const envContent = await readFile(envExamplePath, 'utf-8');

    expect(envContent).toContain('# Example environment variables');
    expect(envContent.length).toBeGreaterThan(0);
  });

  it('should copy source file to src/server.ts', async () => {
    const sourceFile = join(testDir, 'copy-test-server.ts');
    const outputDir = join(testDir, 'output-copy');

    const sourceContent = `import { BuildMCPServer } from 'simply-mcp';
// This is a unique comment that should be preserved
const server = new BuildMCPServer({ name: 'test', version: '1.0.0' });
`;

    await writeFile(sourceFile, sourceContent);

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'copy-test',
      version: '1.0.0',
    });

    const copiedFilePath = join(outputDir, 'src', 'server.ts');
    const copiedContent = await readFile(copiedFilePath, 'utf-8');

    expect(copiedContent).toBe(sourceContent);
    expect(copiedContent).toContain('This is a unique comment');
  });
});

describe('Create Bundle - Error Handling', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-create-bundle-errors-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should throw error for non-existent source file', async () => {
    const sourceFile = join(testDir, 'does-not-exist.ts');
    const outputDir = join(testDir, 'output-no-source');

    await expect(
      createPackageBundleFromEntry({
        from: sourceFile,
        output: outputDir,
        name: 'test',
        version: '1.0.0',
      })
    ).rejects.toThrow('Source file not found');
  });

  it('should throw error for invalid file extension', async () => {
    const sourceFile = join(testDir, 'invalid-ext.txt');
    const outputDir = join(testDir, 'output-invalid-ext');

    await writeFile(sourceFile, 'some content');

    await expect(
      createPackageBundleFromEntry({
        from: sourceFile,
        output: outputDir,
        name: 'test',
        version: '1.0.0',
      })
    ).rejects.toThrow('Source file must be .ts or .js');
  });

  it('should throw error when output directory already exists', async () => {
    const sourceFile = join(testDir, 'existing-output-test.ts');
    const outputDir = join(testDir, 'existing-output');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');
    await mkdir(outputDir, { recursive: true });

    await expect(
      createPackageBundleFromEntry({
        from: sourceFile,
        output: outputDir,
        name: 'test',
        version: '1.0.0',
      })
    ).rejects.toThrow('Output directory already exists');
  });

  it('should handle files without dependencies gracefully', async () => {
    const sourceFile = join(testDir, 'no-deps-server.ts');
    const outputDir = join(testDir, 'output-no-deps');

    // File with no imports at all
    await writeFile(
      sourceFile,
      `const server = {
  name: 'test',
  version: '1.0.0',
};
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'no-deps-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    // Should at least have simply-mcp
    expect(pkgJson.dependencies).toHaveProperty('simply-mcp');
  });
});

describe('Create Bundle - Edge Cases', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `simple-mcp-create-bundle-edge-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should handle relative imports correctly (not add to dependencies)', async () => {
    const sourceFile = join(testDir, 'relative-imports-server.ts');
    const outputDir = join(testDir, 'output-relative');

    await writeFile(
      sourceFile,
      `import { BuildMCPServer } from 'simply-mcp';
import { helper } from './helpers';
import { util } from '../utils';
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'relative-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    // Should not have ./helpers or ../utils
    expect(Object.keys(pkgJson.dependencies)).not.toContain('helpers');
    expect(Object.keys(pkgJson.dependencies)).not.toContain('utils');
  });

  it('should handle require() statements in addition to import', async () => {
    const sourceFile = join(testDir, 'require-server.ts');
    const outputDir = join(testDir, 'output-require');

    await writeFile(
      sourceFile,
      `const express = require('express');
const cors = require('cors');
import { BuildMCPServer } from 'simply-mcp';
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'require-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.dependencies).toHaveProperty('express');
    expect(pkgJson.dependencies).toHaveProperty('cors');
    expect(pkgJson.dependencies).toHaveProperty('simply-mcp');
  });

  it('should handle dynamic import() statements', async () => {
    const sourceFile = join(testDir, 'dynamic-import-server.ts');
    const outputDir = join(testDir, 'output-dynamic');

    await writeFile(
      sourceFile,
      `import { BuildMCPServer } from 'simply-mcp';

async function loadModule() {
  const module = await import('dynamic-package');
  return module;
}
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'dynamic-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.dependencies).toHaveProperty('dynamic-package');
  });

  it('should use default description when not provided', async () => {
    const sourceFile = join(testDir, 'default-desc-server.ts');
    const outputDir = join(testDir, 'output-default-desc');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'default-desc-test',
      version: '1.0.0',
      // description intentionally omitted
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson.description).toBe('MCP Server created with SimplyMCP');
  });

  it('should not include author field if not provided', async () => {
    const sourceFile = join(testDir, 'no-author-server.ts');
    const outputDir = join(testDir, 'output-no-author');

    await writeFile(sourceFile, 'import { BuildMCPServer } from "simply-mcp";');

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'no-author-test',
      version: '1.0.0',
      // author intentionally omitted
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    expect(pkgJson).not.toHaveProperty('author');
  });

  it('should handle package subpath imports correctly', async () => {
    const sourceFile = join(testDir, 'subpath-server.ts');
    const outputDir = join(testDir, 'output-subpath');

    await writeFile(
      sourceFile,
      `import { something } from 'lodash/fp';
import { util } from 'axios/lib/utils';
`
    );

    await createPackageBundleFromEntry({
      from: sourceFile,
      output: outputDir,
      name: 'subpath-test',
      version: '1.0.0',
    });

    const pkgJsonPath = join(outputDir, 'package.json');
    const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);

    // Should have base package names, not subpaths
    expect(pkgJson.dependencies).toHaveProperty('lodash');
    expect(pkgJson.dependencies).toHaveProperty('axios');
    expect(Object.keys(pkgJson.dependencies)).not.toContain('lodash/fp');
    expect(Object.keys(pkgJson.dependencies)).not.toContain('axios/lib/utils');
  });
});

// Helper function
async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}
