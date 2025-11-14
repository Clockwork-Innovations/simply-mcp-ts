/**
 * Resource Handler
 *
 * Handles resource data extraction and registration.
 * Supports both static resources (pure data in interface) and dynamic resources (requiring implementation).
 */

import type { ParsedResource } from '../server/parser.js';
import type { ParsedSkill } from '../server/compiler/types.js';
import type { BuildMCPServer } from '../server/builder-server.js';
import type { DatabaseManager } from '../core/database-manager.js';
import type { ResourceContext } from '../server/interface-types.js';
import { getNamingVariations } from '../server/compiler/utils.js';
import { uriToMethodName } from '../adapters/ui-adapter.js';
import { generateSkillManual } from '../utils/skill-manual-generator.js';

/**
 * Register a static resource with the MCP server
 * Static resources have literal data defined in the 'value' field of the interface
 */
export function registerStaticResource(
  server: BuildMCPServer,
  resource: ParsedResource
): void {
  const { uri, name, description, mimeType, data, hidden } = resource;

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
    ...(hidden !== undefined && { hidden }),
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
  const { uri, name, description, mimeType, methodName, database, params, hidden } = resource;

  // Phase 2.2: Try semantic method name with naming variations, then fallback to URI
  // This allows flexible naming conventions and both semantic/URI-based patterns:
  // 1. Semantic (any case): userStats / user_stats / UserStats = async () => {...}
  // 2. URI-based: 'stats://users': Resource = async () => {...}

  // Convert URI to camelCase method name first
  const semanticMethodName = uriToMethodName(uri);

  let method = serverInstance[semanticMethodName];  // Try semantic name first (exact match)
  let foundVariation: string | null = null;

  if (!method) {
    // Try naming variations of semantic method name
    const variations = getNamingVariations(semanticMethodName);
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
    const variations = getNamingVariations(semanticMethodName).slice(0, 3);  // Show top 3 variations
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
      ...(hidden !== undefined && { hidden }),
    });
    return;
  }

  // Handle function-based dynamic resources
  if (typeof method !== 'function') {
    throw new Error(
      `Dynamic resource "${uri}" method "${foundVariation || semanticMethodName}" must be either:\n` +
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
    ...(hidden !== undefined && { hidden }),
    content: (passedContext?: any) => {
      // Extract params from passed context (if provided by builder-server)
      const extractedParams = passedContext?.metadata?.params || {};

      // Build resource context object
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

      // Add other context fields from passed context (logger, mcp, batch, capabilities, etc.)
      if (passedContext) {
        if (passedContext.logger) context.logger = passedContext.logger;
        if (passedContext.mcp) context.mcp = passedContext.mcp;
        if (passedContext.batch) context.batch = passedContext.batch;
        if (passedContext.sample) context.sample = passedContext.sample;
        if (passedContext.readResource) context.readResource = passedContext.readResource;
        if (passedContext.elicitInput) context.elicitInput = passedContext.elicitInput;
        if (passedContext.listRoots) context.listRoots = passedContext.listRoots;
      }

      // Call the method with params first (if resource has params), context second
      // This matches the tool pattern: handler(params, context)
      if (params && Object.keys(extractedParams).length > 0) {
        return method.call(serverInstance, extractedParams, context);
      } else {
        // No params - pass context only (backward compatible)
        return method.call(serverInstance, context);
      }
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

/**
 * Register a skill as an MCP resource (Phase 1 - MCP-Native Skills)
 *
 * Skills are exposed as resources with `skill://name` URIs and 'text/markdown' MIME type.
 * Supports both manual markdown content and auto-generated documentation from components.
 *
 * @param server - MCP server instance
 * @param serverInstance - User's server class instance
 * @param skill - Parsed skill metadata
 */
export function registerSkillAsResource(
  server: BuildMCPServer,
  serverInstance: any,
  skill: ParsedSkill
): void {
  const { uri, name, description, mimeType, hidden, methodName, isAutoGenerated, tools, resources, prompts } = skill;

  // Try to find the method implementation with naming variations
  const variations = getNamingVariations(methodName);
  let method: any = null;
  let foundVariation: string | null = null;

  for (const variation of variations) {
    if (serverInstance[variation]) {
      method = serverInstance[variation];
      foundVariation = variation;
      break;
    }
  }

  // For auto-generated skills, method is optional (can return empty string)
  if (!method && !isAutoGenerated) {
    // Manual skills require implementation
    const variationExamples = variations.slice(0, 3).map(v => `  - ${v}: SkillHelper<${skill.interfaceName}> = () => '...'`).join('\n');

    throw new Error(
      `Skill "${name}" with manual 'skill' or 'returns' field requires implementation but was not found on server class.\n\n` +
      `Expected method (any of these naming conventions):\n${variationExamples}\n\n` +
      `The method should return the skill manual as markdown string.\n\n` +
      `Hint: Skills with manual content fields need a runtime implementation that returns markdown.`
    );
  }

  // Auto-generated skills can work without method (default to empty string)
  if (!method && isAutoGenerated) {
    // Create a default no-op method
    method = () => '';
  }

  // Register skill as a resource with dynamic content generator
  server.addResource({
    uri,
    name,
    description,
    mimeType,
    ...(hidden !== undefined && { hidden }),
    content: async () => {
      // Auto-generated path: generate manual from flat arrays
      if (isAutoGenerated && (tools || resources || prompts)) {
        const components = { tools, resources, prompts };
        const result = await generateSkillManual(name, description, components, server);

        // Prepend additional context if method exists
        if (typeof method === 'function') {
          const additionalContext = await method.call(serverInstance);
          if (additionalContext && typeof additionalContext === 'string') {
            return `${additionalContext}\n\n${result.content}`;
          }
        }

        return result.content;
      }

      // Manual path: call method and validate return type
      if (typeof method !== 'function') {
        throw new Error(
          `Skill "${name}" method "${foundVariation || methodName}" must be a function that returns markdown string.\n` +
          `Found: ${typeof method}`
        );
      }

      const content = await method.call(serverInstance);

      if (typeof content !== 'string') {
        throw new Error(
          `Skill "${name}" method "${foundVariation || methodName}" must return a string (markdown content).\n` +
          `Returned: ${typeof content}`
        );
      }

      return content;
    },
  });
}

/**
 * Register all skills as MCP resources
 *
 * @param server - MCP server instance
 * @param serverInstance - User's server class instance
 * @param skills - Array of parsed skill metadata
 * @param verbose - Enable verbose logging
 */
export function registerSkillsAsResources(
  server: BuildMCPServer,
  serverInstance: any,
  skills: ParsedSkill[],
  verbose?: boolean
): void {
  for (const skill of skills) {
    if (verbose) {
      const type = skill.isAutoGenerated ? 'auto-generated' : 'manual';
      console.log(`[Interface Adapter] Registering ${type} skill as resource: ${skill.uri}`);
    }

    // Register main skill resource
    registerSkillAsResource(server, serverInstance, skill);
  }
}
