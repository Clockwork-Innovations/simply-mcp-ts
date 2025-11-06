/**
 * MCP Tool Helper Utilities
 *
 * Utility functions for working with multiple useMCPTool results.
 * These helpers accept arrays of tool results and provide aggregate operations.
 *
 * @example
 * ```tsx
 * import { useMCPTool, isAnyLoading, hasAnyError } from 'simply-mcp/client';
 *
 * function Dashboard() {
 *   const search = useMCPTool('search');
 *   const add = useMCPTool('add_to_cart');
 *   const stats = useMCPTool('get_stats');
 *
 *   const tools = [search, add, stats];
 *
 *   if (isAnyLoading(tools)) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   if (hasAnyError(tools)) {
 *     const errors = getAllErrors(tools);
 *     return <div>Errors: {errors.map(e => e.message).join(', ')}</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={() => search.execute({ query: 'laptop' })}>Search</button>
 *       <button onClick={() => add.execute({ id: '123' })}>Add to Cart</button>
 *     </div>
 *   );
 * }
 * ```
 */

import type { UseMCPToolResult } from './useMCPTool.js';

/**
 * Check if any tools are loading
 *
 * @param tools - Array of tool results from useMCPTool
 * @returns true if any tool is loading
 *
 * @example
 * ```tsx
 * const search = useMCPTool('search');
 * const add = useMCPTool('add');
 *
 * if (isAnyLoading([search, add])) {
 *   return <div>Loading...</div>;
 * }
 * ```
 */
export function isAnyLoading(tools: UseMCPToolResult<any>[]): boolean {
  return tools.some((tool) => tool.loading);
}

/**
 * Check if all tools are loading
 *
 * @param tools - Array of tool results from useMCPTool
 * @returns true if all tools are loading
 *
 * @example
 * ```tsx
 * const search = useMCPTool('search');
 * const add = useMCPTool('add');
 *
 * if (areAllLoading([search, add])) {
 *   return <div>All operations in progress...</div>;
 * }
 * ```
 */
export function areAllLoading(tools: UseMCPToolResult<any>[]): boolean {
  return tools.length > 0 && tools.every((tool) => tool.loading);
}

/**
 * Check if any tools have errors
 *
 * @param tools - Array of tool results from useMCPTool
 * @returns true if any tool has an error
 *
 * @example
 * ```tsx
 * const search = useMCPTool('search');
 * const add = useMCPTool('add');
 *
 * if (hasAnyError([search, add])) {
 *   return <div>Something went wrong!</div>;
 * }
 * ```
 */
export function hasAnyError(tools: UseMCPToolResult<any>[]): boolean {
  return tools.some((tool) => tool.error !== null);
}

/**
 * Get all errors from tools
 *
 * @param tools - Array of tool results from useMCPTool
 * @returns Array of errors (non-null only)
 *
 * @example
 * ```tsx
 * const search = useMCPTool('search');
 * const add = useMCPTool('add');
 *
 * const errors = getAllErrors([search, add]);
 * if (errors.length > 0) {
 *   return (
 *     <div>
 *       {errors.map((err, i) => (
 *         <div key={i}>{err.message}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function getAllErrors(tools: UseMCPToolResult<any>[]): Error[] {
  return tools.map((tool) => tool.error).filter((error): error is Error => error !== null);
}

/**
 * Reset all tools to their initial state
 *
 * @param tools - Array of tool results from useMCPTool
 *
 * @example
 * ```tsx
 * const search = useMCPTool('search');
 * const add = useMCPTool('add');
 *
 * const tools = [search, add];
 *
 * // Later...
 * <button onClick={() => resetAllTools(tools)}>
 *   Clear All
 * </button>
 * ```
 */
export function resetAllTools(tools: UseMCPToolResult<any>[]): void {
  tools.forEach((tool) => tool.reset());
}
