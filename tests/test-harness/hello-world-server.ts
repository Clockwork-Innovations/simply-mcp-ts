/**
 * Hello World MCP Server
 *
 * A basic MCP server created following the simply-mcp-builder.ts guide.
 * Demonstrates:
 * - One tool (greet)
 * - One prompt (greeting_prompt)
 * - One resource (info)
 *
 * Built using the interface-driven API pattern.
 */

import type { ITool, IParam, IPrompt, IResource, IServer } from 'simply-mcp';

// =============================================================================
// PARAMETER INTERFACES
// =============================================================================

/**
 * Name parameter with validation
 */
interface NameParam extends IParam {
  type: 'string';
  description: 'Person\'s name to greet';
  minLength: 1;
  maxLength: 100;
}

// =============================================================================
// TOOL INTERFACE
// =============================================================================

/**
 * Greet tool - takes a name and returns a greeting
 */
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: {
    name: NameParam;
  };
  result: string;
}

// =============================================================================
// PROMPT INTERFACE
// =============================================================================

/**
 * Greeting prompt - generates a prompt for creating personalized greetings
 * This is a static prompt with template interpolation
 */
interface GreetingPrompt extends IPrompt {
  name: 'greeting_prompt';
  description: 'Generate a prompt for creating a personalized greeting';
  args: {
    /** Person's name for the greeting */
    name: string;
  };
  template: `Create a warm, personalized greeting for {name}. Make it friendly and welcoming.`;
}

// =============================================================================
// RESOURCE INTERFACE
// =============================================================================

/**
 * Info resource - static information about this Hello World server
 * Uses 'value' property for static data (no implementation needed)
 */
interface InfoResource extends IResource {
  uri: 'info://hello-world';
  name: 'Hello World Server Info';
  description: 'Static information about this Hello World MCP server';
  mimeType: 'application/json';
  value: {
    name: 'Hello World MCP Server';
    version: '1.0.0';
    description: 'A basic MCP server demonstrating tools, prompts, and resources';
    author: 'Created using simply-mcp-builder.ts guide';
  };
}

// =============================================================================
// SERVER INTERFACE
// =============================================================================

interface HelloWorldServer extends IServer {
  name: 'hello-world';
  version: '1.0.0';
  description: 'A simple Hello World MCP server for testing the builder guide';
}

// =============================================================================
// SERVER IMPLEMENTATION
// =============================================================================

/**
 * Hello World Server Implementation
 *
 * What needs implementation:
 * - Tools: greet (all tools require implementation)
 * - Static prompt: greeting_prompt (no implementation needed - template auto-interpolated)
 * - Static resource: info (no implementation needed - data extracted from interface)
 */
export default class HelloWorldServerImpl implements HelloWorldServer {
  /**
   * Greet tool implementation
   *
   * @param params - Contains the name to greet
   * @returns A greeting message
   */
  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };

  // ========================================================================
  // PROMPTS - NO IMPLEMENTATION NEEDED
  // ========================================================================
  // greeting_prompt is STATIC - template auto-interpolated by framework

  // ========================================================================
  // RESOURCES - NO IMPLEMENTATION NEEDED
  // ========================================================================
  // InfoResource is STATIC - data extracted from interface (uses 'value' property)
}
