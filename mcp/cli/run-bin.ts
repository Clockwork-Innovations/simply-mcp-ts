#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-run command
 * Provides a direct alias to 'simplymcp run'
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runCommand } from './run.js';

// Execute the run command directly
yargs(hideBin(process.argv))
  .scriptName('simplymcp-run')
  .command(runCommand)
  .help('h')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .demandCommand(1)
  .strict()
  .parse();
