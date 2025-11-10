/**
 * Code Execution Server with Docker Executor
 *
 * Demonstrates maximum isolation for untrusted AI-generated code using Docker containers.
 * Ideal for production deployments where security is paramount.
 *
 * Security Features:
 * - Ephemeral containers (create -> execute -> destroy)
 * - Memory limits (256MB default)
 * - Network isolation (disabled by default)
 * - Read-only filesystem
 * - Non-root user execution
 * - All capabilities dropped
 *
 * Requirements:
 * - Docker must be installed and running
 * - npm install dockerode
 *
 * Usage:
 *   npx tsx examples/v4/code-execution-docker-server.ts
 */

import { createServer } from '../../src/index.js';

const server = createServer({
  name: 'docker-code-execution-server',
  description: 'MCP server with Docker-based code execution for maximum isolation',
  version: '1.0.0',

  // Enable Docker-based code execution
  codeExecution: {
    mode: 'docker', // Use Docker containers
    language: 'typescript', // Support TypeScript
    timeout: 30000, // 30 second timeout
    captureOutput: true,
    introspectTools: true, // Enable tool injection

    // Docker-specific configuration
    docker: {
      image: 'node:20-alpine', // Lightweight Alpine-based image
      memoryLimit: 512, // 512MB memory limit
      cpuLimit: 1.0, // 100% of one CPU core
      enableNetwork: false, // No network access (most secure)
    },
  },

  // Example tools that can be called from code execution
  tools: {
    /**
     * Get current timestamp
     */
    getTimestamp: {
      description: 'Get the current Unix timestamp',
      parameters: {},
      handler: async () => {
        return {
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };
      },
    },

    /**
     * Calculate factorial
     */
    factorial: {
      description: 'Calculate factorial of a number',
      parameters: {
        n: {
          type: 'number',
          description: 'Number to calculate factorial for',
        },
      },
      handler: async ({ n }: { n: number }) => {
        if (n < 0) {
          throw new Error('Factorial is not defined for negative numbers');
        }
        if (n > 100) {
          throw new Error('Number too large for factorial calculation');
        }

        let result = 1;
        for (let i = 2; i <= n; i++) {
          result *= i;
        }

        return { n, factorial: result };
      },
    },
  },

  resources: {
    /**
     * Server configuration resource
     */
    'config://docker': {
      description: 'Docker executor configuration',
      mimeType: 'application/json',
      handler: async () => {
        return JSON.stringify(
          {
            mode: 'docker',
            image: 'node:20-alpine',
            memoryLimit: '512MB',
            cpuLimit: '1.0 CPU core',
            networkAccess: 'disabled',
            security: {
              readOnlyFilesystem: true,
              nonRootUser: true,
              capabilitiesDropped: true,
              ephemeralContainers: true,
            },
          },
          null,
          2
        );
      },
    },
  },
});

// Start server
server
  .start()
  .then(() => {
    console.error('Docker code execution server started successfully');
    console.error('\nTest with tool_runner tool:');
    console.error('  Language: typescript or javascript');
    console.error('  Code examples:');
    console.error('    - return 42;');
    console.error('    - const x = await getTimestamp(); return x;');
    console.error('    - const f = await factorial({ n: 5 }); return f;');
    console.error('\nSecurity:');
    console.error('  - Code runs in ephemeral Docker container');
    console.error('  - Memory limit: 512MB');
    console.error('  - CPU limit: 1.0 core');
    console.error('  - Network: disabled');
    console.error('  - Filesystem: read-only');
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
