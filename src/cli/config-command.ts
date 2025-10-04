/**
 * Config command for SimplyMCP CLI
 * Manages configuration files and displays config information
 */

import type { CommandModule } from 'yargs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import {
  loadCLIConfig,
  getConfigFilePath,
  validateConfig,
  listServers,
  type CLIConfig,
} from './cli-config-loader.js';

/**
 * Show current configuration
 */
async function showConfig(configPath?: string): Promise<void> {
  try {
    const configFile = await getConfigFilePath(configPath);

    if (!configFile) {
      console.error('No configuration file found.');
      console.error('');
      console.error('Searched for:');
      console.error('  - simplymcp.config.ts');
      console.error('  - simplymcp.config.js');
      console.error('  - simplymcp.config.mjs');
      console.error('  - simplymcp.config.json');
      console.error('');
      console.error('Create a config file with: simplymcp config init');
      process.exit(1);
    }

    const config = await loadCLIConfig(configPath);

    if (!config) {
      console.error('Failed to load configuration file');
      process.exit(1);
    }

    console.log('Configuration file:', configFile);
    console.log('');
    console.log('Configuration:');
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error loading config:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Validate configuration file
 */
async function validateConfigFile(configPath?: string): Promise<void> {
  try {
    const configFile = await getConfigFilePath(configPath);

    if (!configFile) {
      console.error('No configuration file found');
      process.exit(1);
    }

    console.log('Validating configuration:', configFile);
    console.log('');

    const config = await loadCLIConfig(configPath);

    if (!config) {
      console.error('Failed to load configuration file');
      process.exit(1);
    }

    const validation = await validateConfig(config);

    if (validation.errors.length > 0) {
      console.error('Validation errors:');
      for (const error of validation.errors) {
        console.error('  -', error);
      }
      console.error('');
    }

    if (validation.warnings.length > 0) {
      console.warn('Warnings:');
      for (const warning of validation.warnings) {
        console.warn('  -', warning);
      }
      console.warn('');
    }

    if (validation.valid) {
      console.log('Configuration is valid');
      if (validation.warnings.length > 0) {
        process.exit(0);
      }
    } else {
      console.error('Configuration validation failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error validating config:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * List available servers
 */
async function listAvailableServers(configPath?: string): Promise<void> {
  try {
    const configFile = await getConfigFilePath(configPath);

    if (!configFile) {
      console.error('No configuration file found');
      process.exit(1);
    }

    const config = await loadCLIConfig(configPath);

    if (!config) {
      console.error('Failed to load configuration file');
      process.exit(1);
    }

    const servers = listServers(config);

    if (servers.length === 0) {
      console.log('No servers configured');
      return;
    }

    console.log('Available servers:');
    console.log('');

    for (const server of servers) {
      const isDefault = config.defaultServer === server.name;
      const defaultMarker = isDefault ? ' (default)' : '';

      console.log(`  ${server.name}${defaultMarker}`);
      console.log(`    Entry: ${server.entry}`);

      if (server.config.transport) {
        console.log(`    Transport: ${server.config.transport}`);
      }

      if (server.config.port) {
        console.log(`    Port: ${server.config.port}`);
      }

      if (server.config.style) {
        console.log(`    Style: ${server.config.style}`);
      }

      if (server.config.watch) {
        console.log(`    Watch: enabled`);
      }

      console.log('');
    }

    if (config.defaults) {
      console.log('Global defaults:');
      if (config.defaults.transport) {
        console.log(`  Transport: ${config.defaults.transport}`);
      }
      if (config.defaults.port) {
        console.log(`  Port: ${config.defaults.port}`);
      }
      if (config.defaults.verbose) {
        console.log(`  Verbose: ${config.defaults.verbose}`);
      }
      if (config.defaults.watch) {
        console.log(`  Watch: ${config.defaults.watch}`);
      }
    }
  } catch (error) {
    console.error('Error listing servers:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Initialize a new config file
 */
async function initConfig(format: 'ts' | 'js' | 'json' = 'ts'): Promise<void> {
  try {
    const fileName =
      format === 'ts'
        ? 'simplymcp.config.ts'
        : format === 'js'
          ? 'simplymcp.config.js'
          : 'simplymcp.config.json';

    const configPath = resolve(process.cwd(), fileName);

    // Check if file already exists
    try {
      await readFile(configPath);
      console.error(`Config file already exists: ${fileName}`);
      process.exit(1);
    } catch {
      // File doesn't exist, continue
    }

    let content: string;

    if (format === 'ts') {
      content = `import { defineConfig } from 'simply-mcp/config';

export default defineConfig({
  // Default server to run when no file is specified
  // defaultServer: 'my-server',

  // Named server configurations
  servers: {
    'my-server': {
      entry: './src/my-server.ts',
      transport: 'http',
      port: 3000,
      watch: true,
    },
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
  },
});
`;
    } else if (format === 'js') {
      content = `export default {
  // Default server to run when no file is specified
  // defaultServer: 'my-server',

  // Named server configurations
  servers: {
    'my-server': {
      entry: './src/my-server.js',
      transport: 'http',
      port: 3000,
      watch: true,
    },
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
  },
};
`;
    } else {
      content = JSON.stringify(
        {
          servers: {
            'my-server': {
              entry: './src/my-server.js',
              transport: 'http',
              port: 3000,
              watch: true,
            },
          },
          defaults: {
            transport: 'stdio',
            verbose: false,
          },
        },
        null,
        2
      );
    }

    const { writeFile } = await import('fs/promises');
    await writeFile(configPath, content, 'utf-8');

    console.log(`Created config file: ${fileName}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit the config file to match your setup');
    console.log('  2. Run your server with: simplymcp run my-server');
    console.log('  3. Validate config with: simplymcp config validate');
  } catch (error) {
    console.error('Error creating config:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Yargs command definition for the config command
 */
export const configCommand: CommandModule = {
  command: 'config <action>',
  describe: 'Manage SimpleMCP configuration',
  builder: (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        choices: ['show', 'validate', 'list', 'init'] as const,
        demandOption: true,
      })
      .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to config file',
      })
      .option('format', {
        alias: 'f',
        type: 'string',
        choices: ['ts', 'js', 'json'] as const,
        description: 'Config file format (for init command)',
        default: 'ts' as const,
      })
      .example('$0 config show', 'Show current configuration')
      .example('$0 config validate', 'Validate configuration file')
      .example('$0 config list', 'List available servers')
      .example('$0 config init', 'Initialize new TypeScript config')
      .example('$0 config init --format json', 'Initialize new JSON config');
  },
  handler: async (argv: any) => {
    const action = argv.action as 'show' | 'validate' | 'list' | 'init';
    const configPath = argv.config as string | undefined;
    const format = argv.format as 'ts' | 'js' | 'json';

    switch (action) {
      case 'show':
        await showConfig(configPath);
        break;
      case 'validate':
        await validateConfigFile(configPath);
        break;
      case 'list':
        await listAvailableServers(configPath);
        break;
      case 'init':
        await initConfig(format);
        break;
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  },
};
