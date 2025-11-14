/**
 * Unit tests for filter-hidden.ts
 * Tests the filterHiddenItems() utility function
 */

import { jest } from '@jest/globals';
import { filterHiddenItems } from '../../src/utils/filter-hidden.js';
import type { HiddenEvaluationContext, HiddenPredicate } from '../../src/types/hidden.js';

describe('Filter Hidden Items', () => {
  describe('Basic filtering', () => {
    it('should filter out items with static hidden: true', async () => {
      const items = [
        { name: 'visible-tool' },
        { name: 'hidden-tool' },
        { name: 'another-visible' }
      ];

      const definitions = new Map([
        ['visible-tool', { definition: { hidden: false } }],
        ['hidden-tool', { definition: { hidden: true } }],
        ['another-visible', { definition: { hidden: false } }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(2);
      expect(result.map(i => i.name)).toEqual(['visible-tool', 'another-visible']);
    });

    it('should keep items with static hidden: false', async () => {
      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' }
      ];

      const definitions = new Map([
        ['tool-1', { definition: { hidden: false } }],
        ['tool-2', { definition: { hidden: false } }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(2);
    });

    it('should keep items with no hidden field (visible by default)', async () => {
      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' }
      ];

      const definitions = new Map([
        ['tool-1', { definition: {} }],
        ['tool-2', { definition: {} }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(2);
    });

    it('should handle empty list', async () => {
      const items: Array<{ name: string }> = [];
      const definitions = new Map();

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('Dynamic function filtering', () => {
    it('should filter items where function returns true', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const user = ctx?.metadata?.user as { role?: string } | undefined;
        return user?.role !== 'admin';
      };

      const items = [
        { name: 'admin-tool' },
        { name: 'regular-tool' }
      ];

      const definitions = new Map([
        ['admin-tool', { definition: { hidden: predicate } }],
        ['regular-tool', { definition: { hidden: false } }]
      ]);

      const userContext: HiddenEvaluationContext = {
        metadata: { user: { role: 'user' } }
      };

      const result = await filterHiddenItems(
        items,
        definitions,
        () => userContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('regular-tool');
    });

    it('should keep items where function returns false', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const user = ctx?.metadata?.user as { role?: string } | undefined;
        return user?.role !== 'admin';
      };

      const items = [
        { name: 'admin-tool' },
        { name: 'regular-tool' }
      ];

      const definitions = new Map([
        ['admin-tool', { definition: { hidden: predicate } }],
        ['regular-tool', { definition: { hidden: false } }]
      ]);

      const adminContext: HiddenEvaluationContext = {
        metadata: { user: { role: 'admin' } }
      };

      const result = await filterHiddenItems(
        items,
        definitions,
        () => adminContext
      );

      expect(result).toHaveLength(2);
      expect(result.map(i => i.name)).toEqual(['admin-tool', 'regular-tool']);
    });
  });

  describe('Parallel evaluation', () => {
    it('should evaluate multiple items concurrently', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      const createPredicate = (id: number): HiddenPredicate => async () => {
        startTimes[id] = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        endTimes[id] = Date.now();
        return false;
      };

      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' },
        { name: 'tool-3' }
      ];

      const definitions = new Map([
        ['tool-1', { definition: { hidden: createPredicate(0) } }],
        ['tool-2', { definition: { hidden: createPredicate(1) } }],
        ['tool-3', { definition: { hidden: createPredicate(2) } }]
      ]);

      const start = Date.now();
      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );
      const duration = Date.now() - start;

      expect(result).toHaveLength(3);
      // Parallel execution should take ~50ms, not 150ms
      expect(duration).toBeLessThan(150);

      // Check that evaluations started at roughly the same time
      const maxStartDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxStartDiff).toBeLessThan(50); // Started within 50ms of each other
    });

    it('should handle large lists efficiently', async () => {
      const items = Array.from({ length: 20 }, (_, i) => ({ name: `tool-${i}` }));
      const definitions = new Map(
        items.map(item => [
          item.name,
          {
            definition: {
              hidden: async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return false;
              }
            }
          }
        ])
      );

      const start = Date.now();
      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );
      const duration = Date.now() - start;

      expect(result).toHaveLength(20);
      // Parallel execution should take ~10-30ms, not 200ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Context passing', () => {
    it('should pass context correctly to all predicates', async () => {
      const receivedContexts: Array<HiddenEvaluationContext | undefined> = [];

      const createPredicate = (id: number): HiddenPredicate => (ctx) => {
        receivedContexts[id] = ctx;
        return false;
      };

      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' },
        { name: 'tool-3' }
      ];

      const definitions = new Map([
        ['tool-1', { definition: { hidden: createPredicate(0) } }],
        ['tool-2', { definition: { hidden: createPredicate(1) } }],
        ['tool-3', { definition: { hidden: createPredicate(2) } }]
      ]);

      const testContext: HiddenEvaluationContext = {
        metadata: { testId: 'test-123' }
      };

      await filterHiddenItems(
        items,
        definitions,
        () => testContext
      );

      expect(receivedContexts).toHaveLength(3);
      receivedContexts.forEach(ctx => {
        expect(ctx).toEqual(testContext);
      });
    });

    it('should call getHiddenContext once', async () => {
      const getContextFn = jest.fn(() => ({
        metadata: { callCount: 'test' }
      }));

      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' }
      ];

      const definitions = new Map([
        ['tool-1', { definition: { hidden: false } }],
        ['tool-2', { definition: { hidden: false } }]
      ]);

      await filterHiddenItems(
        items,
        definitions,
        getContextFn
      );

      expect(getContextFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mixed static and dynamic', () => {
    it('should handle mixed static and dynamic hidden in same list', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const features = ctx?.metadata?.features as string[] | undefined;
        return !features?.includes('beta');
      };

      const items = [
        { name: 'always-hidden' },
        { name: 'always-visible' },
        { name: 'beta-only' },
        { name: 'no-hidden' }
      ];

      const definitions = new Map([
        ['always-hidden', { definition: { hidden: true } }],
        ['always-visible', { definition: { hidden: false } }],
        ['beta-only', { definition: { hidden: predicate } }],
        ['no-hidden', { definition: {} }]
      ]);

      // Regular user without beta
      const regularContext: HiddenEvaluationContext = {
        metadata: { features: [] }
      };

      const regularResult = await filterHiddenItems(
        items,
        definitions,
        () => regularContext
      );

      expect(regularResult).toHaveLength(2);
      expect(regularResult.map(i => i.name)).toEqual(['always-visible', 'no-hidden']);

      // Beta user
      const betaContext: HiddenEvaluationContext = {
        metadata: { features: ['beta'] }
      };

      const betaResult = await filterHiddenItems(
        items,
        definitions,
        () => betaContext
      );

      expect(betaResult).toHaveLength(3);
      expect(betaResult.map(i => i.name)).toEqual(['always-visible', 'beta-only', 'no-hidden']);
    });
  });

  describe('Resource URIs', () => {
    it('should handle items with uri instead of name', async () => {
      const items = [
        { uri: 'config://settings' },
        { uri: 'debug://logs' }
      ];

      const definitions = new Map([
        ['config://settings', { definition: { hidden: false } }],
        ['debug://logs', { definition: { hidden: true } }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(1);
      expect(result[0].uri).toBe('config://settings');
    });

    it('should handle dynamic predicates with URIs', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        return ctx?.server?.isProduction === true;
      };

      const items = [
        { uri: 'debug://logs' },
        { uri: 'config://settings' }
      ];

      const definitions = new Map([
        ['debug://logs', { definition: { hidden: predicate } }],
        ['config://settings', { definition: { hidden: false } }]
      ]);

      const prodContext: HiddenEvaluationContext = {
        server: { isProduction: true }
      };

      const result = await filterHiddenItems(
        items,
        definitions,
        () => prodContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].uri).toBe('config://settings');
    });
  });

  describe('Alternative definition structure', () => {
    it('should handle definition.hidden directly', async () => {
      const items = [
        { name: 'tool-1' },
        { name: 'tool-2' }
      ];

      const definitions = new Map([
        ['tool-1', { hidden: true }],
        ['tool-2', { hidden: false }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('tool-2');
    });

    it('should prefer definition.definition.hidden over definition.hidden', async () => {
      const items = [{ name: 'tool-1' }];

      const definitions = new Map([
        ['tool-1', {
          hidden: false,
          definition: { hidden: true }
        }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(0); // Uses definition.definition.hidden (true)
    });
  });

  describe('Error handling', () => {
    it('should handle items with no definition', async () => {
      const items = [
        { name: 'existing-tool' },
        { name: 'missing-tool' }
      ];

      const definitions = new Map([
        ['existing-tool', { definition: { hidden: false } }]
        // 'missing-tool' has no definition
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(2); // Both visible (missing treated as visible)
    });

    it('should handle items with no name or uri', async () => {
      const items = [
        { name: 'valid-tool' },
        {} as any // No name or uri
      ];

      const definitions = new Map([
        ['valid-tool', { definition: { hidden: false } }]
      ]);

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      expect(result).toHaveLength(2); // Both kept
    });

    it('should handle predicate errors gracefully', async () => {
      const errorPredicate: HiddenPredicate = () => {
        throw new Error('Predicate error');
      };

      const items = [
        { name: 'error-tool' },
        { name: 'normal-tool' }
      ];

      const definitions = new Map([
        ['error-tool', { definition: { hidden: errorPredicate } }],
        ['normal-tool', { definition: { hidden: false } }]
      ]);

      const originalError = console.error;
      console.error = jest.fn();

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({})
      );

      console.error = originalError;

      expect(result).toHaveLength(2); // Error predicate fails open
    });
  });

  describe('Custom options', () => {
    it('should pass options to evaluateHidden', async () => {
      const slowPredicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return true;
      };

      const items = [{ name: 'slow-tool' }];

      const definitions = new Map([
        ['slow-tool', { definition: { hidden: slowPredicate } }]
      ]);

      const originalError = console.error;
      console.error = jest.fn();

      const result = await filterHiddenItems(
        items,
        definitions,
        () => ({}),
        { timeout: 100 } // Short timeout
      );

      console.error = originalError;

      expect(result).toHaveLength(1); // Timeout fails open
    });

    it('should use custom logger', async () => {
      const errorPredicate: HiddenPredicate = () => {
        throw new Error('Custom logger test');
      };

      const items = [{ name: 'error-tool' }];

      const definitions = new Map([
        ['error-tool', { definition: { hidden: errorPredicate } }]
      ]);

      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn()
      };

      await filterHiddenItems(
        items,
        definitions,
        () => ({}),
        { logger: mockLogger }
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
