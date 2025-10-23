/**
 * Functional API Router - Foundation Layer Tests
 *
 * Tests the core Functional API router functionality:
 * - defineRouter() function
 * - SingleFileRouter type checking
 * - MCPBuilder.router() method
 * - Router accumulation
 * - SingleFileMCPConfig.routers property
 * - Adapter integration with BuildMCPServer
 * - Router metadata and validation
 */

import { describe, it, expect } from '@jest/globals';
import type { SingleFileRouter, SingleFileMCPConfig } from '../src/single-file-types.js';
import { defineRouter, defineMCP, createMCP, Schema } from '../src/single-file-types.js';
import { z } from 'zod';
import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';

describe('Functional API Router - Foundation Layer', () => {
  // ========================================================================
  // Test 1: Basic Router Definition
  // ========================================================================
  it('defineRouter accepts SingleFileRouter with required fields and returns matching object', () => {
    const router = defineRouter({
      name: 'test-router',
      description: 'Test router',
      tools: ['tool1', 'tool2']
    });

    expect(router).toBeDefined();
    expect(router.name).toBe('test-router');
    expect(router.description).toBe('Test router');
    expect(router.tools).toEqual(['tool1', 'tool2']);
  });

  // ========================================================================
  // Test 2: Router Type Safety
  // ========================================================================
  it('defineRouter preserves exact structure for type safety', () => {
    const router: SingleFileRouter = defineRouter({
      name: 'calc-router',
      description: 'Calculator operations',
      tools: ['add', 'subtract', 'multiply', 'divide']
    });

    // TypeScript type checking ensures no type assertion needed
    expect(router.name).toBeTypeOf('string');
    expect(router.description).toBeTypeOf('string');
    expect(Array.isArray(router.tools)).toBe(true);
    expect(router.tools.length).toBe(4);
  });

  // ========================================================================
  // Test 3: MCPBuilder Router Support
  // ========================================================================
  it('MCPBuilder.router() method works and returns builder instance for chaining', () => {
    const builder = createMCP({ name: 'test-server', version: '1.0.0' });

    const result = builder.router({
      name: 'test-router',
      description: 'Test router',
      tools: ['tool1']
    });

    expect(result).toBe(builder); // Returns same instance for chaining
  });

  // ========================================================================
  // Test 4: Router Accumulation
  // ========================================================================
  it('multiple router() calls accumulate (do not replace)', () => {
    const config = createMCP({ name: 'test-server', version: '1.0.0' })
      .router({
        name: 'router1',
        description: 'First router',
        tools: ['tool1']
      })
      .router({
        name: 'router2',
        description: 'Second router',
        tools: ['tool2']
      })
      .tool({
        name: 'tool1',
        description: 'Test tool',
        parameters: z.object({}),
        execute: async () => 'result'
      })
      .build();

    expect(config.routers).toBeDefined();
    expect(config.routers!.length).toBe(2);
    expect(config.routers![0].name).toBe('router1');
    expect(config.routers![1].name).toBe('router2');
    expect(config.tools!.length).toBe(1);
  });

  // ========================================================================
  // Test 5: SingleFileMCPConfig Router Property
  // ========================================================================
  it('defineMCP config accepts routers array', () => {
    const config = defineMCP({
      name: 'test-server',
      version: '1.0.0',
      tools: [
        {
          name: 'tool1',
          description: 'Test tool',
          parameters: z.object({ value: z.string() }),
          execute: async (args) => `Result: ${args.value}`
        }
      ],
      routers: [
        {
          name: 'router1',
          description: 'First router',
          tools: ['tool1']
        }
      ]
    });

    expect(config.routers).toBeDefined();
    expect(Array.isArray(config.routers)).toBe(true);
    expect(config.routers!.length).toBe(1);
    expect(config.routers![0].name).toBe('router1');
  });

  // ========================================================================
  // Test 6: Router with Empty Tools Array
  // ========================================================================
  it('router can have empty tools array (no validation error at Foundation layer)', () => {
    const router = defineRouter({
      name: 'empty-router',
      description: 'Router with no tools yet',
      tools: []
    });

    expect(router.tools).toBeDefined();
    expect(Array.isArray(router.tools)).toBe(true);
    expect(router.tools.length).toBe(0);
  });

  // ========================================================================
  // Test 7: Router Metadata Property
  // ========================================================================
  it('router metadata property is optional and works with/without it', () => {
    const routerWithoutMeta = defineRouter({
      name: 'no-meta-router',
      description: 'Router without metadata',
      tools: ['tool1']
    });

    const routerWithMeta = defineRouter({
      name: 'meta-router',
      description: 'Router with metadata',
      tools: ['tool1'],
      metadata: { version: '1.0', tags: ['test', 'demo'] }
    });

    expect(routerWithoutMeta.metadata).toBeUndefined();
    expect(routerWithMeta.metadata).toBeDefined();
    expect(routerWithMeta.metadata!.version).toBe('1.0');
    expect(Array.isArray(routerWithMeta.metadata!.tags)).toBe(true);
  });

  // ========================================================================
  // Test 8: Router in Config Build
  // ========================================================================
  it('config with both tools and routers builds successfully together', () => {
    const config = defineMCP({
      name: 'combined-server',
      version: '1.0.0',
      tools: [
        {
          name: 'standalone-tool',
          description: 'Standalone tool',
          parameters: z.object({}),
          execute: async () => 'standalone'
        },
        {
          name: 'routed-tool',
          description: 'Routed tool',
          parameters: z.object({}),
          execute: async () => 'routed'
        }
      ],
      routers: [
        {
          name: 'test-router',
          description: 'Test router',
          tools: ['routed-tool']
        }
      ]
    });

    expect(config.tools!.length).toBe(2);
    expect(config.routers!.length).toBe(1);
  });

  // ========================================================================
  // Test 9: MCPBuilder Build with Routers
  // ========================================================================
  it('MCPBuilder accumulates tools and routers and build() returns config with both arrays', () => {
    const config = createMCP({ name: 'test-server', version: '1.0.0' })
      .tool({
        name: 'tool1',
        description: 'First tool',
        parameters: z.object({ value: z.string() }),
        execute: async (args) => `Tool1: ${args.value}`
      })
      .router({
        name: 'router1',
        description: 'First router',
        tools: ['tool1']
      })
      .tool({
        name: 'tool2',
        description: 'Second tool',
        parameters: z.object({ num: z.number() }),
        execute: async (args) => `Tool2: ${args.num}`
      })
      .build();

    expect(config.tools).toBeDefined();
    expect(config.tools!.length).toBe(2);
    expect(config.routers).toBeDefined();
    expect(config.routers!.length).toBe(1);
  });

  // ========================================================================
  // Test 10: Router Name Type
  // ========================================================================
  it('router name is string type', () => {
    const router = defineRouter({
      name: 'string-name-router',
      description: 'Test',
      tools: []
    });

    expect(typeof router.name).toBe('string');
    expect(router.name).toBeTypeOf('string');
  });

  // ========================================================================
  // Test 11: Router Description Type
  // ========================================================================
  it('router description is string type', () => {
    const router = defineRouter({
      name: 'test',
      description: 'This is a description',
      tools: []
    });

    expect(typeof router.description).toBe('string');
    expect(router.description).toBeTypeOf('string');
  });

  // ========================================================================
  // Test 12: Router Tools Array Type
  // ========================================================================
  it('router tools is array of strings, not mixed types', () => {
    const router = defineRouter({
      name: 'test',
      description: 'Test',
      tools: ['tool1', 'tool2', 'tool3']
    });

    expect(Array.isArray(router.tools)).toBe(true);
    expect(router.tools.length).toBe(3);

    // Check each element is a string
    router.tools.forEach(toolName => {
      expect(typeof toolName).toBe('string');
    });
  });

  // ========================================================================
  // Test 13: Adapter Integration
  // ========================================================================
  it('BuildMCPServer accepts config with routers property (no crash)', () => {
    // This is a Foundation layer test - just verify it doesn't error
    // Don't test full routing functionality (that's Feature layer)

    const server = new BuildMCPServer({
      name: 'router-test',
      version: '1.0.0'
    });

    // Add a router tool using the adapter's method
    expect(() => {
      server.addRouterTool({
        name: 'test-router',
        description: 'Test router'
      });
    }).not.toThrow();

    // Verify router was added
    const stats = server.getStats();
    expect(stats.tools).toBeGreaterThanOrEqual(1); // At least the router tool
  });
});
