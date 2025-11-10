/**
 * Unit Tests: VmExecutor
 *
 * Tests the VM2-based JavaScript code executor.
 * Validates execution, output capture, error handling, timeout enforcement,
 * and runtime integration for TypeScript with tool injection.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { VmExecutor } from '../../../../src/features/code-execution/executors/vm-executor.js';
import { TypeScriptRuntime } from '../../../../src/features/code-execution/runtimes/typescript-runtime.js';
import type { IExecutionResult } from '../../../../src/features/code-execution/types.js';
import type { InternalTool } from '../../../../src/features/code-execution/tool-injection/type-generator.js';
import { z } from 'zod';

describe('VmExecutor', () => {
  let executor: VmExecutor;

  beforeEach(() => {
    executor = new VmExecutor({ timeout: 5000, captureOutput: true });
  });

  describe('execute() - Basic Execution', () => {
    test('should execute simple JavaScript and return value', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.error).toBeUndefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should execute code with variable declarations', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'const x = 10; const y = 20; return x + y;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(30);
    });

    test('should execute code with string return', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return "Hello, World!";',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('Hello, World!');
    });

    test('should execute code with object return', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return { name: "Alice", age: 30 };',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toEqual({ name: 'Alice', age: 30 });
    });

    test('should execute code with array return', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return [1, 2, 3, 4, 5];',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('execute() - Console Output Capture', () => {
    test('should capture console.log output in stdout', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("test message");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('test message\n');
      expect(result.stderr).toBeUndefined();
    });

    test('should capture console.error output in stderr', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.error("error message");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stderr).toBe('error message\n');
      expect(result.stdout).toBeUndefined();
    });

    test('should capture console.warn output in stderr', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.warn("warning message");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stderr).toBe('warning message\n');
    });

    test('should capture console.info output in stdout', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.info("info message");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('info message\n');
    });

    test('should capture console.debug output in stdout', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.debug("debug message");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('debug message\n');
    });

    test('should capture multiple console.log calls', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("line 1"); console.log("line 2"); console.log("line 3");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('line 1\nline 2\nline 3\n');
    });

    test('should capture mixed stdout and stderr', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("stdout"); console.error("stderr"); console.log("more stdout");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('stdout\nmore stdout\n');
      expect(result.stderr).toBe('stderr\n');
    });

    test('should handle console.log with multiple arguments', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("hello", "world", 123);',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('hello world 123\n');
    });

    test('should not capture output when captureOutput is false', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("test"); return 42;',
        timeout: 5000,
        captureOutput: false,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.stdout).toBeUndefined();
      expect(result.stderr).toBeUndefined();
    });
  });

  describe('execute() - Error Handling', () => {
    test('should handle syntax errors gracefully', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return {invalid syntax here',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unexpected');
    });

    test('should handle runtime errors with stack traces', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'throw new Error("Runtime error occurred");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Runtime error occurred');
      expect(result.stackTrace).toBeDefined();
      expect(result.stackTrace).toContain('Error: Runtime error occurred');
    });

    test('should handle reference errors', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return undefinedVariable;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('undefinedVariable');
    });

    test('should handle type errors', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'const x = null; return x.property;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should capture output before error occurs', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("before error"); throw new Error("test error");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('test error');
      expect(result.stdout).toBe('before error\n');
    });
  });

  describe('execute() - Timeout Enforcement', () => {
    test('should enforce timeout with infinite loop', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'while(true) {}',
        timeout: 100, // Short timeout
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timed out');
      expect(result.error).toContain('100ms');
    }, 10000); // Test timeout longer than execution timeout

    test('should enforce timeout with long-running computation', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'let sum = 0; for(let i = 0; i < 1000000000; i++) { sum += i; }',
        timeout: 50,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 10000);

    test('should complete before timeout with fast code', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.executionTime).toBeLessThan(1000);
    });

    test('should capture output before timeout', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'console.log("start"); while(true) {}',
        timeout: 100,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.stdout).toBe('start\n');
    }, 10000);
  });

  describe('execute() - Execution Time Measurement', () => {
    test('should measure execution time', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(1000);
    });

    test('should measure execution time even on error', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'throw new Error("test");',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('execute() - Language Validation', () => {
    test('should reject non-JavaScript/TypeScript languages', async () => {
      const result = await executor.execute({
        language: 'python' as any,
        code: 'print("hello")',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('VM executor only supports JavaScript');
      expect(result.error).toContain('python');
    });

    test('should reject ruby language', async () => {
      const result = await executor.execute({
        language: 'ruby' as any,
        code: 'puts "hello"',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('VM executor only supports JavaScript');
    });

    test('should reject bash language', async () => {
      const result = await executor.execute({
        language: 'bash' as any,
        code: 'echo hello',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('VM executor only supports JavaScript');
    });

    test('should reject TypeScript without runtime', async () => {
      const result = await executor.execute({
        language: 'typescript',
        code: 'const x: number = 42; return x;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TypeScript execution requires a runtime');
    });
  });

  describe('execute() - State Isolation', () => {
    test('should isolate state between executions', async () => {
      // First execution sets a variable
      const result1 = await executor.execute({
        language: 'javascript',
        code: 'const x = 42; return x;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result1.success).toBe(true);
      expect(result1.returnValue).toBe(42);

      // Second execution should not have access to x
      const result2 = await executor.execute({
        language: 'javascript',
        code: 'return typeof x;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result2.success).toBe(true);
      expect(result2.returnValue).toBe('undefined');
    });

    test('should not share console state between executions', async () => {
      // First execution
      await executor.execute({
        language: 'javascript',
        code: 'console.log("first");',
        timeout: 5000,
        captureOutput: true,
      });

      // Second execution should have clean stdout
      const result2 = await executor.execute({
        language: 'javascript',
        code: 'console.log("second"); return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result2.stdout).toBe('second\n');
      expect(result2.stdout).not.toContain('first');
    });
  });

  describe('execute() - Code Wrapping', () => {
    test('should allow return statements in code', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
    });

    test('should handle code without return statement', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'const x = 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBeUndefined();
    });

    test('should handle early returns', async () => {
      const result = await executor.execute({
        language: 'javascript',
        code: 'if (true) return "early"; return "late";',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('early');
    });
  });

  describe('cleanup()', () => {
    test('should cleanup resources without error', async () => {
      await expect(executor.cleanup()).resolves.toBeUndefined();
    });

    test('should allow execution after cleanup', async () => {
      await executor.cleanup();

      const result = await executor.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
        captureOutput: true,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
    });
  });

  describe('Constructor Configuration', () => {
    test('should use config timeout by default', async () => {
      const shortExecutor = new VmExecutor({ timeout: 100, captureOutput: true });

      const result = await shortExecutor.execute({
        language: 'javascript',
        code: 'while(true) {}',
        timeout: 100,
        captureOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 10000);

    test('should use config captureOutput setting', async () => {
      const noOutputExecutor = new VmExecutor({ timeout: 5000, captureOutput: false });

      const result = await noOutputExecutor.execute({
        language: 'javascript',
        code: 'console.log("test"); return 42;',
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.stdout).toBeUndefined();
    });
  });

  describe('Runtime Integration (Layer 2.2)', () => {
    test('executes TypeScript code with runtime', async () => {
      const runtime = new TypeScriptRuntime({ language: 'typescript' });
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'const x: number = 42; return x * 2;',
        timeout: 5000,
        context: {},
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(84);
    });

    test('uses runtime to prepare code', async () => {
      const runtime = new TypeScriptRuntime({ language: 'typescript' });
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'interface User { name: string } const u: User = { name: "Alice" }; return u.name;',
        timeout: 5000,
        context: {},
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('Alice');
    });

    test('merges runtime sandbox with console', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('test_tool', {
        definition: {
          name: 'test_tool',
          description: 'Test tool',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: 'tool result' }] }),
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'console.log("test"); const x = await testTool({}); return x;',
        timeout: 5000,
        captureOutput: true,
        context: {},
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('tool result');
      expect(result.stdout).toBe('test\n');
    });

    test('handles runtime compilation errors', async () => {
      const runtime = new TypeScriptRuntime({ language: 'typescript' });
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'const x = ;', // Syntax error
        timeout: 5000,
        context: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('compilation failed');
    });

    test('passes context to runtime', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('context_tool', {
        definition: {
          name: 'context_tool',
          description: 'Uses context',
          parameters: z.object({}),
          execute: async (_params: any, context: any) => ({
            content: [{ type: 'text', text: `session: ${context.sessionId}` }],
          }),
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'const x = await contextTool({}); return x;',
        timeout: 5000,
        context: { sessionId: 'test-123' },
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('session: test-123');
    });

    test('falls back to Layer 1 for JavaScript without runtime', async () => {
      const executorNoRuntime = new VmExecutor({ timeout: 5000 });

      const result = await executorNoRuntime.execute({
        language: 'javascript',
        code: 'return 42;',
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
    });

    test('does not inject tools when no context provided', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('test_tool', {
        definition: {
          name: 'test_tool',
          description: 'Test',
          parameters: z.object({}),
          execute: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
      const executor = new VmExecutor({ timeout: 5000, runtime });

      // No context provided
      const result = await executor.execute({
        language: 'typescript',
        code: 'return typeof testTool;', // Should be undefined
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe('undefined');
    });

    test('handles tool execution errors', async () => {
      const tools = new Map<string, InternalTool>();
      tools.set('error_tool', {
        definition: {
          name: 'error_tool',
          description: 'Throws error',
          parameters: z.object({}),
          execute: async () => {
            throw new Error('Tool failed');
          },
        },
        jsonSchema: { type: 'object', properties: {} },
      });

      const runtime = new TypeScriptRuntime({ language: 'typescript' }, tools);
      const executor = new VmExecutor({ timeout: 5000, runtime });

      const result = await executor.execute({
        language: 'typescript',
        code: 'const x = await errorTool({}); return x;',
        timeout: 5000,
        context: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tool 'error_tool' failed");
    });
  });
});
