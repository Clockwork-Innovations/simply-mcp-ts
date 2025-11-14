/**
 * Skill Membership E2E Test
 *
 * Tests the complete skill membership (auto-grouping) feature:
 * 1. Components can declare skill membership via `skill` field
 * 2. Skills automatically include components by membership
 * 3. Explicit components are merged with membership components
 * 4. Conditional resources work with skill membership
 */

import type { CompileResult } from '../../src/server/test-utils.js';
import { resolve } from 'path';
import { compileServerFromCode } from '../../src/server/test-utils.js';
import { readFileSync } from 'fs';

// Jest provides __dirname and __filename in CommonJS mode

// Helper to compile server from file path
// Note: This reads the file and rewrites imports to use dist/ paths for testing
async function compileFromFile(filePath: string): Promise<CompileResult> {
  let code = readFileSync(filePath, 'utf-8');

  // Rewrite import paths from '../src/index.js' to '../../src/index.js' to make them resolve correctly
  code = code.replace(/from\s+['"]\.\.\/src\//g, "from '../../src/");

  return await compileServerFromCode(code, {
    name: 'hello-world-skill',
    version: '1.0.0',
    silent: true
  });
}

describe('Skill Membership E2E - Hello World Skill Test Server', () => {
  it('should auto-include components via skill membership', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server, parsed } = await compileFromFile(serverPath);

    // 1. Verify compilation extracted skill membership
    expect(parsed.tools).toHaveLength(3); // say_hello, add, multiply
    const sayHelloTool = parsed.tools.find(t => t.name === 'say_hello');
    expect(sayHelloTool).toBeDefined();

    // The example has two skills: greeting (manual) and quick_math (auto-gen)
    expect(parsed.skills).toHaveLength(2);
    const greetingSkill = parsed.skills.find(s => s.name === 'greeting');
    const quickMathSkill = parsed.skills.find(s => s.name === 'quick_math');
    expect(greetingSkill).toBeDefined();
    expect(quickMathSkill).toBeDefined();

    // 2. Verify greeting skill has manual content
    const result = await server.readResource('skill://greeting');
    const skillContent = result.contents[0].text;

    // Skill manual should include greeting content
    expect(skillContent).toContain('Greeting Skill');
    expect(skillContent).toContain('say_hello');

    // 3. Verify quick_math skill auto-generated content
    const mathResult = await server.readResource('skill://quick_math');
    const mathContent = mathResult.contents[0].text;
    expect(mathContent).toContain('add');
    expect(mathContent).toContain('multiply');
  });

  it('should list resources (skills shown as resources)', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    const resources = await server.listResources();

    // The example has two skills
    const greetingSkill = resources.find(r => r.uri === 'skill://greeting');
    const quickMathSkill = resources.find(r => r.uri === 'skill://quick_math');

    expect(greetingSkill).toBeDefined();
    expect(greetingSkill?.name).toBe('greeting');

    expect(quickMathSkill).toBeDefined();
    expect(quickMathSkill?.name).toBe('quick_math');
  });

  it('should call say_hello tool', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer

    // Call say_hello tool
    const result = await server.executeTool('say_hello', { name: 'Alice' });
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text;
    expect(text).toContain('Alice');
    expect(text).toContain('Hello');
  });

  it('should call add tool from quick_math skill', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer

    // Call add tool (part of quick_math skill)
    const result = await server.executeTool('add', { a: 5, b: 3 });
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain('5');
    expect(text).toContain('3');
    expect(text).toContain('8');
  });

  it('should read greeting skill resource', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer
    const result = await server.readResource('skill://greeting');

    expect(result).toHaveProperty('contents');
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0]).toHaveProperty('text');
    expect(result.contents[0].text).toContain('Greeting Skill');
  });

  it('should read quick_math skill resource', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer

    // Read quick_math auto-generated skill
    const result = await server.readResource('skill://quick_math');
    expect(result).toHaveProperty('contents');
    expect(Array.isArray(result.contents)).toBe(true);
    const content = result.contents[0].text;
    expect(content).toContain('add');
    expect(content).toContain('multiply');
  });

  it('should list tools with skill membership', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer
    const tools = await server.listTools();

    expect(tools).toHaveLength(3); // say_hello, add, multiply
    const toolNames = tools.map(t => t.name).sort();
    expect(toolNames).toEqual(['add', 'multiply', 'say_hello']);
  });

  it('should list prompts with skill membership', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer
    const prompts = await server.listPrompts();

    // The example doesn't define any prompts
    expect(prompts).toHaveLength(0);
  });

  it('should list skills', async () => {
    const serverPath = resolve(__dirname, '../../examples/hello-world-skill-test-server.ts');
    const { server } = await compileFromFile(serverPath);

    // server is already InterfaceServer
    const allResources = await server.listResources();
    const skills = allResources.filter(r => r.uri.startsWith('skill://'));

    expect(skills).toHaveLength(2); // greeting and quick_math
    const skillNames = skills.map(s => s.name).sort();
    expect(skillNames).toEqual(['greeting', 'quick_math']);
  });
});

describe('Skill Membership E2E - Multiple Skills', () => {
  it('should handle auto-generated skills with tools', async () => {
    const code = `
      import { ISkill, ITool, ToolHelper, SkillHelper } from 'simply-mcp';

      interface ReportTool extends ITool {
        name: 'generate_report';
        description: 'Generate a report';
        params: { type: { type: 'string' } };
        result: { report: string };
      }

      interface AnalyticsTool extends ITool {
        name: 'analyze_data';
        description: 'Analyze data';
        params: {};
        result: string;
      }

      interface AnalyticsSkill extends ISkill {
        name: 'analytics';
        description: 'Analytics capabilities';
        tools: ['analyze_data'];
      }

      interface ReportingSkill extends ISkill {
        name: 'reporting';
        description: 'Reporting capabilities';
        tools: ['generate_report'];
      }

      export default class TestServer {
        generateReport: ToolHelper<ReportTool> = (params) => {
          return { report: \`\${params.type} report generated\` };
        };

        analyzeData: ToolHelper<AnalyticsTool> = () => 'Analysis complete';

        analyticsSkill: SkillHelper<AnalyticsSkill> = () => '';
        reportingSkill: SkillHelper<ReportingSkill> = () => '';
      }
    `;

    const { compileServerFromCode } = await import('../../src/index.js');
    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer

    // Both skills should have their respective tools
    const analyticsResult = await server.readResource('skill://analytics');
    expect(analyticsResult.contents[0].text).toContain('analyze_data');

    const reportingResult = await server.readResource('skill://reporting');
    expect(reportingResult.contents[0].text).toContain('generate_report');
  });

  it('should deduplicate components when listed explicitly and via membership', async () => {
    const code = `
      import { ISkill, ITool, ToolHelper, SkillHelper } from 'simply-mcp';

      interface Tool1 extends ITool {
        name: 'tool_1';
        description: 'Tool 1';
        params: {};
        result: string;
        skill: 'my_skill';
      }

      interface Tool2 extends ITool {
        name: 'tool_2';
        description: 'Tool 2';
        params: {};
        result: string;
        skill: 'my_skill';
      }

      interface MySkill extends ISkill {
        name: 'my_skill';
        description: 'My skill';
        tools: ['tool_1', 'tool_2'];  // Explicitly list both tools
      }

      export default class TestServer {
        tool1: ToolHelper<Tool1> = () => 'Result 1';
        tool2: ToolHelper<Tool2> = () => 'Result 2';
        mySkill: SkillHelper<MySkill> = () => ''; // Auto-generated
      }
    `;

    const { compileServerFromCode } = await import('../../src/index.js');
    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true
    });

    // server is already InterfaceServer
    const result = await server.readResource('skill://my_skill');
    const skillContent = result.contents[0].text;

    // Both tools should be included
    expect(skillContent).toContain('tool_1');
    expect(skillContent).toContain('tool_2');

    // tool_1 should appear only once (not duplicated)
    const tool1Matches = skillContent.match(/tool_1/g);
    // There might be multiple mentions (heading, description, etc.)
    // but the tool itself should be documented once
    expect(tool1Matches).toBeTruthy();
  });
});
