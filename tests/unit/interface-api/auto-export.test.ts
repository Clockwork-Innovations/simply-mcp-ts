/**
 * Tests for named export support
 * Validates that "export class" works as an alternative to "export default class"
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/api/interface/adapter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Named Export Support', () => {
  it('should load a server with named export (export class)', async () => {
    const server = await loadInterfaceServer({
      filePath: path.join(__dirname, '../../fixtures/interface-named-export.ts'),
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
      filePath: path.join(__dirname, '../../fixtures/interface-named-export.ts'),
      verbose: false,
    });

    const result = await server.executeTool('echo', { message: 'Hello' });

    expect(result).toBe('Hello');
  });

  it('should detect class name from naming pattern', async () => {
    const server = await loadInterfaceServer({
      filePath: path.join(__dirname, '../../fixtures/interface-named-export.ts'),
      verbose: false,
    });

    // Verify the server was loaded correctly
    expect(server).toBeDefined();
    expect(server.name).toBe('named-export-test');
  });

  it('should throw helpful error when no export found', async () => {
    // Create a temp file with class but no export
    const tempFile = path.join(__dirname, '../../fixtures/interface-no-export-temp.ts');
    const fs = await import('fs');
    fs.writeFileSync(tempFile, `
      import type { IServer, ITool } from '../../../src/index.js';

      interface TestServer extends IServer {
        name: 'test';
        version: '1.0.0';
      }

      interface TestTool extends ITool {
        name: 'test';
        description: 'test';
        params: {};
        result: string;
      }

      // Class without export
      class TestServer {
        test = async () => "result";
      }
    `);

    try {
      await loadInterfaceServer({
        filePath: tempFile,
        verbose: false,
      });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain('Expected class');
        expect(error.message).toContain('export');
      }
    } finally {
      // Clean up
      fs.unlinkSync(tempFile);
    }
  });
});
