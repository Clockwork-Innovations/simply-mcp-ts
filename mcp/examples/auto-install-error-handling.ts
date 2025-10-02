#!/usr/bin/env npx tsx
/**
 * Auto-Installation Error Handling Example
 *
 * This example demonstrates:
 * - Error handling for failed installations
 * - Recovery strategies
 * - Manual dependency installation
 * - Graceful degradation
 *
 * Usage:
 *   npx tsx examples/auto-install-error-handling.ts
 */

// /// dependencies
// axios@^1.6.0
// this-package-does-not-exist-12345@^1.0.0
// ///

import { SimpleMCP } from '../SimpleMCP.js';
import { z } from 'zod';

async function main() {
  console.log('[Example] Demonstrating error handling...\n');

  // Strategy 1: Catch installation errors and continue
  console.log('Strategy 1: Catch errors and continue with available packages');
  console.log('─'.repeat(60));

  let server: SimpleMCP;

  try {
    // Try auto-install (will fail due to invalid package)
    server = await SimpleMCP.fromFile(__filename, {
      name: 'error-handling-demo',
      version: '1.0.0',
      autoInstall: {
        onError: (error) => {
          console.error(`  [Error] ${error.packageName || 'Unknown'}: ${error.message}`);
        },
        onProgress: (event) => {
          if (event.type === 'progress') {
            console.log(`  [Progress] ${event.message}`);
          }
        },
      },
    });

    console.log('\n✓ Installation completed (some packages may have failed)\n');
  } catch (error) {
    console.error('\n✗ Auto-installation failed completely');
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}\n`);

    // Strategy 2: Fallback to manual server creation
    console.log('Strategy 2: Fallback to manual server creation');
    console.log('─'.repeat(60));

    server = new SimpleMCP({
      name: 'error-handling-demo',
      version: '1.0.0',
    });

    console.log('✓ Server created without auto-install\n');

    // Try manual installation
    console.log('Attempting manual installation of valid packages...');
    const result = await server.installDependencies({
      onProgress: (event) => {
        if (event.type !== 'progress') {
          console.log(`  [${event.type}] ${event.message}`);
        }
      },
    });

    if (result.success) {
      console.log(`\n✓ Manual installation successful: ${result.installed.length} packages\n`);
    } else {
      console.log(`\n⚠ Manual installation partial: ${result.installed.length} installed, ${result.failed.length} failed\n`);
    }
  }

  // Strategy 3: Check dependencies and provide user feedback
  console.log('Strategy 3: Check dependency status and provide feedback');
  console.log('─'.repeat(60));

  const status = await server.checkDependencies();

  if (status.missing.length > 0) {
    console.log('\n⚠ Warning: Some dependencies are missing:');
    status.missing.forEach((pkg) => {
      console.log(`  - ${pkg}`);
    });

    console.log('\nRecovery options:');
    console.log('  1. Install manually: npm install ' + status.missing.join(' '));
    console.log('  2. Remove features that depend on missing packages');
    console.log('  3. Use alternative packages\n');
  }

  if (status.installed.length > 0) {
    console.log('✓ Available dependencies:');
    status.installed.forEach((pkg) => {
      console.log(`  - ${pkg}`);
    });
    console.log('');
  }

  // Strategy 4: Add tools with conditional dependency loading
  console.log('Strategy 4: Graceful degradation with conditional features');
  console.log('─'.repeat(60) + '\n');

  server.addTool({
    name: 'safe_fetch',
    description: 'Fetch data with graceful fallback (uses axios if available, otherwise fetch API)',
    parameters: z.object({
      url: z.string().url(),
    }),
    execute: async (args) => {
      try {
        // Try to use axios if available
        const axios = (await import('axios')).default;

        const response = await axios.get(args.url, { timeout: 5000 });

        return `✓ Fetched using axios (status: ${response.status}):\n${JSON.stringify(response.data, null, 2)}`;
      } catch (axiosError) {
        // Fallback to native fetch
        console.error('  [Tool] axios not available, using fetch API');

        try {
          const response = await fetch(args.url, {
            signal: AbortSignal.timeout(5000),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          return `✓ Fetched using native fetch (status: ${response.status}):\n${JSON.stringify(data, null, 2)}`;
        } catch (fetchError) {
          return {
            content: [
              {
                type: 'text',
                text: `✗ Failed to fetch data:\n  - axios: ${axiosError instanceof Error ? axiosError.message : 'not available'}\n  - fetch: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
              },
            ],
            isError: true,
          };
        }
      }
    },
  });

  server.addTool({
    name: 'check_package_availability',
    description: 'Check which optional packages are available',
    parameters: z.object({
      packages: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      const packagesToCheck = args.packages || ['axios', 'lodash', 'date-fns', 'chalk'];
      const results: Record<string, boolean> = {};

      for (const pkg of packagesToCheck) {
        try {
          await import(pkg);
          results[pkg] = true;
        } catch {
          results[pkg] = false;
        }
      }

      const available = Object.entries(results)
        .filter(([, isAvailable]) => isAvailable)
        .map(([pkg]) => pkg);

      const unavailable = Object.entries(results)
        .filter(([, isAvailable]) => !isAvailable)
        .map(([pkg]) => pkg);

      return {
        content: [
          {
            type: 'text',
            text: [
              'Package Availability Report:',
              '',
              `✓ Available (${available.length}):`,
              ...available.map((pkg) => `  - ${pkg}`),
              '',
              `✗ Unavailable (${unavailable.length}):`,
              ...unavailable.map((pkg) => `  - ${pkg}`),
              '',
              'Tip: Install missing packages with:',
              `  npm install ${unavailable.join(' ')}`,
            ].join('\n'),
          },
        ],
      };
    },
  });

  console.log('✓ Added 2 resilient tools: safe_fetch, check_package_availability\n');

  // Strategy 5: Provide helpful installation instructions
  console.log('Strategy 5: User-friendly installation guide');
  console.log('─'.repeat(60));

  if (status.missing.length > 0 || status.outdated.length > 0) {
    console.log('\nTo fix dependency issues:\n');

    if (status.missing.length > 0) {
      console.log('1. Install missing packages:');
      console.log(`   npm install ${status.missing.map((pkg) => {
        const version = server.getDependencyVersion(pkg);
        return version ? `${pkg}@${version}` : pkg;
      }).join(' ')}\n`);
    }

    if (status.outdated.length > 0) {
      console.log('2. Update outdated packages:');
      status.outdated.forEach((pkg) => {
        console.log(`   npm install ${pkg.name}@${pkg.required}`);
      });
      console.log('');
    }

    console.log('3. Or enable auto-install:');
    console.log('   const server = await SimpleMCP.fromFile(__filename, {');
    console.log('     autoInstall: true');
    console.log('   });\n');
  } else {
    console.log('\n✓ All dependencies are installed and up to date!\n');
  }

  console.log('─'.repeat(60) + '\n');
  console.log('[Example] Starting server (with available dependencies only)...\n');

  // Start the server
  await server.start({ transport: 'stdio' });
}

main().catch((error) => {
  console.error('[Example] Fatal error:', error);
  console.error('\nRecovery tips:');
  console.error('  1. Check your internet connection');
  console.error('  2. Verify npm is installed: npm --version');
  console.error('  3. Try manual installation: npm install axios');
  console.error('  4. Check npm registry access: npm ping');
  process.exit(1);
});
