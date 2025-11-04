/**
 * Phase 1 Type System Validation Tests
 *
 * Validates:
 * 1. Helper type inference (ToolHelper, PromptHelper, ResourceHelper)
 * 2. IParam type field requirement
 * 3. InferParams and InferParamType utilities
 * 4. Backward compatibility with existing patterns
 */

import type {
  IParam,
  ITool,
  IPrompt,
  IResource,
  ToolHelper,
  PromptHelper,
  ResourceHelper,
  InferParams
} from '../../src/index.js';

// ============================================================================
// Test 1: IParam type field is required
// ============================================================================

interface TestParam extends IParam {
  type: 'string'; // ✅ This should be required
  description: 'Test parameter';
}

// This should fail compilation if uncommented (type field is required):
// interface BrokenParam extends IParam {
//   description: 'Missing type field'; // ❌ Should error - type field is required
// }

// ============================================================================
// Test 2: ToolHelper infers params correctly
// ============================================================================

interface AddTool extends ITool {
  name: 'add';
  description: 'Add numbers';
  params: {
    a: { type: 'number'; description: 'First'; required: true };
    b: { type: 'number'; description: 'Second'; required: true };
    round: { type: 'boolean'; description: 'Round'; required: false };
  };
  result: { sum: number };
}

const add: ToolHelper<AddTool> = async (params) => {
  // TypeScript should infer:
  // params.a: number (required)
  // params.b: number (required)
  // params.round?: boolean (optional)
  const sum = params.a + params.b;
  return { sum: params.round ? Math.round(sum) : sum };
};

// Test with context parameter
const addWithContext: ToolHelper<AddTool> = async (params, context) => {
  context?.logger?.info(`Adding ${params.a} + ${params.b}`);
  const sum = params.a + params.b;
  return { sum: params.round ? Math.round(sum) : sum };
};

// ============================================================================
// Test 3: PromptHelper infers args correctly
// ============================================================================

interface GreetPrompt extends IPrompt {
  name: 'greet';
  description: 'Greet user';
  args: {
    name: { description: 'Name'; required: true };
    formal: { description: 'Formal'; type: 'boolean'; required: false };
  };
}

const greet: PromptHelper<GreetPrompt> = (args) => {
  // TypeScript should infer:
  // args.name: string (required)
  // args.formal?: boolean (optional)
  const style = args.formal ? 'Good day' : 'Hello';
  return `${style}, ${args.name}!`;
};

// Test async version
const greetAsync: PromptHelper<GreetPrompt> = async (args) => {
  const style = args.formal ? 'Good day' : 'Hello';
  return `${style}, ${args.name}!`;
};

// Test with PromptMessage[] return
const greetMessages: PromptHelper<GreetPrompt> = (args) => {
  return [
    { role: 'user', content: { type: 'text', text: `Greet ${args.name}` } }
  ];
};

// ============================================================================
// Test 4: ResourceHelper works
// ============================================================================

interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Stats';
  description: 'Server stats';
  mimeType: 'application/json';
  result: { uptime: number };
}

const stats: ResourceHelper<StatsResource> = async () => ({
  uptime: Date.now() / 1000 // Simulated uptime
});

// Test sync version
const statsSync: ResourceHelper<StatsResource> = () => ({
  uptime: Date.now() / 1000 // Simulated uptime
});

// ============================================================================
// Test 5: InferParams utility type
// ============================================================================

type AddParams = InferParams<AddTool>;
// Should be: { a: number; b: number; round?: boolean }

// Verify the inferred type matches expected structure
const testParams: AddParams = {
  a: 1,
  b: 2,
  round: true
};

const testParamsWithoutOptional: AddParams = {
  a: 1,
  b: 2
  // round is optional, can be omitted
};

// This should fail if uncommented (missing required param):
// const brokenParams: AddParams = {
//   a: 1
//   // ❌ Missing required param 'b'
// };

// ============================================================================
// Test 6: Complex nested types
// ============================================================================

interface ComplexTool extends ITool {
  name: 'complex';
  description: 'Complex nested types';
  params: {
    user: {
      type: 'object';
      description: 'User object';
      properties: {
        name: { type: 'string'; description: 'Name' };
        age: { type: 'number'; description: 'Age' };
      };
    };
    tags: {
      type: 'array';
      description: 'Tags';
      items: { type: 'string'; description: 'Tag' };
    };
    metadata: {
      type: 'object';
      description: 'Metadata';
      properties: {
        version: { type: 'string'; description: 'Version' };
        active: { type: 'boolean'; description: 'Active' };
      };
      required: false;
    };
  };
  result: { success: boolean };
}

const complex: ToolHelper<ComplexTool> = async (params) => {
  // TypeScript should infer:
  // params.user: { name: string; age: number }
  // params.tags: string[]
  // params.metadata?: { version: string; active: boolean }

  console.log(params.user.name, params.user.age);
  console.log(params.tags.length);
  console.log(params.metadata?.version);

  return { success: true };
};

// ============================================================================
// Test 7: Enum type inference
// ============================================================================

interface EnumPrompt extends IPrompt {
  name: 'enum_test';
  description: 'Test enum inference';
  args: {
    style: { description: 'Style'; enum: readonly ['formal', 'casual'] };
    name: { description: 'Name' };
  };
}

const enumPrompt: PromptHelper<EnumPrompt> = (args) => {
  // args.style should be 'formal' | 'casual'
  const greeting = args.style === 'formal' ? 'Good day' : 'Hey';
  return `${greeting}, ${args.name}`;
};

// ============================================================================
// Test 8: Backward compatibility - class-based pattern
// ============================================================================

interface MyServer {
  name: 'test-server';
  version: '1.0.0';
}

class TestServer implements MyServer {
  name = 'test-server' as const;
  version = '1.0.0' as const;

  // Classic class method approach
  // Note: Methods implement the callable signature, not the full interface
  add = async (params: { a: number; b: number; round?: boolean }) => {
    return { sum: params.a + params.b };
  };

  greet = (args: { name: string; formal?: boolean }) => {
    return `Hello, ${args.name}!`;
  };
}

// ============================================================================
// SUCCESS: All tests passed if this file compiles without errors
// ============================================================================

console.log('✅ Phase 1 type validation tests passed');

export {
  add,
  greet,
  stats,
  complex,
  enumPrompt,
  TestServer
};
