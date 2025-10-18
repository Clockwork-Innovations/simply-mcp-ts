#!/usr/bin/env node
/**
 * Router Testing Mode Example
 *
 * Demonstrates how to use flattenRouters for development and testing.
 * This example shows:
 * - Controlling tool visibility with flattenRouters option
 * - Using environment variables for configuration
 * - Differences between production and testing mode
 * - When and why to use flattenRouters=true
 *
 * flattenRouters Modes:
 *
 * Production (flattenRouters=false, default):
 * - Router-assigned tools are HIDDEN from main tool list
 * - Only routers and unassigned tools are visible
 * - Models must call router first to discover tools
 * - Cleaner, more organized tool list
 *
 * Testing/Development (flattenRouters=true):
 * - ALL tools are visible in main tool list
 * - Easier for testing and exploration
 * - Models can call any tool directly
 * - Useful for debugging and development
 *
 * Usage:
 *   # Run in production mode (default):
 *   npx tsx examples/router-testing/server.ts
 *
 *   # Run in testing mode (show all tools):
 *   FLATTEN_ROUTERS=true npx tsx examples/router-testing/server.ts
 *
 *   # Run with HTTP transport:
 *   npx tsx examples/router-testing/server.ts --http --port 3000
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Check environment variable to determine mode
const flattenRouters = process.env.FLATTEN_ROUTERS === 'true';

// Create server with configurable flattenRouters
const server = new BuildMCPServer({
  name: 'testing-server',
  version: '1.0.0',
  description: 'Example showing flattenRouters for testing and development',
  flattenRouters, // Control via environment variable
});

// ============================================================================
// API Tools (Assigned to Router)
// ============================================================================

/**
 * Call API
 * Makes HTTP requests to external APIs
 */
server.addTool({
  name: 'call_api',
  description: 'Make an HTTP request to an external API',
  parameters: z.object({
    url: z.string().url().describe('API endpoint URL'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().default('GET').describe('HTTP method'),
    body: z.string().optional().describe('Request body (JSON string)'),
  }),
  execute: async (args) => {
    // Mock API call
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      data: {
        message: 'API call successful',
        method: args.method,
        url: args.url,
        timestamp: new Date().toISOString(),
      },
    };

    return `API Response (${args.method} ${args.url}):

Status: ${mockResponse.status} ${mockResponse.statusText}

Response:
${JSON.stringify(mockResponse.data, null, 2)}

Note: This is a mock response for demonstration.`;
  },
});

/**
 * Parse Response
 * Parse and extract data from API responses
 */
server.addTool({
  name: 'parse_response',
  description: 'Parse and extract data from API response',
  parameters: z.object({
    response: z.string().describe('API response (JSON string)'),
    path: z.string().optional().describe('JSONPath expression to extract data'),
  }),
  execute: async (args) => {
    // Mock parsing logic
    try {
      const parsed = JSON.parse(args.response);
      const extracted = args.path
        ? `Extracted value at "${args.path}": ${JSON.stringify(parsed, null, 2)}`
        : `Full parsed response: ${JSON.stringify(parsed, null, 2)}`;

      return `Response Parsing Result:

${extracted}

Parsing completed successfully.`;
    } catch (error) {
      return `Error parsing response: ${error instanceof Error ? error.message : 'Unknown error'}

Please provide valid JSON.`;
    }
  },
});

/**
 * Handle Error
 * Handle and format API errors
 */
server.addTool({
  name: 'handle_error',
  description: 'Handle and format API error responses',
  parameters: z.object({
    status_code: z.number().describe('HTTP status code'),
    error_message: z.string().describe('Error message'),
  }),
  execute: async (args) => {
    // Mock error handling
    const errorCategories: Record<number, string> = {
      400: 'Bad Request - Check your request parameters',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - You don\'t have permission',
      404: 'Not Found - Resource doesn\'t exist',
      500: 'Internal Server Error - Something went wrong on the server',
      503: 'Service Unavailable - Try again later',
    };

    const category = errorCategories[args.status_code] || 'Unknown Error';
    const suggestions = args.status_code >= 500
      ? '- Retry the request after a delay\n- Contact support if the issue persists'
      : '- Check your request parameters\n- Verify authentication credentials';

    return `API Error Handler:

Status Code: ${args.status_code}
Category: ${category}
Message: ${args.error_message}

Suggested Actions:
${suggestions}

Error logged and formatted for display.`;
  },
});

// ============================================================================
// General Tools (Not Assigned to Router)
// ============================================================================

/**
 * General Tool
 * This tool is NOT assigned to any router
 * It's always visible in the main tool list
 */
server.addTool({
  name: 'general_tool',
  description: 'A general-purpose tool not assigned to any router',
  parameters: z.object({
    message: z.string().describe('Message to process'),
  }),
  execute: async (args) => {
    return `General Tool Response:

Message: ${args.message}
Processed at: ${new Date().toISOString()}

This tool is always visible because it's not assigned to any router.`;
  },
});

// ============================================================================
// API Router
// ============================================================================

/**
 * API Router
 * Groups all API-related tools together
 */
server.addRouterTool({
  name: 'api_router',
  description: 'Access API-related tools. Call this to discover API operations.',
  tools: [
    'call_api',
    'parse_response',
    'handle_error',
  ],
});

// ============================================================================
// Server Startup
// ============================================================================

// Parse command line arguments
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3000;

// Start the server
(async () => {
  try {
    await server.start({
      transport: useHttp ? 'http' : 'stdio',
      port: useHttp ? port : undefined,
    });

    // Log server info
    const info = server.getInfo();
    const stats = server.getStats();

    if (!useHttp) {
      console.error(`\n[Router Testing Example] Server "${info.name}" v${info.version} is running`);
      console.error(`\n[Router Testing Example] Current Mode: ${flattenRouters ? 'TESTING/DEVELOPMENT' : 'PRODUCTION'}`);
      console.error(`\n[Router Testing Example] Configuration:`);
      console.error(`  - flattenRouters: ${stats.flattenRouters}`);
      console.error(`  - Environment: FLATTEN_ROUTERS=${process.env.FLATTEN_ROUTERS || 'not set (defaults to false)'}`);

      if (flattenRouters) {
        console.error(`\n[Router Testing Example] TESTING MODE (flattenRouters=true):`);
        console.error(`  Visible Tools:`);
        console.error(`    - api_router (router)`);
        console.error(`    - call_api (assigned to api_router)`);
        console.error(`    - parse_response (assigned to api_router)`);
        console.error(`    - handle_error (assigned to api_router)`);
        console.error(`    - general_tool (unassigned)`);
        console.error(`  Total visible: 5 tools`);
        console.error(`\n  Models can call ANY tool directly.`);
        console.error(`  Useful for testing and exploration.`);
      } else {
        console.error(`\n[Router Testing Example] PRODUCTION MODE (flattenRouters=false):`);
        console.error(`  Visible Tools:`);
        console.error(`    - api_router (router)`);
        console.error(`    - general_tool (unassigned)`);
        console.error(`  Hidden Tools (in router):`);
        console.error(`    - call_api`);
        console.error(`    - parse_response`);
        console.error(`    - handle_error`);
        console.error(`  Total visible: 2 tools`);
        console.error(`\n  Models must call api_router first to discover API tools.`);
        console.error(`  Cleaner tool list, better organization.`);
      }

      console.error(`\n[Router Testing Example] How to access router tools:`);
      console.error(`  1. Call "api_router" to see available tools`);
      console.error(`  2. Call via namespace: "api_router__call_api"`);
      if (flattenRouters) {
        console.error(`  3. Call directly (testing mode): "call_api"`);
      }

      console.error(`\n[Router Testing Example] Stats:`, stats);

      console.error(`\n[Router Testing Example] Try different modes:`);
      console.error(`  Production:  npx tsx server.ts`);
      console.error(`  Testing:     FLATTEN_ROUTERS=true npx tsx server.ts`);
    }
  } catch (error) {
    console.error('[Router Testing Example] Failed to start server:', error);
    process.exit(1);
  }
})();
