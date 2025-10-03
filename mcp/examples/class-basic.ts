/**
 * Class-Based MCP Server Example
 *
 * The cleanest way to define an MCP server - just a TypeScript class!
 *
 * Usage:
 *   npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts
 *   npx tsx mcp/class-adapter.ts mcp/examples/class-basic.ts --http --port 3000
 */

import { MCPServer, tool, prompt, resource } from 'simply-mcp';

/**
 * My Awesome Server
 * This is a simple example MCP server
 */
@MCPServer({ name: 'my-server', version: '1.0.0' })
export default class MyServer {
  /**
   * Greet a user by name
   */
  @tool('Greet a user with a personalized message')
  greet(name: string, formal?: boolean): string {
    const greeting = formal ? 'Good day' : 'Hello';
    return `${greeting}, ${name}! Welcome!`;
  }

  /**
   * Add two numbers together
   */
  @tool()
  add(a: number, b: number): string {
    return `${a} + ${b} = ${a + b}`;
  }

  /**
   * Calculate the area of a rectangle
   */
  @tool('Calculate rectangle area')
  calculateArea(width: number, height: number): number {
    return width * height;
  }

  /**
   * Echo a message back
   */
  @tool()
  echo(message: string, uppercase?: boolean): string {
    return uppercase ? message.toUpperCase() : message;
  }

  /**
   * Get current timestamp
   */
  @tool('Get the current ISO timestamp')
  getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create a user profile
   */
  @tool('Create a user profile with validation')
  createUser(username: string, email: string, age: number): object {
    return {
      id: Math.random().toString(36).substring(7),
      username,
      email,
      age,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Code review prompt generator
   */
  @prompt('Generate a code review prompt')
  codeReview(language: string, focus?: string): string {
    return `Review the following ${language} code.
${focus ? `Focus on: ${focus}` : 'Provide a general review.'}

Look for:
- Code quality
- Potential bugs
- Performance issues
- Best practices`;
  }

  /**
   * Server configuration resource
   */
  @resource('config://server', { mimeType: 'application/json' })
  serverConfig() {
    return {
      name: 'my-server',
      version: '1.0.0',
      features: ['tools', 'prompts', 'resources'],
      style: 'class-based with decorators',
    };
  }

  /**
   * Server documentation resource
   */
  @resource('doc://readme', { name: 'README', mimeType: 'text/plain' })
  readme() {
    return `# My Server

A simple MCP server using class-based decorators.

## Available Tools

- greet: Greet a user
- add: Add two numbers
- calculateArea: Calculate rectangle area
- echo: Echo a message
- getTimestamp: Get current timestamp
- createUser: Create a user profile

## Available Prompts

- codeReview: Generate code review prompt

Clean, simple, and powerful!`;
  }
}
