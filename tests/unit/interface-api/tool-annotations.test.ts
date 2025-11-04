/**
 * Tool Annotations Tests
 *
 * Tests the tool annotations feature including:
 * - Annotation parsing from interfaces
 * - Validation of annotation values
 * - Schema generation with annotations
 * - Backward compatibility (tools without annotations)
 * - Custom metadata fields
 *
 * @since v4.1.0
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { parseInterfaceFile } from '../../../src/server/parser.js';
import { BuildMCPServer } from '../../../src/server/builder-server.js';
import { resolve } from 'path';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Tool Annotations', () => {
  describe('Annotation Parsing', () => {
    it('should parse readOnlyHint annotation', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query string';
        }

        interface GetDataTool extends ITool {
          name: 'get_data';
          description: 'Get data';
          params: { query: QueryParam };
          result: string;
          annotations: {
            readOnlyHint: true;
          };
        }

        export default class TestServer {
          getData: GetDataTool = async (params) => 'data';
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        expect(result.tools).toHaveLength(1);
        expect(result.tools[0].annotations).toBeDefined();
        expect(result.tools[0].annotations?.readOnlyHint).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should parse destructiveHint annotation', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface IdParam extends IParam {
          type: 'string';
          description: 'ID';
        }

        interface DeleteTool extends ITool {
          name: 'delete_item';
          description: 'Delete item';
          params: { id: IdParam };
          result: boolean;
          annotations: {
            destructiveHint: true;
          };
        }

        export default class TestServer {
          deleteItem: DeleteTool = async (params) => true;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        expect(result.tools[0].annotations?.destructiveHint).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should parse all MCP standard annotations', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'object';
          description: 'Data';
        }

        interface UpdateTool extends ITool {
          name: 'update_item';
          description: 'Update item';
          params: { data: DataParam };
          result: any;
          annotations: {
            title: 'Update Item';
            readOnlyHint: false;
            destructiveHint: false;
            idempotentHint: true;
            openWorldHint: false;
          };
        }

        export default class TestServer {
          updateItem: UpdateTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        const annotations = result.tools[0].annotations;

        expect(annotations?.title).toBe('Update Item');
        expect(annotations?.readOnlyHint).toBe(false);
        expect(annotations?.destructiveHint).toBe(false);
        expect(annotations?.idempotentHint).toBe(true);
        expect(annotations?.openWorldHint).toBe(false);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should parse Simply-MCP extension annotations', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface IdParam extends IParam {
          type: 'string';
          description: 'ID';
        }

        interface DeleteTool extends ITool {
          name: 'delete_item';
          description: 'Delete item';
          params: { id: IdParam };
          result: boolean;
          annotations: {
            requiresConfirmation: true;
            category: 'data';
            estimatedDuration: 'fast';
          };
        }

        export default class TestServer {
          deleteItem: DeleteTool = async (params) => true;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        const annotations = result.tools[0].annotations;

        expect(annotations?.requiresConfirmation).toBe(true);
        expect(annotations?.category).toBe('data');
        expect(annotations?.estimatedDuration).toBe('fast');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should parse custom metadata fields', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface CustomTool extends ITool {
          name: 'custom_tool';
          description: 'Custom tool';
          params: { data: DataParam };
          result: string;
          annotations: {
            category: 'custom';
            version: '2.0';
            experimental: true;
          };
        }

        export default class TestServer {
          customTool: CustomTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        const annotations: any = result.tools[0].annotations;

        expect(annotations.version).toBe('2.0');
        expect(annotations.experimental).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Annotation Validation', () => {
    it('should reject conflicting readOnlyHint and destructiveHint', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface ConflictTool extends ITool {
          name: 'conflict_tool';
          description: 'Conflicting annotations';
          params: { data: DataParam };
          result: string;
          annotations: {
            readOnlyHint: true;
            destructiveHint: true;
          };
        }

        export default class TestServer {
          conflictTool: ConflictTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        // Should have at least one validation error about conflicting annotations
        const hasConflictError = result.validationErrors.some(
          err => err.includes('cannot be both readOnlyHint and destructiveHint')
        );
        expect(hasConflictError).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject invalid estimatedDuration value', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface InvalidDurationTool extends ITool {
          name: 'invalid_duration';
          description: 'Invalid duration';
          params: { data: DataParam };
          result: string;
          annotations: {
            estimatedDuration: 'instant';
          };
        }

        export default class TestServer {
          invalidDuration: InvalidDurationTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        // Should have at least one validation error about invalid estimatedDuration
        const hasInvalidDurationError = result.validationErrors.some(
          err => err.includes("Invalid estimatedDuration") && err.includes("instant")
        );
        expect(hasInvalidDurationError).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject non-boolean values for boolean fields', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface InvalidBooleanTool extends ITool {
          name: 'invalid_boolean';
          description: 'Invalid boolean annotation';
          params: { data: DataParam };
          result: string;
          annotations: {
            readOnlyHint: 'true';  // Should be boolean, not string
            destructiveHint: 1;    // Should be boolean, not number
          };
        }

        export default class TestServer {
          invalidBoolean: InvalidBooleanTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);

        // Should have validation errors for both fields
        const readOnlyError = result.validationErrors.some(
          err => err.includes("readOnlyHint") && err.includes("must be a boolean")
        );
        const destructiveError = result.validationErrors.some(
          err => err.includes("destructiveHint") && err.includes("must be a boolean")
        );

        expect(readOnlyError).toBe(true);
        expect(destructiveError).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should reject non-string values for string fields', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface InvalidStringTool extends ITool {
          name: 'invalid_string';
          description: 'Invalid string annotation';
          params: { data: DataParam };
          result: string;
          annotations: {
            title: 123;        // Should be string, not number
            category: true;    // Should be string, not boolean
          };
        }

        export default class TestServer {
          invalidString: InvalidStringTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);

        // Should have validation errors for both fields
        const titleError = result.validationErrors.some(
          err => err.includes("title") && err.includes("must be a string")
        );
        const categoryError = result.validationErrors.some(
          err => err.includes("category") && err.includes("must be a string")
        );

        expect(titleError).toBe(true);
        expect(categoryError).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should report all validation errors when multiple fields are invalid', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface MultipleErrorsTool extends ITool {
          name: 'multiple_errors';
          description: 'Tool with multiple validation errors';
          params: { data: DataParam };
          result: string;
          annotations: {
            readOnlyHint: true;        // VALID
            destructiveHint: true;     // VALID but conflicts with readOnlyHint
            title: 123;                // INVALID type
            estimatedDuration: 'instant';  // INVALID enum value
          };
        }

        export default class TestServer {
          multipleErrors: MultipleErrorsTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);

        // Should have at least 3 validation errors
        expect(result.validationErrors.length).toBeGreaterThanOrEqual(3);

        // Verify specific errors are present
        expect(result.validationErrors.some(e => e.includes('readOnlyHint') && e.includes('destructiveHint'))).toBe(true);
        expect(result.validationErrors.some(e => e.includes('title') && e.includes('string'))).toBe(true);
        expect(result.validationErrors.some(e => e.includes('estimatedDuration'))).toBe(true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should accept valid estimatedDuration values', () => {
      const validDurations = ['fast', 'medium', 'slow'];

      for (const duration of validDurations) {
        const testFile = `
          import type { ITool, IParam } from 'simply-mcp';

          interface DataParam extends IParam {
            type: 'string';
            description: 'Data';
          }

          interface ValidDurationTool extends ITool {
            name: 'valid_duration';
            description: 'Valid duration';
            params: { data: DataParam };
            result: string;
            annotations: {
              estimatedDuration: '${duration}';
            };
          }

          export default class TestServer {
            validDuration: ValidDurationTool = async (params) => params.data;
          }
        `;

        const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
        const tempFile = join(tempDir, 'test.ts');
        writeFileSync(tempFile, testFile);

        try {
          const result = parseInterfaceFile(tempFile);
          expect(result.tools[0].annotations?.estimatedDuration).toBe(duration);
          // Should not have validation errors related to estimatedDuration
          const durationErrors = result.validationErrors.filter(
            err => err.includes('estimatedDuration')
          );
          expect(durationErrors).toHaveLength(0);
        } finally {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with tools without annotations', () => {
      const testFile = `
        import type { ITool, IParam } from 'simply-mcp';

        interface DataParam extends IParam {
          type: 'string';
          description: 'Data';
        }

        interface NoAnnotationsTool extends ITool {
          name: 'no_annotations';
          description: 'Tool without annotations';
          params: { data: DataParam };
          result: string;
        }

        export default class TestServer {
          noAnnotations: NoAnnotationsTool = async (params) => params.data;
        }
      `;

      const tempDir = mkdtempSync(join(tmpdir(), 'test-'));
      const tempFile = join(tempDir, 'test.ts');
      writeFileSync(tempFile, testFile);

      try {
        const result = parseInterfaceFile(tempFile);
        expect(result.tools).toHaveLength(1);
        expect(result.tools[0].annotations).toBeUndefined();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Integration with BuildMCPServer', () => {
    it('should include annotations in tools list', async () => {
      const { z } = await import('zod');
      const server = new BuildMCPServer({
        name: 'test-server',
        version: '1.0.0',
      });

      server.addTool({
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({}),
        execute: async () => 'result',
        annotations: {
          readOnlyHint: true,
          category: 'test',
          estimatedDuration: 'fast',
        },
      });

      // Access the internal tools map to verify annotations are stored
      const tools = (server as any).tools;
      const tool = tools.get('test_tool');

      expect(tool).toBeDefined();
      expect(tool.definition.annotations).toBeDefined();
      expect(tool.definition.annotations.readOnlyHint).toBe(true);
      expect(tool.definition.annotations.category).toBe('test');
      expect(tool.definition.annotations.estimatedDuration).toBe('fast');
    });
  });

  // Full Example File test removed - example file doesn't exist
  // The core annotation parsing is covered by the tests above
});
