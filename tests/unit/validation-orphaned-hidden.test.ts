/**
 * Unit Tests: Orphaned Hidden Items Rule
 *
 * Tests the validation rule that detects hidden tools/resources/prompts
 * that are not referenced by any skill.
 */

import { describe, it, expect } from '@jest/globals';
import { checkOrphanedHiddenItems } from '../../src/server/compiler/validators/rules/orphaned-hidden.js';
import type { ValidationContext, ReferenceMaps } from '../../src/server/compiler/validators/types.js';
import type { ParsedTool, ParsedResource, ParsedPrompt, ParsedSkill } from '../../src/server/compiler/types.js';

/**
 * Helper to create a minimal validation context for testing
 */
function createTestContext(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    tools: new Map<string, ParsedTool>(),
    resources: new Map<string, ParsedResource>(),
    prompts: new Map<string, ParsedPrompt>(),
    skills: new Map<string, ParsedSkill>(),
    sourceFile: '/test/server.ts',
    config: {
      enabled: true,
      rules: {
        orphanedHidden: 'warn',
        invalidReferences: 'error',
        nonHiddenComponents: 'warn',
        emptySkills: 'warn'
      },
      strict: false
    },
    ...overrides
  };
}

/**
 * Helper to create empty reference maps
 */
function createEmptyReferenceMaps(): ReferenceMaps {
  return {
    componentToSkills: new Map<string, Set<string>>(),
    skillToComponents: new Map<string, Set<string>>()
  };
}

describe('Orphaned Hidden Items Rule', () => {
  describe('Hidden Tools', () => {
    it('should warn about hidden tool not referenced by any skill', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            methodName: 'debugMode',
            description: 'Enable debug mode',
            hidden: true,
            hiddenIsDynamic: false,
            params: {} as any,
            result: {} as any,
            interfaceName: 'DebugModeTool',
            location: { file: '/test/server.ts', line: 42 }
          } as ParsedTool]
        ])
      });

      const referenceMaps = createEmptyReferenceMaps();
      const warnings = checkOrphanedHiddenItems(context, referenceMaps);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].rule).toBe('orphaned-hidden-tool');
      expect(warnings[0].severity).toBe('warning');
      expect(warnings[0].message).toContain('debug_mode');
      expect(warnings[0].message).toContain('not referenced by any skill');
      expect(warnings[0].suggestion).toContain('Add to an existing skill');
      expect(warnings[0].suggestion).toContain('Create a new skill');
      expect(warnings[0].suggestion).toContain('remove hidden flag');
    });

    it('should not warn when hidden tool is referenced by a skill', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        skills: new Map([
          ['debug_toolkit', {
            name: 'debug_toolkit',
            description: 'Debug tools',
            tools: ['debug_mode']
          } as ParsedSkill]
        ])
      });

      const referenceMaps = createEmptyReferenceMaps();
      referenceMaps.componentToSkills.set('tool:debug_mode', new Set(['debug_toolkit']));

      const warnings = checkOrphanedHiddenItems(context, referenceMaps);

      expect(warnings).toHaveLength(0);
    });

    it('should not warn about non-hidden tools', () => {
      const context = createTestContext({
        tools: new Map([
          ['greet', {
            name: 'greet',
            hidden: false
          } as ParsedTool]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(0);
    });

    it('should not warn about dynamic hidden tools (cannot validate at compile time)', () => {
      const context = createTestContext({
        tools: new Map([
          ['admin_tool', {
            name: 'admin_tool',
            hidden: true,
            hiddenIsDynamic: true
          } as ParsedTool]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(0);
    });

    it('should include available skills in relatedItems', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        skills: new Map([
          ['skill1', { name: 'skill1' } as ParsedSkill],
          ['skill2', { name: 'skill2' } as ParsedSkill],
          ['skill3', { name: 'skill3' } as ParsedSkill]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(1);
      expect(warnings[0].relatedItems).toEqual(['skill1', 'skill2', 'skill3']);
    });
  });

  describe('Hidden Resources', () => {
    it('should warn about hidden resource not referenced by any skill', () => {
      const context = createTestContext({
        resources: new Map([
          ['config://server', {
            uri: 'config://server',
            name: 'Server Config',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedResource]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(1);
      expect(warnings[0].rule).toBe('orphaned-hidden-resource');
      expect(warnings[0].message).toContain('config://server');
      expect(warnings[0].message).toContain('not referenced by any skill');
    });

    it('should not warn when hidden resource is referenced by a skill', () => {
      const context = createTestContext({
        resources: new Map([
          ['config://server', {
            uri: 'config://server',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedResource]
        ]),
        skills: new Map([
          ['config_skill', {
            name: 'config_skill',
            tools: [],
            resources: ['config://server']
          } as ParsedSkill]
        ])
      });

      const referenceMaps = createEmptyReferenceMaps();
      referenceMaps.componentToSkills.set('resource:config://server', new Set(['config_skill']));

      const warnings = checkOrphanedHiddenItems(context, referenceMaps);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('Hidden Prompts', () => {
    it('should warn about hidden prompt not referenced by any skill', () => {
      const context = createTestContext({
        prompts: new Map([
          ['admin_prompt', {
            name: 'admin_prompt',
            description: 'Admin operations',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedPrompt]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(1);
      expect(warnings[0].rule).toBe('orphaned-hidden-prompt');
      expect(warnings[0].message).toContain('admin_prompt');
      expect(warnings[0].message).toContain('not referenced by any skill');
    });

    it('should not warn when hidden prompt is referenced by a skill', () => {
      const context = createTestContext({
        prompts: new Map([
          ['admin_prompt', {
            name: 'admin_prompt',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedPrompt]
        ]),
        skills: new Map([
          ['admin_skill', {
            name: 'admin_skill',
            tools: [],
            prompts: ['admin_prompt']
          } as ParsedSkill]
        ])
      });

      const referenceMaps = createEmptyReferenceMaps();
      referenceMaps.componentToSkills.set('prompt:admin_prompt', new Set(['admin_skill']));

      const warnings = checkOrphanedHiddenItems(context, referenceMaps);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('Multiple Orphaned Items', () => {
    it('should detect multiple orphaned hidden items across types', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_tool', {
            name: 'debug_tool',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        resources: new Map([
          ['hidden://resource', {
            uri: 'hidden://resource',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedResource]
        ]),
        prompts: new Map([
          ['hidden_prompt', {
            name: 'hidden_prompt',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedPrompt]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(3);
      expect(warnings.find(w => w.rule === 'orphaned-hidden-tool')).toBeDefined();
      expect(warnings.find(w => w.rule === 'orphaned-hidden-resource')).toBeDefined();
      expect(warnings.find(w => w.rule === 'orphaned-hidden-prompt')).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should respect "off" config', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        config: {
          enabled: true,
          rules: {
            orphanedHidden: 'off'
          }
        }
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(0);
    });

    it('should use "error" severity when configured', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        config: {
          enabled: true,
          rules: {
            orphanedHidden: 'error'
          }
        }
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('error');
    });

    it('should use "warning" severity when configured as "warn"', () => {
      const context = createTestContext({
        tools: new Map([
          ['debug_mode', {
            name: 'debug_mode',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        config: {
          enabled: true,
          rules: {
            orphanedHidden: 'warn'
          }
        }
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context gracefully', () => {
      const context = createTestContext();
      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(0);
    });

    it('should handle context with only non-hidden items', () => {
      const context = createTestContext({
        tools: new Map([
          ['tool1', { name: 'tool1', hidden: false } as ParsedTool],
          ['tool2', { name: 'tool2', hidden: false } as ParsedTool]
        ]),
        resources: new Map([
          ['res://1', { uri: 'res://1', hidden: false } as ParsedResource]
        ])
      });

      const warnings = checkOrphanedHiddenItems(context, createEmptyReferenceMaps());

      expect(warnings).toHaveLength(0);
    });

    it('should handle hidden items referenced by multiple skills', () => {
      const context = createTestContext({
        tools: new Map([
          ['shared_tool', {
            name: 'shared_tool',
            hidden: true,
            hiddenIsDynamic: false
          } as ParsedTool]
        ]),
        skills: new Map([
          ['skill1', { name: 'skill1', tools: ['shared_tool'] } as ParsedSkill],
          ['skill2', { name: 'skill2', tools: ['shared_tool'] } as ParsedSkill]
        ])
      });

      const referenceMaps = createEmptyReferenceMaps();
      referenceMaps.componentToSkills.set('tool:shared_tool', new Set(['skill1', 'skill2']));

      const warnings = checkOrphanedHiddenItems(context, referenceMaps);

      expect(warnings).toHaveLength(0);
    });
  });
});
