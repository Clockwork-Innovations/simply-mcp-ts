/**
 * Integration Tests: Code Execution Adapter
 *
 * Tests that the adapter correctly parses and validates code execution configurations.
 * Validates compatibility with different server patterns (class, const, interface).
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_code_exec_adapter__');

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

describe('Code Execution Adapter - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Configuration Parsing with Interface API', () => {
    test('should parse codeExecution from IServer interface', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'interface-test',
  version: '1.0.0',
  description: 'Test interface parsing',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('interface-server.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.server?.codeExecution?.mode).toBe('vm');
      expect(result.server?.codeExecution?.timeout).toBe(5000);
    });

    test('should NOT parse codeExecution when absent', () => {
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
  name: 'no-code-exec',
  version: '1.0.0',
  description: 'Server without code execution',
};

export default class TestServer {
  greet: GreetTool = async ({ message }) => \`Hello, \${message}!\`;
}
`;

      const filePath = createTestFile('no-code-exec.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server?.codeExecution).toBeUndefined();
      expect(result.tools).toHaveLength(1);
    });
  });

  describe('Const-Based Server Support', () => {
    test('should parse const server with tools', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-code-exec',
  version: '1.0.0',
  description: 'Const server with code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

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

const echo: EchoTool = async ({ msg }) => msg;
`;

      const filePath = createTestFile('const-server.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.tools).toHaveLength(1);
      expect(result.implementations).toHaveLength(1);
      // Note: codeExecution is not parsed from const server object literals
      // It would need to be on the IServer interface extension, not the const value
    });
  });

  describe('Configuration Variations', () => {
    test('should parse minimal config', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'minimal-config',
  version: '1.0.0',
  description: 'Minimal code execution config',
  codeExecution: {
    mode: 'vm',
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('minimal-config.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.server?.codeExecution?.mode).toBe('vm');
    });

    test('should parse full config with all options', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'full-config',
  version: '1.0.0',
  description: 'Full code execution config',
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
  });

  describe('Mixed Tool Scenarios', () => {
    test('should coexist with regular tools', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface WeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather';
  params: { city: CityParam };
  result: string;
}

export const server: IServer = {
  name: 'mixed-tools',
  version: '1.0.0',
  description: 'Regular tools + code execution',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class TestServer {
  get_weather: WeatherTool = async ({ city }) => \`Weather in \${city}: Sunny\`;
}
`;

      const filePath = createTestFile('mixed-tools.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('get_weather');
    });

    test('should work with routers', () => {
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

    test('should work with resources', () => {
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

  describe('Different Server Patterns', () => {
    test('should work with class-based servers', () => {
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
  name: 'class-server',
  version: '1.0.0',
  description: 'Class-based server',
  codeExecution: {
    mode: 'vm',
    timeout: 5000,
  }
};

export default class ClassServer {
  greet: GreetTool = async ({ message }) => \`Hello, \${message}!\`;
}
`;

      const filePath = createTestFile('class-server.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution).toBeDefined();
      expect(result.className).toBe('ClassServer');
      expect(result.tools).toHaveLength(1);
    });

    test('should work with const-only servers (no class)', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-only',
  version: '1.0.0',
  description: 'Const-only server',
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

      const filePath = createTestFile('const-only.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.className).toBeUndefined();
      expect(result.tools).toHaveLength(1);
      expect(result.implementations).toHaveLength(1);
      // Note: codeExecution is not parsed from const server object literals
    });
  });

  describe('Special Configuration Cases', () => {
    test('should parse captureOutput: false', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'no-capture',
  version: '1.0.0',
  description: 'No output capture',
  codeExecution: {
    mode: 'vm',
    captureOutput: false,
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('no-capture.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.captureOutput).toBe(false);
    });

    test('should parse custom timeout', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'custom-timeout',
  version: '1.0.0',
  description: 'Custom timeout',
  codeExecution: {
    mode: 'vm',
    timeout: 15000,
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('custom-timeout.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.timeout).toBe(15000);
    });

    test('should parse allowed languages array', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

export const server: IServer = {
  name: 'lang-restriction',
  version: '1.0.0',
  description: 'Language restriction',
  codeExecution: {
    mode: 'vm',
    allowedLanguages: ['javascript'],
  }
};

export default class TestServer {}
`;

      const filePath = createTestFile('lang-restriction.ts', content);
      const result = compileInterfaceFile(filePath);

      expect(result.validationErrors).toEqual([]);
      expect(result.server?.codeExecution?.allowedLanguages).toEqual(['javascript']);
    });
  });
});
