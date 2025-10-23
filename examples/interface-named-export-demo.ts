/**
 * Interface API - Named Export Demo
 *
 * This example demonstrates that you can use "export class" instead of "export default class".
 * This reduces boilerplate by eliminating the need for the "default" keyword.
 *
 * Both styles work:
 *   - export default class MyServer { ... }  // Traditional
 *   - export class MyServer { ... }          // Simplified (this example)
 *
 * Usage:
 *   npx simply-mcp run examples/interface-named-export-demo.ts
 */

import type { ITool, IServer } from 'simply-mcp';

// Define server metadata
interface DemoServer extends IServer {
  name: 'named-export-demo';
  version: '1.0.0';
  description: 'Demonstrates export class (without default)';
}

// Define a simple tool
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone by name';
  params: {
    name: string;
    enthusiastic?: boolean;
  };
  result: string;
}

// Implement the server using NAMED EXPORT (no "default" keyword!)
// This is detected automatically by the framework
export class DemoServer {
  greet = async (params: GreetTool['params']): Promise<GreetTool['result']> => {
    const greeting = params.enthusiastic ? 'Hello!!!' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };
}

// Benefits of named export:
// 1. Less boilerplate - no "default" keyword needed
// 2. Still fully type-safe
// 3. Auto-detected by the framework
// 4. Works exactly the same as export default
