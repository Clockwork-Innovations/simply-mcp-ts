/**
 * useMCPTools Hook - Manage Multiple MCP Tools
 *
 * Convenience hook for working with multiple MCP tools simultaneously.
 * Returns a typed object with tool executors, making it easy to call
 * multiple tools from a single component.
 *
 * @example
 * ```tsx
 * import { useMCPTools } from 'simply-mcp/client';
 *
 * function Dashboard() {
 *   const tools = useMCPTools({
 *     search: 'search_products',
 *     addToCart: 'add_to_cart',
 *     getStats: 'get_stats'
 *   }, {
 *     // Global options for all tools
 *     onError: (err) => console.error(err)
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => tools.search.execute({ query: 'laptop' })}>
 *         Search
 *       </button>
 *       {tools.search.loading && <div>Loading...</div>}
 *       {tools.search.data && <div>Results: {tools.search.data.length}</div>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useMCPTool, UseMCPToolOptions, UseMCPToolResult } from './useMCPTool.js';

/**
 * Tool definitions map
 * Key is the local name, value is the MCP tool name
 */
export type ToolDefinitions = Record<string, string>;

/**
 * Tool-specific options map
 * Key is the local name, value is the options for that tool
 */
export type ToolOptionsMap<T extends ToolDefinitions> = {
  [K in keyof T]?: UseMCPToolOptions;
};

/**
 * Result type for useMCPTools
 * Maps each tool definition to its useMCPTool result
 */
export type UseMCPToolsResult<T extends ToolDefinitions> = {
  [K in keyof T]: UseMCPToolResult;
};

/**
 * Hook for managing multiple MCP tools
 *
 * @param tools - Map of local names to MCP tool names
 * @param globalOptions - Options applied to all tools
 * @param toolOptions - Per-tool options (overrides globalOptions)
 * @returns Object with tool executors
 *
 * @example
 * ```tsx
 * // Basic usage
 * const tools = useMCPTools({
 *   search: 'search_products',
 *   add: 'add_to_cart'
 * });
 *
 * // With global options
 * const tools = useMCPTools(
 *   { search: 'search_products', add: 'add_to_cart' },
 *   { parseAs: 'json', optimistic: true }
 * );
 *
 * // With per-tool options
 * const tools = useMCPTools(
 *   { search: 'search_products', add: 'add_to_cart' },
 *   { parseAs: 'json' },
 *   {
 *     search: { onSuccess: (data) => console.log('Search:', data) },
 *     add: { onSuccess: () => console.log('Added to cart!') }
 *   }
 * );
 *
 * // Use the tools
 * await tools.search.execute({ query: 'laptop' });
 * await tools.add.execute({ productId: '123' });
 * ```
 */
export function useMCPTools<T extends ToolDefinitions>(
  tools: T,
  globalOptions: UseMCPToolOptions = {},
  toolOptions: ToolOptionsMap<T> = {}
): UseMCPToolsResult<T> {
  const result = {} as UseMCPToolsResult<T>;

  // Create a hook for each tool
  for (const [localName, mcpToolName] of Object.entries(tools)) {
    // Merge global options with tool-specific options
    const options = {
      ...globalOptions,
      ...(toolOptions[localName] || {}),
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[localName as keyof T] = useMCPTool(mcpToolName, options);
  }

  return result;
}

/**
 * Check if any tools are loading
 *
 * @param tools - Result from useMCPTools
 * @returns true if any tool is loading
 *
 * @example
 * ```tsx
 * const tools = useMCPTools({ search: 'search', add: 'add_to_cart' });
 * const isLoading = isAnyLoading(tools); // true if search OR add is loading
 * ```
 */
export function isAnyLoading<T extends ToolDefinitions>(
  tools: UseMCPToolsResult<T>
): boolean {
  return Object.values(tools).some((tool: any) => tool.loading);
}

/**
 * Check if all tools are loading
 *
 * @param tools - Result from useMCPTools
 * @returns true if all tools are loading
 */
export function areAllLoading<T extends ToolDefinitions>(
  tools: UseMCPToolsResult<T>
): boolean {
  const toolArray = Object.values(tools);
  return toolArray.length > 0 && toolArray.every((tool: any) => tool.loading);
}

/**
 * Check if any tools have errors
 *
 * @param tools - Result from useMCPTools
 * @returns true if any tool has an error
 */
export function hasAnyError<T extends ToolDefinitions>(
  tools: UseMCPToolsResult<T>
): boolean {
  return Object.values(tools).some((tool: any) => tool.error !== null);
}

/**
 * Get all errors from tools
 *
 * @param tools - Result from useMCPTools
 * @returns Array of errors (non-null only)
 */
export function getAllErrors<T extends ToolDefinitions>(
  tools: UseMCPToolsResult<T>
): Error[] {
  return Object.values(tools)
    .map((tool: any) => tool.error)
    .filter((error): error is Error => error !== null);
}

/**
 * Reset all tools
 *
 * @param tools - Result from useMCPTools
 *
 * @example
 * ```tsx
 * const tools = useMCPTools({ search: 'search', add: 'add' });
 * // ... use tools ...
 * resetAllTools(tools); // Clear all state
 * ```
 */
export function resetAllTools<T extends ToolDefinitions>(
  tools: UseMCPToolsResult<T>
): void {
  Object.values(tools).forEach((tool: any) => tool.reset());
}
