/**
 * MCP UI React Hooks - Adapter Layer
 *
 * Clean, declarative API for calling MCP tools from React components.
 * Works with ANY UI library (shadcn, Radix, MUI, Chakra, native HTML, etc.)
 *
 * @example
 * ```tsx
 * import { useMCPTool } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button'; // Any button works!
 *
 * function SearchUI() {
 *   const search = useMCPTool('search_products');
 *
 *   return (
 *     <Button
 *       onClick={() => search.execute({ query: 'laptop' })}
 *       disabled={search.loading}
 *     >
 *       {search.loading ? 'Searching...' : 'Search'}
 *     </Button>
 *   );
 * }
 * ```
 */

// Core hooks
export { useMCPTool } from './useMCPTool.js';
export type {
  UseMCPToolOptions,
  UseMCPToolResult,
  MCPToolResult,
} from './useMCPTool.js';

// Multiple tools hook
export {
  useMCPTools,
  isAnyLoading,
  areAllLoading,
  hasAnyError,
  getAllErrors,
  resetAllTools,
} from './useMCPTools.js';
export type {
  ToolDefinitions,
  ToolOptionsMap,
  UseMCPToolsResult,
} from './useMCPTools.js';

// Context provider
export {
  MCPProvider,
  useMCPContext,
  useMergedOptions,
} from './MCPProvider.js';
export type {
  MCPContextValue,
  MCPProviderProps,
} from './MCPProvider.js';
