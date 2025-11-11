/**
 * Unit tests for Phase 2 schema extraction
 *
 * Tests extraction of nested objects, typed arrays, JSDoc, and union types
 * from TypeScript AST without going through bundler validation
 */

import { extractToolSchemas } from '../../src/core/schema-metadata-extractor.js';
import { parseInterfaceFile } from '../../src/server/parser.js';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Phase 2 Schema Extraction', () => {
  let tempFile: string;

  afterEach(async () => {
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Nested objects', () => {
    it('should extract nested object schemas', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            user: {
              name: string;
              age?: number;
            };
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test).toBeDefined();
      expect(schemas.test.parameters.user).toBeDefined();
      expect(schemas.test.parameters.user.type).toBe('object');
      expect(schemas.test.parameters.user.properties).toBeDefined();
      expect(schemas.test.parameters.user.properties!.name).toBeDefined();
      expect(schemas.test.parameters.user.properties!.name.type).toBe('string');
      expect(schemas.test.parameters.user.properties!.name.required).toBe(true);
      expect(schemas.test.parameters.user.properties!.age).toBeDefined();
      expect(schemas.test.parameters.user.properties!.age.type).toBe('number');
      expect(schemas.test.parameters.user.properties!.age.required).toBe(false);
    });

    it('should handle deeply nested objects', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            config: {
              database: {
                host: string;
                port: number;
              };
            };
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.config.type).toBe('object');
      expect(schemas.test.parameters.config.properties).toBeDefined();
      expect(schemas.test.parameters.config.properties!.database.type).toBe('object');
      expect(schemas.test.parameters.config.properties!.database.properties).toBeDefined();
      expect(schemas.test.parameters.config.properties!.database.properties!.host.type).toBe('string');
      expect(schemas.test.parameters.config.properties!.database.properties!.port.type).toBe('number');
    });
  });

  describe('Typed arrays', () => {
    it('should extract string array schemas', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            tags: string[];
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.tags.type).toBe('array');
      expect(schemas.test.parameters.tags.items).toBeDefined();
      expect(schemas.test.parameters.tags.items!.type).toBe('string');
    });

    it('should extract array of objects', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            users: Array<{
              name: string;
              age?: number;
            }>;
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.users.type).toBe('array');
      expect(schemas.test.parameters.users.items).toBeDefined();
      expect(schemas.test.parameters.users.items!.type).toBe('object');
      expect(schemas.test.parameters.users.items!.properties).toBeDefined();
      expect(schemas.test.parameters.users.items!.properties!.name.type).toBe('string');
      expect(schemas.test.parameters.users.items!.properties!.age.type).toBe('number');
      expect(schemas.test.parameters.users.items!.properties!.age.required).toBe(false);
    });
  });

  describe('JSDoc descriptions', () => {
    it('should extract JSDoc comments', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            /** User's full name */
            name: string;
            /** User's age in years */
            age?: number;
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.name.description).toContain('full name');
      expect(schemas.test.parameters.age.description).toContain('age in years');
    });

    it('should extract JSDoc from nested objects', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            /** User information */
            user: {
              /** User's name */
              name: string;
            };
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.user.description).toContain('User information');
      expect(schemas.test.parameters.user.properties!.name.description).toContain("User's name");
    });
  });

  describe('Union types as enums', () => {
    it('should extract string literal unions as enums', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            status: 'active' | 'inactive' | 'pending';
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.status.type).toBe('string');
      expect(schemas.test.parameters.status.enum).toBeDefined();
      expect(schemas.test.parameters.status.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should preserve JSDoc with union types', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            /** Status can be active, inactive, or pending */
            status: 'active' | 'inactive' | 'pending';
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      expect(schemas.test.parameters.status.enum).toEqual(['active', 'inactive', 'pending']);
      expect(schemas.test.parameters.status.description).toContain('Status can be');
    });
  });

  describe('Complex nested structures', () => {
    it('should handle arrays of nested objects with nested arrays', async () => {
      const code = `
        import type { ITool, IServer } from 'simply-mcp';

        export interface ITestTool extends ITool {
          name: 'test';
          description: 'Test tool';
          params: {
            projects: Array<{
              name: string;
              tags: string[];
              metadata: {
                owner: string;
                priority: number;
              };
            }>;
          };
        }

        export interface ITestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
          description: 'Test';
        }

        export default class implements ITestServer {
          name = 'test-server' as const;
          version = '1.0.0' as const;
          description = 'Test' as const;
          test: ITestTool = async (params) => ({ content: [] });
        }
      `;

      tempFile = join(tmpdir(), `test-${Date.now()}.ts`);
      await writeFile(tempFile, code);

      const parsed = parseInterfaceFile(tempFile);
      const schemas = extractToolSchemas(parsed.tools, tempFile);

      const projectsSchema = schemas.test.parameters.projects;
      expect(projectsSchema.type).toBe('array');
      expect(projectsSchema.items).toBeDefined();
      expect(projectsSchema.items!.type).toBe('object');

      const projectProps = projectsSchema.items!.properties!;
      expect(projectProps.name.type).toBe('string');
      expect(projectProps.tags.type).toBe('array');
      expect(projectProps.tags.items!.type).toBe('string');
      expect(projectProps.metadata.type).toBe('object');
      expect(projectProps.metadata.properties!.owner.type).toBe('string');
      expect(projectProps.metadata.properties!.priority.type).toBe('number');
    });
  });
});
