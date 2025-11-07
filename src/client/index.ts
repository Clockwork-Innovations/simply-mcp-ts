/**
 * Simply-MCP Client Exports
 *
 * React hooks and utilities for building MCP UIs.
 * Works with any UI library (shadcn, Radix, MUI, Chakra, native HTML, etc.)
 *
 * @example
 * ```tsx
 * import { useMCPTool } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button';
 *
 * function MyUI() {
 *   const search = useMCPTool('search');
 *
 *   return (
 *     <Button onClick={() => search.execute({ query: 'test' })}>
 *       {search.loading ? 'Searching...' : 'Search'}
 *     </Button>
 *   );
 * }
 * ```
 */

// Export all hooks
export * from './hooks/index.js';

// Re-export for convenience
export { useMCPTool, MCPProvider } from './hooks/index.js';

// Export UI resource rendering components and utilities
export { default as UIResourceRenderer } from './UIResourceRenderer.js';
export { isUIResource } from './ui-utils.js';
export type { UIResourceContent, UIActionResult, UIAction } from './ui-types.js';
