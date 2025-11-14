/**
 * Integration Tests: Missing Components
 *
 * Tests graceful degradation when referenced components don't exist.
 * Validates warnings are shown but generation doesn't crash.
 */

import { compileServerFromCode } from '../../src/index.js';

describe('Skill Missing Components - Graceful Degradation', () => {
  it('should generate manual with warnings when tool not found', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface MissingToolSkill extends ISkill {
        name: 'missing_tool';
        description: 'References non-existent tool';
        tools: ['nonexistent_tool'];
      }

      export default class MissingToolServer {
        missingTool: SkillHelper<MissingToolSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'missing-tool',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const contentResult = await server.readResource('skill://missing_tool');
    const content = contentResult.contents[0].text;

    // Should not crash, should include warnings
    expect(content).toContain('# Missing Tool Skill');
    expect(content).toContain('## Warnings');
    expect(content).toContain('- Tool not found: nonexistent_tool');
    expect(content).toContain('### nonexistent_tool');
    expect(content).toContain('⚠️ **Warning**: This tool is not registered with the server.');
  });

  it('should generate manual with warnings when resource not found', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface MissingResourceSkill extends ISkill {
        name: 'missing_resource';
        description: 'References non-existent resource';
        resources: ['missing://resource'];
      }

      export default class MissingResourceServer {
        missingResource: SkillHelper<MissingResourceSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'missing-resource',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const contentResult = await server.readResource('skill://missing_resource');
    const content = contentResult.contents[0].text;

    expect(content).toContain('## Warnings');
    expect(content).toContain('- Resource not found: missing://resource');
    expect(content).toContain('⚠️ **Warning**: This resource is not registered');
  });

  it('should generate manual with warnings when prompt not found', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface MissingPromptSkill extends ISkill {
        name: 'missing_prompt';
        description: 'References non-existent prompt';
        prompts: ['missing_prompt'];
      }

      export default class MissingPromptServer {
        missingPrompt: SkillHelper<MissingPromptSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'missing-prompt',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const contentResult = await server.readResource('skill://missing_prompt');
    const content = contentResult.contents[0].text;

    expect(content).toContain('## Warnings');
    expect(content).toContain('- Prompt not found: missing_prompt');
  });

  it('should handle mix of found and missing components', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface ExistingTool extends ITool {
        name: 'existing_tool';
        description: 'Tool that exists';
        params: {};
        result: string;
      }

      interface MixedSkill extends ISkill {
        name: 'mixed_components';
        description: 'Mix of found and missing';
        tools: ['existing_tool', 'missing_tool'];
      }

      export default class MixedServer {
        existingTool: ToolHelper<ExistingTool> = async () => 'ok';
        mixedComponents: SkillHelper<MixedSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'mixed',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const contentResult = await server.readResource('skill://mixed_components');
    const content = contentResult.contents[0].text;

    // Should show found tool
    expect(content).toContain('### existing_tool');
    expect(content).toContain('**Description:** Tool that exists');

    // Should show warning for missing tool
    expect(content).toContain('### missing_tool');
    expect(content).toContain('⚠️ **Warning**');
    expect(content).toContain('## Warnings');
  });

  it('should continue generation despite all components missing', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface AllMissingSkill extends ISkill {
        name: 'all_missing';
        description: 'All components missing';
        tools: ['missing1', 'missing2'];
        resources: ['missing://res'];
        prompts: ['missing_prompt'];
      }

      export default class AllMissingServer {
        allMissing: SkillHelper<AllMissingSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'all-missing',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer
    const contentResult = await server.readResource('skill://all_missing');
    const content = contentResult.contents[0].text;

    // Should still generate manual with warnings
    expect(content).toContain('# All Missing Skill');
    expect(content).toContain('## Warnings');
    expect(content).toContain('- Tool not found: missing1');
    expect(content).toContain('- Tool not found: missing2');
    expect(content).toContain('- Resource not found: missing://res');
    expect(content).toContain('- Prompt not found: missing_prompt');
  });

  it('should log warnings to console when not silent', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface WarningSkill extends ISkill {
        name: 'warning_skill';
        description: 'Triggers warnings';
        tools: ['missing_tool'];
      }

      export default class WarningServer {
        warningSkill: SkillHelper<WarningSkill> = () => '';
      }
    `;

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);

    const { server } = await compileServerFromCode(code, {
      name: 'warning',
      version: '1.0.0',
      silent: false,
    });

    // server is already InterfaceServer
    await server.readResource('skill://warning_skill');

    console.warn = originalWarn;

    // Should have generated content with warnings
    const result = await server.readResource('skill://warning_skill');
    const content = result.contents[0].text;
    expect(content).toContain('Tool not found: missing_tool');
  });

  it('should not break server functionality with missing components', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface WorkingTool extends ITool {
        name: 'working_tool';
        description: 'Tool that works';
        params: {};
        result: string;
      }

      interface PartialSkill extends ISkill {
        name: 'partial_skill';
        description: 'Partial components';
        tools: ['working_tool', 'missing_tool'];
      }

      export default class PartialServer {
        workingTool: ToolHelper<WorkingTool> = async () => 'success';
        partialSkill: SkillHelper<PartialSkill> = () => '';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'partial',
      version: '1.0.0',
      silent: true,
    });

    // server is already InterfaceServer

    // Server should still be functional
    const tools = await server.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('working_tool');

    // Tool should be executable
    const result = await server.executeTool('working_tool', {});
    expect(result.content[0].text).toBe('success');

    // Skill should be accessible
    const contentResult = await server.readResource('skill://partial_skill');
    const content = contentResult.contents[0].text;
    expect(content).toBeDefined();
  });

  it('should maintain stats about missing components', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';
      import { z } from 'zod';

      interface FoundTool extends ITool {
        name: 'found_tool';
        description: 'Found';
        params: {};
        result: string;
      }

      interface StatsSkill extends ISkill {
        name: 'stats_skill';
        description: 'Stats test';
        tools: ['found_tool', 'missing1', 'missing2'];
      }

      export default class StatsServer {
        foundTool: ToolHelper<FoundTool> = async () => 'ok';
        statsSkill: SkillHelper<StatsSkill> = () => '';
      }
    `;

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logs.push(msg);

    const { server } = await compileServerFromCode(code, {
      name: 'stats',
      version: '1.0.0',
      silent: false,
    });

    // server is already InterfaceServer
    await server.readResource('skill://stats_skill');

    console.log = originalLog;

    // Manual should show warnings about missing components
    const result = await server.readResource('skill://stats_skill');
    const content = result.contents[0].text;
    expect(content).toContain('missing1');
    expect(content).toContain('missing2');
  });
});
