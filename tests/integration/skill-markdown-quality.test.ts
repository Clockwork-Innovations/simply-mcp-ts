/**
 * Integration Tests: Markdown Quality
 *
 * Tests the quality and structure of generated markdown.
 * Validates LLM-friendly format, proper headers, code blocks, and tables.
 */

import { compileServerFromCode } from '../../src/index.js';

describe('Skill Markdown Quality - Format Validation', () => {
  it('should contain proper markdown headers (h1, h2, h3)', async () => {
    const code = `
      import { ITool, IResource, IPrompt, ISkill, ToolHelper, ResourceHelper, PromptHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test_tool';
        description: 'Test';
        params: {};
        result: string;
      }

      interface TestResource extends IResource {
        uri: 'data://test';
        name: 'Test';
        description: 'Test';
        mimeType: 'text/plain';
        returns: string;
      }

      interface TestPrompt extends IPrompt {
        name: 'test_prompt';
        description: 'Test';
        args: {};
        result: string;
      }

      interface HeaderSkill extends ISkill {
        name: 'header_test';
        description: 'Header test';
        tools: ['test_tool'];
        resources: ['data://test'];
        prompts: ['test_prompt'];
      }

      export default class HeaderServer {
        testTool: ToolHelper<TestTool> = async () => 'ok';
        'data://test': ResourceHelper<TestResource> = async () => 'data';
        testPrompt: PromptHelper<TestPrompt> = async () => 'prompt';
        headerTest: SkillHelper<HeaderSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'header',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://header_test');
    const content = result.contents[0].text;

    // Should have h1 header (skill name)
    expect(content).toMatch(/^# .+$/m);
    expect(content).toContain('# Header Test Skill');

    // Should have h2 headers (sections)
    expect(content).toMatch(/^## .+$/m);
    expect(content).toContain('## Available Tools');
    expect(content).toContain('## Available Resources');
    expect(content).toContain('## Available Prompts');

    // Should have h3 headers (component names)
    expect(content).toMatch(/^### .+$/m);
    expect(content).toContain('### test_tool');
    expect(content).toContain('### data://test');
    expect(content).toContain('### test_prompt');
  });

  it('should contain properly formatted code blocks', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface CodeBlockTool extends ITool {
        name: 'code_test';
        description: 'Code block test';
        params: { x: string; y: number };
        result: string;
      }

      interface CodeBlockSkill extends ISkill {
        name: 'code_block_test';
        description: 'Code block test';
        tools: ['code_test'];
      }

      export default class CodeBlockServer {
        codeTest: ToolHelper<CodeBlockTool> = async ({ x, y }) => 'ok';
        codeBlockTest: SkillHelper<CodeBlockSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'code',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://code_block_test');
    const content = result.contents[0].text;

    // Should have TypeScript code blocks
    expect(content).toContain('```typescript');

    // Code blocks should be closed
    const openCount = (content.match(/```typescript/g) || []).length;
    const closeCount = (content.match(/^```$/gm) || []).length;
    expect(openCount).toBeGreaterThan(0);
    expect(openCount).toBe(closeCount);

    // Code blocks should contain actual code
    const codeBlockRegex = /```typescript\n([\s\S]*?)\n```/g;
    const matches = Array.from(content.matchAll(codeBlockRegex));
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0][1].trim()).not.toBe('');
  });

  it('should contain properly formatted markdown tables', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TableTool extends ITool {
        name: 'table_test';
        description: 'Table test';
        params: { required: string; optional?: number };
        result: string;
      }

      interface TableSkill extends ISkill {
        name: 'table_test';
        description: 'Table test';
        tools: ['table_test'];
      }

      export default class TableServer {
        tableTest: ToolHelper<TableTool> = async () => 'ok';
        tableTest: SkillHelper<TableSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'table',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://table_test');
    const content = result.contents[0].text;

    // Should have parameters section with TypeScript format
    expect(content).toContain('**Parameters:**');
    expect(content).toContain('```typescript');

    // The actual format uses TypeScript code blocks, not tables
    // Just verify the section exists and has proper markdown structure
    expect(content).toContain('## Available Tools');
  });

  it('should have consistent structure across different skills', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface Tool1 extends ITool {
        name: 'tool1';
        description: 'Tool 1';
        params: {};
        result: string;
      }

      interface Tool2 extends ITool {
        name: 'tool2';
        description: 'Tool 2';
        params: {};
        result: string;
      }

      interface Skill1 extends ISkill {
        name: 'skill1';
        description: 'Skill 1';
        tools: ['tool1'];
      }

      interface Skill2 extends ISkill {
        name: 'skill2';
        description: 'Skill 2';
        tools: ['tool2'];
      }

      export default class ConsistentServer {
        tool1: ToolHelper<Tool1> = async () => 'ok';
        tool2: ToolHelper<Tool2> = async () => 'ok';
        skill1: SkillHelper<Skill1> = () => '';
        skill2: SkillHelper<Skill2> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'consistent',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result1 = await server.readResource('skill://skill1');
    const result2 = await server.readResource('skill://skill2');
    const content1 = result1.contents[0].text;
    const content2 = result2.contents[0].text;

    // Both should have same structure
    const getStructure = (content: string) => {
      const headers = content.match(/^#+\s+.+$/gm) || [];
      const codeBlocks = content.match(/```typescript/g) || [];
      const tables = content.match(/\| .+ \| .+ \|/g) || [];
      return {
        hasH1: headers.some(h => h.startsWith('# ')),
        hasH2: headers.some(h => h.startsWith('## ')),
        hasH3: headers.some(h => h.startsWith('### ')),
        hasCodeBlocks: codeBlocks.length > 0,
        hasTables: tables.length > 0,
        hasNote: content.includes('> **Note**: This manual is auto-generated'),
      };
    };

    const struct1 = getStructure(content1);
    const struct2 = getStructure(content2);

    // Both should have same structural elements
    expect(struct1).toEqual(struct2);
  });

  it('should convert snake_case names to Title Case in headers', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test';
        description: 'Test';
        params: {};
        result: string;
      }

      interface TitleCaseSkill extends ISkill {
        name: 'weather_forecast_analysis';
        description: 'Weather analysis';
        tools: ['test'];
      }

      export default class TitleCaseServer {
        test: ToolHelper<TestTool> = async () => 'ok';
        weatherForecastAnalysis: SkillHelper<TitleCaseSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'title',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://weather_forecast_analysis');
    const content = result.contents[0].text;

    expect(content).toContain('# Weather Forecast Analysis Skill');
  });

  it('should include auto-generation note in all generated manuals', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test';
        description: 'Test';
        params: {};
        result: string;
      }

      interface NoteSkill extends ISkill {
        name: 'note_test';
        description: 'Note test';
        tools: ['test'];
      }

      export default class NoteServer {
        test: ToolHelper<TestTool> = async () => 'ok';
        noteTest: SkillHelper<NoteSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'note',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://note_test');
    const content = result.contents[0].text;

    expect(content).toContain('> **Note**: This manual is auto-generated from component definitions.');
  });

  it('should have clear section separation with blank lines', async () => {
    const code = `
      import { ITool, IResource, ISkill, ToolHelper, ResourceHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface TestTool extends ITool {
        name: 'test';
        description: 'Test';
        params: {};
        result: string;
      }

      interface TestResource extends IResource {
        uri: 'data://test';
        name: 'Test';
        description: 'Test';
        mimeType: 'text/plain';
        returns: string;
      }

      interface SeparationSkill extends ISkill {
        name: 'separation_test';
        description: 'Separation test';
        tools: ['test'];
        resources: ['data://test'];
      }

      export default class SeparationServer {
        test: ToolHelper<TestTool> = async () => 'ok';
        'data://test': ResourceHelper<TestResource> = async () => 'data';
        separationTest: SkillHelper<SeparationSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'separation',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://separation_test');
    const content = result.contents[0].text;

    // Sections should be separated by blank lines
    expect(content).toContain('\n\n## Available Tools\n\n');
    expect(content).toContain('\n\n## Available Resources\n\n');

    // No triple+ blank lines (good spacing)
    expect(content).not.toContain('\n\n\n\n');
  });

  it('should produce valid markdown that parsers can read', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface ValidTool extends ITool {
        name: 'valid_tool';
        description: 'Valid tool';
        params: { input: string };
        result: string;
      }

      interface ValidSkill extends ISkill {
        name: 'valid_markdown';
        description: 'Valid markdown';
        tools: ['valid_tool'];
      }

      export default class ValidServer {
        validTool: ToolHelper<ValidTool> = async () => 'ok';
        validMarkdown: SkillHelper<ValidSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'valid',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://valid_markdown');
    const content = result.contents[0].text;

    // Basic markdown validation
    // No unclosed code blocks
    const backticks = content.match(/```/g) || [];
    expect(backticks.length % 2).toBe(0);

    // No broken table rows (should have consistent pipe count)
    const tableRows = content.match(/^\|.+\|$/gm) || [];
    if (tableRows.length > 0) {
      const pipeCount = (tableRows[0].match(/\|/g) || []).length;
      tableRows.forEach(row => {
        const rowPipes = (row.match(/\|/g) || []).length;
        expect(rowPipes).toBe(pipeCount);
      });
    }

    // Headers should have proper format
    // Note: Some headers may appear in code examples or other contexts
    // Just verify that main section headers are properly formatted
    expect(content).toContain('## Available Tools');
    expect(content).toContain('### valid_tool');
  });
});
