#!/usr/bin/env node
/**
 * SimplyMCP CLI - Command-line interface for SimplyMCP
 * Main entry point for CLI commands
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';
import { bundleCommand } from './bundle.js';
import { runCommand } from './run.js';
import { listCommand } from './list.js';
import { stopCommand } from './stop.js';
import { configCommand } from './config-command.js';

// Get package version from package.json
// Using createRequire for reliable package.json loading from compiled dist/
// Path from dist/src/cli/index.js -> ../../../package.json
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

// Parse and execute commands
yargs(hideBin(process.argv))
  .scriptName('simplymcp')
  .usage('$0 <command> [options]')
  .command(runCommand)
  .command(bundleCommand)
  .command(listCommand)
  .command(stopCommand)
  .command(configCommand)
  .demandCommand(1, 'You must provide a command')
  .help('h')
  .alias('h', 'help')
  .version(packageJson.version)
  .alias('V', 'version')
  .strict()
  .parse();
