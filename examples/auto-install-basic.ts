#!/usr/bin/env npx tsx
/**
 * Basic Auto-Installation Example
 *
 * This example demonstrates simple automatic dependency installation
 * using SimplyMCP's auto-install feature.
 *
 * Usage:
 *   npx tsx examples/auto-install-basic.ts
 */

// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

async function main() {
  console.log('[Example] Loading server with auto-install...');

  // Load server from file with auto-install enabled
  const server = await BuildMCPServer.fromFile(__filename, {
    name: 'auto-install-demo',
    version: '1.0.0',
    autoInstall: true, // Enable automatic dependency installation
  });

  console.log('[Example] Server loaded successfully!');

  // Check dependency status
  const status = await server.checkDependencies();
  console.log('[Example] Dependency Status:');
  console.log(`  - Installed: ${status.installed.join(', ')}`);
  console.log(`  - Missing: ${status.missing.join(', ')}`);
  console.log(`  - Outdated: ${status.outdated.length}`);

  // Add a demo tool that uses the installed dependencies
  server.addTool({
    name: 'fetch_data',
    description: 'Fetch data from a URL using axios',
    parameters: z.object({
      url: z.string().url(),
    }),
    execute: async (args) => {
      // Import axios dynamically (now it's installed)
      const axios = (await import('axios')).default;

      try {
        const response = await axios.get(args.url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'SimplyMCP-AutoInstall-Demo/1.0',
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: response.status,
                  statusText: response.statusText,
                  data: response.data,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching URL: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  });

  server.addTool({
    name: 'validate_data',
    description: 'Validate JSON data using Zod schema',
    parameters: z.object({
      data: z.string(),
      schema_type: z.enum(['user', 'post', 'comment']),
    }),
    execute: async (args) => {
      // Define schemas
      const schemas = {
        user: z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
        }),
        post: z.object({
          id: z.number(),
          title: z.string(),
          body: z.string(),
          userId: z.number(),
        }),
        comment: z.object({
          id: z.number(),
          name: z.string(),
          email: z.string().email(),
          body: z.string(),
        }),
      };

      try {
        const parsed = JSON.parse(args.data);
        const schema = schemas[args.schema_type];
        const validated = schema.parse(parsed);

        return {
          content: [
            {
              type: 'text',
              text: `✓ Validation successful for ${args.schema_type}:\n${JSON.stringify(validated, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  });

  console.log('[Example] Added 2 demo tools: fetch_data, validate_data');
  console.log('[Example] Starting server...');

  // Start the server
  await server.start({ transport: 'stdio' });
}

main().catch((error) => {
  console.error('[Example] Fatal error:', error);
  process.exit(1);
});
