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

// Helper utilities for working with multiple tools
export {
  isAnyLoading,
  areAllLoading,
  hasAnyError,
  getAllErrors,
  resetAllTools,
} from './useMCPToolHelpers.js';

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

// MCP UI Protocol Action Hooks
export { usePromptSubmit } from './usePromptSubmit.js';
export type {
  UsePromptSubmitOptions,
  UsePromptSubmitResult,
} from './usePromptSubmit.js';

export { useIntent } from './useIntent.js';
export type {
  UseIntentOptions,
  UseIntentResult,
  IntentHistoryEntry,
} from './useIntent.js';

export { useNotify } from './useNotify.js';
export type {
  UseNotifyOptions,
  UseNotifyResult,
  NotificationLevel,
} from './useNotify.js';

export { useOpenLink } from './useOpenLink.js';
export type {
  UseOpenLinkOptions,
  UseOpenLinkResult,
  LinkHistoryEntry,
} from './useOpenLink.js';
