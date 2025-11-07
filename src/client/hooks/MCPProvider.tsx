/**
 * MCPProvider - Context Provider for MCP UI Configuration
 *
 * Optional provider for configuring global defaults for MCP tool hooks.
 * Not required - hooks work fine without it, but useful for setting
 * global error handlers, default parsing, etc.
 *
 * @example
 * ```tsx
 * import { MCPProvider } from 'simply-mcp/client';
 *
 * function App() {
 *   return (
 *     <MCPProvider
 *       onError={(err) => toast.error(err.message)}
 *       parseAs="json"
 *     >
 *       <YourUI />
 *     </MCPProvider>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, ReactNode } from 'react';
import type { UseMCPToolOptions } from './useMCPTool.js';

/**
 * MCP Context value
 */
export interface MCPContextValue {
  /**
   * Default options for all useMCPTool hooks
   */
  defaultOptions: UseMCPToolOptions;

  /**
   * Global error handler (called for all tool errors)
   */
  onError?: (error: Error, toolName: string) => void;

  /**
   * Global success handler (called for all tool successes)
   */
  onSuccess?: (data: any, toolName: string) => void;
}

/**
 * Default context value
 */
const defaultContextValue: MCPContextValue = {
  defaultOptions: {
    optimistic: true,
    parseAs: 'json',
    retries: 0,
  },
};

/**
 * MCP Context
 */
const MCPContext = createContext<MCPContextValue>(defaultContextValue);

/**
 * MCP Provider Props
 */
export interface MCPProviderProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Default options for all tool hooks
   */
  defaultOptions?: Partial<UseMCPToolOptions>;

  /**
   * Global error handler
   */
  onError?: (error: Error, toolName: string) => void;

  /**
   * Global success handler
   */
  onSuccess?: (data: any, toolName: string) => void;

  /**
   * Default parse mode ('json' | 'text' | 'raw')
   * @default 'json'
   */
  parseAs?: 'json' | 'text' | 'raw';

  /**
   * Enable optimistic updates by default
   * @default true
   */
  optimistic?: boolean;

  /**
   * Default retry count
   * @default 0
   */
  retries?: number;

  /**
   * Default retry delay in ms
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * MCP Provider Component
 *
 * Provides global configuration for MCP tool hooks.
 *
 * @param props - Provider props
 *
 * @example
 * ```tsx
 * // Basic usage with global error handler
 * <MCPProvider onError={(err) => console.error(err)}>
 *   <App />
 * </MCPProvider>
 *
 * // With toast notifications
 * <MCPProvider
 *   onError={(err, toolName) => toast.error(`${toolName} failed: ${err.message}`)}
 *   onSuccess={(data, toolName) => toast.success(`${toolName} succeeded`)}
 * >
 *   <App />
 * </MCPProvider>
 *
 * // With custom defaults
 * <MCPProvider
 *   parseAs="text"
 *   optimistic={false}
 *   retries={3}
 *   retryDelay={2000}
 * >
 *   <App />
 * </MCPProvider>
 * ```
 */
export function MCPProvider({
  children,
  defaultOptions = {},
  onError,
  onSuccess,
  parseAs,
  optimistic,
  retries,
  retryDelay,
}: MCPProviderProps) {
  // Merge props into defaultOptions
  const mergedOptions: UseMCPToolOptions = {
    ...defaultContextValue.defaultOptions,
    ...defaultOptions,
    ...(parseAs !== undefined && { parseAs }),
    ...(optimistic !== undefined && { optimistic }),
    ...(retries !== undefined && { retries }),
    ...(retryDelay !== undefined && { retryDelay }),
  };

  const value: MCPContextValue = {
    defaultOptions: mergedOptions,
    onError,
    onSuccess,
  };

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}

/**
 * Hook to access MCP context
 *
 * @returns Current MCP context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const mcp = useMCPContext();
 *   console.log('Default options:', mcp.defaultOptions);
 * }
 * ```
 */
export function useMCPContext(): MCPContextValue {
  return useContext(MCPContext);
}

/**
 * Hook to get merged options (context defaults + hook options)
 *
 * @param toolName - Name of the tool
 * @param hookOptions - Options passed to the hook
 * @returns Merged options
 *
 * @internal
 */
export function useMergedOptions(
  toolName: string,
  hookOptions: UseMCPToolOptions = {}
): UseMCPToolOptions {
  const context = useMCPContext();

  // Merge context defaults with hook options
  // Hook options take precedence
  const merged: UseMCPToolOptions = {
    ...context.defaultOptions,
    ...hookOptions,
  };

  // Wrap callbacks to call both global and hook-specific handlers
  if (context.onError || hookOptions.onError) {
    const contextError = context.onError;
    const hookError = hookOptions.onError;

    merged.onError = (error: Error) => {
      contextError?.(error, toolName);
      hookError?.(error, toolName);
    };
  }

  if (context.onSuccess || hookOptions.onSuccess) {
    const contextSuccess = context.onSuccess;
    const hookSuccess = hookOptions.onSuccess;

    merged.onSuccess = (data: any, result: any) => {
      contextSuccess?.(data, toolName);
      hookSuccess?.(data, result);
    };
  }

  return merged;
}
