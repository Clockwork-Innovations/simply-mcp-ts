/**
 * Configuration Type Definitions
 *
 * Type definitions for CLI configuration and server configuration.
 * These types define the structure of simplymcp.config.ts files.
 *
 * @module types/config
 */

/**
 * API style types
 */
export type APIStyle = 'decorator' | 'functional' | 'programmatic';

/**
 * Transport types
 */
export type TransportType = 'stdio' | 'http';

/**
 * Server-specific configuration (for CLI named servers)
 * Note: This is different from the MCP ServerConfig in core.ts which defines
 * the structure of an MCP server. This ServerConfig defines CLI server entries.
 * @alias CLIServerConfig
 */
export interface ServerConfig {
  /**
   * Path to server entry file
   */
  entry: string;

  /**
   * Force specific API style
   */
  style?: APIStyle;

  /**
   * Transport type for this server
   */
  transport?: TransportType;

  /**
   * Port for HTTP transport
   */
  port?: number;

  /**
   * Watch mode for this server
   */
  watch?: boolean;

  /**
   * Environment variables for this server
   */
  env?: Record<string, string>;

  /**
   * Verbose output for this server
   */
  verbose?: boolean;
}

/**
 * Default configuration options
 */
export interface DefaultsConfig {
  /**
   * Default transport type
   */
  transport?: TransportType;

  /**
   * Default port for HTTP transport
   */
  port?: number;

  /**
   * Default verbose setting
   */
  verbose?: boolean;

  /**
   * Default watch mode setting
   */
  watch?: boolean;
}

/**
 * Run command configuration options
 */
export interface RunConfig {
  /**
   * API style to use
   */
  style?: APIStyle;

  /**
   * Use HTTP transport instead of stdio
   * @default false
   */
  http?: boolean;

  /**
   * Port for HTTP server
   * @default 3000
   */
  port?: number;

  /**
   * Enable watch mode
   * @default false
   */
  watch?: boolean;

  /**
   * Use polling for watch mode
   * @default false
   */
  watchPoll?: boolean;

  /**
   * Watch polling interval in milliseconds
   * @default 1000
   */
  watchInterval?: number;

  /**
   * Enable Node.js inspector
   * @default false
   */
  inspect?: boolean;

  /**
   * Inspector port
   * @default 9229
   */
  inspectPort?: number;

  /**
   * Verbose output
   * @default false
   */
  verbose?: boolean;
}

/**
 * Bundle command configuration options
 */
export interface BundleConfig {
  /**
   * Entry point file
   */
  entry?: string;

  /**
   * Output file or directory
   */
  output?: string;

  /**
   * Output format
   */
  format?: 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';

  /**
   * Minify output
   */
  minify?: boolean;

  /**
   * Generate source maps
   */
  sourcemap?: 'inline' | 'external' | 'both' | false;

  /**
   * Target platform
   */
  platform?: 'node' | 'neutral';

  /**
   * Target Node.js version
   */
  target?: 'node18' | 'node20' | 'node22' | 'esnext' | 'es2020' | 'es2021' | 'es2022';

  /**
   * External packages
   */
  external?: string[];

  /**
   * Enable tree-shaking
   */
  treeShake?: boolean;

  /**
   * Auto-install dependencies
   */
  autoInstall?: boolean;
}

/**
 * SimplyMCP CLI configuration
 */
export interface CLIConfig {
  /**
   * Default server to run (when no file is specified)
   */
  defaultServer?: string;

  /**
   * Named server configurations
   */
  servers?: Record<string, ServerConfig>;

  /**
   * Global defaults for all servers
   */
  defaults?: DefaultsConfig;

  /**
   * Default options for run command
   */
  run?: RunConfig;

  /**
   * Default options for bundle command
   */
  bundle?: BundleConfig;

  /**
   * Legacy bundle options (for backward compatibility)
   */
  entry?: string;
  output?: {
    dir?: string;
    filename?: string;
    format?: 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';
  };
  autoInstall?: boolean;
}
