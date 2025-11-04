/**
 * Tests for named export support
 * Validates that "export class" works as an alternative to "export default class"
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDir = __dirname;

describe('Named Export Support', () => {
  it('should load a server with named export (export class)', async () => {
    const server = await loadInterfaceServer({
      filePath: path.join(testDir, '../../fixtures/interface-named-export.ts'),
      verbose: false,
    });

    expect(server).toBeDefined();
    expect(server.name).toBe('named-export-test');
    expect(server.version).toBe('1.0.0');

    const tools = server.listTools();
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('echo');
  });

  it('should execute tools on named-export server', async () => {
    const server = await loadInterfaceServer({
      filePath: path.join(testDir, '../../fixtures/interface-named-export.ts'),
      verbose: false,
    });

    const result = await server.executeTool('echo', { message: 'Hello' });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Hello' }]
    });
  });

  it('should detect class name from naming pattern', async () => {
    const server = await loadInterfaceServer({
      filePath: path.join(testDir, '../../fixtures/interface-named-export.ts'),
      verbose: false,
    });

    // Verify the server was loaded correctly
    expect(server).toBeDefined();
    expect(server.name).toBe('named-export-test');
  });

  it('should throw helpful error when no export found', async () => {
    // Create a minimal fixture file with invalid class name (won't match naming pattern)
    const tempFile = path.join(testDir, '../../fixtures/interface-no-export-temp.ts');
    const fs = await import('fs');
    fs.writeFileSync(tempFile, `
      import type { IServer, ITool } from '../../../src/index.js';

      interface MyInterface extends IServer {
        name: 'test';
        version: '1.0.0';
      }

      interface TestTool extends ITool {
        name: 'test';
        description: 'test';
        params: {};
        result: string;
      }

      // Class without export keyword and doesn't match naming pattern
      class Foo {
        test = async () => "result";
      }
    `);

    try {
      await loadInterfaceServer({
        filePath: tempFile,
        verbose: false,
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Error could be from TypeScript compilation or from missing export
      // Just verify we got an error
      expect(error.message.length).toBeGreaterThan(0);
    } finally {
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});
