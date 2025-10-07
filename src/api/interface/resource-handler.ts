/**
 * Resource Handler
 *
 * Handles resource data extraction and registration.
 * Supports both static resources (pure data in interface) and dynamic resources (requiring implementation).
 */

import type { ParsedResource } from './parser.js';
import type { BuildMCPServer } from '../programmatic/BuildMCPServer.js';

/**
 * Register a static resource with the MCP server
 * Static resources have data defined directly in the interface
 */
export function registerStaticResource(
  server: BuildMCPServer,
  resource: ParsedResource
): void {
  const { uri, name, description, mimeType, data } = resource;

  if (data === undefined) {
    throw new Error(
      `Static resource "${uri}" is missing data property. ` +
      `Add a 'data' property or set 'dynamic: true' and implement as a method.`
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
 * Dynamic resources require a method implementation on the server class
 */
export function registerDynamicResource(
  server: BuildMCPServer,
  serverInstance: any,
  resource: ParsedResource
): void {
  const { uri, name, description, mimeType, methodName } = resource;

  // Check if method exists on server instance
  const method = serverInstance[methodName];

  if (!method) {
    throw new Error(
      `Dynamic resource "${uri}" requires method "${methodName}" but it was not found on server class.\n` +
      `Expected: class implements { ${methodName}: ${resource.interfaceName} }`
    );
  }

  if (typeof method !== 'function') {
    throw new Error(
      `Dynamic resource "${uri}" method "${methodName}" is not a function (found: ${typeof method})`
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
      // Call the method on the server instance
      return method.call(serverInstance);
    },
  });
}

/**
 * Register all resources (static and dynamic) with the MCP server
 */
export function registerResources(
  server: BuildMCPServer,
  serverInstance: any,
  resources: ParsedResource[],
  verbose?: boolean
): void {
  for (const resource of resources) {
    if (verbose) {
      const type = resource.dynamic ? 'dynamic' : 'static';
      console.log(`[Interface Adapter] Registering ${type} resource: ${resource.uri}`);
    }

    if (resource.dynamic) {
      registerDynamicResource(server, serverInstance, resource);
    } else {
      registerStaticResource(server, resource);
    }
  }
}
