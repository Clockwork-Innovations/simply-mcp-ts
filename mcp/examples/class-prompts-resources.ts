/**
 * Example demonstrating @prompt and @resource decorators
 *
 * This example shows how to create a server with tools, prompts, and resources
 * using the Decorator API.
 *
 * Usage:
 *   npx tsx mcp/class-adapter.ts mcp/examples/class-prompts-resources.ts
 */

import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({
  name: 'example-prompts-resources',
  version: '1.0.0',
  description: 'Example server with tools, prompts, and resources'
})
export default class ExampleServer {
  /**
   * A simple calculator tool
   * @param a First number
   * @param b Second number
   * @param operation The operation to perform (add, subtract, multiply, divide)
   */
  @tool('Perform basic math operations')
  calculate(a: number, b: number, operation: 'add' | 'subtract' | 'multiply' | 'divide'): number {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Generate a personalized greeting prompt
   */
  @prompt('Generate a friendly greeting message')
  greetingPrompt(name: string, style?: string): string {
    const styleText = style ? ` in a ${style} style` : '';
    return `Generate a friendly greeting for ${name}${styleText}.`;
  }

  /**
   * Generate a code review prompt
   */
  @prompt('Generate a code review prompt with specific focus areas')
  codeReviewPrompt(language: string, focusAreas: string): string {
    return `Review the following ${language} code with focus on: ${focusAreas}. Provide specific feedback and suggestions.`;
  }

  /**
   * Generate a summary prompt
   */
  @prompt('Generate a summary prompt for text content')
  summarizePrompt(maxWords: number, style: string): string {
    return `Summarize the following content in ${maxWords} words or less, using a ${style} tone.`;
  }

  /**
   * Provide server status information
   */
  @resource('info://server/status', { mimeType: 'application/json' })
  serverStatus(): object {
    return {
      status: 'running',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Provide server configuration
   */
  @resource('info://server/config', { mimeType: 'application/json' })
  serverConfig(): object {
    return {
      name: 'example-prompts-resources',
      version: '1.0.0',
      transport: 'stdio',
      features: {
        tools: true,
        prompts: true,
        resources: true
      }
    };
  }

  /**
   * Provide help text
   */
  @resource('help://usage', { mimeType: 'text/plain' })
  helpText(): string {
    return `
Example MCP Server - Usage Guide

TOOLS:
  - calculate: Perform basic math operations (add, subtract, multiply, divide)

PROMPTS:
  - greetingPrompt: Generate a personalized greeting
  - codeReviewPrompt: Generate a code review prompt
  - summarizePrompt: Generate a summary prompt

RESOURCES:
  - info://server/status: Current server status and metrics
  - info://server/config: Server configuration
  - help://usage: This help text

Examples:
  1. Calculate: { a: 10, b: 5, operation: "add" }
  2. Greeting: { name: "Alice", style: "formal" }
  3. Code Review: { language: "TypeScript", focusAreas: "type safety, error handling" }
    `.trim();
  }
}
