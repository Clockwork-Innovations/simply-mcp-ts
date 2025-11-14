/**
 * Integration Tests: Progressive Disclosure with Skills
 *
 * Tests that an LLM can:
 * 1. Discover 3 distinct skills via resources/list
 * 2. Choose the correct skill based on description
 * 3. Read only the chosen skill (not all 3)
 * 4. Use only tools/resources from that skill
 * 5. Successfully complete tasks
 *
 * This tests the progressive disclosure pattern where:
 * - Skills are visible in resources/list (skill:// URIs)
 * - All tools/resources are hidden (not in list)
 * - Tools/resources are discovered by reading the skill
 * - Tools/resources can be called directly even when hidden
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { join } from 'path';
import { cwd } from 'process';

describe('Progressive Disclosure with Skills', () => {
  const serverPath = join(cwd(), 'examples/progressive-disclosure-test-server.ts');
  let server: Awaited<ReturnType<typeof loadInterfaceServer>>;

  beforeAll(async () => {
    server = await loadInterfaceServer({ filePath: serverPath });
  });

  describe('Skill Discovery', () => {
    it('should expose 3 skills as resources', async () => {
      const resources = await Promise.resolve(server.listResources());

      // Should have exactly 3 skills (all visible)
      const skills = resources.filter(r => r.uri.startsWith('skill://'));
      expect(skills).toHaveLength(3);

      // Verify each skill is present
      const skillNames = skills.map(s => s.uri.replace('skill://', '')).sort();
      expect(skillNames).toEqual([
        'file_management',
        'math_calculations',
        'weather_analysis',
      ]);
    });

    it('should provide clear skill descriptions for selection', async () => {
      const resources = await Promise.resolve(server.listResources());
      const skills = resources.filter(r => r.uri.startsWith('skill://'));

      // Weather skill
      const weatherSkill = skills.find(s => s.uri === 'skill://weather_analysis');
      expect(weatherSkill).toBeDefined();
      expect(weatherSkill!.description).toBe('Analyze weather patterns and provide forecasts');

      // File skill
      const fileSkill = skills.find(s => s.uri === 'skill://file_management');
      expect(fileSkill).toBeDefined();
      expect(fileSkill!.description).toBe('Manage files and directories on the system');

      // Math skill
      const mathSkill = skills.find(s => s.uri === 'skill://math_calculations');
      expect(mathSkill).toBeDefined();
      expect(mathSkill!.description).toBe('Perform mathematical calculations and analysis');
    });

    it('should hide all tools and resources (only skills visible)', async () => {
      const tools = await Promise.resolve(server.listTools());
      const resources = await Promise.resolve(server.listResources());

      // No tools should be visible
      expect(tools).toHaveLength(0);

      // Only skill resources should be visible (no weather://, fs://, math:// resources)
      const nonSkillResources = resources.filter(r => !r.uri.startsWith('skill://'));
      expect(nonSkillResources).toHaveLength(0);
    });
  });

  describe('Skill Content', () => {
    it('should generate weather skill documentation with tools and resources', async () => {
      const result = await server.readResource('skill://weather_analysis');

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0].text;

      // Should contain skill title and description
      expect(content).toContain('Weather Analysis');
      expect(content).toContain('Analyze weather patterns');

      // Should list all weather tools
      expect(content).toContain('get_weather');
      expect(content).toContain('get_forecast');
      expect(content).toContain('analyze_climate');

      // Should list all weather resources
      expect(content).toContain('weather://current');
      expect(content).toContain('weather://historical');

      // Should NOT contain file or math components
      expect(content).not.toContain('list_files');
      expect(content).not.toContain('fs://');
      expect(content).not.toContain('calculate_stats');
      expect(content).not.toContain('math://');
    });

    it('should generate file management skill documentation with tools and resources', async () => {
      const result = await server.readResource('skill://file_management');

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0].text;

      // Should contain skill title and description
      expect(content).toContain('File Management');
      expect(content).toContain('Manage files and directories');

      // Should list all file tools
      expect(content).toContain('list_files');
      expect(content).toContain('read_file');
      expect(content).toContain('write_file');
      expect(content).toContain('delete_file');

      // Should list all file resources
      expect(content).toContain('fs://home');
      expect(content).toContain('fs://documents');

      // Should NOT contain weather or math components
      expect(content).not.toContain('get_weather');
      expect(content).not.toContain('weather://');
      expect(content).not.toContain('calculate_stats');
      expect(content).not.toContain('math://');
    });

    it('should generate math calculations skill documentation with tools and resources', async () => {
      const result = await server.readResource('skill://math_calculations');

      expect(result.contents).toHaveLength(1);
      const content = result.contents[0].text;

      // Should contain skill title and description
      expect(content).toContain('Math Calculations');
      expect(content).toContain('Perform mathematical calculations');

      // Should list all math tools
      expect(content).toContain('add');
      expect(content).toContain('subtract');
      expect(content).toContain('multiply');
      expect(content).toContain('divide');
      expect(content).toContain('calculate_stats');

      // Should list all math resources
      expect(content).toContain('math://constants');
      expect(content).toContain('math://formulas');

      // Should NOT contain weather or file components
      expect(content).not.toContain('get_weather');
      expect(content).not.toContain('weather://');
      expect(content).not.toContain('list_files');
      expect(content).not.toContain('fs://');
    });
  });

  describe('Tool Execution (Weather Skill)', () => {
    it('should execute get_weather tool successfully', async () => {
      const result = await server.executeTool('get_weather', { city: 'San Francisco' });

      expect(result).toBeDefined();
      expect(typeof result.temperature).toBe('number');
      expect(typeof result.conditions).toBe('string');
      expect(typeof result.humidity).toBe('number');
      expect(typeof result.wind_speed).toBe('number');
      expect(result.temperature).toBeGreaterThanOrEqual(15);
      expect(result.temperature).toBeLessThanOrEqual(30);
    });

    it('should execute get_forecast tool successfully', async () => {
      const result = await server.executeTool('get_forecast', { city: 'New York', days: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.forecast)).toBe(true);
      expect(result.forecast.length).toBe(5);

      result.forecast.forEach(day => {
        expect(typeof day.date).toBe('string');
        expect(typeof day.temperature).toBe('number');
        expect(typeof day.conditions).toBe('string');
      });
    });

    it('should execute analyze_climate tool successfully', async () => {
      const result = await server.executeTool('analyze_climate', { region: 'California' });

      expect(result).toBeDefined();
      expect(typeof result.average_temp).toBe('number');
      expect(typeof result.rainfall).toBe('number');
      expect(Array.isArray(result.trends)).toBe(true);
      expect(result.trends.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Reading (Weather Skill)', () => {
    it('should read weather://current resource successfully', async () => {
      const result = await server.readResource('weather://current');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(typeof data.stations).toBe('number');
      expect(typeof data.last_update).toBe('string');
      expect(data.stations).toBeGreaterThan(0);
    });

    it('should read weather://historical resource successfully', async () => {
      const result = await server.readResource('weather://historical');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(typeof data.records).toBe('number');
      expect(typeof data.date_range).toBe('string');
      expect(data.records).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution (File Management Skill)', () => {
    it('should execute list_files tool successfully', async () => {
      const result = await server.executeTool('list_files', { path: '/home/user/documents' });

      expect(result).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);

      result.files.forEach(file => {
        expect(typeof file.name).toBe('string');
        expect(['file', 'directory']).toContain(file.type);
        expect(typeof file.size).toBe('number');
      });
    });

    it('should execute read_file tool successfully', async () => {
      const result = await server.executeTool('read_file', { path: '/home/user/test.txt' });

      expect(result).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(typeof result.size).toBe('number');
      expect(typeof result.mime_type).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should execute write_file tool successfully', async () => {
      const result = await server.executeTool('write_file', {
        path: '/home/user/test.txt',
        content: 'Hello, World!',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.bytes_written).toBe(13);
    });

    it('should execute delete_file tool successfully', async () => {
      const result = await server.executeTool('delete_file', {
        path: '/home/user/test.txt',
        recursive: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.items_deleted).toBeGreaterThan(0);
    });
  });

  describe('Resource Reading (File Management Skill)', () => {
    it('should read fs://home resource successfully', async () => {
      const result = await server.readResource('fs://home');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(typeof data.path).toBe('string');
      expect(typeof data.total_size).toBe('number');
      expect(typeof data.file_count).toBe('number');
    });

    it('should read fs://documents resource successfully', async () => {
      const result = await server.readResource('fs://documents');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(typeof data.path).toBe('string');
      expect(Array.isArray(data.documents)).toBe(true);
      expect(data.documents.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution (Math Calculations Skill)', () => {
    it('should execute add tool successfully', async () => {
      const result = await server.executeTool('add', { numbers: [10, 20, 30, 40, 50] });

      expect(result).toBeDefined();
      expect(result.result).toBe(150);
    });

    it('should execute subtract tool successfully', async () => {
      const result = await server.executeTool('subtract', { numbers: [100, 25, 10] });

      expect(result).toBeDefined();
      expect(result.result).toBe(65);
    });

    it('should execute multiply tool successfully', async () => {
      const result = await server.executeTool('multiply', { numbers: [2, 3, 4] });

      expect(result).toBeDefined();
      expect(result.result).toBe(24);
    });

    it('should execute divide tool successfully', async () => {
      const result = await server.executeTool('divide', { numbers: [100, 2, 5] });

      expect(result).toBeDefined();
      expect(result.result).toBe(10);
    });

    it('should handle division by zero', async () => {
      await expect(server.executeTool('divide', { numbers: [100, 0] }))
        .rejects.toThrow('Division by zero');
    });

    it('should execute calculate_stats tool successfully', async () => {
      const result = await server.executeTool('calculate_stats', { numbers: [10, 20, 30, 40, 50] });

      expect(result).toBeDefined();
      expect(result.mean).toBe(30);
      expect(result.median).toBe(30);
      expect(result.sum).toBe(150);
      expect(result.count).toBe(5);
      expect(typeof result.std_dev).toBe('number');
      expect(Array.isArray(result.mode)).toBe(true);
    });

    it('should calculate correct statistics for dataset with mode', async () => {
      const result = await server.executeTool('calculate_stats', { numbers: [1, 2, 2, 3, 4, 4, 4, 5] });

      expect(result.mode).toEqual([4]); // 4 appears most frequently
      expect(result.count).toBe(8);
      expect(result.sum).toBe(25);
    });
  });

  describe('Resource Reading (Math Calculations Skill)', () => {
    it('should read math://constants resource successfully', async () => {
      const result = await server.readResource('math://constants');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(typeof data.pi).toBe('number');
      expect(typeof data.e).toBe('number');
      expect(typeof data.phi).toBe('number');
      expect(typeof data.sqrt2).toBe('number');
      expect(data.pi).toBeCloseTo(3.14159, 4);
      expect(data.e).toBeCloseTo(2.71828, 4);
    });

    it('should read math://formulas resource successfully', async () => {
      const result = await server.readResource('math://formulas');

      expect(result.contents).toHaveLength(1);
      const data = JSON.parse(result.contents[0].text);

      expect(Array.isArray(data.formulas)).toBe(true);
      expect(data.formulas.length).toBeGreaterThan(0);
      expect(data.formulas.some((f: string) => f.includes('πr²'))).toBe(true);
    });
  });

  describe('Cross-Skill Isolation', () => {
    it('should not expose weather tools in file management skill', async () => {
      const result = await server.readResource('skill://file_management');
      const content = result.contents[0].text;

      expect(content).not.toContain('get_weather');
      expect(content).not.toContain('get_forecast');
      expect(content).not.toContain('analyze_climate');
    });

    it('should not expose file tools in math calculations skill', async () => {
      const result = await server.readResource('skill://math_calculations');
      const content = result.contents[0].text;

      expect(content).not.toContain('list_files');
      expect(content).not.toContain('read_file');
      expect(content).not.toContain('write_file');
    });

    it('should not expose math tools in weather analysis skill', async () => {
      const result = await server.readResource('skill://weather_analysis');
      const content = result.contents[0].text;

      expect(content).not.toContain('calculate_stats');
      expect(content).not.toContain('add');
      expect(content).not.toContain('multiply');
    });
  });

  describe('Progressive Disclosure Benefits', () => {
    it('should show minimal initial discovery (only 3 skills)', async () => {
      const tools = await Promise.resolve(server.listTools());
      const resources = await Promise.resolve(server.listResources());

      // Initial discovery: 0 tools, 3 resources (skills)
      expect(tools).toHaveLength(0);
      expect(resources).toHaveLength(3);

      // Total hidden items: 13 tools + 6 resources = 19 items
      // Token reduction: ~75% (3 items vs 22 total)
    });

    it('should reveal components only when skill is read', async () => {
      // Before reading any skill: 0 tools visible
      const toolsBefore = await Promise.resolve(server.listTools());
      expect(toolsBefore).toHaveLength(0);

      // Read weather skill
      const weatherSkill = await server.readResource('skill://weather_analysis');
      const weatherContent = weatherSkill.contents[0].text;

      // Weather tools are documented in skill content
      expect(weatherContent).toContain('get_weather');
      expect(weatherContent).toContain('get_forecast');
      expect(weatherContent).toContain('analyze_climate');

      // But they're still hidden from list (progressive disclosure)
      const toolsAfter = await Promise.resolve(server.listTools());
      expect(toolsAfter).toHaveLength(0);

      // However, they can be executed directly
      await expect(server.executeTool('get_weather', { city: 'Test' }))
        .resolves.toBeDefined();
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should support weather query workflow', async () => {
      // 1. LLM sees skills in resources/list
      const resources = await Promise.resolve(server.listResources());
      const weatherSkill = resources.find(r => r.uri === 'skill://weather_analysis');
      expect(weatherSkill).toBeDefined();

      // 2. LLM reads weather skill
      const skill = await server.readResource('skill://weather_analysis');
      const skillContent = skill.contents[0].text;
      expect(skillContent).toContain('get_forecast');

      // 3. LLM calls get_forecast tool
      const forecast = await server.executeTool('get_forecast', { city: 'San Francisco', days: 3 });
      expect(forecast.forecast).toHaveLength(3);
    });

    it('should support file management workflow', async () => {
      // 1. LLM sees skills in resources/list
      const resources = await Promise.resolve(server.listResources());
      const fileSkill = resources.find(r => r.uri === 'skill://file_management');
      expect(fileSkill).toBeDefined();

      // 2. LLM reads file skill
      const skill = await server.readResource('skill://file_management');
      const skillContent = skill.contents[0].text;
      expect(skillContent).toContain('list_files');

      // 3. LLM calls list_files tool
      const files = await server.executeTool('list_files', { path: '/documents' });
      expect(Array.isArray(files.files)).toBe(true);
    });

    it('should support math calculation workflow', async () => {
      // 1. LLM sees skills in resources/list
      const resources = await Promise.resolve(server.listResources());
      const mathSkill = resources.find(r => r.uri === 'skill://math_calculations');
      expect(mathSkill).toBeDefined();

      // 2. LLM reads math skill
      const skill = await server.readResource('skill://math_calculations');
      const skillContent = skill.contents[0].text;
      expect(skillContent).toContain('calculate_stats');

      // 3. LLM calls calculate_stats tool
      const stats = await server.executeTool('calculate_stats', { numbers: [10, 20, 30, 40, 50] });
      expect(stats.mean).toBe(30);
    });
  });
});
