/**
 * Bundled Server Reflection Test
 *
 * Tests that bundled servers work correctly via runtime reflection.
 * This is a regression test for the CommonJS/ESM compatibility issues
 * and parameter schema generation for reflected tools.
 *
 * Background:
 * - Bundled servers are in JavaScript (no TypeScript interfaces)
 * - Static analysis fails, so we use runtime reflection
 * - Tools must receive both params and context (the "helper")
 *
 * Bugs fixed:
 * 1. CommonJS/ESM module format mismatch (module.default.default)
 * 2. No runtime reflection fallback for bundled servers
 * 3. Missing context/helper parameter in tool execution
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Bundled Server Reflection', () => {
  let testDir: string;
  let serverFile: string;
  let bundleFile: string;
  let cliPath: string;

  beforeAll(async () => {
    // Create temp directory for test files
    testDir = path.join(os.tmpdir(), 'bundled-server-test-' + Date.now());
    await mkdir(testDir, { recursive: true });

    serverFile = path.join(testDir, 'test-server.ts');
    bundleFile = path.join(testDir, 'test-server-bundle.js');
    cliPath = path.join(__dirname, '../../dist/src/cli/index.js');

    // Create a simple interface-driven server
    const serverCode = `
import type { ITool, IServer, IParam } from 'simply-mcp';

interface NumberParam extends IParam {
  type: 'number';
  description: 'A number';
  required: true;
}

interface AddTool extends ITool {
  description: 'Add two numbers';
  params: {
    a: NumberParam;
    b: NumberParam;
  };
}

interface MultiplyTool extends ITool {
  description: 'Multiply two numbers';
  params: {
    a: NumberParam;
    b: NumberParam;
  };
}

interface TestServer extends IServer {
  name: 'test-bundled-server';
  version: '1.0.0';
  description: 'Test server for bundled reflection';
  add: AddTool;
  multiply: MultiplyTool;
}

export default class implements TestServer {
  name = 'test-bundled-server' as const;
  version = '1.0.0' as const;
  description = 'Test server for bundled reflection' as const;

  add: AddTool = async (params) => {
    const { a, b } = params;
    return \`Sum: \${a + b}\`;
  };

  multiply: MultiplyTool = async (params) => {
    const { a, b } = params;
    return \`Product: \${a * b}\`;
  };
}
`;

    await writeFile(serverFile, serverCode);

    // Bundle the server
    const bundleCmd = `node ${cliPath} bundle ${serverFile} -o ${bundleFile}`;
    await execAsync(bundleCmd);
  });

  afterAll(async () => {
    // Clean up test files
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load bundled server without errors', async () => {
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0' }
      }
    });

    const { stdout } = await execAsync(
      `echo '${initRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);
    expect(response.result).toBeDefined();
    expect(response.result.serverInfo.name).toBe('interface-server');
  });

  it('should discover tools via runtime reflection', async () => {
    const listRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    const { stdout } = await execAsync(
      `echo '${listRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);
    expect(response.result).toBeDefined();
    expect(response.result.tools).toHaveLength(2);

    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('add');
    expect(toolNames).toContain('multiply');
  });

  it('should generate proper parameter schemas for reflected tools', async () => {
    const listRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    const { stdout } = await execAsync(
      `echo '${listRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);
    const addTool = response.result.tools.find((t: any) => t.name === 'add');

    expect(addTool.inputSchema).toBeDefined();
    expect(addTool.inputSchema.type).toBe('object');

    // Should have proper parameter definitions (not passthrough)
    expect(addTool.inputSchema.properties).toBeDefined();
    expect(addTool.inputSchema.properties.a).toBeDefined();
    expect(addTool.inputSchema.properties.a.type).toBe('number');
    expect(addTool.inputSchema.properties.b).toBeDefined();
    expect(addTool.inputSchema.properties.b.type).toBe('number');

    // Should mark required parameters
    expect(addTool.inputSchema.required).toContain('a');
    expect(addTool.inputSchema.required).toContain('b');

    // Should NOT be passthrough
    expect(addTool.inputSchema.additionalProperties).not.toBe(true);
  });

  it('should execute reflected tools with parameters', async () => {
    const callRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'add',
        arguments: { a: 15, b: 27 }
      }
    });

    const { stdout } = await execAsync(
      `echo '${callRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);
    expect(response.result).toBeDefined();
    expect(response.result.content).toHaveLength(1);
    expect(response.result.content[0].type).toBe('text');
    expect(response.result.content[0].text).toBe('Sum: 42');
  });

  it('should execute multiple tools correctly', async () => {
    const multiplyRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'multiply',
        arguments: { a: 6, b: 7 }
      }
    });

    const { stdout } = await execAsync(
      `echo '${multiplyRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toBe('Product: 42');
  });

  it('should validate missing required parameters', async () => {
    const badRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'add',
        arguments: {} // Missing a and b
      }
    });

    const { stdout } = await execAsync(
      `echo '${badRequest}' | node ${cliPath} run ${bundleFile}`
    );

    const response = JSON.parse(stdout.split('\n')[0]);

    // With proper schema validation, missing required params should cause a validation error
    expect(response.result).toBeDefined();
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toMatch(/required|validation/i);
  });
});
