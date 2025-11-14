/**
 * Test: IParam Schema Generation
 *
 * Verifies that IParam interfaces generate correct JSON schemas for primitive types.
 * Reproduces the bug where NavigateUrlParam (extends StringParam) was generating
 * { type: "object" } instead of { type: "string" }.
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { join } from 'path';
import fs from 'fs/promises';

describe('IParam Schema Generation', () => {
  it('should generate correct primitive schemas for IParam interfaces', async () => {
    // Create a minimal test server file
    const testServerPath = join(__dirname, '../fixtures/iparam-test-server.ts');
    const testServerContent = `
import type { IParam, IServer, ITool, ToolHelper } from 'simply-mcp';

// Parameter definitions using IParam interfaces
interface StringParam extends IParam {
  type: 'string';
  description: string;
  required: true;
}

interface NumberParam extends IParam {
  type: 'number';
  description: string;
  required?: false;
}

interface NavigateUrlParam extends StringParam {
  description: 'URL to navigate the active tab to.';
  minLength: 1;
}

interface WaitForLoadParam extends NumberParam {
  description: 'Milliseconds to wait after navigation for the page to settle.';
  required?: false;
  min: 0;
}

// Tool interface
interface NavigateTool extends ITool {
  name: 'test_navigate';
  description: 'Navigate to the given URL.';
  params: {
    url: NavigateUrlParam;
    waitForLoad?: WaitForLoadParam;
  };
  result: {
    success: boolean;
    finalUrl: string | null;
  };
}

// Server implementation
export default class TestServer implements IServer {
  readonly name = 'test-server' as const;
  readonly version = '0.1.0' as const;
  readonly description = 'Test server for IParam schema generation' as const;
  readonly transport = 'stdio' as const;

  testNavigate: ToolHelper<NavigateTool> = async (params) => {
    const { url, waitForLoad } = params;
    return { success: true, finalUrl: url };
  };
}
`;

    // Write the test server file
    await fs.writeFile(testServerPath, testServerContent, 'utf-8');

    try {
      // Load the server
      const server = await loadInterfaceServer({
        filePath: testServerPath,
        verbose: false,
      });

      // Get the tool list
      const tools = await server.listTools();

      // Find the navigate tool
      const navigateTool = tools.find((t: any) => t.name === 'test_navigate');
      expect(navigateTool).toBeDefined();

      // Verify the inputSchema
      const inputSchema = navigateTool.inputSchema;
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toBeDefined();

      // THIS IS THE KEY TEST: url should be type "string", not "object"
      expect(inputSchema.properties.url).toBeDefined();
      expect(inputSchema.properties.url.type).toBe('string');
      expect(inputSchema.properties.url.description).toBe('URL to navigate the active tab to.');
      expect(inputSchema.properties.url.minLength).toBe(1);

      // waitForLoad should be type "number", not "object"
      expect(inputSchema.properties.waitForLoad).toBeDefined();
      expect(inputSchema.properties.waitForLoad.type).toBe('number');
      expect(inputSchema.properties.waitForLoad.description).toBe('Milliseconds to wait after navigation for the page to settle.');
      expect(inputSchema.properties.waitForLoad.minimum).toBe(0);

      // Verify required fields
      expect(inputSchema.required).toEqual(['url']);

      // Clean up
      await server.stop();
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testServerPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  it('should handle enum constraints in IParam interfaces', async () => {
    const testServerPath = join(__dirname, '../fixtures/iparam-enum-test-server.ts');
    const testServerContent = `
import type { IParam, IServer, ITool, ToolHelper } from 'simply-mcp';

interface StringParam extends IParam {
  type: 'string';
  description: string;
}

interface OrderByParam extends StringParam {
  description: 'Sort order for items.';
  enum: ['newest', 'oldest'];
}

interface FilterTool extends ITool {
  name: 'test_filter';
  description: 'Filter items.';
  params: {
    orderBy: OrderByParam;
  };
  result: {
    items: string[];
  };
}

export default class TestServer implements IServer {
  readonly name = 'test-server' as const;
  readonly version = '0.1.0' as const;
  readonly description = 'Test server' as const;
  readonly transport = 'stdio' as const;

  testFilter: ToolHelper<FilterTool> = async (params) => {
    return { items: [] };
  };
}
`;

    await fs.writeFile(testServerPath, testServerContent, 'utf-8');

    try {
      const server = await loadInterfaceServer({ filePath: testServerPath, verbose: false });
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'test_filter');

      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties.orderBy.type).toBe('string');
      expect(tool.inputSchema.properties.orderBy.enum).toEqual(['newest', 'oldest']);

      await server.stop();
    } finally {
      try {
        await fs.unlink(testServerPath);
      } catch (error) {
        // Ignore
      }
    }
  });
});
