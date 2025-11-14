/**
 * Context provided to hidden evaluation functions
 *
 * This context allows hidden predicates to make intelligent decisions based on:
 * - MCP session information
 * - Request metadata
 * - Server state and configuration
 * - Custom application data
 */
export interface HiddenEvaluationContext {
  /**
   * MCP session metadata
   * Contains server info, session ID, request context
   */
  mcp?: {
    /** Server metadata */
    server: {
      name: string;
      version: string;
      description?: string;
    };
    /** Session object from MCP SDK */
    session?: any;
    /** Request-specific context */
    request?: {
      request_id?: string;
      meta?: Record<string, unknown>;
    };
  };

  /**
   * Custom metadata passed by application
   *
   * Use this for application-specific context like:
   * - User authentication/authorization data
   * - Feature flags
   * - Environment information
   * - Request-specific state
   *
   * @example
   * ```typescript
   * {
   *   user: { id: 'user123', role: 'admin', permissions: ['debug'] },
   *   features: ['advanced_tools', 'experimental'],
   *   environment: 'production',
   *   requestTime: Date.now()
   * }
   * ```
   */
  metadata?: Record<string, unknown>;

  /**
   * Server runtime state
   * Available in interface-based servers
   */
  server?: {
    /** Whether server is in production mode */
    isProduction?: boolean;
    /** Server start time */
    startTime?: number;
    /** Custom server state */
    [key: string]: unknown;
  };

  /**
   * Extensibility: Additional context fields
   * Applications can extend context via declaration merging
   */
  [key: string]: unknown;
}

/**
 * Hidden predicate function type
 *
 * Supports both synchronous and asynchronous evaluation.
 * Should return true to hide the item, false to show it.
 */
export type HiddenPredicate = (context?: HiddenEvaluationContext) => boolean | Promise<boolean>;

/**
 * Hidden field type - static boolean or dynamic predicate
 */
export type HiddenValue = boolean | HiddenPredicate;

/**
 * Type guard: Check if hidden value is a function
 */
export function isHiddenFunction(hidden: HiddenValue | undefined): hidden is HiddenPredicate {
  return typeof hidden === 'function';
}

/**
 * Type guard: Check if hidden value is a static boolean
 */
export function isHiddenBoolean(hidden: HiddenValue | undefined): hidden is boolean {
  return typeof hidden === 'boolean';
}
