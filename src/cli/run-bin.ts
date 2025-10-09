#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-run command
 * Provides a direct alias to 'simplymcp run'
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';
import { runCommand } from './run.js';

// Get package version from package.json
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

// Execute the run command directly
yargs(hideBin(process.argv))
  .scriptName('simplymcp-run')
  .command(runCommand)
  .help('h')
  .alias('h', 'help')
  .version(packageJson.version)
  .alias('v', 'version')
  .demandCommand(1)
  .strict()
  .parse();
