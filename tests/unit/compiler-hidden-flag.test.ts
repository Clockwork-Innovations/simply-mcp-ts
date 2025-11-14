/**
 * Unit Tests: Compiler Hidden Flag Extraction
 *
 * Tests that compilers correctly extract the `hidden` field from ITool, IResource, and IPrompt interfaces.
 * Validates that the field is properly parsed as a boolean (true, false, or undefined).
 */

import { describe, it, expect } from '@jest/globals';
import { parseInterfaceFile } from '../../src/server/parser.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Compiler Hidden Flag Extraction', () => {
  const testDir = join(tmpdir(), 'test-compiler-hidden-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Tool Compiler', () => {
    it('should extract hidden: true from tool interface', async () => {
      const testFile = join(testDir, 'tool-hidden-true.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface HiddenTool extends ITool {
          name: 'hidden_tool';
          description: 'A hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        export const hiddenTool = async (params: { name: string }) => {
          return \`Hidden: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBe(true);
      expect(result.tools[0].name).toBe('hidden_tool');
    });

    it('should extract hidden: false from tool interface', async () => {
      const testFile = join(testDir, 'tool-hidden-false.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface VisibleTool extends ITool {
          name: 'visible_tool';
          description: 'A visible tool';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        export const visibleTool = async (params: { name: string }) => {
          return \`Visible: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBe(false);
      expect(result.tools[0].name).toBe('visible_tool');
    });

    it('should handle missing hidden field (undefined)', async () => {
      const testFile = join(testDir, 'tool-no-hidden.ts');
      const code = `
        import type { ITool, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'User name';
        }

        interface DefaultTool extends ITool {
          name: 'default_tool';
          description: 'A tool without hidden field';
          params: { name: NameParam };
          result: string;
        }

        export const defaultTool = async (params: { name: string }) => {
          return \`Default: \${params.name}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].hidden).toBeUndefined();
      expect(result.tools[0].name).toBe('default_tool');
    });
  });

  describe('Resource Compiler', () => {
    it('should extract hidden: true from resource interface', async () => {
      const testFile = join(testDir, 'resource-hidden-true.ts');
      const code = `
        import type { IResource } from 'simply-mcp';

        interface HiddenResource extends IResource {
          uri: 'hidden://resource';
          name: 'Hidden Resource';
          description: 'A hidden resource';
          mimeType: 'application/json';
          value: { secret: true };
          hidden: true;
        }
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hidden).toBe(true);
      expect(result.resources[0].uri).toBe('hidden://resource');
    });

    it('should extract hidden: false from resource interface', async () => {
      const testFile = join(testDir, 'resource-hidden-false.ts');
      const code = `
        import type { IResource } from 'simply-mcp';

        interface VisibleResource extends IResource {
          uri: 'visible://resource';
          name: 'Visible Resource';
          description: 'A visible resource';
          mimeType: 'application/json';
          value: { public: true };
          hidden: false;
        }
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hidden).toBe(false);
      expect(result.resources[0].uri).toBe('visible://resource');
    });

    it('should handle missing hidden field (undefined)', async () => {
      const testFile = join(testDir, 'resource-no-hidden.ts');
      const code = `
        import type { IResource } from 'simply-mcp';

        interface DefaultResource extends IResource {
          uri: 'default://resource';
          name: 'Default Resource';
          description: 'A resource without hidden field';
          mimeType: 'text/plain';
          value: 'default content';
        }
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].hidden).toBeUndefined();
      expect(result.resources[0].uri).toBe('default://resource');
    });
  });

  describe('Prompt Compiler', () => {
    it('should extract hidden: true from prompt interface', async () => {
      const testFile = join(testDir, 'prompt-hidden-true.ts');
      const code = `
        import type { IPrompt } from 'simply-mcp';

        interface HiddenPrompt extends IPrompt {
          name: 'hidden_prompt';
          description: 'A hidden prompt';
          args: {
            topic: { description: 'Topic name' };
          };
          hidden: true;
        }

        export const hiddenPrompt = (args: { topic: string }) => {
          return \`Hidden topic: \${args.topic}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBe(true);
      expect(result.prompts[0].name).toBe('hidden_prompt');
    });

    it('should extract hidden: false from prompt interface', async () => {
      const testFile = join(testDir, 'prompt-hidden-false.ts');
      const code = `
        import type { IPrompt } from 'simply-mcp';

        interface VisiblePrompt extends IPrompt {
          name: 'visible_prompt';
          description: 'A visible prompt';
          args: {
            topic: { description: 'Topic name' };
          };
          hidden: false;
        }

        export const visiblePrompt = (args: { topic: string }) => {
          return \`Visible topic: \${args.topic}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBe(false);
      expect(result.prompts[0].name).toBe('visible_prompt');
    });

    it('should handle missing hidden field (undefined)', async () => {
      const testFile = join(testDir, 'prompt-no-hidden.ts');
      const code = `
        import type { IPrompt } from 'simply-mcp';

        interface DefaultPrompt extends IPrompt {
          name: 'default_prompt';
          description: 'A prompt without hidden field';
          args: {
            topic: { description: 'Topic name' };
          };
        }

        export const defaultPrompt = (args: { topic: string }) => {
          return \`Default topic: \${args.topic}\`;
        };
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBeUndefined();
      expect(result.prompts[0].name).toBe('default_prompt');
    });
  });

  describe('Mixed Hidden Values', () => {
    it('should correctly parse multiple items with different hidden values', async () => {
      const testFile = join(testDir, 'mixed-hidden.ts');
      const code = `
        import type { ITool, IResource, IPrompt, IParam } from 'simply-mcp';

        interface NameParam extends IParam {
          type: 'string';
          description: 'Name';
        }

        interface Tool1 extends ITool {
          name: 'tool_hidden';
          description: 'Hidden tool';
          params: { name: NameParam };
          result: string;
          hidden: true;
        }

        interface Tool2 extends ITool {
          name: 'tool_visible';
          description: 'Visible tool';
          params: { name: NameParam };
          result: string;
          hidden: false;
        }

        interface Tool3 extends ITool {
          name: 'tool_default';
          description: 'Default tool';
          params: { name: NameParam };
          result: string;
        }

        interface Resource1 extends IResource {
          uri: 'res://hidden';
          name: 'Hidden';
          description: 'Hidden';
          mimeType: 'text/plain';
          value: 'hidden';
          hidden: true;
        }

        interface Resource2 extends IResource {
          uri: 'res://visible';
          name: 'Visible';
          description: 'Visible';
          mimeType: 'text/plain';
          value: 'visible';
          hidden: false;
        }

        interface Prompt1 extends IPrompt {
          name: 'prompt_hidden';
          description: 'Hidden prompt';
          args: { name: { description: 'Name' } };
          hidden: true;
        }

        export const toolHidden = async (params: { name: string }) => params.name;
        export const toolVisible = async (params: { name: string }) => params.name;
        export const toolDefault = async (params: { name: string }) => params.name;
        export const promptHidden = (args: { name: string }) => args.name;
      `;

      writeFileSync(testFile, code);
      const result = await parseInterfaceFile(testFile);

      // Verify tools
      expect(result.tools).toHaveLength(3);
      const hiddenTool = result.tools.find(t => t.name === 'tool_hidden');
      const visibleTool = result.tools.find(t => t.name === 'tool_visible');
      const defaultTool = result.tools.find(t => t.name === 'tool_default');

      expect(hiddenTool?.hidden).toBe(true);
      expect(visibleTool?.hidden).toBe(false);
      expect(defaultTool?.hidden).toBeUndefined();

      // Verify resources
      expect(result.resources).toHaveLength(2);
      const hiddenRes = result.resources.find(r => r.uri === 'res://hidden');
      const visibleRes = result.resources.find(r => r.uri === 'res://visible');

      expect(hiddenRes?.hidden).toBe(true);
      expect(visibleRes?.hidden).toBe(false);

      // Verify prompts
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].hidden).toBe(true);
      expect(result.prompts[0].name).toBe('prompt_hidden');
    });
  });
});
