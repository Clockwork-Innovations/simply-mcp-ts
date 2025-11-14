/**
 * Skill Compiler Unit Tests
 *
 * Tests that the skill compiler correctly extracts ISkill metadata from TypeScript interfaces.
 * Tests validation, naming rules, and error handling.
 */

import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_skill_compiler__');

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
    // Ignore errors
  }
}

async function compileCode(code: string) {
  setupTempDir();
  const testFile = join(TEMP_DIR, 'test.ts');
  writeFileSync(testFile, code);
  try {
    return await compileInterfaceFile(testFile);
  } finally {
    cleanupTempDir();
  }
}

describe('Skill Compiler - Basic Extraction', () => {
  it('should extract skill with name, description, and skill fields correctly', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast for a location';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('weather_forecast');
    expect(result.skills[0].description).toBe('Get weather forecast for a location');
    expect(result.skills[0].interfaceName).toBe('WeatherSkill');
  });

  it('should derive correct camelCase method name from snake_case skill name', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface WeatherAnalysis extends ISkill {
        name: 'weather_analysis';
        description: 'Analyze weather patterns';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('weather_analysis');
    expect(result.skills[0].methodName).toBe('weatherAnalysis');
  });

  it('should derive method name for single-word skill name', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather';
        description: 'Weather information';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('weather');
    expect(result.skills[0].methodName).toBe('weather');
  });

  it('should derive method name for multi-word snake_case skill name', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface ComplexSkill extends ISkill {
        name: 'analyze_weather_patterns_and_trends';
        description: 'Complex analysis';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('analyze_weather_patterns_and_trends');
    expect(result.skills[0].methodName).toBe('analyzeWeatherPatternsAndTrends');
  });
});

describe('Skill Compiler - Hidden Flag', () => {
  it('should extract hidden flag when true', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface InternalSkill extends ISkill {
        name: 'internal_docs';
        description: 'Internal documentation';
        skill: string;
        hidden: true;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].hidden).toBe(true);
  });

  it('should extract hidden flag when false', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface PublicSkill extends ISkill {
        name: 'public_docs';
        description: 'Public documentation';
        skill: string;
        hidden: false;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].hidden).toBe(false);
  });

  it('should have hidden undefined when not specified', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface DefaultSkill extends ISkill {
        name: 'default_skill';
        description: 'Default visibility';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].hidden).toBeUndefined();
  });
});

describe('Skill Compiler - Naming Validation', () => {
  it('should reject camelCase skill names', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'weatherForecast';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('invalid name format');
    expect(errors).toContain('snake_case');
  });

  it('should reject PascalCase skill names', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'WeatherForecast';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('invalid name format');
  });

  it('should reject skill names starting with uppercase', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'Weather_forecast';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('invalid name format');
  });

  it('should reject skill names with hyphens', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'weather-forecast';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('invalid name format');
  });

  it('should reject skill names starting with numbers', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: '1_weather';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('invalid name format');
  });

  it('should accept skill names with numbers after first character', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface GoodSkill extends ISkill {
        name: 'weather_v2';
        description: 'Weather forecast version 2';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('weather_v2');
  });

  it('should accept skill names with consecutive underscores', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface UnusualSkill extends ISkill {
        name: 'weather__data';
        description: 'Weather data';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('weather__data');
  });
});

describe('Skill Compiler - Required Fields Validation', () => {
  it('should reject skill missing name field', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain("missing required 'name' field");
    expect(errors).toContain('snake_case format');
  });

  it('should reject skill missing description field', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'weather_forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain("missing required 'description' field");
    expect(errors).toContain('trigger phrase');
  });

  it('should accept skill with all required fields', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface GoodSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.validationErrors).toEqual([]);
  });
});

describe('Skill Compiler - Content Type Validation', () => {
  it('should accept skill with manual content (skill field)', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface ManualSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Weather forecast';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.validationErrors).toEqual([]);
    expect(result.skills[0].isAutoGenerated).toBe(false);
  });

  it('should accept skill with auto-generation (tools array)', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface AutoSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Weather forecast';
        tools: ['get_weather', 'get_forecast'];
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.validationErrors).toEqual([]);
    expect(result.skills[0].isAutoGenerated).toBe(true);
  });

  it('should accept skill with auto-generation (resources array)', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface AutoSkill extends ISkill {
        name: 'data_access';
        description: 'Access data resources';
        resources: ['config', 'database'];
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.validationErrors).toEqual([]);
    expect(result.skills[0].isAutoGenerated).toBe(true);
  });

  it('should accept skill with auto-generation (prompts array)', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface AutoSkill extends ISkill {
        name: 'prompt_system';
        description: 'Use system prompts';
        prompts: ['init_prompt', 'help_prompt'];
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.validationErrors).toEqual([]);
    expect(result.skills[0].isAutoGenerated).toBe(true);
  });

  it('should reject skill with both manual content and auto-generation fields', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface MixedSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Weather forecast';
        skill: string;
        tools: ['get_weather'];
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('both manual content and auto-generation fields');
    expect(errors).toContain('mutually exclusive');
  });

  it('should reject skill with neither manual content nor auto-generation fields', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface EmptyContentSkill extends ISkill {
        name: 'empty_skill';
        description: 'Skill with no content';
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    expect(errors).toContain('must have either manual content or auto-generation fields');
  });
});

describe('Skill Compiler - Multiple Skills', () => {
  it('should extract multiple skills from same file', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Weather forecast';
        skill: string;
      }

      interface NewsSkill extends ISkill {
        name: 'news_summary';
        description: 'News summary';
        skill: string;
      }

      interface AnalysisSkill extends ISkill {
        name: 'data_analysis';
        description: 'Data analysis';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(3);

    const names = result.skills.map(s => s.name).sort();
    expect(names).toEqual(['data_analysis', 'news_summary', 'weather_forecast']);

    const methodNames = result.skills.map(s => s.methodName).sort();
    expect(methodNames).toEqual(['dataAnalysis', 'newsSummary', 'weatherForecast']);
  });

  it('should handle mix of valid and invalid skills', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface GoodSkill extends ISkill {
        name: 'good_skill';
        description: 'A valid skill';
        skill: string;
      }

      interface BadSkill extends ISkill {
        name: 'BadSkill';
        description: 'Invalid name format';
        skill: string;
      }

      interface AnotherGoodSkill extends ISkill {
        name: 'another_skill';
        description: 'Another valid skill';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    // Only valid skills should be extracted
    expect(result.skills).toHaveLength(2);
    expect(result.skills.map(s => s.name).sort()).toEqual(['another_skill', 'good_skill']);

    // But validation errors should be present
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors?.length).toBeGreaterThan(0);
  });
});

describe('Skill Compiler - Edge Cases', () => {
  it('should handle empty interface extending ISkill', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface EmptySkill extends ISkill {
      }
    `;

    const result = await compileCode(code);

    expect(result.validationErrors).toBeDefined();
    const errors = result.validationErrors?.join(' ');
    // New validation checks for manual/auto-gen fields first
    expect(errors).toContain("must have either manual content or auto-generation fields");
  });

  it('should handle skill with extra unknown properties', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface SkillWithExtra extends ISkill {
        name: 'test_skill';
        description: 'Test skill';
        skill: string;
        unknownField: boolean;
      }
    `;

    const result = await compileCode(code);

    // Should still extract the skill successfully
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('test_skill');
  });

  it('should handle very long skill names', async () => {
    const code = `
      import { ISkill } from 'simply-mcp';

      interface LongNameSkill extends ISkill {
        name: 'this_is_a_very_long_skill_name_that_tests_the_limits_of_naming';
        description: 'Long name test';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe('this_is_a_very_long_skill_name_that_tests_the_limits_of_naming');
    expect(result.skills[0].methodName).toBe('thisIsAVeryLongSkillNameThatTestsTheLimitsOfNaming');
  });

  it('should handle very long descriptions', async () => {
    const longDesc = 'This is a very long description that goes on and on and on. '.repeat(10);
    const code = `
      import { ISkill } from 'simply-mcp';

      interface LongDescSkill extends ISkill {
        name: 'long_desc';
        description: '${longDesc}';
        skill: string;
      }
    `;

    const result = await compileCode(code);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].description).toBe(longDesc);
  });
});
