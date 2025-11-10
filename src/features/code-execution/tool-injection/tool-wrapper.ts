/**
 * Tool Wrapper System for Code Execution
 *
 * Creates async wrapper functions that route TypeScript code's tool calls
 * to actual MCP tool handlers. Provides parameter validation and result extraction.
 *
 * @example
 * ```typescript
 * const wrappers = createToolWrappers(server.tools, context);
 * // wrappers.getWeather is async function calling get_weather tool
 * // wrappers.sendEmail is async function calling send_email tool
 * ```
 */

import type { InternalTool } from './type-generator.js';
import { snakeToCamel } from './type-generator.js';

/**
 * Create async wrapper functions for all server tools
 *
 * These wrappers:
 * 1. Validate parameters using existing Zod schemas
 * 2. Call the actual MCP tool handler
 * 3. Extract content from MCP protocol response
 * 4. Return JSON-serializable results
 *
 * @param tools - Map of registered tools
 * @param context - Execution context for tool calls
 * @param excludeToolRunner - Exclude tool_runner to prevent recursion
 * @returns Record of async functions ready for sandbox injection
 *
 * @example
 * ```typescript
 * const wrappers = createToolWrappers(server.tools, context);
 * // Injected into sandbox:
 * const weather = await getWeather({ city: 'San Francisco' });
 * const user = await getUserById({ id: '123' });
 * ```
 */
export function createToolWrappers(
  tools: Map<string, InternalTool>,
  context: any, // HandlerContext from MCP
  excludeToolRunner: boolean = true
): Record<string, Function> {
  const wrappers: Record<string, Function> = {};

  for (const [toolName, tool] of tools) {
    // Skip tool_runner to prevent recursion
    if (excludeToolRunner && (toolName === 'tool_runner' || toolName === 'execute-code')) {
      continue;
    }

    const funcName = snakeToCamel(toolName);

    // Create async wrapper function
    const wrapper = async (params: any) => {
      try {
        // 1. Validate params using Zod schema
        const validated = tool.definition.parameters.parse(params);

        // 2. Call actual MCP tool handler
        const result = await tool.definition.execute(validated, context);

        // 3. Extract content from MCP protocol wrapper
        const extracted = extractToolResult(result);

        // 4. Ensure result is JSON-serializable
        return ensureSerializable(extracted);

      } catch (error: any) {
        // Re-throw with tool name for better error messages
        const errorMsg = error.message || 'Tool execution failed';
        throw new Error(`Tool '${toolName}' failed: ${errorMsg}`);
      }
    };

    // Freeze wrapper to prevent modification
    Object.freeze(wrapper);

    wrappers[funcName] = wrapper;
  }

  return wrappers;
}

/**
 * Extract result from MCP protocol response
 *
 * MCP tools return { content: [...] } wrapper
 * We extract the actual content for easier use in TypeScript code
 *
 * @param result - MCP tool result
 * @returns Extracted content value
 */
function extractToolResult(result: any): any {
  // Handle MCP protocol format: { content: [{ type: 'text', text: '...' }] }
  if (result && Array.isArray(result.content)) {
    // Single text content - extract text value
    if (result.content.length === 1 && result.content[0].type === 'text') {
      const text = result.content[0].text;
      // Try to parse as JSON if it looks like JSON
      if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('['))) {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
      return text;
    }

    // Multiple content items - return array
    return result.content.map((item: any) => {
      if (item.type === 'text') {
        return item.text;
      }
      if (item.type === 'resource') {
        return item.resource;
      }
      return item;
    });
  }

  // Already extracted or different format
  return result;
}

/**
 * Ensure value is JSON-serializable
 *
 * Throws error if value contains functions or other non-serializable types
 *
 * @param value - Value to check
 * @returns Same value if serializable
 * @throws Error if value is not JSON-serializable
 */
function ensureSerializable(value: any): any {
  try {
    // Try to serialize and deserialize
    const serialized = JSON.stringify(value);
    return JSON.parse(serialized);
  } catch (error) {
    throw new Error(
      'Tool result must be JSON-serializable. ' +
      'Cannot return functions, symbols, or circular references.'
    );
  }
}
