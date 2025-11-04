/**
 * Phase 1 Import Path Validation Test
 *
 * Verifies that all type exports are accessible through the main package entry point
 * and that the modular refactoring maintains backward compatibility.
 */

// ============================================================================
// Test: All exports still work from main package
// ============================================================================

import {
  // Core parameter and definition types
  IParam,
  ITool,
  IToolAnnotations,
  IPrompt,
  IPromptArgument,
  IResource,
  IServer,

  // Auth types
  IAuth,
  IApiKeyAuth,
  IOAuth2Auth,

  // Advanced feature types
  ISampling,
  IElicit,
  IRoots,
  ICompletion,
  ISubscription,
  IUI,

  // Helper types (Phase 1)
  ToolHelper,
  PromptHelper,
  ResourceHelper,
  InferParams,
  InferParamType,
  InferPromptArgs,

  // Utility types
  ToolParams,
  ToolResult,
  PromptArgs,
  ResourceData,
  InferArgType,
  InferArgs,

  // Message types
  PromptMessage,
  SimpleMessage,

  // Audio types
  IAudioContent,
  IAudioMetadata,
} from 'simply-mcp';

// ============================================================================
// Test: Type imports work correctly
// ============================================================================

// Test IParam
const testParam: IParam = {
  type: 'string',
  description: 'Test parameter',
  minLength: 1
};

// Test ITool
interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: {
    input: { type: 'string'; description: 'Input' };
  };
  result: string;
}

// Test IPrompt
interface TestPrompt extends IPrompt {
  name: 'test';
  description: 'Test prompt';
  args: {
    query: { description: 'Query' };
  };
}

// Test IResource
interface TestResource extends IResource {
  uri: 'test://resource';
  name: 'Test';
  description: 'Test resource';
  mimeType: 'application/json';
  result: { data: string };
}

// Test IServer
interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

// Test Helper types
const testToolHelper: ToolHelper<TestTool> = async (params) => {
  return params.input;
};

const testPromptHelper: PromptHelper<TestPrompt> = (args) => {
  return `Query: ${args.query}`;
};

const testResourceHelper: ResourceHelper<TestResource> = async () => {
  return { data: 'test' };
};

// Test InferParams
type TestParams = InferParams<TestTool>;
const testInferredParams: TestParams = {
  input: 'test'
};

// Test InferParamType
type TestStringType = InferParamType<{ type: 'string'; description: 'Test' }>;
const testString: TestStringType = 'test';

type TestNumberType = InferParamType<{ type: 'number'; description: 'Test' }>;
const testNumber: TestNumberType = 42;

type TestBooleanType = InferParamType<{ type: 'boolean'; description: 'Test' }>;
const testBoolean: TestBooleanType = true;

// Test InferPromptArgs
type TestPromptArgs = InferPromptArgs<TestPrompt>;
const testArgs: TestPromptArgs = {
  query: 'test query'
};

// Test PromptMessage
const testMessage: PromptMessage = {
  role: 'user',
  content: { type: 'text', text: 'test' }
};

// Test SimpleMessage
const testSimpleMessage: SimpleMessage = {
  user: 'Hello'
};

// Test IToolAnnotations
const testAnnotations: IToolAnnotations = {
  title: 'Test Tool',
  readOnlyHint: true,
  category: 'test'
};

// Test IAuth (commented out - IAuth is abstract/union type)
// interface TestAuth extends IAuth {
//   type: 'api-key';
//   apiKey: {
//     headerName: 'X-API-Key';
//     envVar: 'API_KEY';
//   };
// }

// Test ISampling
interface TestSampling extends ISampling {
  model: 'gpt-4';
  maxTokens: 1000;
}

// ============================================================================
// SUCCESS: All imports successful if this file compiles without errors
// ============================================================================

console.log('✅ All imports successful');
console.log('✅ Phase 1 modular refactoring maintains backward compatibility');

export {
  testParam,
  testToolHelper,
  testPromptHelper,
  testResourceHelper,
  testInferredParams,
  testMessage,
  testSimpleMessage
};
