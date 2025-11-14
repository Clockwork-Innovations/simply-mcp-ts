/**
 * Unit Tests: Skill Manual Generator
 *
 * Tests the generateSkillManual() function for FT-2 auto-generation system.
 * Validates markdown generation from component references.
 */

import { generateSkillManual } from '../../src/utils/skill-manual-generator.js';
import { BuildMCPServer } from '../../src/server/builder-server.js';
import { z } from 'zod';

describe('Skill Manual Generator - Unit Tests', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
      silent: true,
    });
  });

  describe('Tool section generation', () => {
    it('should generate markdown with tool description and parameters', async () => {
      // Register a test tool
      server.addTool({
        name: 'test_tool',
        description: 'A test tool for validation',
        parameters: z.object({
          input: z.string().describe('Input parameter'),
          count: z.number().optional().describe('Optional count'),
        }),
        execute: async () => 'result',
      });

      const result = await generateSkillManual(
        'test_skill',
        'Test skill description',
        { tools: ['test_tool'] },
        server
      );

      // Verify markdown structure
      expect(result.content).toContain('# Test Skill Skill');
      expect(result.content).toContain('Test skill description');
      expect(result.content).toContain('> **Note**: This manual is auto-generated from component definitions.');
      expect(result.content).toContain('## Available Tools');
      expect(result.content).toContain('### test_tool');
      expect(result.content).toContain('**Description:** A test tool for validation');
      expect(result.content).toContain('**Parameters:**');
      expect(result.content).toContain('```typescript');
      expect(result.content).toContain('| Parameter | Type | Required | Description |');
      expect(result.content).toContain('| `input` | string | ✓ | Input parameter |');
      expect(result.content).toContain('| `count` | number | - | Optional count |');
      expect(result.content).toContain('**Example:**');
      expect(result.content).toContain('await callTool("test_tool", {');

      // Verify stats
      expect(result.stats.toolsFound).toBe(1);
      expect(result.stats.toolsMissing).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should generate markdown for multiple tools', async () => {
      server.addTool({
        name: 'tool_one',
        description: 'First tool',
        parameters: z.object({ a: z.string() }),
        execute: async () => 'one',
      });

      server.addTool({
        name: 'tool_two',
        description: 'Second tool',
        parameters: z.object({ b: z.number() }),
        execute: async () => 'two',
      });

      const result = await generateSkillManual(
        'multi_tool',
        'Multiple tools',
        { tools: ['tool_one', 'tool_two'] },
        server
      );

      expect(result.content).toContain('### tool_one');
      expect(result.content).toContain('First tool');
      expect(result.content).toContain('### tool_two');
      expect(result.content).toContain('Second tool');
      expect(result.stats.toolsFound).toBe(2);
    });

    it('should handle tool with no parameters', async () => {
      server.addTool({
        name: 'no_params_tool',
        description: 'Tool without parameters',
        parameters: z.object({}),
        execute: async () => 'result',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['no_params_tool'] },
        server
      );

      expect(result.content).toContain('### no_params_tool');
      expect(result.content).toContain('Tool without parameters');
      expect(result.stats.toolsFound).toBe(1);
    });
  });

  describe('Resource section generation', () => {
    it('should generate markdown with resource details', async () => {
      server.addResource({
        uri: 'config://test_resource',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'application/json',
        fetch: async () => ({ data: 'test' }),
      });

      const result = await generateSkillManual(
        'test_skill',
        'Test skill',
        { resources: ['config://test_resource'] },
        server
      );

      expect(result.content).toContain('## Available Resources');
      expect(result.content).toContain('### config://test_resource');
      expect(result.content).toContain('**Name:** Test Resource');
      expect(result.content).toContain('**Description:** A test resource');
      expect(result.content).toContain('**MIME Type:** `application/json`');
      expect(result.content).toContain('**Example:**');
      expect(result.content).toContain('const content = await readResource("config://test_resource");');

      expect(result.stats.resourcesFound).toBe(1);
      expect(result.stats.resourcesMissing).toBe(0);
    });

    it('should show subscribable flag for subscribable resources', async () => {
      server.addResource({
        uri: 'data://live_feed',
        name: 'Live Feed',
        description: 'Live data feed',
        mimeType: 'text/plain',
        subscribable: true,
        fetch: async () => 'data',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { resources: ['data://live_feed'] },
        server
      );

      expect(result.content).toContain('**Subscribable:** Yes (supports real-time updates)');
    });
  });

  describe('Prompt section generation', () => {
    it('should generate markdown with prompt arguments', async () => {
      server.addPrompt({
        name: 'test_prompt',
        description: 'A test prompt',
        arguments: [
          {
            name: 'topic',
            description: 'Topic to discuss',
            required: true,
          },
          {
            name: 'context',
            description: 'Additional context',
            required: false,
          },
        ],
        generate: async () => 'prompt result',
      });

      const result = await generateSkillManual(
        'test_skill',
        'Test skill',
        { prompts: ['test_prompt'] },
        server
      );

      expect(result.content).toContain('## Available Prompts');
      expect(result.content).toContain('### test_prompt');
      expect(result.content).toContain('**Description:** A test prompt');
      expect(result.content).toContain('**Arguments:**');
      expect(result.content).toContain('| Argument | Required | Description |');
      expect(result.content).toContain('| `topic` | ✓ | Topic to discuss |');
      expect(result.content).toContain('| `context` | - | Additional context |');
      expect(result.content).toContain('const prompt = await getPrompt("test_prompt", {');

      expect(result.stats.promptsFound).toBe(1);
      expect(result.stats.promptsMissing).toBe(0);
    });

    it('should handle prompt with no arguments', async () => {
      server.addPrompt({
        name: 'no_args_prompt',
        description: 'Prompt without arguments',
        generate: async () => 'result',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { prompts: ['no_args_prompt'] },
        server
      );

      expect(result.content).toContain('### no_args_prompt');
      expect(result.content).toContain('**Arguments:** None');
    });
  });

  describe('All component types together', () => {
    it('should generate complete manual with all component types', async () => {
      // Add tool
      server.addTool({
        name: 'complete_tool',
        description: 'Complete tool',
        parameters: z.object({ x: z.string() }),
        execute: async () => 'result',
      });

      // Add resource
      server.addResource({
        uri: 'data://complete',
        name: 'Complete Resource',
        description: 'Complete resource',
        mimeType: 'text/plain',
        fetch: async () => 'data',
      });

      // Add prompt
      server.addPrompt({
        name: 'complete_prompt',
        description: 'Complete prompt',
        arguments: [{ name: 'arg', description: 'Argument', required: true }],
        generate: async () => 'prompt',
      });

      const result = await generateSkillManual(
        'complete_skill',
        'Complete skill with all components',
        {
          tools: ['complete_tool'],
          resources: ['data://complete'],
          prompts: ['complete_prompt'],
        },
        server
      );

      // Verify all sections are present
      expect(result.content).toContain('# Complete Skill Skill');
      expect(result.content).toContain('Complete skill with all components');
      expect(result.content).toContain('## Available Tools');
      expect(result.content).toContain('### complete_tool');
      expect(result.content).toContain('## Available Resources');
      expect(result.content).toContain('### data://complete');
      expect(result.content).toContain('## Available Prompts');
      expect(result.content).toContain('### complete_prompt');

      // Verify stats
      expect(result.stats.toolsFound).toBe(1);
      expect(result.stats.resourcesFound).toBe(1);
      expect(result.stats.promptsFound).toBe(1);
      expect(result.stats.toolsMissing).toBe(0);
      expect(result.stats.resourcesMissing).toBe(0);
      expect(result.stats.promptsMissing).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Missing component handling', () => {
    it('should add warning when tool not found', async () => {
      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['nonexistent_tool'] },
        server
      );

      expect(result.warnings).toContain('Tool not found: nonexistent_tool');
      expect(result.content).toContain('## Warnings');
      expect(result.content).toContain('The following components were referenced but not found:');
      expect(result.content).toContain('- Tool not found: nonexistent_tool');
      expect(result.content).toContain('### nonexistent_tool');
      expect(result.content).toContain('⚠️ **Warning**: This tool is not registered with the server.');
      expect(result.stats.toolsMissing).toBe(1);
      expect(result.stats.toolsFound).toBe(0);
    });

    it('should add warning when resource not found', async () => {
      const result = await generateSkillManual(
        'test',
        'Test',
        { resources: ['missing://resource'] },
        server
      );

      expect(result.warnings).toContain('Resource not found: missing://resource');
      expect(result.content).toContain('### missing://resource');
      expect(result.content).toContain('⚠️ **Warning**: This resource is not registered with the server.');
      expect(result.stats.resourcesMissing).toBe(1);
      expect(result.stats.resourcesFound).toBe(0);
    });

    it('should add warning when prompt not found', async () => {
      const result = await generateSkillManual(
        'test',
        'Test',
        { prompts: ['missing_prompt'] },
        server
      );

      expect(result.warnings).toContain('Prompt not found: missing_prompt');
      expect(result.content).toContain('### missing_prompt');
      expect(result.content).toContain('⚠️ **Warning**: This prompt is not registered with the server.');
      expect(result.stats.promptsMissing).toBe(1);
      expect(result.stats.promptsFound).toBe(0);
    });

    it('should handle mix of found and missing components', async () => {
      server.addTool({
        name: 'existing_tool',
        description: 'Exists',
        parameters: z.object({}),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'mixed',
        'Mixed',
        { tools: ['existing_tool', 'missing_tool'] },
        server
      );

      expect(result.stats.toolsFound).toBe(1);
      expect(result.stats.toolsMissing).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.content).toContain('### existing_tool');
      expect(result.content).toContain('**Description:** Exists');
      expect(result.content).toContain('### missing_tool');
      expect(result.content).toContain('⚠️ **Warning**');
    });

    it('should continue generation despite all components missing', async () => {
      const result = await generateSkillManual(
        'empty',
        'Empty',
        {
          tools: ['missing1'],
          resources: ['missing2'],
          prompts: ['missing3'],
        },
        server
      );

      expect(result.warnings).toHaveLength(3);
      expect(result.stats.toolsMissing).toBe(1);
      expect(result.stats.resourcesMissing).toBe(1);
      expect(result.stats.promptsMissing).toBe(1);
      expect(result.content).toContain('## Warnings');
    });
  });

  describe('Markdown format quality', () => {
    it('should generate proper markdown headers', async () => {
      server.addTool({
        name: 'test',
        description: 'Test',
        parameters: z.object({}),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'format_test',
        'Format test',
        { tools: ['test'] },
        server
      );

      // Should have h1 header
      expect(result.content).toMatch(/^# .+$/m);
      // Should have h2 headers
      expect(result.content).toMatch(/^## .+$/m);
      // Should have h3 headers
      expect(result.content).toMatch(/^### .+$/m);
    });

    it('should generate proper code blocks', async () => {
      server.addTool({
        name: 'test',
        description: 'Test',
        parameters: z.object({ x: z.string() }),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['test'] },
        server
      );

      // Should have TypeScript code blocks
      expect(result.content).toContain('```typescript');
      // Code blocks should be closed
      const openCount = (result.content.match(/```typescript/g) || []).length;
      const closeCount = (result.content.match(/^```$/gm) || []).length;
      expect(openCount).toBe(closeCount);
    });

    it('should generate proper markdown tables', async () => {
      server.addTool({
        name: 'test',
        description: 'Test',
        parameters: z.object({ param: z.string() }),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['test'] },
        server
      );

      // Should have table headers
      expect(result.content).toContain('| Parameter | Type | Required | Description |');
      // Should have table separator
      expect(result.content).toContain('|-----------|------|----------|-------------|');
      // Should have table data
      expect(result.content).toMatch(/\| `\w+` \| \w+ \| [✓-] \| .+ \|/);
    });

    it('should convert snake_case skill names to Title Case', async () => {
      const result = await generateSkillManual(
        'weather_forecast_analysis',
        'Weather analysis',
        { tools: [] },
        server
      );

      expect(result.content).toContain('# Weather Forecast Analysis Skill');
    });
  });

  describe('Tool parameter rendering', () => {
    it('should correctly render optional vs required parameters', async () => {
      server.addTool({
        name: 'params_test',
        description: 'Parameter test',
        parameters: z.object({
          required_param: z.string().describe('Must provide'),
          optional_param: z.number().optional().describe('Can skip'),
        }),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['params_test'] },
        server
      );

      // TypeScript interface should show optional with ?
      expect(result.content).toContain('required_param: string');
      expect(result.content).toContain('optional_param?: number');

      // Table should show checkmark vs dash
      expect(result.content).toContain('| `required_param` | string | ✓ | Must provide |');
      expect(result.content).toContain('| `optional_param` | number | - | Can skip |');
    });

    it('should render parameter descriptions from Zod schema', async () => {
      server.addTool({
        name: 'desc_test',
        description: 'Description test',
        parameters: z.object({
          with_desc: z.string().describe('Has description'),
          without_desc: z.string(),
        }),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['desc_test'] },
        server
      );

      expect(result.content).toContain('| `with_desc` | string | ✓ | Has description |');
      expect(result.content).toContain('| `without_desc` | string | ✓ | - |');
    });
  });

  describe('Stats accuracy', () => {
    it('should return accurate stats for found components', async () => {
      server.addTool({
        name: 't1',
        description: 'Tool 1',
        parameters: z.object({}),
        execute: async () => 'ok',
      });
      server.addTool({
        name: 't2',
        description: 'Tool 2',
        parameters: z.object({}),
        execute: async () => 'ok',
      });

      const result = await generateSkillManual(
        'test',
        'Test',
        { tools: ['t1', 't2'] },
        server
      );

      expect(result.stats.toolsFound).toBe(2);
      expect(result.stats.toolsMissing).toBe(0);
      expect(result.stats.resourcesFound).toBe(0);
      expect(result.stats.resourcesMissing).toBe(0);
      expect(result.stats.promptsFound).toBe(0);
      expect(result.stats.promptsMissing).toBe(0);
    });

    it('should return accurate stats for missing components', async () => {
      const result = await generateSkillManual(
        'test',
        'Test',
        {
          tools: ['missing1', 'missing2'],
          resources: ['missing3'],
        },
        server
      );

      expect(result.stats.toolsFound).toBe(0);
      expect(result.stats.toolsMissing).toBe(2);
      expect(result.stats.resourcesFound).toBe(0);
      expect(result.stats.resourcesMissing).toBe(1);
    });
  });
});
