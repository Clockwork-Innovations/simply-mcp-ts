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

import type { IServer, ITool, IParam, ToolHelper } from '../../src/index.js';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const server: IServer = {
  name: 'test-coercion-comprehensive',
  version: '1.0.0',
  description: 'Comprehensive test suite for parameter type coercion'
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
// TOOL IMPLEMENTATIONS
// ============================================================================

// Number coercion test
const testNumber: ToolHelper<NumberTestTool> = async (params) => {
  const valueType = typeof params.value;
  const isNumber = valueType === 'number' && !isNaN(params.value);

  return {
    received: params.value,
    type: valueType,
    isNumber,
    doubled: isNumber ? params.value * 2 : NaN,
  };
};

// Math operation test
const mathOperation: ToolHelper<MathTool> = async (params) => {
  return {
    sum: params.a + params.b,
    product: params.a * params.b,
    quotient: params.b !== 0 ? params.a / params.b : NaN,
    types: {
      a: typeof params.a,
      b: typeof params.b,
    },
  };
};

// Boolean coercion test
const testBoolean: ToolHelper<BooleanTestTool> = async (params) => {
  const valueType = typeof params.value;
  const isBoolean = valueType === 'boolean';

  return {
    received: params.value,
    type: valueType,
    isBoolean,
    negated: isBoolean ? !params.value : false,
    asString: String(params.value),
  };
};

// Logic operation test
const logicOperation: ToolHelper<LogicTool> = async (params) => {
  return {
    and: params.a && params.b,
    or: params.a || params.b,
    xor: (params.a || params.b) && !(params.a && params.b),
    types: {
      a: typeof params.a,
      b: typeof params.b,
    },
  };
};

// Mixed types test
const testMixed: ToolHelper<MixedTestTool> = async (params) => {
  const summary = params.enabled
    ? `${params.name}: ${params.count} items enabled`
    : `${params.name}: disabled`;

  return {
    summary,
    types: {
      count: typeof params.count,
      enabled: typeof params.enabled,
      name: typeof params.name,
    },
    values: {
      count: params.count,
      enabled: params.enabled,
      name: params.name,
    },
  };
};

// Range validation test
const testRange: ToolHelper<RangeTool> = async (params) => {
  const valid = params.value >= 0 && params.value <= 100;

  return {
    value: params.value,
    valid,
    message: valid
      ? `Value ${params.value} is within range [0, 100]`
      : `Value ${params.value} is outside range [0, 100]`,
  };
};

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

const server: CoercionTestServer = {
  name: 'test-coercion-comprehensive',
  description: 'Comprehensive test suite for parameter type coercion',
  version: '1.0.0',
  testNumber,
  mathOperation,
  testBoolean,
  logicOperation,
  testMixed,
  testRange
};

export default server;
