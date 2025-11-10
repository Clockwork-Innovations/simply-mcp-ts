/**
 * Troubleshooting TypeScript Errors - Common Issues and Solutions
 *
 * This file demonstrates common TypeScript errors when using simply-mcp
 * and shows how to fix them using ToolHelper/PromptHelper/ResourceHelper.
 */

import type { ITool, IPrompt, IResource, IServer, ToolHelper, PromptHelper, ResourceHelper } from 'simply-mcp';

// ============================================================================
// Problem 1: "Type 'X' is not assignable to type 'Y'"
// ============================================================================

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: number;
}

// ❌ WRONG: This produces TypeScript error in strict mode
// error TS2322: Type '(params: any) => Promise<number>' is not assignable to type 'AddTool'
/*
const addWrong: AddTool = async (params) => {
  return params.a + params.b;
};
*/

// ✅ CORRECT: Use ToolHelper for automatic type inference
const add: ToolHelper<AddTool> = async (params) => {
  return params.a + params.b;  // params.a and params.b are typed as number
};

// ============================================================================
// Problem 2: "Property 'x' does not exist on type 'Y'"
// ============================================================================

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: {
    name: { type: 'string'; description: 'Name to greet' };
  };
  result: string;
}

// ❌ WRONG: Property 'name' may not be inferred
/*
const greetWrong: GreetTool = async (params) => {
  return `Hello, ${params.name}!`;  // ❌ Property 'name' does not exist
};
*/

// ✅ CORRECT: ToolHelper infers params.name from GreetTool['params']
const greet: ToolHelper<GreetTool> = async (params) => {
  return `Hello, ${params.name}!`;  // ✅ params.name is typed as string
};

// ============================================================================
// Problem 3: Implicit 'any' errors in strict mode
// ============================================================================

interface ProcessTool extends ITool {
  name: 'process';
  description: 'Process data';
  params: {
    data: { type: 'string'; description: 'Data to process' };
  };
  result: { status: string };
}

// ❌ WRONG: Parameter 'params' implicitly has an 'any' type
/*
const processWrong: ProcessTool = async (params) => {
  return { status: 'ok' };
};
*/

// ✅ CORRECT: ToolHelper provides full type inference
const process: ToolHelper<ProcessTool> = async (params) => {
  return { status: 'ok' };  // ✅ No implicit any!
};

// ============================================================================
// Problem 4: Complex nested parameter types
// ============================================================================

interface ComplexTool extends ITool {
  name: 'complex';
  description: 'Process complex nested data';
  params: {
    user: {
      type: 'object';
      properties: {
        name: { type: 'string'; description: 'User name' };
        tags: {
          type: 'array';
          items: { type: 'string' };
          description: 'User tags';
        };
      };
      description: 'User object';
    };
  };
  result: string;
}

// ❌ WRONG: Very hard to type manually
/*
const complexWrong: ComplexTool = async (params) => {
  // What's the type of params.user? params.user.tags?
  console.log(params.user.name);
  console.log(params.user.tags[0]);
  return 'processed';
};
*/

// ✅ CORRECT: ToolHelper handles nested types automatically
const complex: ToolHelper<ComplexTool> = async (params) => {
  // params.user is typed as { name: string; tags: string[] }
  console.log(params.user.name);     // ✅ string
  console.log(params.user.tags[0]);  // ✅ string
  return 'processed';
};

// ============================================================================
// Problem 5: Prompts with bare interface
// ============================================================================

interface GreetingPrompt extends IPrompt {
  name: 'greeting';
  description: 'Generate a greeting message';
  args: {
    name: { description: 'Person to greet' };
  };
}

// ❌ WRONG: Type error in strict mode
/*
const greetingWrong: GreetingPrompt = (args) => {
  return `Hello, ${args.name}!`;
};
*/

// ✅ CORRECT: Use PromptHelper
const greeting: PromptHelper<GreetingPrompt> = (args) => {
  return `Hello, ${args.name}!`;  // ✅ args.name is typed correctly
};

// ============================================================================
// Problem 6: Resources with bare interface
// ============================================================================

interface StatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Stats';
  description: 'User statistics';
  mimeType: 'application/json';
  returns: { count: number; active: number };
}

// ❌ WRONG: Type error in strict mode
/*
const statsWrong: StatsResource = async () => {
  return { count: 100, active: 50 };
};
*/

// ✅ CORRECT: Use ResourceHelper
const stats: ResourceHelper<StatsResource> = async () => {
  return { count: 100, active: 50 };  // ✅ Return type is validated
};

// ============================================================================
// Server Export
// ============================================================================

const server: IServer = {
  name: 'troubleshooting-server',
  version: '1.0.0',
  description: 'Examples of TypeScript error fixes'
};

export { server, add, greet, process, complex, greeting, stats };
