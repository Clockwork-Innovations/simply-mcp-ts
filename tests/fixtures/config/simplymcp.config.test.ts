/**
 * Test configuration file for SimpleMCP CLI
 * Demonstrates TypeScript config with named servers
 */

import { defineConfig } from '../dist/src/core/config.js';

export default defineConfig({
  // Default server to run when no file is specified
  defaultServer: 'weather',

  // Named server configurations
  servers: {
    weather: {
      entry: './examples/class-basic.ts',
      transport: 'http',
      port: 3000,
      watch: true,
      verbose: true,
    },

    calculator: {
      entry: './examples/class-minimal.ts',
      style: 'decorator',
      transport: 'stdio',
    },

    functional: {
      entry: './examples/single-file-basic.ts',
      style: 'functional',
      transport: 'http',
      port: 3001,
    },
  },

  // Global defaults for all servers
  defaults: {
    transport: 'stdio',
    verbose: false,
  },

  // Default options for run command
  run: {
    watch: false,
  },
});
