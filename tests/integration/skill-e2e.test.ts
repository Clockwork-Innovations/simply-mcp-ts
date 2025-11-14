/**
 * Skill End-to-End Workflow Tests
 *
 * Tests the complete skill workflow from TypeScript definition to execution:
 * - Compilation extracts skill metadata
 * - Registration connects implementation to server
 * - Protocol handlers serve skills correctly
 * - Progressive disclosure (hidden skills) works
 */

import { compileServerFromCode } from '../../src/index.js';

describe('Skill E2E - Complete Workflow', () => {
  it('should compile, register, and serve a simple skill', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast for a location';
        skill: string;
      }

      export default class TestServer {
        weatherForecast: SkillHelper<WeatherSkill> = () => {
          return '# Weather Forecast\\n\\nGet current weather conditions.';
        };
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // 1. Compilation should extract skill
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].name).toBe('weather_forecast');
    expect(parsed.skills[0].description).toBe('Get weather forecast for a location');
    expect(parsed.skills[0].methodName).toBe('weatherForecast');

    // 2. Registration should add skill to server
    // server is already InterfaceServer
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('weather_forecast');
    expect(skills[0].description).toBe('Get weather forecast for a location');
    expect(skills[0].uri).toBe('skill://weather_forecast');
    expect(skills[0].mimeType).toBe('text/markdown');

    // 3. Execution should return correct content
    const result = await server.readResource('skill://weather_forecast');

    expect(result.contents[0].text).toBe('# Weather Forecast\n\nGet current weather conditions.');
  });

  it('should handle multiple skills end-to-end', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast';
        skill: string;
      }

      interface NewsSkill extends ISkill {
        name: 'news_summary';
        description: 'Summarize latest news';
        skill: string;
      }

      interface AnalysisSkill extends ISkill {
        name: 'data_analysis';
        description: 'Analyze data patterns';
        skill: string;
      }

      export default class TestServer {
        weatherForecast: SkillHelper<WeatherSkill> = () => {
          return '# Weather Forecast\\n\\nWeather content';
        };

        newsSummary: SkillHelper<NewsSkill> = () => {
          return '# News Summary\\n\\nNews content';
        };

        dataAnalysis: SkillHelper<AnalysisSkill> = () => {
          return '# Data Analysis\\n\\nAnalysis content';
        };
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // Compilation
    expect(parsed.skills).toHaveLength(3);

    // Registration
    // server is already InterfaceServer
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(3);

    const names = skills.map(s => s.name).sort();
    expect(names).toEqual(['data_analysis', 'news_summary', 'weather_forecast']);

    // Execution
    const weatherResult = await server.readResource('skill://weather_forecast');
    expect(weatherResult.contents[0].text).toBe('# Weather Forecast\n\nWeather content');

    const newsResult = await server.readResource('skill://news_summary');
    expect(newsResult.contents[0].text).toBe('# News Summary\n\nNews content');

    const analysisResult = await server.readResource('skill://data_analysis');
    expect(analysisResult.contents[0].text).toBe('# Data Analysis\n\nAnalysis content');
  });

  it('should support dynamic skill content generation', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface DynamicSkill extends ISkill {
        name: 'dynamic_status';
        description: 'Get current system status';
        skill: string;
      }

      export default class TestServer {
        private callCount = 0;

        dynamicStatus: SkillHelper<DynamicSkill> = () => {
          this.callCount++;
          return \`# System Status\\n\\nCall count: \${this.callCount}\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    // First call
    const result1 = await server.readResource('skill://dynamic_status');
    expect(result1.contents[0].text).toContain('Call count: 1');

    // Second call
    const result2 = await server.readResource('skill://dynamic_status');
    expect(result2.contents[0].text).toContain('Call count: 2');

    // Third call
    const result3 = await server.readResource('skill://dynamic_status');
    expect(result3.contents[0].text).toContain('Call count: 3');
  });
});

describe('Skill E2E - Hidden Skills (Progressive Disclosure)', () => {
  it('should hide skills with hidden: true from listSkills', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface PublicSkill extends ISkill {
        name: 'public_docs';
        description: 'Public documentation';
        skill: string;
        hidden: false;
      }

      interface InternalSkill extends ISkill {
        name: 'internal_docs';
        description: 'Internal documentation';
        skill: string;
        hidden: true;
      }

      export default class TestServer {
        publicDocs: SkillHelper<PublicSkill> = () => {
          return '# Public Documentation\\n\\nPublic content';
        };

        internalDocs: SkillHelper<InternalSkill> = () => {
          return '# Internal Documentation\\n\\nInternal content';
        };
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // Compilation should extract both skills
    expect(parsed.skills).toHaveLength(2);

    // server is already InterfaceServer

    // List should only show public skill
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('public_docs');

    // But both should be accessible via readResource
    const publicResult = await server.readResource('skill://public_docs');
    expect(publicResult.contents[0].text).toBe('# Public Documentation\n\nPublic content');

    const internalResult = await server.readResource('skill://internal_docs');
    expect(internalResult.contents[0].text).toBe('# Internal Documentation\n\nInternal content');
  });

  it('should show skills with hidden: false', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ExplicitSkill extends ISkill {
        name: 'explicit_public';
        description: 'Explicitly public skill';
        skill: string;
        hidden: false;
      }

      export default class TestServer {
        explicitPublic: SkillHelper<ExplicitSkill> = () => {
          return '# Explicit Public\\n\\nContent';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('explicit_public');
  });

  it('should show skills without hidden field (default visible)', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface DefaultSkill extends ISkill {
        name: 'default_visibility';
        description: 'Default visibility skill';
        skill: string;
      }

      export default class TestServer {
        defaultVisibility: SkillHelper<DefaultSkill> = () => {
          return '# Default Visibility\\n\\nContent';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('default_visibility');
  });

  it('should handle mix of visible and hidden skills', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface Skill1 extends ISkill {
        name: 'skill_1';
        description: 'Skill 1';
        skill: string;
        hidden: false;
      }

      interface Skill2 extends ISkill {
        name: 'skill_2';
        description: 'Skill 2';
        skill: string;
        hidden: true;
      }

      interface Skill3 extends ISkill {
        name: 'skill_3';
        description: 'Skill 3';
        skill: string;
      }

      interface Skill4 extends ISkill {
        name: 'skill_4';
        description: 'Skill 4';
        skill: string;
        hidden: true;
      }

      interface Skill5 extends ISkill {
        name: 'skill_5';
        description: 'Skill 5';
        skill: string;
        hidden: false;
      }

      export default class TestServer {
        skill_1: SkillHelper<Skill1> = () => '# Skill 1';
        skill_2: SkillHelper<Skill2> = () => '# Skill 2';
        skill_3: SkillHelper<Skill3> = () => '# Skill 3';
        skill_4: SkillHelper<Skill4> = () => '# Skill 4';
        skill_5: SkillHelper<Skill5> = () => '# Skill 5';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // All 5 should be compiled
    expect(parsed.skills).toHaveLength(5);

    // server is already InterfaceServer

    // Only 3 should be visible (skill_1, skill_3, skill_5)
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(3);

    const visibleNames = skills.map(s => s.name).sort();
    expect(visibleNames).toEqual(['skill_1', 'skill_3', 'skill_5']);

    // But all 5 should be accessible
    await expect(server.readResource('skill://skill_1')).resolves.toBeDefined();
    await expect(server.readResource('skill://skill_2')).resolves.toBeDefined();
    await expect(server.readResource('skill://skill_3')).resolves.toBeDefined();
    await expect(server.readResource('skill://skill_4')).resolves.toBeDefined();
    await expect(server.readResource('skill://skill_5')).resolves.toBeDefined();
  });
});

describe('Skill E2E - Static vs Dynamic Content', () => {
  it('should support static markdown content', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface StaticSkill extends ISkill {
        name: 'static_docs';
        description: 'Static documentation';
        skill: string;
      }

      const staticContent = '# Static Documentation\\n\\n## Overview\\nThis is static content.';

      export default class TestServer {
        staticDocs: SkillHelper<StaticSkill> = () => staticContent;
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    const result1 = await server.readResource('skill://static_docs');
    const result2 = await server.readResource('skill://static_docs');

    // Should return same content each time
    expect(result1.contents[0].text).toBe(result2.contents[0].text);
    expect(result1.contents[0].text).toContain('Static Documentation');
    expect(result1.contents[0].text).toContain('This is static content');
  });

  it('should support dynamic markdown generation', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface TimeSkill extends ISkill {
        name: 'current_time';
        description: 'Get current time';
        skill: string;
      }

      export default class TestServer {
        currentTime: SkillHelper<TimeSkill> = () => {
          const now = new Date().toISOString();
          return \`# Current Time\\n\\nTime: \${now}\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    const result1 = await server.readResource('skill://current_time');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10));

    const result2 = await server.readResource('skill://current_time');

    // Content should be different (different timestamps)
    expect(result1.contents[0].text).toContain('Current Time');
    expect(result2.contents[0].text).toContain('Current Time');
    expect(result1.contents[0].text).not.toBe(result2.contents[0].text); // Different timestamps
  });

  it('should support async skill implementation', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface AsyncSkill extends ISkill {
        name: 'async_data';
        description: 'Get async data';
        skill: string;
      }

      export default class TestServer {
        asyncData: SkillHelper<AsyncSkill> = async () => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 1));
          return '# Async Data\\n\\nFetched asynchronously';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    const result = await server.readResource('skill://async_data');

    expect(result.contents[0].text).toBe('# Async Data\n\nFetched asynchronously');
  });
});

describe('Skill E2E - Error Scenarios', () => {
  it('should throw error for unknown skill', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface KnownSkill extends ISkill {
        name: 'known_skill';
        description: 'Known skill';
        skill: string;
      }

      export default class TestServer {
        knownSkill: SkillHelper<KnownSkill> = () => '# Known';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    await expect(
      server.readResource('skill://unknown_skill')
    ).rejects.toThrow();
  });

  it('should include available skills in error message', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface Skill1 extends ISkill {
        name: 'skill_a';
        description: 'Skill A';
        skill: string;
      }

      interface Skill2 extends ISkill {
        name: 'skill_b';
        description: 'Skill B';
        skill: string;
      }

      export default class TestServer {
        skillA: SkillHelper<Skill1> = () => '# A';
        skillB: SkillHelper<Skill2> = () => '# B';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    try {
      await server.readResource('skill://unknown');
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('skill://skill_a');
      expect(error.message).toContain('skill://skill_b');
    }
  });

  it('should validate return type at runtime', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'bad_skill';
        description: 'Bad skill';
        skill: string;
      }

      export default class TestServer {
        badSkill: SkillHelper<BadSkill> = (() => 123) as any;
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    try {
      await server.readResource('skill://bad_skill');
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('must return a string');
    }
  });
});

describe('Skill E2E - Complex Scenarios', () => {
  it('should support skill accessing server state', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface StateSkill extends ISkill {
        name: 'server_state';
        description: 'Get server state';
        skill: string;
      }

      export default class TestServer {
        private state = {
          requestCount: 0,
          lastAccess: new Date().toISOString()
        };

        serverState: SkillHelper<StateSkill> = () => {
          this.state.requestCount++;
          this.state.lastAccess = new Date().toISOString();

          return \`# Server State\\n\\nRequests: \${this.state.requestCount}\\nLast access: \${this.state.lastAccess}\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    const result1 = await server.readResource('skill://server_state');
    expect(result1.contents[0].text).toContain('Requests: 1');

    const result2 = await server.readResource('skill://server_state');
    expect(result2.contents[0].text).toContain('Requests: 2');

    const result3 = await server.readResource('skill://server_state');
    expect(result3.contents[0].text).toContain('Requests: 3');
  });

  it('should support skill with complex markdown formatting', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ComplexSkill extends ISkill {
        name: 'complex_docs';
        description: 'Complex documentation';
        skill: string;
      }

      export default class TestServer {
        complexDocs: SkillHelper<ComplexSkill> = () => {
          return \`# Complex Documentation

## Overview
This skill demonstrates complex markdown formatting.

## Features
- **Bold text**
- *Italic text*
- \\\`inline code\\\`

## Code Block
\\\`\\\`\\\`typescript
interface Example {
  name: string;
  value: number;
}
\\\`\\\`\\\`

## Table
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

## Links
[Link text](https://example.com)

## Lists
1. First item
2. Second item
   - Nested item
   - Another nested item
3. Third item

> Blockquote text here
\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    const result = await server.readResource('skill://complex_docs');
    const content = result.contents[0].text;

    expect(content).toContain('# Complex Documentation');
    expect(content).toContain('**Bold text**');
    expect(content).toContain('```typescript');
    expect(content).toContain('| Column 1 | Column 2 |');
    expect(content).toContain('[Link text](https://example.com)');
    expect(content).toContain('> Blockquote');
  });
});
