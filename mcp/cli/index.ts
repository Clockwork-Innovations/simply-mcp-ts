#!/usr/bin/env node
/**
 * SimpleMCP CLI - Command-line interface for SimpleMCP
 * Main entry point for CLI commands
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bundleCommand } from './bundle.js';

// Parse and execute commands
yargs(hideBin(process.argv))
  .scriptName('simplymcp')
  .usage('$0 <command> [options]')
  .command(bundleCommand)
  .demandCommand(1, 'You must provide a command')
  .help('h')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .parse();
