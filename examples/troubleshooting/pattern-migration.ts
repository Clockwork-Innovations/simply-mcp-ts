/**
 * Pattern Migration Guide - Bare Interface → ToolHelper
 *
 * This file shows how to migrate from bare interface pattern to ToolHelper pattern
 * when you encounter TypeScript errors or want better type safety.
 */

import type { ITool, IPrompt, IResource, IServer, ToolHelper, PromptHelper, ResourceHelper } from 'simply-mcp';

// ============================================================================
// BEFORE: Bare Interface Pattern
// ============================================================================

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Perform calculation';
  params: {
    operation: { type: 'string'; enum: ['add', 'subtract', 'multiply', 'divide'] as const; description: 'Operation' };
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: number;
}

// Before: Bare interface (works with strict: false)
// const calculate: CalculateTool = async (params) => {
//   switch (params.operation) {
//     case 'add': return params.a + params.b;
//     case 'subtract': return params.a - params.b;
//     case 'multiply': return params.a * params.b;
//     case 'divide': return params.a / params.b;
//     default: throw new Error('Invalid operation');
//   }
// };

// ============================================================================
// AFTER: ToolHelper Pattern
// ============================================================================

// After: Use ToolHelper for full type safety
const calculate: ToolHelper<CalculateTool> = async (params) => {
  // ✅ params.operation is typed as 'add' | 'subtract' | 'multiply' | 'divide'
  // ✅ params.a and params.b are typed as number
  switch (params.operation) {
    case 'add': return params.a + params.b;
    case 'subtract': return params.a - params.b;
    case 'multiply': return params.a * params.b;
    case 'divide': return params.a / params.b;
    default: throw new Error('Invalid operation');
  }
};

// ============================================================================
// Migration with Optional Parameters
// ============================================================================

interface FormatTool extends ITool {
  name: 'format';
  description: 'Format text';
  params: {
    text: { type: 'string'; description: 'Text to format' };
    uppercase: { type: 'boolean'; description: 'Convert to uppercase'; required: false };
    trim: { type: 'boolean'; description: 'Trim whitespace'; required: false };
  };
  result: string;
}

// Before: Manual optional parameter handling
// const format: FormatTool = async (params) => {
//   let result = params.text;
//   if (params.uppercase) result = result.toUpperCase();
//   if (params.trim) result = result.trim();
//   return result;
// };

// After: ToolHelper handles optional parameters automatically
const format: ToolHelper<FormatTool> = async (params) => {
  let result = params.text;
  // ✅ params.uppercase and params.trim are typed as boolean | undefined
  if (params.uppercase) result = result.toUpperCase();
  if (params.trim) result = result.trim();
  return result;
};

// ============================================================================
// Migration with Context
// ============================================================================

interface ProcessFileTool extends ITool {
  name: 'process_file';
  description: 'Process a file with progress reporting';
  params: {
    filename: { type: 'string'; description: 'File to process' };
  };
  result: { success: boolean; lines: number };
}

// Before: Context not strongly typed
// const processFile: ProcessFileTool = async (params, context) => {
//   // context parameter may not be well-typed
//   await context?.reportProgress?.(0, 100, 'Starting...');
//   // ... processing
//   return { success: true, lines: 100 };
// };

// After: ToolHelper provides strong context typing
const processFile: ToolHelper<ProcessFileTool> = async (params, context) => {
  // ✅ context is typed as HandlerContext
  await context?.reportProgress?.(0, 100, 'Starting...');
  // ... processing
  return { success: true, lines: 100 };
};

// ============================================================================
// Migration: Prompts
// ============================================================================

interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate code review prompt';
  args: {
    language: { description: 'Programming language'; type: 'string' };
    complexity: { description: 'Code complexity level'; enum: ['simple', 'medium', 'complex'] as const };
  };
}

// Before: Bare interface
// const codeReview: CodeReviewPrompt = (args) => {
//   return `Review this ${args.language} code (${args.complexity} complexity)`;
// };

// After: Use PromptHelper
const codeReview: PromptHelper<CodeReviewPrompt> = (args) => {
  // ✅ args.language is typed as string
  // ✅ args.complexity is typed as 'simple' | 'medium' | 'complex'
  return `Review this ${args.language} code (${args.complexity} complexity)`;
};

// ============================================================================
// Migration: Resources
// ============================================================================

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Config';
  description: 'Runtime application configuration';
  mimeType: 'application/json';
  returns: {
    version: string;
    env: 'development' | 'production';
    features: string[];
  };
}

// Before: Bare interface
// const appConfig: ConfigResource = async () => {
//   return {
//     version: '1.0.0',
//     env: 'production',
//     features: ['feature1', 'feature2']
//   };
// };

// After: Use ResourceHelper
const appConfig: ResourceHelper<ConfigResource> = async () => {
  // ✅ Return type is validated against ConfigResource['returns']
  return {
    version: '1.0.0',
    env: 'production',
    features: ['feature1', 'feature2']
  };
};

// ============================================================================
// Migration Checklist
// ============================================================================

/**
 * Migration Checklist:
 *
 * 1. Import helper types:
 *    ```typescript
 *    import type { ToolHelper, PromptHelper, ResourceHelper } from 'simply-mcp';
 *    ```
 *
 * 2. Change type annotation:
 *    - Before: `const myTool: MyToolInterface = async (params) => { ... }`
 *    - After:  `const myTool: ToolHelper<MyToolInterface> = async (params) => { ... }`
 *
 * 3. Remove any manual type annotations on params:
 *    - Before: `const myTool = async (params: { name: string }) => { ... }`
 *    - After:  `const myTool: ToolHelper<MyTool> = async (params) => { ... }`
 *                                                                  ^^^^ No type needed!
 *
 * 4. Verify IntelliSense:
 *    - Hover over `params` - should show inferred types
 *    - Test autocomplete on params properties
 *
 * 5. Run TypeScript compiler:
 *    ```bash
 *    npx tsc --noEmit
 *    ```
 *
 * 6. Benefits after migration:
 *    ✅ Full type inference
 *    ✅ Works with strict: true
 *    ✅ Better IDE autocomplete
 *    ✅ Catch errors at compile time
 *    ✅ No implicit any errors
 */

// ============================================================================
// Server Export
// ============================================================================

const server: IServer = {
  name: 'pattern-migration-server',
  version: '1.0.0',
  description: 'Demonstrates pattern migration from bare interface to helper types'
};

export { server, calculate, format, processFile, codeReview, appConfig };
