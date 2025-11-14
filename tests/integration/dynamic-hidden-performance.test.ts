/**
 * Integration Tests: Dynamic Hidden Performance
 *
 * Tests performance characteristics of dynamic hidden evaluation:
 * - Static hidden overhead (< 5ms for 100 items)
 * - Sync function overhead (< 10ms for 100 items)
 * - Async function overhead (< 50ms for 100 items)
 * - Timeout protection
 * - Parallel evaluation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Dynamic Hidden Performance', () => {
  const testDir = join(tmpdir(), 'test-performance-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Static hidden performance', () => {
    it('should have < 5ms overhead for 100 items with static hidden', async () => {
      const testFile = join(testDir, 'static-perf.ts');

      // Generate code with 100 tools, half hidden statically
      const tools = Array.from({ length: 100 }, (_, i) => {
        const hidden = i % 2 === 0 ? 'hidden: true;' : 'hidden: false;';
        return `
          interface Tool${i} extends ITool {
            name: 'tool_${i}';
            params: { query: QueryParam };
            result: string;
            ${hidden}
          }
        `;
      }).join('\n');

      const exports = Array.from({ length: 100 }, (_, i) =>
        `tool${i}: Tool${i};`
      ).join('\n');

      const impls = Array.from({ length: 100 }, (_, i) =>
        `export const tool${i} = async (params: any) => 'result_${i}';`
      ).join('\n');

      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        ${tools}

        interface Server extends IServer {
          tools: {
            ${exports}
          };
        }

        ${impls}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools_list = await server.listTools({});
      const duration = Date.now() - start;

      expect(tools_list).toHaveLength(50); // Half are hidden
      expect(duration).toBeLessThan(5); // < 5ms for static evaluation
    });
  });

  describe('Sync function performance', () => {
    it('should have < 10ms overhead for 100 items with sync predicates', async () => {
      const testFile = join(testDir, 'sync-perf.ts');

      // Generate code with 100 tools, all using sync predicates
      const tools = Array.from({ length: 100 }, (_, i) => `
        interface Tool${i} extends ITool {
          name: 'tool_${i}';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as { id?: string } | undefined;
            return ${i % 2 === 0 ? '!user?.id' : 'false'};
          };
        }
      `).join('\n');

      const exports = Array.from({ length: 100 }, (_, i) =>
        `tool${i}: Tool${i};`
      ).join('\n');

      const impls = Array.from({ length: 100 }, (_, i) =>
        `export const tool${i} = async (params: any) => 'result_${i}';`
      ).join('\n');

      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        ${tools}

        interface Server extends IServer {
          tools: {
            ${exports}
          };
        }

        ${impls}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools_list = await server.listTools({
        metadata: { user: { id: 'user-123' } }
      });
      const duration = Date.now() - start;

      expect(tools_list).toHaveLength(100); // All visible with user context
      expect(duration).toBeLessThan(10); // < 10ms for sync evaluation
    });
  });

  describe('Async function performance', () => {
    it('should have < 50ms overhead for 100 items with async predicates', async () => {
      const testFile = join(testDir, 'async-perf.ts');

      // Generate code with 100 tools, all using async predicates
      const tools = Array.from({ length: 100 }, (_, i) => `
        interface Tool${i} extends ITool {
          name: 'tool_${i}';
          params: { query: QueryParam };
          result: string;
          hidden: async (ctx?: HiddenEvaluationContext) => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return ${i % 2 === 0 ? 'true' : 'false'};
          };
        }
      `).join('\n');

      const exports = Array.from({ length: 100 }, (_, i) =>
        `tool${i}: Tool${i};`
      ).join('\n');

      const impls = Array.from({ length: 100 }, (_, i) =>
        `export const tool${i} = async (params: any) => 'result_${i}';`
      ).join('\n');

      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        ${tools}

        interface Server extends IServer {
          tools: {
            ${exports}
          };
        }

        ${impls}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools_list = await server.listTools({});
      const duration = Date.now() - start;

      expect(tools_list).toHaveLength(50); // Half visible
      expect(duration).toBeLessThan(50); // < 50ms for async evaluation (parallel)
    });
  });

  describe('Timeout protection', () => {
    it('should timeout slow predicates and fail-open', async () => {
      const testFile = join(testDir, 'timeout.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface SlowTool extends ITool {
          name: 'slow_tool';
          description: 'Tool with slow predicate';
          params: { query: QueryParam };
          result: string;
          hidden: async (ctx?: HiddenEvaluationContext) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          };
        }

        interface FastTool extends ITool {
          name: 'fast_tool';
          description: 'Tool with fast predicate';
          params: { query: QueryParam };
          result: string;
          hidden: false;
        }

        interface Server extends IServer {
          tools: {
            slowTool: SlowTool;
            fastTool: FastTool;
          };
        }

        export const slowTool = async (params: any) => 'slow';
        export const fastTool = async (params: any) => 'fast';
      `;

      writeFileSync(testFile, code);

      // Suppress console.error for timeout warnings
      const originalError = console.error;
      console.error = jest.fn();

      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools = await server.listTools({});
      const duration = Date.now() - start;

      console.error = originalError;

      // Slow tool should be visible (timeout fails open)
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(
        expect.arrayContaining(['slow_tool', 'fast_tool'])
      );

      // Should complete in ~1000ms (timeout), not 2000ms
      expect(duration).toBeLessThan(1500);
      expect(duration).toBeGreaterThan(900); // At least the timeout period
    });
  });

  describe('Parallel evaluation', () => {
    it('should evaluate predicates in parallel, not sequentially', async () => {
      const testFile = join(testDir, 'parallel.ts');

      // Create 10 tools, each with 50ms async delay
      const tools = Array.from({ length: 10 }, (_, i) => `
        interface Tool${i} extends ITool {
          name: 'tool_${i}';
          params: { query: QueryParam };
          result: string;
          hidden: async (ctx?: HiddenEvaluationContext) => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return false;
          };
        }
      `).join('\n');

      const exports = Array.from({ length: 10 }, (_, i) =>
        `tool${i}: Tool${i};`
      ).join('\n');

      const impls = Array.from({ length: 10 }, (_, i) =>
        `export const tool${i} = async (params: any) => 'result_${i}';`
      ).join('\n');

      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        ${tools}

        interface Server extends IServer {
          tools: {
            ${exports}
          };
        }

        ${impls}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools_list = await server.listTools({});
      const duration = Date.now() - start;

      expect(tools_list).toHaveLength(10);

      // Parallel: ~50-100ms total, Sequential: ~500ms total
      expect(duration).toBeLessThan(150); // Confirms parallel execution
    });
  });

  describe('Mixed performance', () => {
    it('should efficiently handle mixed static/sync/async predicates', async () => {
      const testFile = join(testDir, 'mixed-perf.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        // 10 static hidden
        ${Array.from({ length: 10 }, (_, i) => `
          interface StaticTool${i} extends ITool {
            name: 'static_${i}';
            params: { query: QueryParam };
            result: string;
            hidden: ${i % 2 === 0};
          }
        `).join('\n')}

        // 10 sync predicates
        ${Array.from({ length: 10 }, (_, i) => `
          interface SyncTool${i} extends ITool {
            name: 'sync_${i}';
            params: { query: QueryParam };
            result: string;
            hidden: (ctx?: HiddenEvaluationContext) => ${i % 2 === 0};
          }
        `).join('\n')}

        // 10 async predicates
        ${Array.from({ length: 10 }, (_, i) => `
          interface AsyncTool${i} extends ITool {
            name: 'async_${i}';
            params: { query: QueryParam };
            result: string;
            hidden: async (ctx?: HiddenEvaluationContext) => {
              await new Promise(resolve => setTimeout(resolve, 5));
              return ${i % 2 === 0};
            };
          }
        `).join('\n')}

        interface Server extends IServer {
          tools: {
            ${Array.from({ length: 10 }, (_, i) => `staticTool${i}: StaticTool${i};`).join('\n')}
            ${Array.from({ length: 10 }, (_, i) => `syncTool${i}: SyncTool${i};`).join('\n')}
            ${Array.from({ length: 10 }, (_, i) => `asyncTool${i}: AsyncTool${i};`).join('\n')}
          };
        }

        ${Array.from({ length: 10 }, (_, i) =>
          `export const staticTool${i} = async (params: any) => 'static_${i}';`
        ).join('\n')}
        ${Array.from({ length: 10 }, (_, i) =>
          `export const syncTool${i} = async (params: any) => 'sync_${i}';`
        ).join('\n')}
        ${Array.from({ length: 10 }, (_, i) =>
          `export const asyncTool${i} = async (params: any) => 'async_${i}';`
        ).join('\n')}
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const start = Date.now();
      const tools = await server.listTools({});
      const duration = Date.now() - start;

      expect(tools).toHaveLength(15); // Half of each type visible
      expect(duration).toBeLessThan(20); // Should be fast
    });
  });
});
