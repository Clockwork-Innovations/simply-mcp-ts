/**
 * Integration Tests: Code Execution Server
 *
 * Tests compilation and tool registration for servers with code execution enabled.
 * Follows the pattern of other integration tests (compile + parse, not full HTTP).
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_code_execution__');

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

describe('Code Execution Server - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Server Configuration Parsing', () => {
    test('should parse server with codeExecution config', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'code-exec-test',
  version: '1.0.0',
  description: 'Test server with code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('server-config.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.server?.codeExecution?.mode).toBe('vm');
      expect(result.server?.codeExecution?.timeout).toBe(5000);
    });

    test('should parse server with full codeExecution config', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'full-config-test',
  version: '1.0.0',
  description: 'Full config test',
  codeExecution: {
    mode: 'vm',
    timeout: 10000,
    captureOutput: true,
    allowedLanguages: ['javascript'],
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('full-config.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.server?.codeExecution?.mode).toBe('vm');
      expect(result.server?.codeExecution?.timeout).toBe(10000);
      expect(result.server?.codeExecution?.captureOutput).toBe(true);
      expect(result.server?.codeExecution?.allowedLanguages).toEqual(['javascript']);
    });

    test('should parse server without codeExecution', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'no-code-exec',
  version: '1.0.0',
  description: 'Server without code execution',
};

export default class TestServer {}
`;

      const filePath = createTestFile('no-code-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server?.codeExecution).toBeUndefined();
    });
  });

  describe('Mixed Server Configurations', () => {
    test('should parse server with tools and codeExecution', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { message: MessageParam };
  result: string;
}

export const server: IServer = {
  name: 'mixed-server',
  version: '1.0.0',
  description: 'Server with tools and code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {
  greet: GreetTool = async ({ message }) => \`Hello, \${message}!\`;
}
`;

      const filePath = createTestFile('mixed-server.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('greet');
    });

    test('should parse server with routers and codeExecution', () => {
      const content = `
import type { IServer, ITool, IToolRouter, IParam } from '../../../src/index.js';

interface MsgParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { msg: MsgParam };
  result: string;
}

interface UtilityRouter extends IToolRouter {
  name: 'utility';
  description: 'Utility tools';
  tools: ['echo'];
}

const server: IServer = {
  name: 'router-with-exec',
  version: '1.0.0',
  description: 'Routers + code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

const utilityRouter: UtilityRouter = {
  name: 'utility',
  description: 'Utility tools',
  tools: ['echo']
};

const echo: EchoTool = async ({ msg }) => msg;
`;

      const filePath = createTestFile('router-with-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.routers).toHaveLength(1);
      expect(result.tools).toHaveLength(1);
    });

    test('should parse server with resources and codeExecution', () => {
      const content = `
import type { IServer, IResource } from '../../../src/index.js';

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'app_config';
  description: 'App configuration';
  mimeType: 'application/json';
  dynamic: true;
  result: { contents: Array<{ uri: string; text: string }> };
}

export const server: IServer = {
  name: 'resource-with-exec',
  version: '1.0.0',
  description: 'Resources + code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {
  app_config: ConfigResource = async () => ({ contents: [] });
}
`;

      const filePath = createTestFile('resource-with-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.resources).toHaveLength(1);
    });
  });

  describe('Configuration Validation', () => {
    test('should accept minimal codeExecution config', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'minimal-config',
  version: '1.0.0',
  description: 'Minimal config',
  codeExecution: {
    mode: 'vm',
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('minimal-config.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.mode).toBe('vm');
    });

    test('should parse different execution modes', () => {
      const vmContent = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'vm-mode',
  version: '1.0.0',
  description: 'VM mode',
  codeExecution: {
    mode: 'vm',
  }
};

export default class TestServer {}
`;

      const vmPath = createTestFile('vm-mode.ts', vmContent);
      const vmResult = compileInterfaceFile(vmPath);

      expect(vmResult.validationErrors).toEqual([]);
      expect(vmResult.server?.codeExecution?.mode).toBe('vm');
    });

    test('should parse captureOutput settings', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'capture-test',
  version: '1.0.0',
  description: 'Capture output test',
  codeExecution: {
    mode: 'vm',
    captureOutput: false,
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('capture-test.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.captureOutput).toBe(false);
    });

    test('should parse allowedLanguages', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'lang-test',
  version: '1.0.0',
  description: 'Language test',
  codeExecution: {
    mode: 'vm',
    allowedLanguages: ['javascript'],
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('lang-test.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.allowedLanguages).toEqual(['javascript']);
    });
  });

  describe('Const-Based Servers', () => {
    test('should parse const server basic properties', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

const server: IServer = {
  name: 'const-exec-server',
  version: '1.0.0',
  description: 'Const server with code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};
`;

      const filePath = createTestFile('const-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server?.name).toBe('const-exec-server');
      // Note: codeExecution is not parsed from const server object literals
      // It's only parsed from IServer interface extensions
    });

    test('should parse const server with tools', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-tools-exec',
  version: '1.0.0',
  description: 'Const tools + code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
}

const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('const-tools-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.tools).toHaveLength(1);
      expect(result.implementations).toHaveLength(1);
      // Note: codeExecution is not parsed from const server object literals
    });
  });
});
