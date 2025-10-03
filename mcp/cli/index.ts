#!/usr/bin/env node
/**
 * SimplyMCP CLI - Command-line interface for SimplyMCP
 * Main entry point for CLI commands
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bundleCommand } from './bundle.js';
import { runCommand } from './run.js';

// Parse and execute commands
yargs(hideBin(process.argv))
  .scriptName('simplymcp')
  .usage('$0 <command> [options]')
  .command(bundleCommand)
  .command(runCommand)
  .demandCommand(1, 'You must provide a command')
  .help('h')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .parse();
