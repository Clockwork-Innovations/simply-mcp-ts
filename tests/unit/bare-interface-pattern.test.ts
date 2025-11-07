/**
 * Bare Interface Pattern Tests
 *
 * Tests the pure interface-driven pattern with ZERO class boilerplate.
 * Validates that servers can be written with just:
 * - const server: IServer
 * - const tool: ToolInterface
 *
 * No classes, no instantiation - truly zero boilerplate.
 */

import { describe, it, expect } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_bare_interface__');

function setupTempDir() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createTestFile(filename: string, content: string): string {
  const filePath = join(TEMP_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('Bare Interface Pattern (Zero Boilerplate)', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Pure Bare Interface - No Class', () => {
    it('should support server with only const server + const tool (no class)', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'bare-interface-server',
  version: '1.0.0',
  description: 'Pure interface-driven server'
};

interface NameParam extends IParam {
  type: 'string';
  description: 'Name parameter';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

const greet: GreetTool = async ({ name }) => {
  return \`Hello, \${name}!\`;
};
`;

      const filePath = createTestFile('pure-bare-interface.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect server config
      expect(result.server).toBeDefined();
      expect(result.server?.name).toBe('bare-interface-server');

      // Should detect const implementation
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].kind).toBe('const');
      expect(result.implementations![0].name).toBe('greet');
      expect(result.implementations![0].interfaceName).toBe('GreetTool');
      expect(result.implementations![0].isBareInterface).toBe(true);

      // Should NOT have a class
      expect(result.className).toBeUndefined();

      // Should NOT have any instances (no class to instantiate)
      expect(result.instances).toHaveLength(0);
    });

    it('should support multiple tools in bare interface pattern', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-tool-server',
  version: '1.0.0',
  description: 'Server with multiple tools'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message to echo';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo a message';
  params: { message: MessageParam };
  result: string;
}

interface PingTool extends ITool {
  name: 'ping';
  description: 'Ping the server';
  params: {};
  result: string;
}

const echo: EchoTool = async ({ message }) => message;
const ping: PingTool = async () => 'pong';
`;

      const filePath = createTestFile('multi-tool-bare.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect both tools
      expect(result.tools).toHaveLength(2);
      expect(result.tools.map(t => t.name)).toContain('echo');
      expect(result.tools.map(t => t.name)).toContain('ping');

      // Should detect both implementations
      expect(result.implementations).toHaveLength(2);
      expect(result.implementations!.every(impl => impl.kind === 'const')).toBe(true);
      expect(result.implementations!.every(impl => impl.isBareInterface)).toBe(true);
    });

    it('should support bare interface with prompts', () => {
      const content = `
import type { IServer, IPrompt } from '../../../src/index.js';

const server: IServer = {
  name: 'prompt-server',
  version: '1.0.0',
  description: 'Server with prompts'
};

interface WelcomePrompt extends IPrompt {
  name: 'welcome';
  description: 'Welcome message prompt';
  args: {};
  result: { messages: Array<{ role: string; content: string }> };
}

const welcome: WelcomePrompt = async () => ({
  messages: [{ role: 'user', content: 'Welcome!' }]
});
`;

      const filePath = createTestFile('prompt-bare.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect prompt
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('welcome');

      // Should detect const implementation
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].helperType).toBe('PromptHelper');
      expect(result.implementations![0].isBareInterface).toBe(true);
    });

    it('should support bare interface with resources', () => {
      const content = `
import type { IServer, IResource } from '../../../src/index.js';

const server: IServer = {
  name: 'resource-server',
  version: '1.0.0',
  description: 'Server with resources'
};

interface UsersResource extends IResource {
  uri: 'users://list';
  name: 'users';
  description: 'List of users';
  mimeType: 'application/json';
  dynamic: true;
  result: { contents: Array<{ uri: string; text: string }> };
}

const users: UsersResource = async () => ({
  contents: [{ uri: 'users://1', text: 'User 1' }]
});
`;

      const filePath = createTestFile('resource-bare.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect resource
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('users');

      // Should detect const implementation
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].helperType).toBe('ResourceHelper');
      expect(result.implementations![0].isBareInterface).toBe(true);
    });
  });

  describe('Mixed Patterns', () => {
    it('should error if mixing bare interface const with class properties', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-server',
  version: '1.0.0',
  description: 'Mixed pattern (should not work)'
};

interface NameParam extends IParam {
  type: 'string';
  description: 'Name parameter';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface FarewellTool extends ITool {
  name: 'farewell';
  description: 'Say goodbye';
  params: { name: NameParam };
  result: string;
}

// Const implementation
const greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;

// Class with property implementation (mixing patterns)
class ServerClass {
  farewell: FarewellTool = async ({ name }) => \`Goodbye, \${name}!\`;
}
`;

      const filePath = createTestFile('mixed-pattern.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have validation error about class not being instantiated
      const instantiationErrors = result.validationErrors!.filter(err =>
        err.includes('not instantiated')
      );
      expect(instantiationErrors.length).toBeGreaterThan(0);

      // Should detect both implementations
      expect(result.implementations).toHaveLength(2);
      expect(result.implementations!.some(impl => impl.kind === 'const')).toBe(true);
      expect(result.implementations!.some(impl => impl.kind === 'class-property')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bare interface server (no tools)', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

const server: IServer = {
  name: 'empty-server',
  version: '1.0.0',
  description: 'Empty server with no capabilities'
};
`;

      const filePath = createTestFile('empty-bare.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors (empty server is valid)
      expect(result.validationErrors).toEqual([]);

      // Should detect server config
      expect(result.server).toBeDefined();
      expect(result.server?.name).toBe('empty-server');

      // Should have no implementations
      expect(result.implementations).toHaveLength(0);
      expect(result.tools).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
    });
  });
});
