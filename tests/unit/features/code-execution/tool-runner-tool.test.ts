/**
 * Unit Tests: Tool Runner Tool
 *
 * Tests the tool_runner tool creation and metadata.
 * Validates tool handler behavior, parameter validation, and error handling.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createToolRunnerTool, getToolRunnerToolMetadata } from '../../../../src/features/code-execution/tool-runner-tool.js';
import type { ICodeExecutionConfig } from '../../../../src/features/code-execution/types.js';
import type { ToolRunnerParams } from '../../../../src/features/code-execution/tool-runner-tool.js';

// Check if isolated-vm is available (tests default to isolated-vm mode)
let HAS_ISOLATED_VM = false;
try {
  require.resolve('isolated-vm');
  HAS_ISOLATED_VM = true;
} catch {
  HAS_ISOLATED_VM = false;
}

const describeIfIsolatedVm = HAS_ISOLATED_VM ? describe : describe.skip;

describeIfIsolatedVm('createToolRunnerTool', () => {
  describe('Tool Creation', () => {
    test('should create valid tool handler', () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };

      const handler = createToolRunnerTool(config);

      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    test('should validate config at creation time', () => {
      const config: ICodeExecutionConfig = {
        mode: 'invalid' as any,
        timeout: 5000,
      };

      expect(() => createToolRunnerTool(config)).toThrow('Invalid execution mode');
    });

    test('should reject invalid timeout at creation', () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: -1000,
      };

      expect(() => createToolRunnerTool(config)).toThrow('Invalid timeout');
    });
  });

  describe('Code Execution', () => {
    let handler: ReturnType<typeof createToolRunnerTool>;

    beforeEach(() => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
        allowedLanguages: ['javascript'],
      };
      handler = createToolRunnerTool(config);
    });

    test('should execute valid JavaScript code', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'return 42;',
      };

      const result = await handler(params);

      if (!result.success) {
        console.log('Test failed. Result:', JSON.stringify(result, null, 2));
      }
      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.error).toBeUndefined();
    });

    test('should capture console output', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'console.log("test output");',
      };

      const result = await handler(params);

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('test output\n');
    });

    test('should execute code with complex logic', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: `
          const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1);
          return factorial(5);
        `,
      };

      const result = await handler(params);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(120);
    });
  });

  describe('Language Validation', () => {
    test('should reject disallowed language', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
        allowedLanguages: ['javascript'],
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'python',
        code: 'print("hello")',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Language 'python' is not allowed");
      expect(result.error).toContain('Allowed languages: javascript');
    });

    test('should accept allowed language', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
        allowedLanguages: ['javascript'],
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'return 42;',
      };

      const result = await handler(params);

      expect(result.success).toBe(true);
    });

    test('should use default allowed languages when not specified', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'return 42;',
      };

      const result = await handler(params);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
    });
  });

  describe('Code Parameter Validation', () => {
    let handler: ReturnType<typeof createToolRunnerTool>;

    beforeEach(() => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      handler = createToolRunnerTool(config);
    });

    test('should reject missing code parameter', async () => {
      const params: any = {
        language: 'javascript',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Code parameter is required');
    });

    test('should reject empty code parameter', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: '',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Code parameter is required');
    });

    test('should reject non-string code parameter', async () => {
      const params: any = {
        language: 'javascript',
        code: 42,
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Code parameter is required and must be a string');
    });

    test('should reject null code parameter', async () => {
      const params: any = {
        language: 'javascript',
        code: null,
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Code parameter is required');
    });
  });

  describe('Timeout Configuration', () => {
    test('should use parameter timeout override', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'while(true) {}',
        timeout: 100, // Override with short timeout
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.error).toContain('100ms');
    }, 10000);

    test('should use config timeout when param not provided', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 100,
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'while(true) {}',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 10000);

    test('should use default timeout when neither provided', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
      };
      const handler = createToolRunnerTool(config);

      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'return 42;',
      };

      const result = await handler(params);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
    });
  });

  describe('Error Handling', () => {
    let handler: ReturnType<typeof createToolRunnerTool>;

    beforeEach(() => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      handler = createToolRunnerTool(config);
    });

    test('should handle executor errors gracefully', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'throw new Error("test error");',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('test error');
      expect(result.stackTrace).toBeDefined();
    });

    test('should handle syntax errors', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'return {invalid syntax',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should preserve execution time on error', async () => {
      const params: ToolRunnerParams = {
        language: 'javascript',
        code: 'throw new Error("test");',
      };

      const result = await handler(params);

      expect(result.success).toBe(false);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Lazy Executor Loading', () => {
    test('should lazy load executor on first call', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      const handler = createToolRunnerTool(config);

      // Handler created but executor not yet loaded
      expect(handler).toBeDefined();

      // First call should load executor and execute
      const result1 = await handler({
        language: 'javascript',
        code: 'return 42;',
      });

      expect(result1.success).toBe(true);
      expect(result1.returnValue).toBe(42);

      // Second call should reuse executor
      const result2 = await handler({
        language: 'javascript',
        code: 'return 100;',
      });

      expect(result2.success).toBe(true);
      expect(result2.returnValue).toBe(100);
    });

    test('should handle executor initialization failure', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm', // Supported but package likely not installed
        timeout: 5000,
      };

      // Creation succeeds (validation only checks mode is valid)
      const handler = createToolRunnerTool(config);

      // First call should fail during executor creation if package not installed
      const result = await handler({
        language: 'javascript',
        code: 'return 42;',
      });

      // Either succeeds (package installed) or fails with clear error
      if (!result.success) {
        expect(result.error).toContain('isolated-vm');
      } else {
        // Package is installed, execution succeeded
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Output Capture Configuration', () => {
    test('should capture output when enabled in config', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
        captureOutput: true,
      };
      const handler = createToolRunnerTool(config);

      const result = await handler({
        language: 'javascript',
        code: 'console.log("test");',
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('test\n');
    });

    test('should not capture output when disabled in config', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
        captureOutput: false,
      };
      const handler = createToolRunnerTool(config);

      const result = await handler({
        language: 'javascript',
        code: 'console.log("test"); return 42;',
      });

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(42);
      expect(result.stdout).toBeUndefined();
    });

    test('should capture output by default', async () => {
      const config: ICodeExecutionConfig = {
        mode: 'isolated-vm',
        timeout: 5000,
      };
      const handler = createToolRunnerTool(config);

      const result = await handler({
        language: 'javascript',
        code: 'console.log("default");',
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('default\n');
    });
  });
});

describe('getToolRunnerToolMetadata', () => {
  test('should return valid tool metadata', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('tool_runner');
    expect(metadata.description).toBeDefined();
    expect(metadata.annotations).toBeDefined();
  });

  test('should have correct tool name', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.name).toBe('tool_runner');
  });

  test('should have meaningful description', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.description).toContain('Execute TypeScript code');
    expect(metadata.description).toContain('isolated sandbox');
    expect(metadata.description).toContain('orchestrates multiple tool calls');
  });

  test('should have destructiveHint annotation', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.annotations?.destructiveHint).toBe(true);
  });

  test('should not require confirmation', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.annotations?.requiresConfirmation).toBe(false);
  });

  test('should have orchestration category', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.annotations?.category).toBe('orchestration');
  });

  test('should have fast estimated duration', () => {
    const metadata = getToolRunnerToolMetadata();

    expect(metadata.annotations?.estimatedDuration).toBe('fast');
  });

  test('should return same metadata on multiple calls', () => {
    const metadata1 = getToolRunnerToolMetadata();
    const metadata2 = getToolRunnerToolMetadata();

    expect(metadata1).toEqual(metadata2);
  });
});
