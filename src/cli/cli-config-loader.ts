/**
 * Configuration file loader for SimplyMCP CLI
 * Supports run and bundle command configurations, named servers, and defaults
 */

import { readFile, access } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';

/**
 * API style types
 */
export type APIStyle = 'interface' | 'programmatic';

/**
 * Transport types
 */
export type TransportType = 'stdio' | 'http';

/**
 * Server-specific configuration
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

/**
 * Load CLI configuration from file
 * @param configPath - Explicit config file path (optional)
 * @param cwd - Working directory (default: process.cwd())
 * @returns Parsed configuration or null if not found
 */
export async function loadCLIConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<CLIConfig | null> {
  const configFile = configPath
    ? resolve(cwd, configPath)
    : await findCLIConfigFile(cwd);

  if (!configFile) {
    return null;
  }

  if (!existsSync(configFile)) {
    throw new Error(`Config file not found: ${configFile}`);
  }

  return parseCLIConfig(configFile);
}

/**
 * Find config file by convention
 * @param cwd - Working directory
 * @returns Path to config file or null if not found
 */
async function findCLIConfigFile(cwd: string): Promise<string | null> {
  const candidates = [
    'simplymcp.config.ts',
    'simplymcp.config.js',
    'simplymcp.config.mjs',
    'simplymcp.config.json',
    'simplemcp.config.ts',
    'simplemcp.config.js',
    'simplemcp.config.mjs',
    'simplemcp.config.json',
    '.simplymcprc.json',
    '.simplymcprc.js',
  ];

  for (const candidate of candidates) {
    const candidatePath = join(cwd, candidate);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Parse config file based on extension
 * @param configPath - Path to config file
 * @returns Parsed configuration
 */
async function parseCLIConfig(configPath: string): Promise<CLIConfig> {
  const ext = configPath.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    // JSON config
    const content = await readFile(configPath, 'utf-8');
    try {
      const config = JSON.parse(content);
      validateCLIConfig(config, configPath);
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${configPath}\n${error.message}`);
      }
      throw error;
    }
  } else if (ext === 'js' || ext === 'mjs' || ext === 'ts') {
    // JavaScript/TypeScript config
    const configUrl = pathToFileURL(configPath).href;
    try {
      const module = await import(configUrl);
      const config = module.default || module;
      validateCLIConfig(config, configPath);
      return config;
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${configPath}\n${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    throw new Error(`Unsupported config file format: ${ext}`);
  }
}

/**
 * Validate configuration object
 * @param config - Configuration to validate
 * @param configPath - Path to config file (for error messages)
 */
function validateCLIConfig(config: any, configPath: string): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error(`Config must be an object in: ${configPath}`);
  }

  // Validate defaultServer
  if (config.defaultServer !== undefined && typeof config.defaultServer !== 'string') {
    throw new Error(`Config field "defaultServer" must be a string in: ${configPath}`);
  }

  // Validate servers
  if (config.servers !== undefined) {
    if (typeof config.servers !== 'object' || config.servers === null || Array.isArray(config.servers)) {
      throw new Error(`Config field "servers" must be an object in: ${configPath}`);
    }

    for (const [serverName, serverConfig] of Object.entries(config.servers)) {
      if (typeof serverConfig !== 'object' || serverConfig === null) {
        throw new Error(`Server config "${serverName}" must be an object in: ${configPath}`);
      }

      const sc = serverConfig as any;

      // Validate entry (required)
      if (!sc.entry || typeof sc.entry !== 'string') {
        throw new Error(`Server config "${serverName}" must have an "entry" field (string) in: ${configPath}`);
      }

      // Validate style
      if (sc.style !== undefined) {
        const validStyles = ['decorator', 'functional', 'programmatic'];
        if (!validStyles.includes(sc.style)) {
          throw new Error(
            `Server config "${serverName}".style must be one of: ${validStyles.join(', ')} in: ${configPath}`
          );
        }
      }

      // Validate transport
      if (sc.transport !== undefined) {
        const validTransports = ['stdio', 'http'];
        if (!validTransports.includes(sc.transport)) {
          throw new Error(
            `Server config "${serverName}".transport must be one of: ${validTransports.join(', ')} in: ${configPath}`
          );
        }
      }

      // Validate port
      if (sc.port !== undefined) {
        if (typeof sc.port !== 'number' || sc.port < 1 || sc.port > 65535) {
          throw new Error(
            `Server config "${serverName}".port must be a number between 1 and 65535 in: ${configPath}`
          );
        }
      }

      // Validate watch
      if (sc.watch !== undefined && typeof sc.watch !== 'boolean') {
        throw new Error(`Server config "${serverName}".watch must be a boolean in: ${configPath}`);
      }

      // Validate env
      if (sc.env !== undefined) {
        if (typeof sc.env !== 'object' || sc.env === null || Array.isArray(sc.env)) {
          throw new Error(`Server config "${serverName}".env must be an object in: ${configPath}`);
        }
        for (const [key, value] of Object.entries(sc.env)) {
          if (typeof value !== 'string') {
            throw new Error(
              `Server config "${serverName}".env["${key}"] must be a string in: ${configPath}`
            );
          }
        }
      }

      // Validate verbose
      if (sc.verbose !== undefined && typeof sc.verbose !== 'boolean') {
        throw new Error(`Server config "${serverName}".verbose must be a boolean in: ${configPath}`);
      }
    }
  }

  // Validate defaults
  if (config.defaults !== undefined) {
    if (typeof config.defaults !== 'object' || config.defaults === null) {
      throw new Error(`Config field "defaults" must be an object in: ${configPath}`);
    }

    const defaults = config.defaults;

    // Validate transport
    if (defaults.transport !== undefined) {
      const validTransports = ['stdio', 'http'];
      if (!validTransports.includes(defaults.transport)) {
        throw new Error(
          `Config field "defaults.transport" must be one of: ${validTransports.join(', ')} in: ${configPath}`
        );
      }
    }

    // Validate port
    if (defaults.port !== undefined) {
      if (typeof defaults.port !== 'number' || defaults.port < 1 || defaults.port > 65535) {
        throw new Error(
          `Config field "defaults.port" must be a number between 1 and 65535 in: ${configPath}`
        );
      }
    }

    // Validate verbose
    if (defaults.verbose !== undefined && typeof defaults.verbose !== 'boolean') {
      throw new Error(`Config field "defaults.verbose" must be a boolean in: ${configPath}`);
    }

    // Validate watch
    if (defaults.watch !== undefined && typeof defaults.watch !== 'boolean') {
      throw new Error(`Config field "defaults.watch" must be a boolean in: ${configPath}`);
    }
  }

  // Validate run options
  if (config.run !== undefined) {
    if (typeof config.run !== 'object' || config.run === null) {
      throw new Error(`Config field "run" must be an object in: ${configPath}`);
    }

    // Validate run.style
    if (config.run.style !== undefined) {
      const validStyles = ['decorator', 'functional', 'programmatic'];
      if (!validStyles.includes(config.run.style)) {
        throw new Error(
          `Config field "run.style" must be one of: ${validStyles.join(', ')} in: ${configPath}`
        );
      }
    }

    // Validate run.http
    if (config.run.http !== undefined && typeof config.run.http !== 'boolean') {
      throw new Error(`Config field "run.http" must be a boolean in: ${configPath}`);
    }

    // Validate run.port
    if (config.run.port !== undefined) {
      if (typeof config.run.port !== 'number' || config.run.port < 1 || config.run.port > 65535) {
        throw new Error(`Config field "run.port" must be a number between 1 and 65535 in: ${configPath}`);
      }
    }

    // Validate run.watch
    if (config.run.watch !== undefined && typeof config.run.watch !== 'boolean') {
      throw new Error(`Config field "run.watch" must be a boolean in: ${configPath}`);
    }

    // Validate run.watchPoll
    if (config.run.watchPoll !== undefined && typeof config.run.watchPoll !== 'boolean') {
      throw new Error(`Config field "run.watchPoll" must be a boolean in: ${configPath}`);
    }

    // Validate run.watchInterval
    if (config.run.watchInterval !== undefined) {
      if (typeof config.run.watchInterval !== 'number' || config.run.watchInterval < 100) {
        throw new Error(`Config field "run.watchInterval" must be a number >= 100 in: ${configPath}`);
      }
    }

    // Validate run.inspect
    if (config.run.inspect !== undefined && typeof config.run.inspect !== 'boolean') {
      throw new Error(`Config field "run.inspect" must be a boolean in: ${configPath}`);
    }

    // Validate run.inspectPort
    if (config.run.inspectPort !== undefined) {
      if (typeof config.run.inspectPort !== 'number' || config.run.inspectPort < 1 || config.run.inspectPort > 65535) {
        throw new Error(`Config field "run.inspectPort" must be a number between 1 and 65535 in: ${configPath}`);
      }
    }

    // Validate run.verbose
    if (config.run.verbose !== undefined && typeof config.run.verbose !== 'boolean') {
      throw new Error(`Config field "run.verbose" must be a boolean in: ${configPath}`);
    }
  }

  // Validate bundle options
  if (config.bundle !== undefined) {
    if (typeof config.bundle !== 'object' || config.bundle === null) {
      throw new Error(`Config field "bundle" must be an object in: ${configPath}`);
    }

    // Validate bundle.entry
    if (config.bundle.entry !== undefined && typeof config.bundle.entry !== 'string') {
      throw new Error(`Config field "bundle.entry" must be a string in: ${configPath}`);
    }

    // Validate bundle.output
    if (config.bundle.output !== undefined && typeof config.bundle.output !== 'string') {
      throw new Error(`Config field "bundle.output" must be a string in: ${configPath}`);
    }

    // Validate bundle.format
    if (config.bundle.format !== undefined) {
      const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
      if (!validFormats.includes(config.bundle.format)) {
        throw new Error(
          `Config field "bundle.format" must be one of: ${validFormats.join(', ')} in: ${configPath}`
        );
      }
    }

    // Validate bundle.minify
    if (config.bundle.minify !== undefined && typeof config.bundle.minify !== 'boolean') {
      throw new Error(`Config field "bundle.minify" must be a boolean in: ${configPath}`);
    }

    // Validate bundle.platform
    if (config.bundle.platform !== undefined) {
      const validPlatforms = ['node', 'neutral'];
      if (!validPlatforms.includes(config.bundle.platform)) {
        throw new Error(
          `Config field "bundle.platform" must be one of: ${validPlatforms.join(', ')} in: ${configPath}`
        );
      }
    }

    // Validate bundle.target
    if (config.bundle.target !== undefined) {
      const validTargets = ['node18', 'node20', 'node22', 'esnext', 'es2020', 'es2021', 'es2022'];
      if (!validTargets.includes(config.bundle.target)) {
        throw new Error(
          `Config field "bundle.target" must be one of: ${validTargets.join(', ')} in: ${configPath}`
        );
      }
    }

    // Validate bundle.external
    if (config.bundle.external !== undefined) {
      if (!Array.isArray(config.bundle.external)) {
        throw new Error(`Config field "bundle.external" must be an array in: ${configPath}`);
      }
      if (!config.bundle.external.every((item: any) => typeof item === 'string')) {
        throw new Error(`Config field "bundle.external" must be an array of strings in: ${configPath}`);
      }
    }

    // Validate bundle.treeShake
    if (config.bundle.treeShake !== undefined && typeof config.bundle.treeShake !== 'boolean') {
      throw new Error(`Config field "bundle.treeShake" must be a boolean in: ${configPath}`);
    }

    // Validate bundle.autoInstall
    if (config.bundle.autoInstall !== undefined && typeof config.bundle.autoInstall !== 'boolean') {
      throw new Error(`Config field "bundle.autoInstall" must be a boolean in: ${configPath}`);
    }
  }

  // Validate legacy bundle options (for backward compatibility)
  if (config.entry !== undefined && typeof config.entry !== 'string') {
    throw new Error(`Config field "entry" must be a string in: ${configPath}`);
  }

  if (config.output !== undefined) {
    if (typeof config.output !== 'object' || config.output === null) {
      throw new Error(`Config field "output" must be an object in: ${configPath}`);
    }

    if (config.output.dir !== undefined && typeof config.output.dir !== 'string') {
      throw new Error(`Config field "output.dir" must be a string in: ${configPath}`);
    }

    if (config.output.filename !== undefined && typeof config.output.filename !== 'string') {
      throw new Error(`Config field "output.filename" must be a string in: ${configPath}`);
    }

    if (config.output.format !== undefined) {
      const validFormats = ['single-file', 'standalone', 'executable', 'esm', 'cjs'];
      if (!validFormats.includes(config.output.format)) {
        throw new Error(
          `Config field "output.format" must be one of: ${validFormats.join(', ')} in: ${configPath}`
        );
      }
    }
  }
}

/**
 * Merge CLI options with run config
 * CLI options take precedence over config file
 * @param config - Config file settings
 * @param cliOptions - CLI command options
 * @returns Merged run options
 */
export function mergeRunConfig(
  config: CLIConfig | null,
  cliOptions: Partial<RunConfig>
): RunConfig {
  const merged: RunConfig = {};

  // CLI args take precedence, then config file, then defaults
  const runConfig = config?.run || {};

  // Style (CLI > config)
  if (cliOptions.style !== undefined) {
    merged.style = cliOptions.style;
  } else if (runConfig.style !== undefined) {
    merged.style = runConfig.style;
  }

  // HTTP (CLI > config)
  if (cliOptions.http !== undefined) {
    merged.http = cliOptions.http;
  } else if (runConfig.http !== undefined) {
    merged.http = runConfig.http;
  }

  // Port (CLI > config)
  if (cliOptions.port !== undefined) {
    merged.port = cliOptions.port;
  } else if (runConfig.port !== undefined) {
    merged.port = runConfig.port;
  }

  // Watch (CLI > config)
  if (cliOptions.watch !== undefined) {
    merged.watch = cliOptions.watch;
  } else if (runConfig.watch !== undefined) {
    merged.watch = runConfig.watch;
  }

  // Watch poll (CLI > config)
  if (cliOptions.watchPoll !== undefined) {
    merged.watchPoll = cliOptions.watchPoll;
  } else if (runConfig.watchPoll !== undefined) {
    merged.watchPoll = runConfig.watchPoll;
  }

  // Watch interval (CLI > config)
  if (cliOptions.watchInterval !== undefined) {
    merged.watchInterval = cliOptions.watchInterval;
  } else if (runConfig.watchInterval !== undefined) {
    merged.watchInterval = runConfig.watchInterval;
  }

  // Inspect (CLI > config)
  if (cliOptions.inspect !== undefined) {
    merged.inspect = cliOptions.inspect;
  } else if (runConfig.inspect !== undefined) {
    merged.inspect = runConfig.inspect;
  }

  // Inspect port (CLI > config)
  if (cliOptions.inspectPort !== undefined) {
    merged.inspectPort = cliOptions.inspectPort;
  } else if (runConfig.inspectPort !== undefined) {
    merged.inspectPort = runConfig.inspectPort;
  }

  // Verbose (CLI > config)
  if (cliOptions.verbose !== undefined) {
    merged.verbose = cliOptions.verbose;
  } else if (runConfig.verbose !== undefined) {
    merged.verbose = runConfig.verbose;
  }

  return merged;
}

/**
 * Get the config file path that was loaded
 * @param configPath - Explicit config file path (optional)
 * @param cwd - Working directory (default: process.cwd())
 * @returns Path to config file or null if not found
 */
export async function getConfigFilePath(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<string | null> {
  if (configPath) {
    const resolved = resolve(cwd, configPath);
    return existsSync(resolved) ? resolved : null;
  }
  return findCLIConfigFile(cwd);
}

/**
 * Resolve server configuration from config file
 * If the file argument matches a server name, returns the server config
 * @param file - File path or server name
 * @param config - Loaded CLI config
 * @returns Server config if found, null otherwise
 */
export function resolveServerConfig(
  file: string,
  config: CLIConfig | null
): { entry: string; config: ServerConfig } | null {
  if (!config?.servers) {
    return null;
  }

  const serverConfig = config.servers[file];
  if (serverConfig) {
    return {
      entry: serverConfig.entry,
      config: serverConfig,
    };
  }

  return null;
}

/**
 * Merge server config with defaults and CLI options
 * Priority: CLI options > server config > defaults > default values
 * @param serverConfig - Server-specific config
 * @param defaults - Global defaults
 * @param cliOptions - CLI command options
 * @returns Merged configuration
 */
export function mergeServerConfig(
  serverConfig: ServerConfig | null,
  defaults: DefaultsConfig | null,
  cliOptions: Partial<RunConfig>
): RunConfig {
  const merged: RunConfig = {};

  // Helper to get value with priority
  const getValue = <K extends keyof RunConfig>(
    cliKey: K,
    serverKey?: keyof ServerConfig,
    defaultKey?: keyof DefaultsConfig
  ): RunConfig[K] | undefined => {
    // CLI takes highest priority
    if (cliOptions[cliKey] !== undefined) {
      return cliOptions[cliKey];
    }

    // Server config takes second priority
    if (serverConfig && serverKey && serverConfig[serverKey] !== undefined) {
      return serverConfig[serverKey] as RunConfig[K];
    }

    // Defaults take third priority
    if (defaults && defaultKey && defaults[defaultKey] !== undefined) {
      return defaults[defaultKey] as RunConfig[K];
    }

    return undefined;
  };

  // Merge all fields
  merged.style = getValue('style', 'style');

  // Handle transport -> http conversion
  const transport = getValue('http') !== undefined
    ? (getValue('http') ? 'http' : 'stdio')
    : (serverConfig?.transport || defaults?.transport);
  merged.http = transport === 'http';

  merged.port = getValue('port', 'port', 'port');
  merged.watch = getValue('watch', 'watch', 'watch');
  merged.watchPoll = getValue('watchPoll');
  merged.watchInterval = getValue('watchInterval');
  merged.inspect = getValue('inspect');
  merged.inspectPort = getValue('inspectPort');
  merged.verbose = getValue('verbose', 'verbose', 'verbose');

  return merged;
}

/**
 * Validate server entry file exists
 * @param serverName - Name of the server
 * @param serverConfig - Server configuration
 * @param cwd - Working directory
 * @returns Validation result
 */
export async function validateServerEntry(
  serverName: string,
  serverConfig: ServerConfig,
  cwd: string
): Promise<{ valid: boolean; error?: string }> {
  const entryPath = resolve(cwd, serverConfig.entry);

  try {
    await access(entryPath);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: `Server "${serverName}": entry file not found: ${serverConfig.entry}`,
    };
  }
}

/**
 * Validate entire configuration
 * @param config - Configuration to validate
 * @param cwd - Working directory
 * @returns Validation result with errors and warnings
 */
export async function validateConfig(
  config: CLIConfig,
  cwd: string = process.cwd()
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate default server exists
  if (config.defaultServer) {
    if (!config.servers || !config.servers[config.defaultServer]) {
      errors.push(`Default server "${config.defaultServer}" not found in servers configuration`);
    }
  }

  // Validate all server entries exist
  if (config.servers) {
    for (const [serverName, serverConfig] of Object.entries(config.servers)) {
      const result = await validateServerEntry(serverName, serverConfig, cwd);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }

      // Warn about HTTP without port
      if (serverConfig.transport === 'http' && !serverConfig.port && !config.defaults?.port) {
        warnings.push(
          `Server "${serverName}": HTTP transport configured without explicit port (will use default 3000)`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get list of available servers from config
 * @param config - CLI configuration
 * @returns Array of server names with their entry files
 */
export function listServers(config: CLIConfig | null): Array<{ name: string; entry: string; config: ServerConfig }> {
  if (!config?.servers) {
    return [];
  }

  return Object.entries(config.servers).map(([name, serverConfig]) => ({
    name,
    entry: serverConfig.entry,
    config: serverConfig,
  }));
}
