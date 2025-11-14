import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';

describe('Type Coercion', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturePath = path.resolve(__dirname, '../fixtures/interface-type-coercion.ts');

  test('loads server with all coercion test tools', async () => {
    const server = await loadInterfaceServer({ filePath: fixturePath });
    const tools = await server.listTools();

    expect(tools).toBeDefined();
    expect(tools.length).toBe(6);

    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('test_number');
    expect(toolNames).toContain('math_operation');
    expect(toolNames).toContain('test_boolean');
    expect(toolNames).toContain('logic_operation');
    expect(toolNames).toContain('test_mixed');
    expect(toolNames).toContain('test_range');
  });

  describe('Number Coercion', () => {
    test('coerces string numbers to actual numbers', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      // Test with number value
      const result = await server.executeTool('test_number', { value: 42 });

      expect(result).toBeDefined();
      expect(result.type).toBe('number');
      expect(result.isNumber).toBe(true);
      expect(result.received).toBe(42);
      expect(result.doubled).toBe(84);
    });

    test('performs correct arithmetic with coerced numbers', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('math_operation', { a: 42, b: 58 });

      expect(result).toBeDefined();
      expect(result.types.a).toBe('number');
      expect(result.types.b).toBe('number');
      expect(result.sum).toBe(100);  // Not "4258" string concatenation
      expect(result.product).toBe(2436);
      expect(result.quotient).toBeCloseTo(0.724, 2);
    });

    test('coerces decimal numbers correctly', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('test_number', { value: 3.14159 });

      expect(result.type).toBe('number');
      expect(result.isNumber).toBe(true);
      expect(result.received).toBeCloseTo(3.14159, 5);
      expect(result.doubled).toBeCloseTo(6.28318, 5);
    });

    test('handles zero correctly', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('test_number', { value: 0 });

      expect(result.type).toBe('number');
      expect(result.isNumber).toBe(true);
      expect(result.received).toBe(0);
      expect(result.doubled).toBe(0);
    });

    test('handles negative numbers correctly', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('math_operation', { a: -10, b: 5 });

      expect(result.sum).toBe(-5);
      expect(result.product).toBe(-50);
      expect(result.quotient).toBe(-2);
    });

    test('validates number constraints', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const validResult = await server.executeTool('test_range', { value: 50 });
      expect(validResult.valid).toBe(true);
      expect(validResult.value).toBe(50);
      expect(validResult.message).toContain('within range');

      const invalidResult = await server.executeTool('test_range', { value: 150 });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.value).toBe(150);
      expect(invalidResult.message).toContain('outside range');
    });
  });

  describe('Boolean Coercion', () => {
    test('coerces boolean values correctly', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const trueResult = await server.executeTool('test_boolean', { value: true });
      expect(trueResult.type).toBe('boolean');
      expect(trueResult.isBoolean).toBe(true);
      expect(trueResult.received).toBe(true);
      expect(trueResult.negated).toBe(false);
      expect(trueResult.asString).toBe('true');

      const falseResult = await server.executeTool('test_boolean', { value: false });
      expect(falseResult.type).toBe('boolean');
      expect(falseResult.isBoolean).toBe(true);
      expect(falseResult.received).toBe(false);
      expect(falseResult.negated).toBe(true);
      expect(falseResult.asString).toBe('false');
    });

    test('performs correct boolean logic operations', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const trueTrue = await server.executeTool('logic_operation', { a: true, b: true });
      expect(trueTrue.types.a).toBe('boolean');
      expect(trueTrue.types.b).toBe('boolean');
      expect(trueTrue.and).toBe(true);
      expect(trueTrue.or).toBe(true);
      expect(trueTrue.xor).toBe(false);

      const trueFalse = await server.executeTool('logic_operation', { a: true, b: false });
      expect(trueFalse.and).toBe(false);
      expect(trueFalse.or).toBe(true);
      expect(trueFalse.xor).toBe(true);

      const falseFalse = await server.executeTool('logic_operation', { a: false, b: false });
      expect(falseFalse.and).toBe(false);
      expect(falseFalse.or).toBe(false);
      expect(falseFalse.xor).toBe(false);
    });
  });

  describe('Mixed Type Coercion', () => {
    test('handles mixed number, boolean, and string parameters', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('test_mixed', {
        count: 42,
        enabled: true,
        name: 'TestItem'
      });

      expect(result.types.count).toBe('number');
      expect(result.types.enabled).toBe('boolean');
      expect(result.types.name).toBe('string');

      expect(result.values.count).toBe(42);
      expect(result.values.enabled).toBe(true);
      expect(result.values.name).toBe('TestItem');

      expect(result.summary).toBe('TestItem: 42 items enabled');
    });

    test('handles disabled state correctly', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('test_mixed', {
        count: 100,
        enabled: false,
        name: 'DisabledItem'
      });

      expect(result.types.enabled).toBe('boolean');
      expect(result.values.enabled).toBe(false);
      expect(result.summary).toBe('DisabledItem: disabled');
    });
  });

  describe('Edge Cases', () => {
    test('handles large numbers', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('math_operation', {
        a: 999999,
        b: 1000001
      });

      expect(result.sum).toBe(2000000);
      expect(result.product).toBe(1000000999999);
    });

    test('handles division by zero', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('math_operation', { a: 10, b: 0 });

      expect(result.sum).toBe(10);
      expect(result.product).toBe(0);
      expect(result.quotient).toBe(NaN);
    });

    test('handles fractional arithmetic', async () => {
      const server = await loadInterfaceServer({ filePath: fixturePath });

      const result = await server.executeTool('math_operation', { a: 1, b: 3 });

      expect(result.quotient).toBeCloseTo(0.333, 2);
    });
  });
});
