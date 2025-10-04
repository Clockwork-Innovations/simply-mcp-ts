#!/usr/bin/env node
/**
 * SimplyMCP CLI - Command-line interface for SimplyMCP
 * Main entry point for CLI commands
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bundleCommand } from './bundle.js';
import { runCommand } from './run.js';
import { listCommand } from './list.js';
import { stopCommand } from './stop.js';
import { configCommand } from './config-command.js';

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
  .version()
  .alias('V', 'version')
  .strict()
  .parse();
