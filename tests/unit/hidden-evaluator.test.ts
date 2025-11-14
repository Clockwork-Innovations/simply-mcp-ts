/**
 * Unit tests for hidden-evaluator.ts
 * Tests the core evaluateHidden() function with all scenarios
 */

import { jest } from '@jest/globals';
import { evaluateHidden } from '../../src/utils/hidden-evaluator.js';
import type { HiddenEvaluationContext, HiddenPredicate } from '../../src/types/hidden.js';

describe('Hidden Evaluator', () => {
  describe('Static boolean values', () => {
    it('should return true for hidden: true', async () => {
      const result = await evaluateHidden(true, {});
      expect(result).toBe(true);
    });

    it('should return false for hidden: false', async () => {
      const result = await evaluateHidden(false, {});
      expect(result).toBe(false);
    });

    it('should return false for hidden: undefined (visible by default)', async () => {
      const result = await evaluateHidden(undefined, {});
      expect(result).toBe(false);
    });

    it('should work without context', async () => {
      expect(await evaluateHidden(true)).toBe(true);
      expect(await evaluateHidden(false)).toBe(false);
      expect(await evaluateHidden(undefined)).toBe(false);
    });
  });

  describe('Sync function predicates', () => {
    it('should execute sync function and return result', async () => {
      const predicate: HiddenPredicate = () => true;
      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(true);
    });

    it('should execute sync function returning false', async () => {
      const predicate: HiddenPredicate = () => false;
      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false);
    });

    it('should pass context to predicate', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const user = ctx?.metadata?.user as { isAdmin?: boolean } | undefined;
        return user?.isAdmin !== true;
      };

      const adminContext: HiddenEvaluationContext = {
        metadata: { user: { isAdmin: true } }
      };
      const userContext: HiddenEvaluationContext = {
        metadata: { user: { isAdmin: false } }
      };

      expect(await evaluateHidden(predicate, adminContext)).toBe(false); // Admin sees it
      expect(await evaluateHidden(predicate, userContext)).toBe(true);  // User doesn't
    });

    it('should handle complex context metadata', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const features = ctx?.metadata?.features as string[] | undefined;
        return !features?.includes('beta');
      };

      const betaContext: HiddenEvaluationContext = {
        metadata: { features: ['beta', 'experimental'] }
      };
      const regularContext: HiddenEvaluationContext = {
        metadata: { features: ['stable'] }
      };

      expect(await evaluateHidden(predicate, betaContext)).toBe(false);
      expect(await evaluateHidden(predicate, regularContext)).toBe(true);
    });

    it('should handle missing context gracefully', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const user = ctx?.metadata?.user as { role?: string } | undefined;
        if (!user) return true; // Hide if no user
        return user.role !== 'admin';
      };

      expect(await evaluateHidden(predicate, {})).toBe(true);
      expect(await evaluateHidden(predicate, undefined)).toBe(true);
    });
  });

  describe('Async function predicates', () => {
    it('should await async function', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      };
      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(true);
    });

    it('should await async function returning false', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return false;
      };
      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false);
    });

    it('should pass context to async predicate', async () => {
      const checkPermission = async (userId: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return userId === 'admin-123';
      };

      const predicate: HiddenPredicate = async (ctx) => {
        const userId = ctx?.metadata?.userId as string | undefined;
        if (!userId) return true;
        return !(await checkPermission(userId));
      };

      const adminContext: HiddenEvaluationContext = {
        metadata: { userId: 'admin-123' }
      };
      const userContext: HiddenEvaluationContext = {
        metadata: { userId: 'user-456' }
      };

      expect(await evaluateHidden(predicate, adminContext)).toBe(false);
      expect(await evaluateHidden(predicate, userContext)).toBe(true);
    });

    it('should handle async predicate with multiple context fields', async () => {
      const predicate: HiddenPredicate = async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        const user = ctx?.metadata?.user as { role?: string } | undefined;
        const features = ctx?.metadata?.features as string[] | undefined;

        return !(user?.role === 'admin' || features?.includes('beta'));
      };

      const adminContext: HiddenEvaluationContext = {
        metadata: { user: { role: 'admin' }, features: [] }
      };
      const betaContext: HiddenEvaluationContext = {
        metadata: { user: { role: 'user' }, features: ['beta'] }
      };
      const regularContext: HiddenEvaluationContext = {
        metadata: { user: { role: 'user' }, features: [] }
      };

      expect(await evaluateHidden(predicate, adminContext)).toBe(false);
      expect(await evaluateHidden(predicate, betaContext)).toBe(false);
      expect(await evaluateHidden(predicate, regularContext)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should fail-open when sync function throws', async () => {
      const predicate: HiddenPredicate = () => {
        throw new Error('Test error');
      };

      // Suppress console.error during test
      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false); // Fail-open: show on error

      console.error = originalError;
    });

    it('should fail-open when async function throws', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        throw new Error('Async test error');
      };

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false); // Fail-open: show on error

      console.error = originalError;
    });

    it('should fail-closed when errorDefault is "hidden"', async () => {
      const predicate: HiddenPredicate = () => {
        throw new Error('Test error');
      };

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {}, { errorDefault: 'hidden' });
      expect(result).toBe(true); // Fail-closed: hide on error

      console.error = originalError;
    });

    it('should handle non-boolean return values', async () => {
      const predicate = (() => 'invalid') as unknown as HiddenPredicate;

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false); // Fail-open: show on invalid return

      console.error = originalError;
    });

    it('should handle non-boolean return with fail-closed', async () => {
      const predicate = (() => 42) as unknown as HiddenPredicate;

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {}, { errorDefault: 'hidden' });
      expect(result).toBe(true); // Fail-closed: hide on invalid return

      console.error = originalError;
    });

    it('should use custom logger', async () => {
      const predicate: HiddenPredicate = () => {
        throw new Error('Custom logger test');
      };

      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn()
      };

      await evaluateHidden(predicate, {}, { logger: mockLogger }, 'test-item');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Hidden predicate evaluation failed'),
        expect.objectContaining({ itemId: 'test-item' })
      );
    });
  });

  describe('Timeout protection', () => {
    // Note: Sync functions that block the event loop (busy loops) cannot be timed out
    // This is a JavaScript limitation. Timeouts work for async functions only.
    it('should handle sync functions that complete quickly', async () => {
      const predicate: HiddenPredicate = () => {
        // Fast sync function
        return true;
      };

      const result = await evaluateHidden(predicate, {}, { timeout: 100 });
      expect(result).toBe(true); // Completes before timeout
    });

    it('should timeout slow async functions', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      };

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {}, { timeout: 100 });
      expect(result).toBe(false); // Timed out, fail-open

      console.error = originalError;
    });

    it('should not timeout fast functions', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return true;
      };

      const result = await evaluateHidden(predicate, {}, { timeout: 1000 });
      expect(result).toBe(true); // Completed before timeout
    });

    it('should use default timeout of 1000ms', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
      };

      const originalError = console.error;
      console.error = jest.fn();

      const result = await evaluateHidden(predicate, {});
      expect(result).toBe(false); // Timed out with default 1000ms

      console.error = originalError;
    });
  });

  describe('Performance warnings', () => {
    it('should warn for slow predicates (>100ms)', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return true;
      };

      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn()
      };

      await evaluateHidden(predicate, {}, { logger: mockLogger }, 'slow-item');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow hidden predicate evaluation'),
        expect.objectContaining({
          itemId: 'slow-item',
          duration: expect.any(Number)
        })
      );
    });

    it('should not warn for fast predicates (<100ms)', async () => {
      const predicate: HiddenPredicate = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      };

      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn()
      };

      await evaluateHidden(predicate, {}, { logger: mockLogger });

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Context structure', () => {
    it('should handle MCP context', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        return ctx?.mcp?.server?.name !== 'admin-server';
      };

      const mcpContext: HiddenEvaluationContext = {
        mcp: {
          server: {
            name: 'admin-server',
            version: '1.0.0'
          }
        }
      };

      expect(await evaluateHidden(predicate, mcpContext)).toBe(false);
    });

    it('should handle server context', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        return ctx?.server?.isProduction === true;
      };

      const prodContext: HiddenEvaluationContext = {
        server: { isProduction: true }
      };
      const devContext: HiddenEvaluationContext = {
        server: { isProduction: false }
      };

      expect(await evaluateHidden(predicate, prodContext)).toBe(true);
      expect(await evaluateHidden(predicate, devContext)).toBe(false);
    });

    it('should handle custom context fields', async () => {
      const predicate: HiddenPredicate = (ctx) => {
        const customField = (ctx as any)?.customField;
        return customField !== 'allowed';
      };

      const context: HiddenEvaluationContext = {
        customField: 'allowed'
      };

      expect(await evaluateHidden(predicate, context)).toBe(false);
    });
  });
});
