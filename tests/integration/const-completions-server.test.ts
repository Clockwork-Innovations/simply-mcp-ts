/**
 * Integration Tests: Const Completion Servers (Phase 2)
 *
 * End-to-end tests for servers using const-based completion definitions.
 * Tests the full compilation pipeline and runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_const_completion_integration__');

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

describe('Const Completion Server - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Complete Const Completion Server', () => {
    it('should compile and load server with const completion', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'const-completion-server',
  version: '1.0.0',
  description: 'Complete server with const completion'
};

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
  handler: (value: string) => Promise<string[]>;
}

interface CountryCompletion extends ICompletion<string[]> {
  name: 'country_autocomplete';
  description: 'Autocomplete country names';
  ref: { type: 'argument'; name: 'country' };
  handler: (value: string) => Promise<string[]>;
}

const cityComplete: CityCompletion = {
  name: 'city_autocomplete',
  description: 'Autocomplete city names',
  ref: { type: 'argument', name: 'city' },
  handler: async (value) => {
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
    return cities.filter(city => city.toLowerCase().includes(value.toLowerCase()));
  }
};

const countryComplete: CountryCompletion = {
  name: 'country_autocomplete',
  description: 'Autocomplete country names',
  ref: { type: 'argument', name: 'country' },
  handler: async (value) => {
    const countries = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'France'];
    return countries.filter(country => country.toLowerCase().includes(value.toLowerCase()));
  }
};
`;

      const filePath = createTestFile('complete-const-completion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify compilation
      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('const-completion-server');

      // Verify completions parsed correctly
      expect(result.completions).toHaveLength(2);

      const cityCompletion = result.completions.find(c => c.name === 'city_autocomplete');
      expect(cityCompletion).toBeDefined();
      expect(cityCompletion!.interfaceName).toBe('CityCompletion');
      expect(cityCompletion!.description).toBe('Autocomplete city names');
      expect(cityCompletion!.constName).toBe('cityComplete');

      const countryCompletion = result.completions.find(c => c.name === 'country_autocomplete');
      expect(countryCompletion).toBeDefined();
      expect(countryCompletion!.interfaceName).toBe('CountryCompletion');
      expect(countryCompletion!.description).toBe('Autocomplete country names');
      expect(countryCompletion!.constName).toBe('countryComplete');

      // Verify const completions discovered
      expect(result.discoveredCompletions).toHaveLength(2);
      expect(result.discoveredCompletions!.some(c => c.name === 'cityComplete')).toBe(true);
      expect(result.discoveredCompletions!.some(c => c.name === 'countryComplete')).toBe(true);
    });

    it('should export const completion correctly from compiled server', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'export-test-server',
  version: '1.0.0',
  description: 'Test completion exports'
};

interface TagCompletion extends ICompletion<string[]> {
  name: 'tag_autocomplete';
  description: 'Autocomplete tags';
  ref: { type: 'argument'; name: 'tag' };
  handler: (value: string) => Promise<string[]>;
}

const tagComplete: TagCompletion = {
  name: 'tag_autocomplete',
  description: 'Autocomplete tags',
  ref: { type: 'argument', name: 'tag' },
  handler: async (value) => {
    return ['javascript', 'typescript', 'python', 'rust', 'go']
      .filter(tag => tag.includes(value.toLowerCase()));
  }
};
`;

      const filePath = createTestFile('export-completion.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify the completion has constName set
      expect(result.completions).toHaveLength(1);
      expect(result.completions[0].constName).toBe('tagComplete');

      // The completion metadata should be accessible
      expect(result.completions[0].name).toBe('tag_autocomplete');
      expect(result.completions[0].description).toBe('Autocomplete tags');
    });
  });

  describe('Multiple Const Completions', () => {
    it('should handle server with multiple const completions', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-completion-server',
  version: '1.0.0',
  description: 'Server with multiple const completions'
};

interface FileCompletion extends ICompletion<string[]> {
  name: 'file_autocomplete';
  description: 'File path autocomplete';
  ref: { type: 'argument'; name: 'file' };
  handler: (value: string) => Promise<string[]>;
}

interface CommandCompletion extends ICompletion<string[]> {
  name: 'command_autocomplete';
  description: 'Shell command autocomplete';
  ref: { type: 'argument'; name: 'command' };
  handler: (value: string) => Promise<string[]>;
}

interface ColorCompletion extends ICompletion<{ name: string; hex: string }[]> {
  name: 'color_picker';
  description: 'Color picker';
  ref: { type: 'argument'; name: 'color' };
  handler: (value: string) => Promise<{ name: string; hex: string }[]>;
}

const fileComplete: FileCompletion = {
  name: 'file_autocomplete',
  description: 'File path autocomplete',
  ref: { type: 'argument', name: 'file' },
  handler: async (value) => ['/path/to/file1', '/path/to/file2']
};

const commandComplete: CommandCompletion = {
  name: 'command_autocomplete',
  description: 'Shell command autocomplete',
  ref: { type: 'argument', name: 'command' },
  handler: async (value) => ['ls', 'cd', 'pwd', 'grep']
};

const colorPicker: ColorCompletion = {
  name: 'color_picker',
  description: 'Color picker',
  ref: { type: 'argument', name: 'color' },
  handler: async (value) => [
    { name: 'red', hex: '#FF0000' },
    { name: 'blue', hex: '#0000FF' }
  ]
};
`;

      const filePath = createTestFile('multi-const-completions.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify all completions compiled
      expect(result.validationErrors).toEqual([]);
      expect(result.completions).toHaveLength(3);
      expect(result.discoveredCompletions).toHaveLength(3);

      const fileCompletion = result.completions.find(c => c.name === 'file_autocomplete');
      const commandCompletion = result.completions.find(c => c.name === 'command_autocomplete');
      const colorCompletion = result.completions.find(c => c.name === 'color_picker');

      expect(fileCompletion).toBeDefined();
      expect(fileCompletion!.constName).toBe('fileComplete');

      expect(commandCompletion).toBeDefined();
      expect(commandCompletion!.constName).toBe('commandComplete');

      expect(colorCompletion).toBeDefined();
      expect(colorCompletion!.constName).toBe('colorPicker');
    });
  });

  describe('Complex Completion Scenarios', () => {
    it('should handle completions with complex ref types', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'complex-completion-server',
  version: '1.0.0',
  description: 'Server with complex completion refs'
};

interface ToolCompletion extends ICompletion<string[]> {
  name: 'tool_autocomplete';
  description: 'Tool name autocomplete';
  ref: { type: 'ref/tool' };
  handler: (value: string) => Promise<string[]>;
}

interface ResourceCompletion extends ICompletion<string[]> {
  name: 'resource_autocomplete';
  description: 'Resource URI autocomplete';
  ref: { type: 'ref/resource' };
  handler: (value: string) => Promise<string[]>;
}

const toolComplete: ToolCompletion = {
  name: 'tool_autocomplete',
  description: 'Tool name autocomplete',
  ref: { type: 'ref/tool' },
  handler: async (value) => ['tool1', 'tool2', 'tool3']
};

const resourceComplete: ResourceCompletion = {
  name: 'resource_autocomplete',
  description: 'Resource URI autocomplete',
  ref: { type: 'ref/resource' },
  handler: async (value) => ['config://app', 'data://users']
};
`;

      const filePath = createTestFile('complex-completions.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);
      expect(result.completions).toHaveLength(2);
      expect(result.discoveredCompletions).toHaveLength(2);

      // Both completions should have constName
      expect(result.completions.every(c => c.constName !== undefined)).toBe(true);
    });

    it('should handle server with completions and other features', () => {
      const content = `
import type { IServer, ITool, IParam, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'full-featured-server',
  version: '1.0.0',
  description: 'Server with completions and tools'
};

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather for a city';
  params: { city: CityParam };
  result: string;
}

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
  handler: (value: string) => Promise<string[]>;
}

const cityComplete: CityCompletion = {
  name: 'city_autocomplete',
  description: 'Autocomplete city names',
  ref: { type: 'argument', name: 'city' },
  handler: async (value) => ['New York', 'Los Angeles']
};

const getWeather: GetWeatherTool = async ({ city }) => {
  return \`Weather in \${city}: Sunny\`;
};
`;

      const filePath = createTestFile('full-featured.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have both tools and completions
      expect(result.tools).toHaveLength(1);
      expect(result.completions).toHaveLength(1);

      // Both should be const-based
      expect(result.implementations).toHaveLength(1); // getWeather
      expect(result.discoveredCompletions).toHaveLength(1); // cityComplete
      expect(result.completions[0].constName).toBe('cityComplete');

      // No class-based patterns
      expect(result.className).toBeUndefined();
    });
  });

  describe('Completion Ref Types', () => {
    it('should preserve different ref types in completions', () => {
      const content = `
import type { IServer, ICompletion } from '../../../src/index.js';

const server: IServer = {
  name: 'ref-types-server',
  version: '1.0.0',
  description: 'Server with different completion ref types'
};

interface ArgCompletion extends ICompletion<string[]> {
  name: 'arg_complete';
  description: 'Argument completion';
  ref: { type: 'argument'; name: 'arg' };
  handler: (value: string) => Promise<string[]>;
}

interface ToolRefCompletion extends ICompletion<string[]> {
  name: 'tool_ref_complete';
  description: 'Tool reference completion';
  ref: { type: 'ref/tool' };
  handler: (value: string) => Promise<string[]>;
}

const argComplete: ArgCompletion = {
  name: 'arg_complete',
  description: 'Argument completion',
  ref: { type: 'argument', name: 'arg' },
  handler: async (value) => ['value1', 'value2']
};

const toolRefComplete: ToolRefCompletion = {
  name: 'tool_ref_complete',
  description: 'Tool reference completion',
  ref: { type: 'ref/tool' },
  handler: async (value) => ['tool1', 'tool2']
};
`;

      const filePath = createTestFile('ref-types.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify both completions have different ref types
      expect(result.completions).toHaveLength(2);

      const argCompletion = result.completions.find(c => c.name === 'arg_complete');
      expect(argCompletion).toBeDefined();
      expect(argCompletion!.refType).toContain('argument');
      expect(argCompletion!.constName).toBe('argComplete');

      const toolRefCompletion = result.completions.find(c => c.name === 'tool_ref_complete');
      expect(toolRefCompletion).toBeDefined();
      expect(toolRefCompletion!.refType).toContain('ref/tool');
      expect(toolRefCompletion!.constName).toBe('toolRefComplete');
    });
  });
});
