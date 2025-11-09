/**
 * Const Roots Discovery Tests (Phase 2)
 *
 * Tests the roots discovery system for const-based roots patterns:
 * - Pattern 1: const x: IRoots = { ... } (base interface)
 * - Pattern 2: const x: ProjectRoots = { ... } (extended interface)
 *
 * This validates the implementation in discovery.ts and main-compiler.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_const_roots_discovery__');

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

describe('Const Roots Discovery (Phase 2)', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Base IRoots Pattern', () => {
    it('should discover single const roots with IRoots base interface', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'roots-test-server',
  version: '1.0.0',
  description: 'Test server with const roots'
};

interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Project root directories';
}

const projectRoots: IRoots = {
  name: 'project_roots',
  description: 'Project root directories'
};
`;

      const filePath = createTestFile('base-iroots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the roots interface
      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].interfaceName).toBe('ProjectRoots');
      expect(result.roots[0].name).toBe('project_roots');
      expect(result.roots[0].description).toBe('Project root directories');

      // Should discover the const roots implementation
      expect(result.discoveredRoots).toHaveLength(1);
      expect(result.discoveredRoots![0].name).toBe('projectRoots');
      expect(result.discoveredRoots![0].interfaceName).toBe('IRoots');
      expect(result.discoveredRoots![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.roots[0].constName).toBe('projectRoots');
    });

    it('should discover const roots with extended roots interface', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'extended-roots-server',
  version: '1.0.0',
  description: 'Server with extended roots interface'
};

interface WorkspaceRoots extends IRoots {
  name: 'workspace_roots';
  description: 'Workspace root paths';
}

const workspaceRoots: WorkspaceRoots = {
  name: 'workspace_roots',
  description: 'Workspace root paths'
};
`;

      const filePath = createTestFile('extended-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the roots interface
      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].interfaceName).toBe('WorkspaceRoots');
      expect(result.roots[0].name).toBe('workspace_roots');

      // Should discover the const roots with extended interface name
      expect(result.discoveredRoots).toHaveLength(1);
      expect(result.discoveredRoots![0].name).toBe('workspaceRoots');
      expect(result.discoveredRoots![0].interfaceName).toBe('WorkspaceRoots');
      expect(result.discoveredRoots![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.roots[0].constName).toBe('workspaceRoots');
    });

    it('should discover multiple const roots in same file', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-roots-server',
  version: '1.0.0',
  description: 'Server with multiple const roots'
};

interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Project directories';
}

interface SystemRoots extends IRoots {
  name: 'system_roots';
  description: 'System directories';
}

const projectRoots: ProjectRoots = {
  name: 'project_roots',
  description: 'Project directories'
};

const systemRoots: SystemRoots = {
  name: 'system_roots',
  description: 'System directories'
};
`;

      const filePath = createTestFile('multi-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse both roots interfaces
      expect(result.roots).toHaveLength(2);
      const projectRoots = result.roots.find(r => r.name === 'project_roots');
      const systemRoots = result.roots.find(r => r.name === 'system_roots');

      expect(projectRoots).toBeDefined();
      expect(projectRoots!.interfaceName).toBe('ProjectRoots');

      expect(systemRoots).toBeDefined();
      expect(systemRoots!.interfaceName).toBe('SystemRoots');

      // Should discover both const roots
      expect(result.discoveredRoots).toHaveLength(2);

      const discoveredProject = result.discoveredRoots!.find(r => r.name === 'projectRoots');
      expect(discoveredProject).toBeDefined();
      expect(discoveredProject!.interfaceName).toBe('ProjectRoots');
      expect(discoveredProject!.kind).toBe('const');

      const discoveredSystem = result.discoveredRoots!.find(r => r.name === 'systemRoots');
      expect(discoveredSystem).toBeDefined();
      expect(discoveredSystem!.interfaceName).toBe('SystemRoots');
      expect(discoveredSystem!.kind).toBe('const');

      // After linking, both should have constName
      expect(projectRoots!.constName).toBe('projectRoots');
      expect(systemRoots!.constName).toBe('systemRoots');
    });
  });

  describe('Roots Linking', () => {
    it('should link discovered roots to parsed roots interfaces', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'linking-test-server',
  version: '1.0.0',
  description: 'Test roots linking'
};

interface ConfigRoots extends IRoots {
  name: 'config_roots';
  description: 'Configuration directories';
}

const configRoots: ConfigRoots = {
  name: 'config_roots',
  description: 'Configuration directories'
};
`;

      const filePath = createTestFile('roots-linking.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Verify linkRootsToInterfaces() worked correctly
      expect(result.roots).toHaveLength(1);
      expect(result.discoveredRoots).toHaveLength(1);

      // The parsed roots should be linked to its const
      const parsedRoots = result.roots[0];
      expect(parsedRoots.constName).toBe('configRoots');

      // The discovered roots should match
      const discoveredRoots = result.discoveredRoots![0];
      expect(discoveredRoots.name).toBe('configRoots');
      expect(discoveredRoots.interfaceName).toBe('ConfigRoots');
    });

    it('should properly set constName on ParsedRoots via linking', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'constname-test-server',
  version: '1.0.0',
  description: 'Test constName field'
};

interface DataRoots extends IRoots {
  name: 'data_roots';
  description: 'Data root directories';
}

const dataRoots: DataRoots = {
  name: 'data_roots',
  description: 'Data root directories'
};
`;

      const filePath = createTestFile('constname-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify linking set constName
      expect(result.roots).toHaveLength(1);
      const roots = result.roots[0];

      // constName should match the discovered const variable name
      expect(roots.constName).toBe('dataRoots');

      // Interface name should be from the interface declaration
      expect(roots.interfaceName).toBe('DataRoots');

      // Roots name should be from the interface metadata
      expect(roots.name).toBe('data_roots');
    });
  });

  describe('Edge Cases', () => {
    it('should handle roots with mismatched const name and interface name', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'mismatch-server',
  version: '1.0.0',
  description: 'Test mismatched names'
};

interface SourceRoots extends IRoots {
  name: 'source_roots';
  description: 'Source code directories';
}

// Const name differs from interface name
const mainSourceDirectories: SourceRoots = {
  name: 'source_roots',
  description: 'Source code directories'
};
`;

      const filePath = createTestFile('mismatch-names.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should still link correctly
      expect(result.roots).toHaveLength(1);
      expect(result.discoveredRoots).toHaveLength(1);

      // Const name should be the actual variable name
      expect(result.roots[0].constName).toBe('mainSourceDirectories');
      expect(result.discoveredRoots![0].name).toBe('mainSourceDirectories');

      // Interface name should be from interface declaration
      expect(result.roots[0].interfaceName).toBe('SourceRoots');
      expect(result.discoveredRoots![0].interfaceName).toBe('SourceRoots');
    });

    it('should not discover const with non-roots interface type', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'non-roots-server',
  version: '1.0.0',
  description: 'Non-roots const test'
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

// This is a tool, not roots - should not be discovered as roots
const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('non-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should NOT discover any roots
      expect(result.roots).toHaveLength(0);
      expect(result.discoveredRoots).toHaveLength(0);

      // Should discover tool implementation instead
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].name).toBe('echo');
    });
  });

  describe('Roots Metadata', () => {
    it('should preserve roots description metadata', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Test roots metadata'
};

interface LibraryRoots extends IRoots {
  name: 'library_roots';
  description: 'Library and dependency root paths for the project';
}

const libraryRoots: LibraryRoots = {
  name: 'library_roots',
  description: 'Library and dependency root paths for the project'
};
`;

      const filePath = createTestFile('roots-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.validationErrors).toEqual([]);

      // Should parse roots with description metadata
      expect(result.roots).toHaveLength(1);
      const roots = result.roots[0];

      expect(roots.name).toBe('library_roots');
      expect(roots.description).toBe('Library and dependency root paths for the project');

      // Should still link correctly
      expect(roots.constName).toBe('libraryRoots');
    });
  });
});
