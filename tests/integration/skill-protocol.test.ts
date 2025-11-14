/**
 * Skill Protocol Integration Tests
 *
 * Tests skills via resources/list and resources/read protocol handlers.
 * Skills are now MCP resources with skill:// URIs (Phase 1: ISkill extends IResource).
 * Tests hidden skill filtering, error handling, and protocol compliance.
 */

import { compileServerFromCode } from '../../src/index.js';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

describe('Skills Protocol - resources/list Endpoint', () => {
  it('should return empty resources array when no skills registered', async () => {
    const code = `
      export default class TestServer {}
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // Get all resources
    const resources = await server.listResources();

    // Filter for skills (skill:// URIs)
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));
    expect(skills).toEqual([]);
  });

  it('should return list of registered skills with correct resource format', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast for a location';
        skill: string;
      }

      interface NewsSkill extends ISkill {
        name: 'news_summary';
        description: 'Summarize latest news';
        skill: string;
      }

      export default class TestServer {
        weatherForecast: SkillHelper<WeatherSkill> = () => {
          return '# Weather Forecast\\n\\nMarkdown content';
        };

        newsSummary: SkillHelper<NewsSkill> = () => {
          return '# News Summary\\n\\nNews content';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // Get all resources
    const resources = await server.listResources();

    // Filter for skills (skill:// URIs)
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(2);

    // Check each skill resource has required fields
    skills.forEach((skill: Resource) => {
      expect(skill).toHaveProperty('uri');
      expect(skill.uri).toMatch(/^skill:\/\//);
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('description');
      expect(skill).toHaveProperty('mimeType');
      expect(skill.mimeType).toBe('text/markdown');
      expect(typeof skill.name).toBe('string');
      expect(typeof skill.description).toBe('string');
    });

    // Verify specific skills
    const names = skills.map((s: Resource) => s.name).sort();
    expect(names).toEqual(['news_summary', 'weather_forecast']);
  });

  it('should filter out hidden skills from list', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface PublicSkill extends ISkill {
        name: 'public_skill';
        description: 'Public skill';
        skill: string;
        hidden: false;
      }

      interface InternalSkill extends ISkill {
        name: 'internal_skill';
        description: 'Internal skill';
        skill: string;
        hidden: true;
      }

      interface DefaultSkill extends ISkill {
        name: 'default_skill';
        description: 'Default skill';
        skill: string;
      }

      export default class TestServer {
        publicSkill: SkillHelper<PublicSkill> = () => '# Public';
        internalSkill: SkillHelper<InternalSkill> = () => '# Internal';
        defaultSkill: SkillHelper<DefaultSkill> = () => '# Default';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const resources = await server.listResources();
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(2);

    const names = skills.map((s: Resource) => s.name).sort();
    expect(names).toEqual(['default_skill', 'public_skill']);

    // internal_skill should NOT be in the list
    expect(names).not.toContain('internal_skill');
  });

  it('should only show hidden:false and undefined skills', async () => {
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

      export default class TestServer {
        skill_1: SkillHelper<Skill1> = () => '# Skill 1';
        skill_2: SkillHelper<Skill2> = () => '# Skill 2';
        skill_3: SkillHelper<Skill3> = () => '# Skill 3';
        skill_4: SkillHelper<Skill4> = () => '# Skill 4';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const resources = await server.listResources();
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(2);

    const names = skills.map((s: Resource) => s.name).sort();
    expect(names).toEqual(['skill_1', 'skill_3']);
  });
});

describe('Skills Protocol - resources/read Endpoint', () => {
  it('should return skill content for valid skill name', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface WeatherSkill extends ISkill {
        name: 'weather_forecast';
        description: 'Get weather forecast';
        skill: string;
      }

      export default class TestServer {
        weatherForecast: SkillHelper<WeatherSkill> = () => {
          return '# Weather Forecast\\n\\n## Overview\\nGet weather forecasts.';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://weather_forecast');

    expect(result).toHaveProperty('contents');
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].text).toBe('# Weather Forecast\n\n## Overview\nGet weather forecasts.');
  });

  it('should return content from static string', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface StaticSkill extends ISkill {
        name: 'static_skill';
        description: 'Static skill';
        skill: string;
      }

      export default class TestServer {
        staticSkill: SkillHelper<StaticSkill> = () => {
          return '# Static Content\\n\\nThis is static.';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://static_skill');
    expect(result.contents[0].text).toBe('# Static Content\n\nThis is static.');
  });

  it('should return content from function (dynamic)', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface DynamicSkill extends ISkill {
        name: 'dynamic_skill';
        description: 'Dynamic skill';
        skill: string;
      }

      export default class TestServer {
        private callCount = 0;

        dynamicSkill: SkillHelper<DynamicSkill> = () => {
          this.callCount++;
          return \`# Dynamic Content\\n\\nCall count: \${this.callCount}\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result1 = await server.readResource('skill://dynamic_skill');
    expect(result1.contents[0].text).toBe('# Dynamic Content\n\nCall count: 1');

    const result2 = await server.readResource('skill://dynamic_skill');
    expect(result2.contents[0].text).toBe('# Dynamic Content\n\nCall count: 2');
  });

  it('should return content from async function', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface AsyncSkill extends ISkill {
        name: 'async_skill';
        description: 'Async skill';
        skill: string;
      }

      export default class TestServer {
        asyncSkill: SkillHelper<AsyncSkill> = async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return '# Async Content\\n\\nThis is async.';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://async_skill');
    expect(result.contents[0].text).toBe('# Async Content\n\nThis is async.');
  });

  it('should return content for hidden skill (progressive disclosure)', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface HiddenSkill extends ISkill {
        name: 'hidden_skill';
        description: 'Hidden skill';
        skill: string;
        hidden: true;
      }

      export default class TestServer {
        hiddenSkill: SkillHelper<HiddenSkill> = () => {
          return '# Hidden Content\\n\\nThis skill is hidden from list but accessible.';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // Verify not in list
    const resources = await server.listResources();
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(0);

    // But should be accessible via readResource
    const result = await server.readResource('skill://hidden_skill');
    expect(result.contents[0].text).toBe('# Hidden Content\n\nThis skill is hidden from list but accessible.');
  });

  it('should throw error for unknown skill', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface ExistingSkill extends ISkill {
        name: 'existing_skill';
        description: 'Existing skill';
        skill: string;
      }

      export default class TestServer {
        existingSkill: SkillHelper<ExistingSkill> = () => '# Existing';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    await expect(
      server.readResource('skill://unknown_skill')
    ).rejects.toThrow();
  });

  it('should include skill name in error message', async () => {
    const code = `
      export default class TestServer {}
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    try {
      await server.readResource('skill://unknown_skill');
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('Unknown resource: skill://unknown_skill');
    }
  });

  it('should validate that content is string type', async () => {
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

    try {
      await server.readResource('skill://bad_skill');
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('must return a string (markdown content)');
    }
  });
});

describe('Skills Protocol - Multiple Skills', () => {
  it('should handle multiple skills with different types', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface StaticSkill extends ISkill {
        name: 'static_skill';
        description: 'Static skill';
        skill: string;
      }

      interface DynamicSkill extends ISkill {
        name: 'dynamic_skill';
        description: 'Dynamic skill';
        skill: string;
      }

      interface AsyncSkill extends ISkill {
        name: 'async_skill';
        description: 'Async skill';
        skill: string;
      }

      interface HiddenSkill extends ISkill {
        name: 'hidden_skill';
        description: 'Hidden skill';
        skill: string;
        hidden: true;
      }

      export default class TestServer {
        staticSkill: SkillHelper<StaticSkill> = () => '# Static';
        dynamicSkill: SkillHelper<DynamicSkill> = () => '# Dynamic';
        asyncSkill: SkillHelper<AsyncSkill> = async () => '# Async';
        hiddenSkill: SkillHelper<HiddenSkill> = () => '# Hidden';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // List should show 3 (not hidden one)
    const resources = await server.listResources();
    const skills = resources.filter((r: Resource) => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(3);

    // Read should work for all 4
    const staticContent = await server.readResource('skill://static_skill');
    expect(staticContent.contents[0].text).toBe('# Static');

    const dynamicContent = await server.readResource('skill://dynamic_skill');
    expect(dynamicContent.contents[0].text).toBe('# Dynamic');

    const asyncContent = await server.readResource('skill://async_skill');
    expect(asyncContent.contents[0].text).toBe('# Async');

    const hiddenContent = await server.readResource('skill://hidden_skill');
    expect(hiddenContent.contents[0].text).toBe('# Hidden');
  });
});

describe('Skills Protocol - Edge Cases', () => {
  it('should handle skill with empty content', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface EmptySkill extends ISkill {
        name: 'empty_skill';
        description: 'Empty skill';
        skill: string;
      }

      export default class TestServer {
        emptySkill: SkillHelper<EmptySkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://empty_skill');
    expect(result.contents[0].text).toBe('');
  });

  it('should handle skill with very long content', async () => {
    const longContent = '# Long Content\n\n' + 'Lorem ipsum '.repeat(1000);

    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface LongSkill extends ISkill {
        name: 'long_skill';
        description: 'Long skill';
        skill: string;
      }

      export default class TestServer {
        longSkill: SkillHelper<LongSkill> = () => {
          return \`${longContent.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\n/g, "\\n")}\`;
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://long_skill');
    const content = result.contents[0].text;
    expect(content).toBe(longContent);
    expect(content.length).toBeGreaterThan(10000);
  });

  it('should handle skill with special characters in content', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface SpecialSkill extends ISkill {
        name: 'special_skill';
        description: 'Special skill';
        skill: string;
      }

      export default class TestServer {
        specialSkill: SkillHelper<SpecialSkill> = () => {
          return '# Special\\n\\n\`\`\`typescript\\nconst x = "test";\\n\`\`\`\\n\\n- Item 1\\n- Item 2';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://special_skill');
    const content = result.contents[0].text;
    expect(content).toContain('```typescript');
    expect(content).toContain('const x = "test"');
  });

  it('should handle skill with unicode characters', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface UnicodeSkill extends ISkill {
        name: 'unicode_skill';
        description: 'Unicode skill';
        skill: string;
      }

      export default class TestServer {
        unicodeSkill: SkillHelper<UnicodeSkill> = () => {
          return '# Unicode\\n\\n你好 🌍 Здравствуй';
        };
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    const result = await server.readResource('skill://unicode_skill');
    expect(result.contents[0].text).toBe('# Unicode\n\n你好 🌍 Здравствуй');
  });
});
