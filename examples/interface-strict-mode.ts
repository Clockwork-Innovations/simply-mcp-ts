/**
 * Interface-Driven API - TypeScript Strict Mode Example
 *
 * Demonstrates the ToolHandler<T> syntax for TypeScript strict mode compatibility.
 *
 * **When to use this example:**
 * - Your tsconfig.json has `strict: true`
 * - You get "missing properties" errors with direct assignment
 * - You need maximum compile-time type safety
 *
 * **Direct assignment doesn't work in strict mode:**
 * ```typescript
 * greet: GreetTool = async (params) => { ... }
 * // ❌ Error: Type '(params: any) => Promise<string>' is missing
 * //    properties from type 'GreetTool': description, params, result
 * ```
 *
 * **Solution: Use ToolHandler<T> utility type:**
 * ```typescript
 * greet: ToolHandler<GreetTool> = async (params) => { ... }
 * // ✅ Works perfectly in strict mode!
 * ```
 *
 * Key Features:
 * - ✅ Full TypeScript strict mode compliance
 * - ✅ Complete type safety at compile-time
 * - ✅ Full IntelliSense on parameters and return types
 * - ✅ Automatic Zod schema generation from TypeScript types
 * - ✅ Runtime validation via MCP protocol
 *
 * Usage:
 *   # Run with Simply MCP CLI
 *   npx simply-mcp run examples/interface-strict-mode.ts
 *
 *   # Validate types (with strict mode enabled)
 *   npx tsc --noEmit examples/interface-strict-mode.ts --strict
 *
 *   # Validate without running
 *   npx simply-mcp run examples/interface-strict-mode.ts --dry-run
 *
 *   **Note:** The ToolHandler<T> utility type works seamlessly with `simply-mcp run`
 *   for both TypeScript and compiled JavaScript, providing full type safety in
 *   strict mode without any multi-step compilation process.
 */

import type { ITool, IServer, ToolHandler } from 'simply-mcp';

/**
 * Greeting tool - basic example with optional parameter
 */
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name with optional formality';
  params: {
    /** Person's name to greet */
    name: string;
    /** Whether to use formal greeting (optional) */
    formal?: boolean;
  };
  result: string;
}

/**
 * Calculate tool - demonstrates complex parameter types
 */
interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Perform basic arithmetic operations';
  params: {
    /** Mathematical operation to perform */
    operation: 'add' | 'subtract' | 'multiply' | 'divide';
    /** First operand */
    a: number;
    /** Second operand */
    b: number;
  };
  result: {
    /** Result of the operation */
    result: number;
    /** Human-readable equation */
    equation: string;
  };
}

/**
 * Search tool - demonstrates array types and complex return values
 */
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search documents with filtering options';
  params: {
    /** Search query */
    query: string;
    /** Optional tags to filter by */
    tags?: string[];
    /** Maximum number of results */
    limit?: number;
  };
  result: {
    /** Matching documents */
    documents: Array<{
      id: string;
      title: string;
      score: number;
    }>;
    /** Total number of matches */
    total: number;
  };
}

/**
 * Server interface
 */
interface StrictModeServer extends IServer {
  name: 'interface-strict-mode';
  version: '1.0.0';
  description: 'Interface-driven server with TypeScript strict mode compliance';
}

/**
 * Server implementation using ToolHandler<T> for strict mode
 *
 * **Why ToolHandler<T> is needed in strict mode:**
 *
 * TypeScript's strict mode enforces structural typing, which means when you write:
 *   greet: GreetTool = async (params) => { ... }
 *
 * TypeScript expects the function to satisfy ALL properties of GreetTool interface
 * (name, description, params, result), not just the call signature.
 *
 * The ToolHandler<T> utility type extracts just the function signature:
 *   ToolHandler<GreetTool> = (params: { name: string; formal?: boolean }) => Promise<string>
 *
 * This satisfies strict mode while maintaining full type safety and IDE support.
 *
 * **Benefits:**
 * - ✅ Compiles in strict mode
 * - ✅ Full parameter type inference
 * - ✅ Full return type inference
 * - ✅ IDE autocomplete works perfectly
 * - ✅ Compile-time type errors for mismatches
 */
export default class StrictModeServerImpl {
  /**
   * Greet tool implementation
   *
   * Uses ToolHandler<GreetTool> to extract function type.
   * Params are fully typed, return type is inferred and validated.
   */
  greet: ToolHandler<GreetTool> = async (params) => {
    // params.name is string (typed)
    // params.formal is boolean | undefined (typed)
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };

  /**
   * Calculate tool implementation
   *
   * Demonstrates ToolHandler with complex params and structured return type.
   */
  calculate: ToolHandler<CalculateTool> = async (params) => {
    // params.operation is 'add' | 'subtract' | 'multiply' | 'divide'
    // params.a and params.b are numbers
    let result: number;

    switch (params.operation) {
      case 'add':
        result = params.a + params.b;
        break;
      case 'subtract':
        result = params.a - params.b;
        break;
      case 'multiply':
        result = params.a * params.b;
        break;
      case 'divide':
        result = params.a / params.b;
        break;
    }

    return {
      result,
      equation: `${params.a} ${params.operation} ${params.b} = ${result}`,
    };
  };

  /**
   * Search tool implementation
   *
   * Demonstrates ToolHandler with array types and optional params.
   * Shows how to handle optional parameters with default values.
   */
  search: ToolHandler<SearchTool> = async (params) => {
    // params.query is string (required)
    // params.tags is string[] | undefined (optional)
    // params.limit is number | undefined (optional)

    const limit = params.limit ?? 10; // Default to 10 if not provided
    const tags = params.tags ?? []; // Default to empty array

    // Simulate search results
    const mockDocuments = [
      { id: '1', title: 'TypeScript Guide', score: 0.95 },
      { id: '2', title: 'Strict Mode Best Practices', score: 0.87 },
      { id: '3', title: 'MCP Server Development', score: 0.82 },
    ].filter((_, i) => i < limit);

    return {
      documents: mockDocuments,
      total: mockDocuments.length,
    };
  };
}

/**
 * Comparison: ToolHandler vs Direct Assignment
 *
 * NON-STRICT MODE (strict: false):
 * ```typescript
 * class MyServer {
 *   // ✅ Direct assignment works
 *   greet: GreetTool = async (params) => { ... }
 *
 *   // ✅ ToolHandler also works
 *   greet: ToolHandler<GreetTool> = async (params) => { ... }
 * }
 * ```
 *
 * STRICT MODE (strict: true):
 * ```typescript
 * class MyServer {
 *   // ❌ Direct assignment fails
 *   greet: GreetTool = async (params) => { ... }
 *   // Error: Type '(params: any) => Promise<string>' is missing
 *   //        properties from type 'GreetTool': description, params, result
 *
 *   // ✅ ToolHandler works
 *   greet: ToolHandler<GreetTool> = async (params) => { ... }
 * }
 * ```
 *
 * **Recommendation:**
 * - If your project has `strict: true` → Use ToolHandler<T> (this example)
 * - If your project has `strict: false` → Use direct assignment (interface-minimal.ts)
 * - Both provide full type safety and IDE support
 */
