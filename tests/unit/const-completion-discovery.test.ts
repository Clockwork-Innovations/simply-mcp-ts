/**
 * Const Completion Discovery Tests (Phase 2)
 *
 * Tests the completion discovery system for const-based completion patterns:
 * - Pattern 1: const x: ICompletion = { ... } (base interface)
 * - Pattern 2: const x: CityCompletion = { ... } (extended interface)
 *
 * This validates the implementation in discovery.ts and main-compiler.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_const_completion_discovery__');

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

describe('Const Completion Discovery (Phase 2)', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Base ICompletion Pattern', () => {
    it('should discover single const completion with ICompletion base interface', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'completion-test-server',
  version: '1.0.0',
  description: 'Test server with const completion'
};

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
  handler: (value: string) => Promise<string[]>;
}

const cityComplete: ICompletion<string[]> = {
  name: 'city_autocomplete',
  description: 'Autocomplete city names',
  ref: { type: 'argument', name: 'city' },
  handler: async (value) => ['New York', 'Los Angeles', 'Chicago']
};
`;

      const filePath = createTestFile('base-icompletion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the completion interface
      expect(result.completions).toHaveLength(1);
      expect(result.completions[0].interfaceName).toBe('CityCompletion');
      expect(result.completions[0].name).toBe('city_autocomplete');
      expect(result.completions[0].description).toBe('Autocomplete city names');

      // Should discover the const completion implementation
      expect(result.discoveredCompletions).toHaveLength(1);
      expect(result.discoveredCompletions![0].name).toBe('cityComplete');
      expect(result.discoveredCompletions![0].interfaceName).toContain('ICompletion');
      expect(result.discoveredCompletions![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.completions[0].constName).toBe('cityComplete');
    });

    it('should discover const completion with extended completion interface', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'extended-completion-server',
  version: '1.0.0',
  description: 'Server with extended completion interface'
};

interface CountryCompletion extends ICompletion<string[]> {
  name: 'country_autocomplete';
  description: 'Autocomplete country names';
  ref: { type: 'argument'; name: 'country' };
  handler: (value: string) => Promise<string[]>;
}

const countryComplete: CountryCompletion = {
  name: 'country_autocomplete',
  description: 'Autocomplete country names',
  ref: { type: 'argument', name: 'country' },
  handler: async (value) => ['United States', 'Canada', 'Mexico']
};
`;

      const filePath = createTestFile('extended-completion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the completion interface
      expect(result.completions).toHaveLength(1);
      expect(result.completions[0].interfaceName).toBe('CountryCompletion');
      expect(result.completions[0].name).toBe('country_autocomplete');

      // Should discover the const completion with extended interface name
      expect(result.discoveredCompletions).toHaveLength(1);
      expect(result.discoveredCompletions![0].name).toBe('countryComplete');
      expect(result.discoveredCompletions![0].interfaceName).toBe('CountryCompletion');
      expect(result.discoveredCompletions![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.completions[0].constName).toBe('countryComplete');
    });

    it('should discover multiple const completions in same file', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-completion-server',
  version: '1.0.0',
  description: 'Server with multiple const completions'
};

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete cities';
  ref: { type: 'argument'; name: 'city' };
  handler: (value: string) => Promise<string[]>;
}

interface CountryCompletion extends ICompletion<string[]> {
  name: 'country_autocomplete';
  description: 'Autocomplete countries';
  ref: { type: 'argument'; name: 'country' };
  handler: (value: string) => Promise<string[]>;
}

const cityComplete: CityCompletion = {
  name: 'city_autocomplete',
  description: 'Autocomplete cities',
  ref: { type: 'argument', name: 'city' },
  handler: async (value) => ['New York', 'Chicago']
};

const countryComplete: CountryCompletion = {
  name: 'country_autocomplete',
  description: 'Autocomplete countries',
  ref: { type: 'argument', name: 'country' },
  handler: async (value) => ['USA', 'Canada']
};
`;

      const filePath = createTestFile('multi-completions.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse both completion interfaces
      expect(result.completions).toHaveLength(2);
      const cityCompletion = result.completions.find(c => c.name === 'city_autocomplete');
      const countryCompletion = result.completions.find(c => c.name === 'country_autocomplete');

      expect(cityCompletion).toBeDefined();
      expect(cityCompletion!.interfaceName).toBe('CityCompletion');

      expect(countryCompletion).toBeDefined();
      expect(countryCompletion!.interfaceName).toBe('CountryCompletion');

      // Should discover both const completions
      expect(result.discoveredCompletions).toHaveLength(2);

      const discoveredCity = result.discoveredCompletions!.find(c => c.name === 'cityComplete');
      expect(discoveredCity).toBeDefined();
      expect(discoveredCity!.interfaceName).toBe('CityCompletion');
      expect(discoveredCity!.kind).toBe('const');

      const discoveredCountry = result.discoveredCompletions!.find(c => c.name === 'countryComplete');
      expect(discoveredCountry).toBeDefined();
      expect(discoveredCountry!.interfaceName).toBe('CountryCompletion');
      expect(discoveredCountry!.kind).toBe('const');

      // After linking, both should have constName
      expect(cityCompletion!.constName).toBe('cityComplete');
      expect(countryCompletion!.constName).toBe('countryComplete');
    });
  });

  describe('Completion Linking', () => {
    it('should link discovered completions to parsed completion interfaces', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'linking-test-server',
  version: '1.0.0',
  description: 'Test completion linking'
};

interface FileCompletion extends ICompletion<string[]> {
  name: 'file_autocomplete';
  description: 'Autocomplete file paths';
  ref: { type: 'argument'; name: 'file' };
  handler: (value: string) => Promise<string[]>;
}

const fileComplete: FileCompletion = {
  name: 'file_autocomplete',
  description: 'Autocomplete file paths',
  ref: { type: 'argument', name: 'file' },
  handler: async (value) => ['/path/to/file1', '/path/to/file2']
};
`;

      const filePath = createTestFile('completion-linking.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Verify linkCompletionsToInterfaces() worked correctly
      expect(result.completions).toHaveLength(1);
      expect(result.discoveredCompletions).toHaveLength(1);

      // The parsed completion should be linked to its const
      const parsedCompletion = result.completions[0];
      expect(parsedCompletion.constName).toBe('fileComplete');

      // The discovered completion should match
      const discoveredCompletion = result.discoveredCompletions![0];
      expect(discoveredCompletion.name).toBe('fileComplete');
      expect(discoveredCompletion.interfaceName).toBe('FileCompletion');
    });

    it('should properly set constName on ParsedCompletion via linking', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'constname-test-server',
  version: '1.0.0',
  description: 'Test constName field'
};

interface ProductCompletion extends ICompletion<string[]> {
  name: 'product_search';
  description: 'Search products';
  ref: { type: 'argument'; name: 'product' };
  handler: (value: string) => Promise<string[]>;
}

const productComplete: ProductCompletion = {
  name: 'product_search',
  description: 'Search products',
  ref: { type: 'argument', name: 'product' },
  handler: async (value) => ['Product A', 'Product B']
};
`;

      const filePath = createTestFile('constname-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify linking set constName
      expect(result.completions).toHaveLength(1);
      const completion = result.completions[0];

      // constName should match the discovered const variable name
      expect(completion.constName).toBe('productComplete');

      // Interface name should be from the interface declaration
      expect(completion.interfaceName).toBe('ProductCompletion');

      // Completion name should be from the interface metadata
      expect(completion.name).toBe('product_search');
    });
  });

  describe('Edge Cases', () => {
    it('should handle completion with mismatched const name and interface name', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'mismatch-server',
  version: '1.0.0',
  description: 'Test mismatched names'
};

interface TagCompletion extends ICompletion<string[]> {
  name: 'tag_autocomplete';
  description: 'Autocomplete tags';
  ref: { type: 'argument'; name: 'tag' };
  handler: (value: string) => Promise<string[]>;
}

// Const name differs from interface name
const mainTagAutocomplete: TagCompletion = {
  name: 'tag_autocomplete',
  description: 'Autocomplete tags',
  ref: { type: 'argument', name: 'tag' },
  handler: async (value) => ['javascript', 'typescript', 'python']
};
`;

      const filePath = createTestFile('mismatch-names.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should still link correctly
      expect(result.completions).toHaveLength(1);
      expect(result.discoveredCompletions).toHaveLength(1);

      // Const name should be the actual variable name
      expect(result.completions[0].constName).toBe('mainTagAutocomplete');
      expect(result.discoveredCompletions![0].name).toBe('mainTagAutocomplete');

      // Interface name should be from interface declaration
      expect(result.completions[0].interfaceName).toBe('TagCompletion');
      expect(result.discoveredCompletions![0].interfaceName).toBe('TagCompletion');
    });

    it('should not discover const with non-completion interface type', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'non-completion-server',
  version: '1.0.0',
  description: 'Non-completion const test'
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

// This is a tool, not a completion - should not be discovered as completion
const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('non-completion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should NOT discover any completions
      expect(result.completions).toHaveLength(0);
      expect(result.discoveredCompletions).toHaveLength(0);

      // Should discover tool implementation instead
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].name).toBe('echo');
    });

    it('should handle completion with generic type parameter', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'generic-completion-server',
  version: '1.0.0',
  description: 'Test generic completion'
};

interface ColorCompletion extends ICompletion<{ name: string; hex: string }[]> {
  name: 'color_picker';
  description: 'Pick a color';
  ref: { type: 'argument'; name: 'color' };
  handler: (value: string) => Promise<{ name: string; hex: string }[]>;
}

const colorPicker: ICompletion<{ name: string; hex: string }[]> = {
  name: 'color_picker',
  description: 'Pick a color',
  ref: { type: 'argument', name: 'color' },
  handler: async (value) => [
    { name: 'red', hex: '#FF0000' },
    { name: 'blue', hex: '#0000FF' }
  ]
};
`;

      const filePath = createTestFile('generic-completion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.completions).toHaveLength(1);
      expect(result.completions[0].name).toBe('color_picker');
      expect(result.completions[0].constName).toBe('colorPicker');
      expect(result.discoveredCompletions).toHaveLength(1);
    });
  });

  describe('Completion Metadata', () => {
    it('should preserve completion ref field metadata', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Test completion metadata'
};

interface CommandCompletion extends ICompletion<string[]> {
  name: 'command_autocomplete';
  description: 'Autocomplete shell commands';
  ref: {
    type: 'argument';
    name: 'command';
  };
  handler: (value: string) => Promise<string[]>;
}

const commandComplete: CommandCompletion = {
  name: 'command_autocomplete',
  description: 'Autocomplete shell commands',
  ref: {
    type: 'argument',
    name: 'command'
  },
  handler: async (value) => ['ls', 'cd', 'pwd', 'grep']
};
`;

      const filePath = createTestFile('completion-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.validationErrors).toEqual([]);

      // Should parse completion with ref metadata
      expect(result.completions).toHaveLength(1);
      const completion = result.completions[0];

      expect(completion.name).toBe('command_autocomplete');
      expect(completion.description).toBe('Autocomplete shell commands');
      expect(completion.refType).toContain('argument');

      // Should still link correctly
      expect(completion.constName).toBe('commandComplete');
    });
  });
});
