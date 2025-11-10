/**
 * Server configuration interface
 */

/**
 * Base Server interface - pure metadata definition
 *
 * Defines server metadata and configuration. Server definitions use const-based pattern
 * where the server object contains only metadata.
 *
 * Transport Configuration:
 * - 'stdio': Standard input/output (default, for use with Claude Desktop, etc.)
 * - 'http': HTTP server (requires port configuration)
 *
 * @example Basic Server (stdio)
 * ```typescript
 * const server: IServer = {
 *   name: 'weather-service',
 *   version: '1.0.0',
 *   description: 'Weather information service'
 * };
 * ```
 *
 * @example HTTP Server
 * ```typescript
 * const server: IServer = {
 *   name: 'weather-service',
 *   version: '1.0.0',
 *   description: 'Weather information service',
 *   transport: 'http',
 *   port: 3000
 * };
 * ```
 *
 * @example HTTP Server with Authentication
 * ```typescript
 * const server: IServer = {
 *   name: 'secure-service',
 *   version: '1.0.0',
 *   description: 'Secure service with API key auth',
 *   transport: 'http',
 *   port: 3000,
 *   auth: {
 *     type: 'apiKey',
 *     keys: [
 *       { name: 'admin', key: 'sk-admin-123', permissions: ['*'] },
 *       { name: 'readonly', key: 'sk-read-456', permissions: ['read:*'] }
 *     ]
 *   }
 * };
 * ```
 *
 * @example HTTP Server with Stateful Sessions
 * ```typescript
 * const server: IServer = {
 *   name: 'session-service',
 *   version: '1.0.0',
 *   description: 'Service with session support',
 *   transport: 'http',
 *   port: 3000,
 *   stateful: true  // Enables session-based state management
 * };
 * ```
 */
export interface IServer {
  /**
   * Server name (kebab-case recommended)
   * Required - should be meaningful and descriptive
   */
  name: string;

  /**
   * Semantic version (e.g., '1.0.0')
   * Optional - defaults to '1.0.0' if not specified
   */
  version?: string;

  /**
   * Server description
   * Required - provides documentation for your server
   */
  description: string;

  /**
   * Transport type (OPTIONAL - inferred from config presence)
   *
   * Transport is automatically determined by which config is present:
   * - If `websocket` config exists → WebSocket transport
   * - If `port` or `stateful` exists → HTTP transport
   * - Otherwise → stdio transport (default)
   *
   * You can explicitly set this to override auto-detection, but it's not recommended.
   *
   * @deprecated Prefer implicit transport via config fields
   */
  transport?: 'stdio' | 'http' | 'websocket';

  /**
   * Port number for HTTP transport
   * Required when transport is 'http'
   * Ignored for 'stdio' transport
   *
   * @example
   * ```typescript
   * interface MyServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   * }
   * ```
   */
  port?: number;

  /**
   * Enable stateful session management for HTTP transport
   * When true, the server maintains session state between requests
   * Ignored for 'stdio' transport
   *
   * Default: false
   *
   * @example
   * ```typescript
   * interface StatefulServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   *   stateful: true;
   * }
   * ```
   */
  stateful?: boolean;

  /**
   * WebSocket-specific configuration
   * Only applicable when transport is 'websocket'
   * Ignored for other transports
   *
   * @example
   * ```typescript
   * interface WebSocketServer extends IServer {
   *   transport: 'websocket';
   *   websocket: {
   *     port: 8080,
   *     heartbeatInterval: 30000,
   *     heartbeatTimeout: 60000,
   *     maxMessageSize: 10485760
   *   };
   * }
   * ```
   */
  websocket?: {
    /**
     * Port to listen on (default: 8080)
     */
    port?: number;

    /**
     * Heartbeat interval in milliseconds (default: 30000)
     */
    heartbeatInterval?: number;

    /**
     * Heartbeat timeout in milliseconds (default: 60000)
     */
    heartbeatTimeout?: number;

    /**
     * Maximum message size in bytes (default: 10MB)
     */
    maxMessageSize?: number;

    /**
     * WebSocket server options
     */
    wsOptions?: any;
  };

  /**
   * Authentication configuration
   * Only applicable to 'http' transport
   * Ignored for 'stdio' transport
   *
   * @example API Key Authentication
   * ```typescript
   * interface ApiKeyAuth extends IApiKeyAuth {
   *   type: 'apiKey';
   *   keys: [
   *     { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
   *   ];
   * }
   *
   * interface MyServer extends IServer {
   *   transport: 'http';
   *   port: 3000;
   *   auth: ApiKeyAuth;
   * }
   * ```
   */
  auth?: import('./auth.js').IAuth;

  /**
   * Control visibility of router-assigned tools in tools/list
   *
   * When false (production mode):
   * - tools/list returns: routers + non-assigned tools only
   * - Assigned tools are hidden from main list
   * - Tools must be called via namespace: `router_name__tool_name`
   * - Cleaner tool list for clients
   *
   * When true (development/testing mode):
   * - tools/list returns: ALL tools including assigned ones
   * - Useful for testing individual tools directly
   * - Tools can be called directly or via namespace
   *
   * Default: false (production mode)
   *
   * @example Production Mode (flattenRouters: false)
   * ```typescript
   * interface ProductionServer extends IServer {
   *   flattenRouters: false; // Or omit (default)
   * }
   *
   * // tools/list returns:
   * // - weather_router (router)
   * // - other_tool (non-assigned tool)
   * // Does NOT return: get_weather, get_forecast (assigned to weather_router)
   *
   * // Call via namespace:
   * // weather_router__get_weather
   * ```
   *
   * @example Development Mode (flattenRouters: true)
   * ```typescript
   * interface DevelopmentServer extends IServer {
   *   flattenRouters: true;
   * }
   *
   * // tools/list returns:
   * // - weather_router (router)
   * // - get_weather (assigned to router)
   * // - get_forecast (assigned to router)
   * // - other_tool (non-assigned tool)
   *
   * // Call directly or via namespace:
   * // get_weather (direct)
   * // weather_router__get_weather (namespaced)
   * ```
   *
   * @since v4.1.0
   */
  flattenRouters?: boolean;

  /**
   * Code execution configuration
   *
   * When configured, automatically registers a 'tool_runner' tool that allows
   * executing TypeScript/JavaScript code in isolated sandbox environments.
   *
   * Phase 1: JavaScript execution using vm2
   * Future: Python, Ruby, Docker support
   *
   * @example Basic VM Mode (JavaScript)
   * ```typescript
   * interface CodeServer extends IServer {
   *   name: 'code-server';
   *   description: 'Server with code execution';
   *   codeExecution: {
   *     mode: 'vm',
   *     timeout: 5000
   *   };
   * }
   * ```
   *
   * @example With Language Constraints
   * ```typescript
   * interface RestrictedCodeServer extends IServer {
   *   name: 'restricted-server';
   *   description: 'Server with restricted code execution';
   *   codeExecution: {
   *     mode: 'vm',
   *     timeout: 10000,
   *     allowedLanguages: ['javascript']
   *   };
   * }
   * ```
   *
   * @since v4.2.0
   */
  codeExecution?: import('../../features/code-execution/types.js').ICodeExecutionConfig;
}
