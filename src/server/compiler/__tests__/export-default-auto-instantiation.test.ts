/**
 * Red-to-Green Test: Export Default Class Auto-Instantiation
 *
 * Tests that classes marked with `export default class` are automatically
 * treated as instantiated by the compiler, eliminating the need for manual
 * instantiation like `const server = new Server()`.
 *
 * RED: This test currently fails because the compiler requires manual instantiation
 * GREEN: After fix, the compiler will auto-detect export default and skip validation
 */

import { describe, it, expect } from '@jest/globals';
import { compileInterfaceFile } from '../main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'src', 'server', 'compiler', '__tests__', '__temp_export_default__');

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

describe('Export Default Class Auto-Instantiation', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('RED: Current broken behavior', () => {
    it('should NOT require manual instantiation for export default class', () => {
      // This is the pattern users naturally write
      const content = `
import type { IServer, ITool } from '../../../index.js';

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
};

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: string;
}

export default class Server {
  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}
`;

      const filePath = createTestFile('export-default-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // RED: This currently fails because validationErrors contains:
      // "Class 'Server' has tool/prompt/resource implementations but is not instantiated."
      //
      // GREEN: After fix, there should be NO instantiation error because export default
      // classes should be treated as automatically instantiated
      const instantiationErrors = result.validationErrors!.filter(err =>
        err.includes('not instantiated')
      );
      expect(instantiationErrors).toEqual([]);

      // Should detect the class
      expect(result.className).toBe('Server');

      // Should detect the tool implementation
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].className).toBe('Server');
    });

    it('should still require manual instantiation for non-exported classes', () => {
      // Classes without export default should still require instantiation
      const content = `
import type { IServer, ITool } from '../../../index.js';

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
};

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: string;
}

class Server {
  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}

// No instantiation - this SHOULD error
`;

      const filePath = createTestFile('no-export-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // This should still error because it's not export default
      const instantiationErrors = result.validationErrors!.filter(err =>
        err.includes('not instantiated')
      );
      expect(instantiationErrors).toHaveLength(1);
      expect(instantiationErrors[0]).toContain('not instantiated');
    });

    it('should not error when export default class has explicit instantiation', () => {
      // Even with export default, explicit instantiation should work
      const content = `
import type { IServer, ITool } from '../../../index.js';

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
};

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: string;
}

export default class Server {
  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}

const serverInstance = new Server();
`;

      const filePath = createTestFile('export-with-instantiation.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no instantiation errors
      const instantiationErrors = result.validationErrors!.filter(err =>
        err.includes('not instantiated')
      );
      expect(instantiationErrors).toEqual([]);

      // Should detect both the export default and the instance (explicit + auto)
      expect(result.className).toBe('Server');
      // Note: Will have 2 instances - one auto-instantiated, one explicit
      expect(result.instances!.length).toBeGreaterThanOrEqual(1);
      expect(result.instances!.some(inst => inst.className === 'Server')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle export default class with export keyword separately', () => {
      // Test: export default class (combined keywords)
      const content = `
import type { IServer, ITool } from '../../../index.js';

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
};

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: string;
}

export default class MyServer {
  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}
`;

      const filePath = createTestFile('combined-keywords.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no instantiation errors
      const instantiationErrors = result.validationErrors!.filter(err =>
        err.includes('not instantiated')
      );
      expect(instantiationErrors).toEqual([]);
      expect(result.className).toBe('MyServer');
    });

    it('should handle class with no implementations and no export default', () => {
      // Empty class should not error (no implementations to validate)
      const content = `
import type { IServer } from '../../../index.js';

const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
};

class EmptyServer {
  // No implementations
}
`;

      const filePath = createTestFile('empty-class.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no errors because there are no implementations to validate
      expect(result.validationErrors).toEqual([]);
    });
  });
});
