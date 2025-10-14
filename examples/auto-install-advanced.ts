#!/usr/bin/env npx tsx
/**
 * Advanced Auto-Installation Example
 *
 * This example demonstrates advanced auto-installation features:
 * - Custom package manager selection
 * - Progress tracking with callbacks
 * - Custom timeout and retry settings
 * - Detailed status reporting
 *
 * Usage:
 *   npx tsx examples/auto-install-advanced.ts
 */

// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21
// date-fns@^2.30.0
// chalk@^5.3.0
// ///

import { BuildMCPServer, type InstallProgressEvent } from 'simply-mcp';
import { z } from 'zod';

async function main() {
  console.log('[Example] Starting advanced auto-installation demo...\n');

  // Create a simple progress bar
  let lastPercent = 0;
  const progressBar = (current: number, total: number): string => {
    const percent = Math.floor((current / total) * 100);
    const filled = Math.floor(percent / 2);
    const empty = 50 - filled;
    return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${percent}%`;
  };

  // Load server with custom auto-install options
  const server = await BuildMCPServer.fromFile(__filename, {
    name: 'advanced-auto-install',
    version: '1.0.0',
    autoInstall: {
      packageManager: 'npm', // Explicitly use npm
      timeout: 10 * 60 * 1000, // 10 minutes timeout
      retries: 5, // Retry up to 5 times
      ignoreScripts: true, // Security: prevent arbitrary code execution

      // Progress callback
      onProgress: (event: InstallProgressEvent) => {
        const timestamp = new Date(event.timestamp).toLocaleTimeString();

        switch (event.type) {
          case 'start':
            console.log(`\n[${timestamp}] ${event.message}`);
            console.log('─'.repeat(60));
            break;

          case 'progress':
            // Update progress display
            if (event.packageName) {
              process.stdout.write(`\r[${timestamp}] Installing ${event.packageName}...`);
            } else {
              process.stdout.write(`\r[${timestamp}] ${event.message}`);
            }
            break;

          case 'complete':
            console.log(`\n[${timestamp}] ${event.message}`);
            console.log('─'.repeat(60) + '\n');
            break;

          case 'error':
            console.error(`\n[${timestamp}] ERROR: ${event.message}\n`);
            break;
        }
      },

      // Error callback
      onError: (error) => {
        console.error(`[Error] ${error.packageName || 'Unknown'}: ${error.message}`);
        if (error.code) {
          console.error(`  Code: ${error.code}`);
        }
      },
    },
  });

  console.log('[Example] Server loaded successfully!\n');

  // Check detailed dependency status
  const status = await server.checkDependencies();

  console.log('Dependency Status Report:');
  console.log('─'.repeat(60));
  console.log(`Total Dependencies: ${status.installed.length + status.missing.length + status.outdated.length}`);
  console.log(`✓ Installed: ${status.installed.length}`);
  console.log(`✗ Missing: ${status.missing.length}`);
  console.log(`⚠ Outdated: ${status.outdated.length}`);
  console.log('─'.repeat(60));

  if (status.installed.length > 0) {
    console.log('\nInstalled Packages:');
    status.installed.forEach((pkg) => {
      const version = server.getDependencyVersion(pkg);
      console.log(`  ✓ ${pkg}@${version}`);
    });
  }

  if (status.outdated.length > 0) {
    console.log('\nOutdated Packages:');
    status.outdated.forEach((pkg) => {
      console.log(`  ⚠ ${pkg.name}: ${pkg.current} → ${pkg.required}`);
    });
  }

  if (status.missing.length > 0) {
    console.log('\nMissing Packages:');
    status.missing.forEach((pkg) => {
      console.log(`  ✗ ${pkg}`);
    });
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Add advanced tools using installed dependencies
  server.addTool({
    name: 'transform_data',
    description: 'Transform data using lodash utilities',
    parameters: z.object({
      operation: z.enum(['chunk', 'groupBy', 'sortBy', 'uniq']),
      data: z.array(z.any()),
      key: z.string().optional(),
    }),
    execute: async (args) => {
      const _ = (await import('lodash')).default;

      let result: any;

      switch (args.operation) {
        case 'chunk':
          const size = parseInt(args.key || '2', 10);
          result = _.chunk(args.data, size);
          break;
        case 'groupBy':
          result = _.groupBy(args.data, args.key);
          break;
        case 'sortBy':
          result = _.sortBy(args.data, args.key);
          break;
        case 'uniq':
          result = _.uniq(args.data);
          break;
      }

      return JSON.stringify(result, null, 2);
    },
  });

  server.addTool({
    name: 'format_date',
    description: 'Format dates using date-fns',
    parameters: z.object({
      date: z.string(),
      format: z.string().default('yyyy-MM-dd HH:mm:ss'),
      operation: z.enum(['format', 'addDays', 'subDays', 'differenceInDays']).optional(),
      value: z.number().optional(),
    }),
    execute: async (args) => {
      const { format, parseISO, addDays, subDays, differenceInDays } = await import('date-fns');
      const date = parseISO(args.date);

      let result: string;

      if (args.operation === 'addDays' && args.value) {
        const newDate = addDays(date, args.value);
        result = format(newDate, args.format);
      } else if (args.operation === 'subDays' && args.value) {
        const newDate = subDays(date, args.value);
        result = format(newDate, args.format);
      } else {
        result = format(date, args.format);
      }

      return result;
    },
  });

  console.log('[Example] Added 2 advanced tools: transform_data, format_date');
  console.log('[Example] Starting server...\n');

  // Start the server
  await server.start({ transport: 'stdio' });
}

main().catch((error) => {
  console.error('[Example] Fatal error:', error);
  process.exit(1);
});
