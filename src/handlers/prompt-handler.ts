/**
 * Prompt Handler
 *
 * Handles prompt registration with the MCP server.
 * All prompts now require implementation (no static templates).
 */

import type { ParsedPrompt } from '../server/parser.js';
import type { BuildMCPServer } from '../server/builder-server.js';

/**
 * Register a prompt with the MCP server
 * All prompts require a method implementation on the server class
 */
export function registerPrompt(
  server: BuildMCPServer,
  serverInstance: any,
  prompt: ParsedPrompt
): void {
  const { name, description, methodName, argsMetadata } = prompt;

  // Check if method exists on server instance
  const method = serverInstance[methodName];

  if (!method) {
    throw new Error(
      `Prompt "${name}" requires method "${methodName}" but it was not found on server class.\n` +
      `Expected: class implements { ${methodName}: ${prompt.interfaceName} }`
    );
  }

  if (typeof method !== 'function') {
    throw new Error(
      `Prompt "${name}" method "${methodName}" is not a function (found: ${typeof method})`
    );
  }

  // Validate and process argument metadata if present
  if (argsMetadata) {
    for (const [argName, metadata] of Object.entries(argsMetadata)) {
      // Validate type field if present
      if (metadata.type && !['string', 'number', 'boolean'].includes(metadata.type)) {
        console.warn(
          `Prompt '${name}': Argument '${argName}' has invalid type '${metadata.type}'. ` +
          `Valid types: 'string' | 'number' | 'boolean'. Defaulting to 'string'.`
        );
      }

      // Validate enum field if present
      if (metadata.enum && (!Array.isArray(metadata.enum) || metadata.enum.length === 0)) {
        console.warn(
          `Prompt '${name}': Argument '${argName}' has invalid enum definition. ` +
          `Expected non-empty array of strings. Enum validation will be skipped.`
        );
      }
    }
  }

  // Build MCP-compliant argument definitions with defaults applied
  let promptArgs: Array<{ name: string; description: string; required: boolean }> = [];

  if (argsMetadata) {
    promptArgs = Object.entries(argsMetadata).map(([argName, metadata]) => ({
      name: argName,
      description: metadata.description || `Argument: ${argName}`,
      required: metadata.required ?? true,  // Apply default: true
    }));
  }

  // Register the prompt with a function template
  // The function will be called at runtime when prompts/get is requested
  server.addPrompt({
    name,
    description: description || `Prompt: ${name}`,
    arguments: promptArgs,
    template: (args, context) => {
      // Call the method on the server instance with args only
      // (interface-style methods don't receive context parameter)
      return method.call(serverInstance, args);
    },
  });
}

/**
 * Register all prompts with the MCP server
 * All prompts now require implementation (no static/dynamic distinction)
 */
export function registerPrompts(
  server: BuildMCPServer,
  serverInstance: any,
  prompts: ParsedPrompt[],
  verbose?: boolean
): void {
  for (const prompt of prompts) {
    if (verbose) {
      console.log(`[Interface Adapter] Registering prompt: ${prompt.name}`);
    }

    registerPrompt(server, serverInstance, prompt);
  }
}
