#!/usr/bin/env node
/**
 * Multi-Router Pattern Example
 *
 * Demonstrates advanced router patterns with tool sharing.
 * This example shows:
 * - One tool belonging to multiple routers
 * - Each router having exclusive tools
 * - Namespace invocation for the same tool via different routers
 * - Using flattenRouters=true to show all tools (testing/discovery mode)
 *
 * Key Concepts:
 * - A single tool (e.g., 'search') can belong to multiple routers
 * - Calling search_router__search vs products_router__search calls the SAME tool
 * - Both calls are functionally equivalent
 * - flattenRouters=true reveals all tools for testing/exploration
 *
 * Usage:
 *   # Run with stdio transport:
 *   npx tsx examples/router-multi/server.ts
 *
 *   # Run with HTTP transport:
 *   npx tsx examples/router-multi/server.ts --http --port 3000
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Create server with flattenRouters=true to show all tools
// This is useful for testing and exploration
const server = new BuildMCPServer({
  name: 'multi-router-server',
  version: '1.0.0',
  description: 'Example demonstrating tools in multiple routers',
  flattenRouters: true, // Show all tools (testing/discovery mode)
});

// ============================================================================
// Shared Tool - Available in Multiple Routers
// ============================================================================

/**
 * Universal Search Tool
 *
 * This tool is shared across multiple routers.
 * It demonstrates how a single tool can serve multiple contexts:
 * - search_router__search (general search)
 * - products_router__search (product search)
 * - users_router__search (user search)
 *
 * All three namespace calls execute the SAME tool with the SAME logic.
 */
server.addTool({
  name: 'search',
  description: 'Search across the system. Supports multiple entity types.',
  parameters: z.object({
    query: z.string().min(1).describe('Search query string'),
    entity_type: z.enum(['product', 'user', 'all']).optional().default('all').describe('Type of entity to search'),
    limit: z.number().min(1).max(100).optional().default(10).describe('Maximum number of results'),
  }),
  execute: async (args, context) => {
    // Access router context to see which router was used (if namespace was used)
    const namespace = context?.metadata?.namespace;
    const routers = context?.metadata?.routers || [];

    // Mock search results based on entity type
    const results: string[] = [];
    const queryLower = args.query.toLowerCase();

    if (args.entity_type === 'product' || args.entity_type === 'all') {
      results.push(`Product: "${queryLower}" Widget ($29.99)`);
      results.push(`Product: "${queryLower}" Pro ($49.99)`);
    }

    if (args.entity_type === 'user' || args.entity_type === 'all') {
      results.push(`User: ${queryLower}@example.com (Active)`);
      results.push(`User: ${queryLower}.admin@example.com (Admin)`);
    }

    const contextInfo = namespace
      ? `\n\nCalled via router: ${namespace}`
      : `\n\nAvailable in routers: ${routers.join(', ')}`;

    return `Search Results for "${args.query}" (${args.entity_type}):

${results.slice(0, args.limit).join('\n')}

Found ${results.length} results.${contextInfo}`;
  },
});

// ============================================================================
// Product-Specific Tools
// ============================================================================

/**
 * Create Product
 * Exclusive to products_router
 */
server.addTool({
  name: 'create_product',
  description: 'Create a new product in the catalog',
  parameters: z.object({
    name: z.string().min(1).describe('Product name'),
    price: z.number().min(0).describe('Product price'),
    category: z.string().optional().describe('Product category'),
  }),
  execute: async (args) => {
    // Mock product creation
    const productId = `PROD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    return `Product created successfully!

ID: ${productId}
Name: ${args.name}
Price: $${args.price.toFixed(2)}
Category: ${args.category || 'Uncategorized'}

Product is now available in the catalog.`;
  },
});

/**
 * Update Product
 * Exclusive to products_router
 */
server.addTool({
  name: 'update_product',
  description: 'Update an existing product',
  parameters: z.object({
    product_id: z.string().min(1).describe('Product ID to update'),
    name: z.string().optional().describe('New product name'),
    price: z.number().min(0).optional().describe('New product price'),
  }),
  execute: async (args) => {
    // Mock product update
    const updates: string[] = [];
    if (args.name) updates.push(`Name: ${args.name}`);
    if (args.price !== undefined) updates.push(`Price: $${args.price.toFixed(2)}`);

    return `Product ${args.product_id} updated successfully!

Changes:
${updates.join('\n')}

Updated at: ${new Date().toISOString()}`;
  },
});

// ============================================================================
// User-Specific Tools
// ============================================================================

/**
 * Create User
 * Exclusive to users_router
 */
server.addTool({
  name: 'create_user',
  description: 'Create a new user account',
  parameters: z.object({
    email: z.string().email().describe('User email address'),
    name: z.string().min(1).describe('User full name'),
    role: z.enum(['user', 'admin']).optional().default('user').describe('User role'),
  }),
  execute: async (args) => {
    // Mock user creation
    const userId = `USER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    return `User created successfully!

ID: ${userId}
Email: ${args.email}
Name: ${args.name}
Role: ${args.role}

Activation email sent to ${args.email}`;
  },
});

/**
 * Update User
 * Exclusive to users_router
 */
server.addTool({
  name: 'update_user',
  description: 'Update an existing user account',
  parameters: z.object({
    user_id: z.string().min(1).describe('User ID to update'),
    name: z.string().optional().describe('New user name'),
    role: z.enum(['user', 'admin']).optional().describe('New user role'),
  }),
  execute: async (args) => {
    // Mock user update
    const updates: string[] = [];
    if (args.name) updates.push(`Name: ${args.name}`);
    if (args.role) updates.push(`Role: ${args.role}`);

    return `User ${args.user_id} updated successfully!

Changes:
${updates.join('\n')}

Updated at: ${new Date().toISOString()}`;
  },
});

// ============================================================================
// Routers
// ============================================================================

/**
 * Search Router
 * General-purpose search functionality
 */
server.addRouterTool({
  name: 'search_router',
  description: 'Access search functionality. Call this to discover search tools.',
  tools: ['search'], // Only contains the shared search tool
});

/**
 * Products Router
 * Product management tools including search
 */
server.addRouterTool({
  name: 'products_router',
  description: 'Access product management tools. Call this to discover product operations.',
  tools: [
    'search',           // Shared tool - also in search_router and users_router
    'create_product',   // Exclusive to this router
    'update_product',   // Exclusive to this router
  ],
});

/**
 * Users Router
 * User management tools including search
 */
server.addRouterTool({
  name: 'users_router',
  description: 'Access user management tools. Call this to discover user operations.',
  tools: [
    'search',        // Shared tool - also in search_router and products_router
    'create_user',   // Exclusive to this router
    'update_user',   // Exclusive to this router
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
      console.error(`\n[Multi-Router Example] Server "${info.name}" v${info.version} is running`);
      console.error(`\n[Multi-Router Example] Router Configuration:`);
      console.error(`  - search_router: [search]`);
      console.error(`  - products_router: [search, create_product, update_product]`);
      console.error(`  - users_router: [search, create_user, update_user]`);
      console.error(`\n[Multi-Router Example] Shared Tool:`);
      console.error(`  - "search" belongs to ALL 3 routers`);
      console.error(`  - Call via search_router__search`);
      console.error(`  - Call via products_router__search`);
      console.error(`  - Call via users_router__search`);
      console.error(`  - All three calls execute the SAME tool`);
      console.error(`\n[Multi-Router Example] Configuration:`);
      console.error(`  - flattenRouters: ${stats.flattenRouters} (all tools visible)`);
      console.error(`  - Total tools: ${stats.tools}`);
      console.error(`  - Routers: ${stats.routers}`);
      console.error(`  - Assigned tools: ${stats.assignedTools}`);
      console.error(`  - Unassigned tools: ${stats.unassignedTools}`);
      console.error(`\n[Multi-Router Example] Try these patterns:`);
      console.error(`  1. Call search_router to see available search tools`);
      console.error(`  2. Call products_router to see product management tools`);
      console.error(`  3. Call search via namespace: search_router__search`);
      console.error(`  4. Call search directly (visible due to flattenRouters=true)`);
      console.error(`\n[Multi-Router Example] Stats:`, stats);
    }
  } catch (error) {
    console.error('[Multi-Router Example] Failed to start server:', error);
    process.exit(1);
  }
})();
