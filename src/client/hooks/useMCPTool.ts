/**
 * useMCPTool Hook - Declarative MCP Tool Calling for React
 *
 * Makes it trivial to call MCP tools from any React component without boilerplate.
 * Works seamlessly with any UI library (shadcn, Radix, MUI, native HTML, etc.)
 *
 * Features:
 * - Automatic loading/error/data state management
 * - Optimistic updates support
 * - TypeScript type inference
 * - Request deduplication
 * - Automatic retries (optional)
 *
 * @example
 * ```tsx
 * import { useMCPTool } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button'; // Any button works!
 *
 * function SearchUI() {
 *   const search = useMCPTool('search_products', {
 *     onSuccess: (data) => console.log('Found:', data),
 *     optimistic: true
 *   });
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

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMergedOptions } from './MCPProvider.js';

/**
 * MCP Tool Result (matches MCP protocol)
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Hook options for useMCPTool
 */
export interface UseMCPToolOptions<TData = any, TContext = unknown> {
  /**
   * Called when tool execution succeeds
   */
  onSuccess?: (data: TData, result: MCPToolResult) => void;

  /**
   * Called when tool execution fails
   * Receives context returned from onMutate for rollback
   */
  onError?: (error: Error, params: any, context?: TContext) => void;

  /**
   * Called before execution starts (for optimistic updates)
   * Return a context object that will be passed to onError for rollback
   */
  onMutate?: (params: any) => TContext | Promise<TContext> | void | Promise<void>;

  /**
   * Enable optimistic loading state (true by default)
   */
  optimistic?: boolean;

  /**
   * Parse the result content automatically
   * - 'json': Parse first text content as JSON
   * - 'text': Return first text content as string
   * - 'raw': Return full MCPToolResult
   * @default 'json'
   */
  parseAs?: 'json' | 'text' | 'raw';

  /**
   * Retry failed requests
   * @default 0
   */
  retries?: number;

  /**
   * Retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Deduplicate simultaneous requests with same params
   * @default true
   */
  deduplicate?: boolean;
}

/**
 * Hook return value
 */
export interface UseMCPToolResult<TData = any> {
  /**
   * Execute the tool with given parameters
   */
  execute: (params?: any) => Promise<TData>;

  /**
   * Current loading state
   */
  loading: boolean;

  /**
   * Parsed data from last successful execution
   */
  data: TData | null;

  /**
   * Error from last failed execution
   */
  error: Error | null;

  /**
   * Reset state to initial values
   */
  reset: () => void;

  /**
   * Whether tool has been called at least once
   */
  called: boolean;
}

/**
 * Parse MCP tool result based on parseAs option
 */
function parseResult<TData>(result: MCPToolResult, parseAs: 'json' | 'text' | 'raw'): TData {
  if (parseAs === 'raw') {
    return result as any;
  }

  const firstContent = result.content?.[0];
  if (!firstContent) {
    throw new Error('No content in tool result');
  }

  const text = firstContent.text || '';

  if (parseAs === 'json') {
    try {
      return JSON.parse(text) as TData;
    } catch (e) {
      throw new Error(`Failed to parse tool result as JSON: ${e.message}`);
    }
  }

  // parseAs === 'text'
  return text as any;
}

/**
 * Generate cache key for deduplication
 */
function getCacheKey(toolName: string, params: any): string {
  return `${toolName}:${JSON.stringify(params)}`;
}

/**
 * React Hook for calling MCP tools with automatic state management
 *
 * @param toolName - Name of the MCP tool to call
 * @param options - Hook configuration options
 * @returns Tool execution state and methods
 *
 * @example
 * ```tsx
 * // Simple usage
 * const search = useMCPTool('search');
 *
 * // With type inference
 * interface SearchResult {
 *   products: Array<{ id: string; name: string }>;
 * }
 * const search = useMCPTool<SearchResult>('search');
 *
 * // With callbacks
 * const search = useMCPTool('search', {
 *   onSuccess: (data) => console.log('Success:', data),
 *   onError: (err) => console.error('Error:', err),
 *   parseAs: 'json'
 * });
 *
 * // Execute the tool
 * await search.execute({ query: 'laptop' });
 * ```
 */
export function useMCPTool<TData = any>(
  toolName: string,
  hookOptions: UseMCPToolOptions<TData> = {}
): UseMCPToolResult<TData> {
  // Merge with context defaults (if MCPProvider is used)
  const options = useMergedOptions(toolName, hookOptions);

  const {
    onSuccess,
    onError,
    onMutate,
    optimistic = true,
    parseAs = 'json',
    retries = 0,
    retryDelay = 1000,
    deduplicate = true,
  } = options;

  // State
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [called, setCalled] = useState(false);

  // Ref for in-flight requests (deduplication)
  const inflightRef = useRef<Map<string, Promise<TData>>>(new Map());

  // Ref to track if component is mounted (prevent state updates after unmount)
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      inflightRef.current.clear();
    };
  }, []);

  /**
   * Execute the tool with retry logic
   */
  const executeWithRetry = useCallback(async (params: any, attempt: number = 0): Promise<MCPToolResult> => {
    try {
      // Check if window.callTool exists
      if (typeof window === 'undefined' || !window.callTool) {
        throw new Error('window.callTool is not available. Are you running in an MCP UI context?');
      }

      const result = await window.callTool(toolName, params);

      // Check for error result
      if (result.isError) {
        const errorText = result.content?.[0]?.text || 'Tool execution failed';
        throw new Error(errorText);
      }

      return result;
    } catch (err) {
      // Retry logic
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeWithRetry(params, attempt + 1);
      }
      throw err;
    }
  }, [toolName, retries, retryDelay]);

  /**
   * Execute the tool
   */
  const execute = useCallback(async (params: any = {}): Promise<TData> => {
    // Deduplication check
    const cacheKey = deduplicate ? getCacheKey(toolName, params) : null;
    if (cacheKey && inflightRef.current.has(cacheKey)) {
      return inflightRef.current.get(cacheKey)!;
    }

    // Create execution promise
    const executionPromise = (async () => {
      let context: any = undefined;

      try {
        // Mark as called (safe - happens before async)
        setCalled(true);

        // Optimistic state update
        if (optimistic) {
          setLoading(true);
          setError(null);
        }

        // Call onMutate for optimistic updates
        // Capture context for potential rollback
        if (onMutate) {
          context = await onMutate(params);
        }

        // Execute tool with retries
        const result = await executeWithRetry(params);

        // Parse result
        const parsedData = parseResult<TData>(result, parseAs);

        // Update state only if still mounted
        if (isMountedRef.current) {
          setData(parsedData);
          setError(null);
          setLoading(false);

          // Call success callback
          if (onSuccess) {
            onSuccess(parsedData, result);
          }
        }

        return parsedData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Update state only if still mounted
        if (isMountedRef.current) {
          setError(error);
          setData(null);
          setLoading(false);

          // Call error callback with context for rollback
          if (onError) {
            onError(error, params, context);
          }
        }

        throw error;
      } finally {
        // Remove from inflight cache
        if (cacheKey) {
          inflightRef.current.delete(cacheKey);
        }
      }
    })();

    // Add to inflight cache
    if (cacheKey) {
      inflightRef.current.set(cacheKey, executionPromise);
    }

    return executionPromise;
  }, [toolName, optimistic, onMutate, onSuccess, onError, executeWithRetry, parseAs, deduplicate]);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    setError(null);
    setCalled(false);
    inflightRef.current.clear();
  }, []);

  return {
    execute,
    loading,
    data,
    error,
    reset,
    called,
  };
}

/**
 * Type declarations for window.callTool
 * (Auto-injected by simply-mcp)
 */
declare global {
  interface Window {
    callTool: (toolName: string, params: any) => Promise<MCPToolResult>;
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
    submitPrompt: (promptText: string) => void;
    triggerIntent: (intent: string, params?: any) => void;
    openLink: (url: string) => void;
  }
}
