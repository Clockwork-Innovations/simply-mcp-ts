/**
 * Comprehensive Type Coercion Test Fixture
 *
 * This fixture validates that all parameter type coercions work correctly
 * for various input formats from JSON-RPC.
 *
 * Tests:
 * - Number coercion: integers, decimals, strings, edge cases
 * - Boolean coercion: true/false, True/False, 1/0, strings
 * - Type safety: verify actual types received
 */

import type { IServer, ITool, IParam } from '../../src/index.js';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

interface TestServer extends IServer {
  name: 'test-coercion-comprehensive';
  description: 'Comprehensive test suite for parameter type coercion';
  version: '1.0.0';
}

// ============================================================================
// NUMBER COERCION TESTS
// ============================================================================

interface NumberParam extends IParam {
  type: 'number';
  description: 'Test number parameter';
}

interface NumberTestTool extends ITool {
  name: 'test_number';
  description: 'Test number coercion from various formats';
  params: { value: NumberParam };
  result: {
    received: any;
    type: string;
    isNumber: boolean;
    doubled: number;
  };
}

interface MathAParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface MathBParam extends IParam {
  type: 'number';
  description: 'Second number';
}

interface MathTool extends ITool {
  name: 'math_operation';
  description: 'Test arithmetic with coerced numbers';
  params: {
    a: MathAParam;
    b: MathBParam;
  };
  result: {
    sum: number;
    product: number;
    quotient: number;
    types: { a: string; b: string };
  };
}

// ============================================================================
// BOOLEAN COERCION TESTS
// ============================================================================

interface BooleanParam extends IParam {
  type: 'boolean';
  description: 'Test boolean parameter';
}

interface BooleanTestTool extends ITool {
  name: 'test_boolean';
  description: 'Test boolean coercion from various formats';
  params: { value: BooleanParam };
  result: {
    received: any;
    type: string;
    isBoolean: boolean;
    negated: boolean;
    asString: string;
  };
}

interface LogicAParam extends IParam {
  type: 'boolean';
  description: 'First boolean';
}

interface LogicBParam extends IParam {
  type: 'boolean';
  description: 'Second boolean';
}

interface LogicTool extends ITool {
  name: 'logic_operation';
  description: 'Test boolean logic with coerced values';
  params: {
    a: LogicAParam;
    b: LogicBParam;
  };
  result: {
    and: boolean;
    or: boolean;
    xor: boolean;
    types: { a: string; b: string };
  };
}

// ============================================================================
// MIXED TYPE TESTS
// ============================================================================

interface MixedCountParam extends IParam {
  type: 'number';
  description: 'Count value';
}

interface MixedEnabledParam extends IParam {
  type: 'boolean';
  description: 'Enabled flag';
}

interface MixedNameParam extends IParam {
  type: 'string';
  description: 'Name string';
}

interface MixedTestTool extends ITool {
  name: 'test_mixed';
  description: 'Test mixed number and boolean parameters';
  params: {
    count: MixedCountParam;
    enabled: MixedEnabledParam;
    name: MixedNameParam;
  };
  result: {
    summary: string;
    types: {
      count: string;
      enabled: string;
      name: string;
    };
    values: {
      count: any;
      enabled: any;
      name: any;
    };
  };
}

// ============================================================================
// VALIDATION TESTS
// ============================================================================

interface RangeValueParam extends IParam {
  type: 'number';
  description: 'Value between 0 and 100';
  min: 0;
  max: 100;
}

interface RangeTool extends ITool {
  name: 'test_range';
  description: 'Test number coercion with validation constraints';
  params: {
    value: RangeValueParam;
  };
  result: {
    value: number;
    valid: boolean;
    message: string;
  };
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export default class TestServer implements TestServer {

  // Number coercion test
  testNumber: NumberTestTool = async ({ value }) => {
    const valueType = typeof value;
    const isNumber = valueType === 'number' && !isNaN(value);

    return {
      received: value,
      type: valueType,
      isNumber,
      doubled: isNumber ? value * 2 : NaN,
    };
  };

  // Math operation test
  mathOperation: MathTool = async ({ a, b }) => {
    return {
      sum: a + b,
      product: a * b,
      quotient: b !== 0 ? a / b : NaN,
      types: {
        a: typeof a,
        b: typeof b,
      },
    };
  };

  // Boolean coercion test
  testBoolean: BooleanTestTool = async ({ value }) => {
    const valueType = typeof value;
    const isBoolean = valueType === 'boolean';

    return {
      received: value,
      type: valueType,
      isBoolean,
      negated: isBoolean ? !value : false,
      asString: String(value),
    };
  };

  // Logic operation test
  logicOperation: LogicTool = async ({ a, b }) => {
    return {
      and: a && b,
      or: a || b,
      xor: (a || b) && !(a && b),
      types: {
        a: typeof a,
        b: typeof b,
      },
    };
  };

  // Mixed types test
  testMixed: MixedTestTool = async ({ count, enabled, name }) => {
    const summary = enabled
      ? `${name}: ${count} items enabled`
      : `${name}: disabled`;

    return {
      summary,
      types: {
        count: typeof count,
        enabled: typeof enabled,
        name: typeof name,
      },
      values: {
        count,
        enabled,
        name,
      },
    };
  };

  // Range validation test
  testRange: RangeTool = async ({ value }) => {
    const valid = value >= 0 && value <= 100;

    return {
      value,
      valid,
      message: valid
        ? `Value ${value} is within range [0, 100]`
        : `Value ${value} is outside range [0, 100]`,
    };
  };
}
