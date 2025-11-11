#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-bundle command
 * Provides a direct alias to 'simplymcp bundle'
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';
import { bundleCommand } from './bundle.js';

// Get package version from package.json
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

// Extract the handler and builder from bundleCommand
const { builder, handler } = bundleCommand;

// Execute the bundle command directly without requiring 'bundle' subcommand
yargs(hideBin(process.argv))
  .scriptName('simplymcp-bundle')
  .usage('$0 [entry] [options]')
  .command({
    command: '$0 [entry]',
    describe: 'Bundle a SimplyMCP server into a standalone distribution',
    builder: builder as any,
    handler: handler as any,
  })
  .help('h')
  .alias('h', 'help')
  .version(packageJson.version)
  .alias('v', 'version')
  .strict()
  .parse();
