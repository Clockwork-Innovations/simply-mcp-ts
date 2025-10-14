/**
 * Configuration utilities for SimpleMCP
 * Provides type-safe config helper and type exports
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
