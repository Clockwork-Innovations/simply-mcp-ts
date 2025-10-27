/**
 * Interface-Driven API - Minimal Example
 *
 * Demonstrates the cleanest, most TypeScript-native way to define an MCP server.
 * This example shows basic tool support with zero boilerplate.
 *
 * Key Features:
 * - Pure TypeScript interfaces (no decorators, no manual schemas)
 * - Full IntelliSense on parameters and return types
 * - Automatic Zod schema generation from TypeScript types
 * - Type-safe implementation with compile-time checking
 *
 * Usage:
 *   # Auto-detection (recommended)
 *   npx simply-mcp run examples/interface-minimal.ts
 *
 *   # Explicit interface command
 *   npx simplymcp-interface examples/interface-minimal.ts
 *
 *   # With HTTP transport
 *   npx simply-mcp run examples/interface-minimal.ts --http --port 3000
 *
 *   # Validate without running
 *   npx simply-mcp run examples/interface-minimal.ts --dry-run
 *
 * Learn More:
 *   See docs/guides/INTERFACE_API_REFERENCE.md for complete documentation
 */

import type { ITool, IServer } from 'simply-mcp';

/**
 * Greeting tool - demonstrates basic parameter and result types
 *
 * This interface defines:
 * - Tool name (snake_case in interface, camelCase in implementation)
 * - Human-readable description
 * - Parameter types (converted to Zod schema automatically)
 * - Return type (enforced at compile-time)
 *
 * Optional parameters use TypeScript's ? syntax.
 */
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: {
    /** Person's name to greet */
    name: string;
    /** Whether to use formal greeting (optional) */
    formal?: boolean;
  };
  result: string;
}

/**
 * Add two numbers tool - demonstrates complex result types
 *
 * Shows how to return structured data instead of primitives.
 * The result type is enforced at compile-time, ensuring type safety.
 */
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers together';
  params: {
    /** First number */
    a: number;
    /** Second number */
    b: number;
  };
  result: {
    /** Sum of a and b */
    sum: number;
    /** Human-readable equation string */
    equation: string;
  };
}

/**
 * Echo tool - demonstrates conditional logic based on optional parameters
 *
 * Shows how optional parameters can affect the output.
 * The uppercase parameter changes the behavior when present.
 */
interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo back a message';
  params: {
    /** Message to echo back */
    message: string;
    /** Convert to uppercase (optional) */
    uppercase?: boolean;
  };
  result: string;
}

/**
 * Server interface - defines server metadata
 *
 * This interface specifies:
 * - Server name (used for identification)
 * - Version (semantic versioning)
 * - Description (optional, for documentation)
 *
 * The implementation class must implement this interface.
 */
interface MinimalServer extends IServer {
  name: 'interface-minimal';
  version: '1.0.0';
  description: 'Minimal interface-driven MCP server demonstrating basic tools';
}

/**
 * Server implementation
 *
 * This class implements the MinimalServer interface and provides implementations
 * for all tools defined above.
 *
 * How it works:
 * 1. **Compile-time**: TypeScript checks that implementations match interfaces
 * 2. **Parse-time**: CLI parses interfaces via AST to extract metadata
 * 3. **Schema generation**: TypeScript types are converted to Zod schemas
 * 4. **Runtime**: MCP requests are validated against generated schemas
 *
 * Benefits:
 * - Full IntelliSense on params (try typing "params." in any method)
 * - Compile-time type checking (wrong types = compiler error)
 * - Zero schema boilerplate (schemas generated from TypeScript types)
 * - Runtime validation (invalid MCP requests are rejected)
 *
 * Method naming:
 * - Interface uses snake_case: 'greet', 'add', 'echo'
 * - Implementation uses camelCase: greet, add, echo
 * - Framework handles conversion automatically
 */
export default class MinimalServerImpl implements MinimalServer {
  /**
   * Greet tool implementation
   *
   * Demonstrates:
   * - Optional parameter handling (formal?)
   * - String result type
   * - Conditional logic based on parameters
   *
   * @param params - Validated parameters from MCP request
   * @returns Greeting string
   */
  greet: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };

  /**
   * Add tool implementation
   *
   * Demonstrates:
   * - Structured result type
   * - Number parameters
   * - Returning multiple values in an object
   *
   * @param params - Contains a and b numbers
   * @returns Object with sum and equation
   */
  add: AddTool = async (params) => {
    return {
      sum: params.a + params.b,
      equation: `${params.a} + ${params.b} = ${params.a + params.b}`,
    };
  };

  /**
   * Echo tool implementation
   *
   * Demonstrates:
   * - Optional parameter with conditional behavior
   * - String transformation
   * - Simple result type
   *
   * @param params - Contains message and optional uppercase flag
   * @returns Original or uppercase message
   */
  echo: EchoTool = async (params) => {
    return params.uppercase
      ? params.message.toUpperCase()
      : params.message;
  };
}
