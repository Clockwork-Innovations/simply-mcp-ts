/**
 * Integration Tests: Const Roots Servers (Phase 2)
 *
 * End-to-end tests for servers using const-based roots definitions.
 * Tests the full compilation pipeline and runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_const_roots_integration__');

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

describe('Const Roots Server - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Complete Const Roots Server', () => {
    it('should compile and load server with const roots', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'const-roots-server',
  version: '1.0.0',
  description: 'Complete server with const roots'
};

interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Project root directories';
}

interface SystemRoots extends IRoots {
  name: 'system_roots';
  description: 'System root directories';
}

const projectRoots: ProjectRoots = {
  name: 'project_roots',
  description: 'Project root directories'
};

const systemRoots: SystemRoots = {
  name: 'system_roots',
  description: 'System root directories'
};
`;

      const filePath = createTestFile('complete-const-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify compilation
      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('const-roots-server');

      // Verify roots parsed correctly
      expect(result.roots).toHaveLength(2);

      const projectRoots = result.roots.find(r => r.name === 'project_roots');
      expect(projectRoots).toBeDefined();
      expect(projectRoots!.interfaceName).toBe('ProjectRoots');
      expect(projectRoots!.description).toBe('Project root directories');
      expect(projectRoots!.constName).toBe('projectRoots');

      const systemRoots = result.roots.find(r => r.name === 'system_roots');
      expect(systemRoots).toBeDefined();
      expect(systemRoots!.interfaceName).toBe('SystemRoots');
      expect(systemRoots!.description).toBe('System root directories');
      expect(systemRoots!.constName).toBe('systemRoots');

      // Verify const roots discovered
      expect(result.discoveredRoots).toHaveLength(2);
      expect(result.discoveredRoots!.some(r => r.name === 'projectRoots')).toBe(true);
      expect(result.discoveredRoots!.some(r => r.name === 'systemRoots')).toBe(true);
    });

    it('should export const roots correctly from compiled server', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'export-test-server',
  version: '1.0.0',
  description: 'Test roots exports'
};

interface ConfigRoots extends IRoots {
  name: 'config_roots';
  description: 'Configuration root directories';
}

const configRoots: ConfigRoots = {
  name: 'config_roots',
  description: 'Configuration root directories'
};
`;

      const filePath = createTestFile('export-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify the roots has constName set
      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].constName).toBe('configRoots');

      // The roots metadata should be accessible
      expect(result.roots[0].name).toBe('config_roots');
      expect(result.roots[0].description).toBe('Configuration root directories');
    });
  });

  describe('Multiple Const Roots', () => {
    it('should handle server with multiple const roots', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-roots-server',
  version: '1.0.0',
  description: 'Server with multiple const roots'
};

interface SourceRoots extends IRoots {
  name: 'source_roots';
  description: 'Source code roots';
}

interface DataRoots extends IRoots {
  name: 'data_roots';
  description: 'Data storage roots';
}

interface LibraryRoots extends IRoots {
  name: 'library_roots';
  description: 'Library roots';
}

const sourceRoots: SourceRoots = {
  name: 'source_roots',
  description: 'Source code roots'
};

const dataRoots: DataRoots = {
  name: 'data_roots',
  description: 'Data storage roots'
};

const libraryRoots: LibraryRoots = {
  name: 'library_roots',
  description: 'Library roots'
};
`;

      const filePath = createTestFile('multi-const-roots.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify all roots compiled
      expect(result.validationErrors).toEqual([]);
      expect(result.roots).toHaveLength(3);
      expect(result.discoveredRoots).toHaveLength(3);

      const sourceRoots = result.roots.find(r => r.name === 'source_roots');
      const dataRoots = result.roots.find(r => r.name === 'data_roots');
      const libraryRoots = result.roots.find(r => r.name === 'library_roots');

      expect(sourceRoots).toBeDefined();
      expect(sourceRoots!.constName).toBe('sourceRoots');

      expect(dataRoots).toBeDefined();
      expect(dataRoots!.constName).toBe('dataRoots');

      expect(libraryRoots).toBeDefined();
      expect(libraryRoots!.constName).toBe('libraryRoots');
    });
  });

  describe('Complex Roots Scenarios', () => {
    it('should handle server with roots and other features', () => {
      const content = `
import type { IServer, ITool, IParam, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'full-featured-server',
  version: '1.0.0',
  description: 'Server with roots and tools'
};

interface PathParam extends IParam {
  type: 'string';
  description: 'File path';
}

interface ListFilesTool extends ITool {
  name: 'list_files';
  description: 'List files in directory';
  params: { path: PathParam };
  result: string[];
}

interface WorkspaceRoots extends IRoots {
  name: 'workspace_roots';
  description: 'Workspace root directories';
}

const workspaceRoots: WorkspaceRoots = {
  name: 'workspace_roots',
  description: 'Workspace root directories'
};

const listFiles: ListFilesTool = async ({ path }) => {
  return ['file1.txt', 'file2.txt'];
};
`;

      const filePath = createTestFile('full-featured.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have both tools and roots
      expect(result.tools).toHaveLength(1);
      expect(result.roots).toHaveLength(1);

      // Both should be const-based
      expect(result.implementations).toHaveLength(1); // listFiles
      expect(result.discoveredRoots).toHaveLength(1); // workspaceRoots
      expect(result.roots[0].constName).toBe('workspaceRoots');

      // No class-based patterns
      expect(result.className).toBeUndefined();
    });
  });

  describe('Roots Metadata Preservation', () => {
    it('should preserve roots description metadata', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Server with roots metadata'
};

interface ApplicationRoots extends IRoots {
  name: 'app_roots';
  description: 'Application root directories including source, data, and configuration paths';
}

const appRoots: ApplicationRoots = {
  name: 'app_roots',
  description: 'Application root directories including source, data, and configuration paths'
};
`;

      const filePath = createTestFile('roots-with-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify metadata preserved
      expect(result.roots).toHaveLength(1);
      const roots = result.roots[0];

      expect(roots.name).toBe('app_roots');
      expect(roots.description).toBe('Application root directories including source, data, and configuration paths');

      // Const name should still be set
      expect(roots.constName).toBe('appRoots');
    });
  });

  describe('Roots with Base Interface', () => {
    it('should handle roots with base IRoots interface', () => {
      const content = `
import type { IServer, IRoots } from '../../../src/index.js';

const server: IServer = {
  name: 'base-interface-server',
  version: '1.0.0',
  description: 'Server with base IRoots interface'
};

interface BuildRoots extends IRoots {
  name: 'build_roots';
  description: 'Build output directories';
}

interface CacheRoots extends IRoots {
  name: 'cache_roots';
  description: 'Cache directories';
}

// Using base IRoots interface directly
const buildRoots: IRoots = {
  name: 'build_roots',
  description: 'Build output directories'
};

// Using extended interface
const cacheRoots: CacheRoots = {
  name: 'cache_roots',
  description: 'Cache directories'
};
`;

      const filePath = createTestFile('base-interface.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);
      expect(result.roots).toHaveLength(2);
      expect(result.discoveredRoots).toHaveLength(2);

      // Both should have constName set
      const buildRoots = result.roots.find(r => r.name === 'build_roots');
      const cacheRoots = result.roots.find(r => r.name === 'cache_roots');

      expect(buildRoots).toBeDefined();
      expect(buildRoots!.constName).toBe('buildRoots');

      expect(cacheRoots).toBeDefined();
      expect(cacheRoots!.constName).toBe('cacheRoots');
    });
  });
});
