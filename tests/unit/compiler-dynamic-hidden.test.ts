/**
 * Unit Tests: Compiler Dynamic Hidden Detection
 *
 * Tests that compilers correctly detect and flag dynamic hidden predicates (functions)
 * versus static hidden booleans in ITool, IResource, IPrompt, and ISkill interfaces.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { parseInterfaceFile } from '../../src/server/parser.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Compiler Dynamic Hidden Detection', () => {
  const testDir = join(tmpdir(), 'test-compiler-dynamic-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Tool Compiler', () => {
    it('should set hiddenIsDynamic: false for hidden: true', async () => {
      const testFile = join(testDir, 'tool-static-true.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface StaticHiddenTool extends ITool {
          name: 'static_hidden';
          description: 'A tool with static hidden';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        export const staticHidden = async (params: { name: string }) => {
          return \`Hidden: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBe(true);
      expect(result.tools[0].hiddenIsDynamic).toBe(false);
    });

    it('should set hiddenIsDynamic: false for hidden: false', async () => {
      const testFile = join(testDir, 'tool-static-false.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface StaticVisibleTool extends ITool {
          name: 'static_visible';
          description: 'A tool with static visible';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        export const staticVisible = async (params: { name: string }) => {
          return \`Visible: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBe(false);
      expect(result.tools[0].hiddenIsDynamic).toBe(false);
    });

    it('should set hiddenIsDynamic: true for function type', async () => {
      const testFile = join(testDir, 'tool-dynamic.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface DynamicHiddenTool extends ITool {
          name: 'dynamic_hidden';
          description: 'A tool with dynamic hidden';
          params: { name: NameParam };
          result: string;
          hidden: (ctx?: any) => boolean;
        }

        export const dynamicHidden = async (params: { name: string }) => {
          return \`Dynamic: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBeUndefined(); // Function cannot be serialized
      expect(result.tools[0].hiddenIsDynamic).toBe(true);
    });

    it('should handle tool with no hidden field', async () => {
      const testFile = join(testDir, 'tool-no-hidden.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface NoHiddenTool extends ITool {
          name: 'no_hidden';
          description: 'A tool without hidden';
          params: { name: NameParam };
          result: string;
        }

        export const noHidden = async (params: { name: string }) => {
          return \`NoHidden: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBeUndefined();
      expect(result.tools[0].hiddenIsDynamic).toBeUndefined();
    });
  });

  describe('Resource Compiler', () => {
    it('should set hiddenIsDynamic: false for static boolean', async () => {
      const testFile = join(testDir, 'resource-static.ts');
      const code = `
        import type { IResource } from 'simply-mcp';

        interface StaticHiddenResource extends IResource {
          uri: 'config://hidden';
          name: 'Hidden Config';
          description: 'A hidden resource';
          mimeType: 'application/json';
          returns: { setting: string };
          hidden: true;
        }

        export const staticHiddenResource = async () => {
          return { setting: 'value' };
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hidden).toBe(true);
      expect(result.resources[0].hiddenIsDynamic).toBe(false);
    });

    it('should set hiddenIsDynamic: true for function type', async () => {
      const testFile = join(testDir, 'resource-dynamic.ts');
      const code = `
        import type { IResource } from 'simply-mcp';

        interface DynamicHiddenResource extends IResource {
          uri: 'config://dynamic';
          name: 'Dynamic Config';
          description: 'A resource with dynamic hidden';
          mimeType: 'application/json';
          returns: { setting: string };
          hidden: (ctx?: any) => boolean;
        }

        export const dynamicHiddenResource = async () => {
          return { setting: 'value' };
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hidden).toBeUndefined();
      expect(result.resources[0].hiddenIsDynamic).toBe(true);
    });
  });

  describe('Prompt Compiler', () => {
    it('should set hiddenIsDynamic: false for static boolean', async () => {
      const testFile = join(testDir, 'prompt-static.ts');
      const code = `
        import type { IPrompt, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface StaticHiddenPrompt extends IPrompt {
          name: 'static_prompt';
          description: 'A hidden prompt';
          arguments: { name: NameParam };
          returns: { messages: any[] };
          hidden: true;
        }

        export const staticPrompt = async (args: { name: string }) => {
          return { messages: [] };
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBe(true);
      expect(result.prompts[0].hiddenIsDynamic).toBe(false);
    });

    it('should set hiddenIsDynamic: true for function type', async () => {
      const testFile = join(testDir, 'prompt-dynamic.ts');
      const code = `
        import type { IPrompt, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface DynamicHiddenPrompt extends IPrompt {
          name: 'dynamic_prompt';
          description: 'A prompt with dynamic hidden';
          arguments: { name: NameParam };
          returns: { messages: any[] };
          hidden: (ctx?: any) => Promise<boolean>;
        }

        export const dynamicPrompt = async (args: { name: string }) => {
          return { messages: [] };
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBeUndefined();
      expect(result.prompts[0].hiddenIsDynamic).toBe(true);
    });
  });

  describe('Skill Compiler', () => {
    it('should set hiddenIsDynamic: false for static boolean', async () => {
      const testFile = join(testDir, 'skill-static.ts');
      const code = `
        import type { ISkill, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface StaticHiddenSkill extends ISkill {
          name: 'static_skill';
          description: 'A hidden skill';
          tools: ['static_skill'];
          hidden: true;
        }

        export const staticSkill = async (args: { name: string }) => {
          return \`Skill: \${args.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].hidden).toBe(true);
      expect(result.skills[0].hiddenIsDynamic).toBe(false);
    });

    it('should set hiddenIsDynamic: true for function type', async () => {
      const testFile = join(testDir, 'skill-dynamic.ts');
      const code = `
        import type { ISkill, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface DynamicHiddenSkill extends ISkill {
          name: 'dynamic_skill';
          description: 'A skill with dynamic hidden';
          tools: ['dynamic_skill'];
          hidden: (ctx?: any) => boolean;
        }

        export const dynamicSkill = async (args: { name: string }) => {
          return \`Skill: \${args.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].hidden).toBeUndefined();
      expect(result.skills[0].hiddenIsDynamic).toBe(true);
    });
  });

  describe('Mixed Static and Dynamic', () => {
    it('should correctly detect mixed hidden types in same file', async () => {
      const testFile = join(testDir, 'mixed-hidden.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface StaticTool extends ITool {
          name: 'static_tool';
          description: 'Static hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface DynamicTool extends ITool {
          name: 'dynamic_tool';
          description: 'Dynamic hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: (ctx?: any) => boolean;
        }

        interface NoHiddenTool extends ITool {
          name: 'no_hidden_tool';
          description: 'Tool without hidden';
          params: { name: NameParam };
          result: string;
        }

        export const staticTool = async (params: { name: string }) => 'static';
        export const dynamicTool = async (params: { name: string }) => 'dynamic';
        export const noHiddenTool = async (params: { name: string }) => 'none';
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(3);

      const staticTool = result.tools.find(t => t.name === 'static_tool');
      expect(staticTool?.hidden).toBe(true);
      expect(staticTool?.hiddenIsDynamic).toBe(false);

      const dynamicTool = result.tools.find(t => t.name === 'dynamic_tool');
      expect(dynamicTool?.hidden).toBeUndefined();
      expect(dynamicTool?.hiddenIsDynamic).toBe(true);

      const noHiddenTool = result.tools.find(t => t.name === 'no_hidden_tool');
      expect(noHiddenTool?.hidden).toBeUndefined();
      expect(noHiddenTool?.hiddenIsDynamic).toBeUndefined();
    });

    it('should handle all item types with dynamic hidden', async () => {
      const testFile = join(testDir, 'all-types-dynamic.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface DynamicTool extends ITool {
          name: 'tool';
          params: { name: NameParam };
          result: string;
          hidden: (ctx?: any) => boolean;
        }

        interface DynamicResource extends IResource {
          uri: 'config://test';
          mimeType: 'text/plain';
          skill: string;
          hidden: (ctx?: any) => boolean;
        }

        interface DynamicPrompt extends IPrompt {
          name: 'prompt';
          arguments: { name: NameParam };
          returns: { messages: any[] };
          hidden: (ctx?: any) => boolean;
        }

        export const tool = async (p: any) => 'tool';
        export const resource = async () => 'resource';
        export const prompt = async (a: any) => ({ messages: [] });
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hiddenIsDynamic).toBe(true);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hiddenIsDynamic).toBe(true);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hiddenIsDynamic).toBe(true);

      // Skills are tested separately in individual tests
    });
  });
});
