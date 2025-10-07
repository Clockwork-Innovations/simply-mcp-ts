/**
 * Configuration utilities for SimpleMCP
 * Provides type-safe config helper and type exports
 *
 * @deprecated Importing from 'simply-mcp/config' is deprecated as of v2.5.0.
 * Import from 'simply-mcp' instead:
 *
 * ```typescript
 * // New (v2.5.0+)
 * import { defineConfig, type CLIConfig } from 'simply-mcp';
 *
 * // Old (still works but deprecated)
 * import { defineConfig, type CLIConfig } from 'simply-mcp/config';
 * ```
 *
 * The subpath import will be removed in v4.0.0.
 */

/**
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/config' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type CLIConfig } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type CLIConfig } from 'simply-mcp/config';
 */
export type {
  CLIConfig,
  ServerConfig,
  DefaultsConfig,
  RunConfig,
  BundleConfig,
  APIStyle,
  TransportType,
} from './cli/cli-config-loader.js';

import type { CLIConfig } from './cli/cli-config-loader.js';

/**
 * Type-safe configuration helper
 * Provides autocomplete and type checking for config files
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/config' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { defineConfig } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { defineConfig } from 'simply-mcp/config';
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'simply-mcp';
 *
 * export default defineConfig({
 *   defaultServer: 'weather',
 *   servers: {
 *     weather: {
 *       entry: './src/weather-server.ts',
 *       transport: 'http',
 *       port: 3000,
 *     },
 *   },
 *   defaults: {
 *     verbose: true,
 *   },
 * });
 * ```
 */
export function defineConfig(config: CLIConfig): CLIConfig {
  return config;
}
