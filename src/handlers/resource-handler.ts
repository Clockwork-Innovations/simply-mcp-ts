/**
 * Resource Handler
 *
 * Handles resource data extraction and registration.
 * Supports both static resources (pure data in interface) and dynamic resources (requiring implementation).
 */

import type { ParsedResource } from '../server/parser.js';
import type { BuildMCPServer } from '../server/builder-server.js';
import type { DatabaseManager } from '../core/database-manager.js';
import type { ResourceContext } from '../server/interface-types.js';
import { getNamingVariations } from '../server/compiler/utils.js';

/**
 * Register a static resource with the MCP server
 * Static resources have literal data defined in the 'value' field of the interface
 */
export function registerStaticResource(
  server: BuildMCPServer,
  resource: ParsedResource
): void {
  const { uri, name, description, mimeType, data } = resource;

  if (data === undefined) {
    throw new Error(
      `Static resource "${uri}" is missing literal data.\n\n` +
      `Static resources with 'value' field can only contain compile-time literal data ` +
      `(strings, numbers, inline objects). They cannot reference variables or computed values.\n\n` +
      `Solutions:\n` +
      `  1. Use inline literal data in the interface:\n` +
      `     interface ${resource.interfaceName || 'MyResource'} extends IResource {\n` +
      `       uri: '${uri}';\n` +
      `       value: { version: '1.0.0', data: [1, 2, 3] };  // ← Literal values only\n` +
      `     }\n\n` +
      `  2. Use a dynamic resource instead (RECOMMENDED for variable data):\n` +
      `     interface ${resource.interfaceName || 'MyResource'} extends IResource {\n` +
      `       uri: '${uri}';\n` +
      `       returns: { version: string; data: number[] };  // ← Use 'returns' instead of 'value'\n` +
      `     }\n` +
      `     // Then implement on your server class:\n` +
      `     ${resource.methodName || 'myResource'}: ResourceHelper<${resource.interfaceName || 'MyResource'}> = async () => MY_DATA;\n\n` +
      `Hint: If your data is a const/variable, use 'returns' instead of 'value'.`
    );
  }

  // Convert data to content string
  let content: string;
  if (typeof data === 'object') {
    content = JSON.stringify(data, null, 2);
  } else {
    content = String(data);
  }

  // Register with BuildMCPServer
  server.addResource({
    uri,
    name: name || uri,
    description: description || `Resource: ${uri}`,
    mimeType: mimeType || 'application/json',
    content,
  });
}

/**
 * Register a dynamic resource with the MCP server
 * Dynamic resources use 'returns' field in interface and require a method implementation on the server class
 *
 * Supports two patterns:
 * 1. Function-based: method is a function that returns data dynamically
 * 2. Object-based: method is an object with inline 'data' property (static content)
 *
 * @param server - MCP server instance
 * @param serverInstance - User's server class instance
 * @param resource - Parsed resource metadata
 * @param dbManager - Optional database manager for resources with database config
 */
export function registerDynamicResource(
  server: BuildMCPServer,
  serverInstance: any,
  resource: ParsedResource,
  dbManager?: DatabaseManager
): void {
  const { uri, name, description, mimeType, methodName, database } = resource;

  // Phase 2.2: Try semantic method name with naming variations, then fallback to URI
  // This allows flexible naming conventions and both semantic/URI-based patterns:
  // 1. Semantic (any case): userStats / user_stats / UserStats = async () => {...}
  // 2. URI-based: 'stats://users': Resource = async () => {...}
  let method = serverInstance[methodName];  // Try semantic name first (exact match)
  let foundVariation: string | null = null;

  if (!method) {
    // Try naming variations of methodName
    const variations = getNamingVariations(methodName);
    for (const variation of variations) {
      if (serverInstance[variation]) {
        method = serverInstance[variation];
        foundVariation = variation;
        break;
      }
    }
  }

  if (!method) {
    method = serverInstance[uri];  // Fallback to URI as property name
    if (method) {
      foundVariation = uri;
    }
  }

  if (!method) {
    // Generate helpful error message with naming variation suggestions
    const variations = getNamingVariations(methodName).slice(0, 3);  // Show top 3 variations
    const variationExamples = variations.map(v => `  - ${v}: ${resource.interfaceName} = async () => {...}`).join('\n');

    throw new Error(
      `Dynamic resource "${uri}" (with 'returns' field) requires implementation but was not found on server class.\n\n` +
      `Expected pattern (choose one):\n` +
      `  1. Semantic name (any of these naming conventions):\n${variationExamples}\n` +
      `  2. URI property: '${uri}': ${resource.interfaceName} = async () => {...}\n\n` +
      `Hint: Resources with 'returns' field need a runtime implementation.`
    );
  }

  // Handle inline static resources (object with 'data' property)
  if (typeof method === 'object' && method !== null && 'data' in method) {
    // This is an inline static resource definition
    const inlineData = method.data;
    let content: string;

    if (typeof inlineData === 'object') {
      content = JSON.stringify(inlineData, null, 2);
    } else {
      content = String(inlineData);
    }

    server.addResource({
      uri,
      name: method.name || name || uri,
      description: method.description || description || `Resource: ${uri}`,
      mimeType: method.mimeType || mimeType || 'application/json',
      content,
    });
    return;
  }

  // Handle function-based dynamic resources
  if (typeof method !== 'function') {
    throw new Error(
      `Dynamic resource "${uri}" method "${methodName}" must be either:\n` +
      `  1. A function that returns data, or\n` +
      `  2. An object with a 'data' property for inline static content\n` +
      `Found: ${typeof method}`
    );
  }

  // Register the resource with a function that generates content dynamically
  // The function will be called at runtime when resources/read is requested
  server.addResource({
    uri,
    name: name || uri,
    description: description || `Resource: ${uri}`,
    mimeType: mimeType || 'application/json',
    content: () => {
      // Build context object
      const context: ResourceContext = {};

      // If resource has database config and database manager is provided, create connection
      if (database && dbManager) {
        try {
          context.db = dbManager.connect(database);
        } catch (error) {
          console.error(`[Resource Handler] Failed to connect to database for resource "${uri}":`, error);
          throw new Error(
            `Database connection failed for resource "${uri}": ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Call the method on the server instance with context
      return method.call(serverInstance, context);
    },
  });
}

/**
 * Register all resources (static and dynamic) with the MCP server
 *
 * @param server - MCP server instance
 * @param serverInstance - User's server class instance
 * @param resources - Array of parsed resource metadata
 * @param verbose - Enable verbose logging
 * @param dbManager - Optional database manager for resources with database config
 */
export function registerResources(
  server: BuildMCPServer,
  serverInstance: any,
  resources: ParsedResource[],
  verbose?: boolean,
  dbManager?: DatabaseManager
): void {
  for (const resource of resources) {
    if (verbose) {
      const type = resource.dynamic ? 'dynamic' : 'static';
      const hasDb = resource.database ? ' (with database)' : '';
      console.log(`[Interface Adapter] Registering ${type} resource: ${resource.uri}${hasDb}`);
    }

    if (resource.dynamic) {
      registerDynamicResource(server, serverInstance, resource, dbManager);
    } else {
      registerStaticResource(server, resource);
    }
  }
}
