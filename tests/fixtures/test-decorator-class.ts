/**
 * Test fixture class for decorator API tests
 * Tests @tool, @prompt, and @resource decorators with various edge cases
 */

import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({
  name: 'test-decorator-server',
  version: '1.0.0',
  description: 'Test server for decorator API validation'
})
export default class TestDecoratorServer {
  /**
   * A simple calculator tool for testing
   * @param a First number
   * @param b Second number
   * @param operation The operation to perform (add, subtract, multiply, divide)
   */
  @tool('Perform basic math operations')
  calculate(a: number, b: number, operation: 'add' | 'subtract' | 'multiply' | 'divide'): number {
    switch (operation) {
      case 'add':
        return a + b;
      case 'subtract':
        return a - b;
      case 'multiply':
        return a * b;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Greet a user with optional formality
   * @param name The name of the user to greet
   * @param formal Whether to use formal greeting (optional)
   */
  @tool('Greet a user with optional formality')
  greetUser(name: string, formal?: boolean): string {
    if (formal) {
      return `Good day, ${name}. How may I assist you?`;
    }
    return `Hey ${name}! How's it going?`;
  }

  /**
   * Echo a message back
   * @param message The message to echo
   */
  @tool('Echo a message back to the caller')
  echoMessage(message: string): string {
    return `Echo: ${message}`;
  }

  /**
   * Test complex parameter types
   * @param count A numeric count
   * @param message A message string
   * @param options Optional configuration object
   */
  @tool('Test tool with complex parameter types')
  complexParams(
    count: number,
    message: string,
    options?: { flag?: boolean; data?: string }
  ): object {
    return {
      count,
      message,
      options: options || {},
      timestamp: new Date().toISOString(),
    };
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
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Provide server configuration
   */
  @resource('info://server/config', { mimeType: 'application/json' })
  serverConfig(): object {
    return {
      name: 'test-decorator-server',
      version: '1.0.0',
      transport: 'stdio',
      features: {
        tools: true,
        prompts: true,
        resources: true,
      },
    };
  }

  /**
   * Provide help text
   */
  @resource('help://usage', { mimeType: 'text/plain' })
  helpText(): string {
    return `
Test Decorator Server - Usage Guide

TOOLS:
  - calculate: Perform basic math operations (add, subtract, multiply, divide)
  - greet-user: Greet a user with optional formality
  - echo-message: Echo a message back
  - complex-params: Test complex parameter types

PROMPTS:
  - greetingPrompt: Generate a personalized greeting
  - codeReviewPrompt: Generate a code review prompt
  - summarizePrompt: Generate a summary prompt

RESOURCES:
  - info://server/status: Current server status and metrics
  - info://server/config: Server configuration
  - help://usage: This help text

This server is used for testing the decorator API (@tool, @prompt, @resource).
    `.trim();
  }
}
