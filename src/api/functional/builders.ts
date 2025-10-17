/**
 * Functional API Builders
 *
 * Builder functions and classes for creating MCP server configurations.
 *
 * Inspired by FastMCP - allows defining MCP servers using a declarative configuration
 * with tools, prompts, and resources.
 *
 * @example
 * ```typescript
 * import { defineMCP } from 'simply-mcp';
 * import { z } from 'zod';
 *
 * export default defineMCP({
 *   name: 'my-server',
 *   version: '1.0.0',
 *   tools: [
 *     {
 *       name: 'greet',
 *       description: 'Greet a user',
 *       parameters: z.object({ name: z.string() }),
 *       execute: async (args) => `Hello, ${args.name}!`
 *     }
 *   ]
 * });
 * ```
 */

import type {
  SingleFileMCPConfig,
  SingleFileTool,
  SingleFilePrompt,
  SingleFileResource,
  SingleFileUIResource,
  ServerOptions,
} from './types.js';
import { Schema } from '../../schema-builder.js';

// Re-export Schema builder for convenience
export { Schema };

/**
 * Helper function to define an MCP configuration with type safety
 * This function doesn't do anything at runtime - it just provides type checking
 */
export function defineMCP(config: SingleFileMCPConfig): SingleFileMCPConfig {
  return config;
}

/**
 * Helper function to define a tool with type safety
 */
export function defineTool<T = any>(tool: SingleFileTool<T>): SingleFileTool<T> {
  return tool;
}

/**
 * Helper function to define a prompt with type safety
 */
export function definePrompt(prompt: SingleFilePrompt): SingleFilePrompt {
  return prompt;
}

/**
 * Helper function to define a resource with type safety
 */
export function defineResource(resource: SingleFileResource): SingleFileResource {
  return resource;
}

/**
 * Helper function to define a UI resource with type safety and validation
 *
 * UI resources are special resources that can be rendered as interactive
 * UI elements in MCP clients. This helper validates UI-specific constraints
 * and provides type safety for UI resource definitions.
 *
 * @param uiResource - UI resource definition with validated constraints
 * @returns The same UI resource definition (for type checking)
 *
 * @throws {Error} If URI doesn't start with "ui://"
 * @throws {Error} If MIME type is not a valid UI resource type
 *
 * @example
 * ```typescript
 * import { defineUIResource } from 'simply-mcp';
 *
 * // Static HTML UI resource
 * const feedbackForm = defineUIResource({
 *   uri: 'ui://form/feedback',
 *   name: 'Feedback Form',
 *   description: 'User feedback form',
 *   mimeType: 'text/html',
 *   content: '<form><h2>Feedback</h2><textarea></textarea></form>'
 * });
 *
 * // Dynamic HTML UI resource
 * const dashboard = defineUIResource({
 *   uri: 'ui://dashboard/stats',
 *   name: 'Stats Dashboard',
 *   description: 'Live statistics',
 *   mimeType: 'text/html',
 *   content: async () => {
 *     const stats = await getStats();
 *     return `<div><h1>Users: ${stats.users}</h1></div>`;
 *   }
 * });
 *
 * // External URL UI resource
 * const analytics = defineUIResource({
 *   uri: 'ui://analytics/dashboard',
 *   name: 'Analytics Dashboard',
 *   description: 'Analytics dashboard',
 *   mimeType: 'text/uri-list',
 *   content: 'https://analytics.example.com/dashboard'
 * });
 *
 * // Remote DOM UI resource
 * const counter = defineUIResource({
 *   uri: 'ui://counter/v1',
 *   name: 'Interactive Counter',
 *   description: 'Counter component',
 *   mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
 *   content: `
 *     const card = remoteDOM.createElement('div', { style: { padding: '20px' } });
 *     const title = remoteDOM.createElement('h2');
 *     remoteDOM.setTextContent(title, 'Counter');
 *     remoteDOM.appendChild(card, title);
 *   `
 * });
 * ```
 */
export function defineUIResource(uiResource: SingleFileUIResource): SingleFileUIResource {
  // Validate UI resource URI
  if (!uiResource.uri.startsWith('ui://')) {
    throw new Error(
      `UI resource URI must start with "ui://", got: "${uiResource.uri}"\n\n` +
      `What went wrong:\n` +
      `  UI resources must use the "ui://" URI scheme to be recognized by MCP-UI clients.\n\n` +
      `To fix:\n` +
      `  Change the URI to start with "ui://"\n\n` +
      `Example:\n` +
      `  defineUIResource({\n` +
      `    uri: 'ui://product-card/v1',  // Correct\n` +
      `    name: 'Product Card',\n` +
      `    description: 'Product selector',\n` +
      `    mimeType: 'text/html',\n` +
      `    content: '<div>...</div>'\n` +
      `  });\n\n` +
      `Tip: Use descriptive URIs like "ui://app-name/component-name/version"`
    );
  }

  // Validate UI resource MIME type
  const validMimeTypes = [
    'text/html',
    'text/uri-list',
    'application/vnd.mcp-ui.remote-dom+javascript'
  ];

  if (!validMimeTypes.includes(uiResource.mimeType)) {
    throw new Error(
      `Invalid UI resource MIME type: "${uiResource.mimeType}"\n\n` +
      `What went wrong:\n` +
      `  UI resources must use specific MIME types to indicate how they should be rendered.\n\n` +
      `Valid MIME types:\n` +
      `  - text/html: Inline HTML content (Foundation Layer)\n` +
      `  - text/uri-list: External URL (Feature Layer)\n` +
      `  - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM (Layer 3)\n\n` +
      `To fix:\n` +
      `  Use one of the valid MIME types listed above\n\n` +
      `Example:\n` +
      `  defineUIResource({\n` +
      `    uri: 'ui://product-card/v1',\n` +
      `    name: 'Product Card',\n` +
      `    description: 'Product selector',\n` +
      `    mimeType: 'text/html',  // Valid MIME type\n` +
      `    content: '<div>...</div>'\n` +
      `  });`
    );
  }

  return uiResource;
}

/**
 * Builder pattern for creating MCP configs (alternative to defineMCP)
 * Inspired by FastMCP's decorator pattern
 */
export class MCPBuilder {
  private config: SingleFileMCPConfig;

  constructor(options: ServerOptions) {
    this.config = {
      name: options.name,
      version: options.version,
      port: options.port,
      basePath: options.basePath,
      defaultTimeout: options.defaultTimeout,
      tools: [],
      prompts: [],
      resources: [],
    };
  }

  /**
   * Add a tool to the server
   */
  tool<T = any>(tool: SingleFileTool<T>): this {
    this.config.tools = this.config.tools || [];
    this.config.tools.push(tool);
    return this;
  }

  /**
   * Add a prompt to the server
   */
  prompt(prompt: SingleFilePrompt): this {
    this.config.prompts = this.config.prompts || [];
    this.config.prompts.push(prompt);
    return this;
  }

  /**
   * Add a resource to the server
   */
  resource(resource: SingleFileResource): this {
    this.config.resources = this.config.resources || [];
    this.config.resources.push(resource);
    return this;
  }

  /**
   * Add a UI resource to the server
   *
   * UI resources are special resources that can be rendered as interactive
   * UI elements in MCP clients. This method validates UI-specific constraints.
   *
   * @param uiResource - UI resource definition
   * @returns this for chaining
   *
   * @throws {Error} If URI doesn't start with "ui://"
   * @throws {Error} If MIME type is not a valid UI resource type
   *
   * @example
   * ```typescript
   * const server = createMCP({ name: 'my-server', version: '1.0.0' })
   *   .uiResource({
   *     uri: 'ui://form/feedback',
   *     name: 'Feedback Form',
   *     description: 'User feedback form',
   *     mimeType: 'text/html',
   *     content: '<form>...</form>'
   *   })
   *   .build();
   * ```
   */
  uiResource(uiResource: SingleFileUIResource): this {
    // Validate and add to UI resources
    const validated = defineUIResource(uiResource);
    this.config.uiResources = this.config.uiResources || [];
    this.config.uiResources.push(validated);
    return this;
  }

  /**
   * Build and return the config
   */
  build(): SingleFileMCPConfig {
    return this.config;
  }
}

/**
 * Create a new MCP builder
 */
export function createMCP(options: ServerOptions): MCPBuilder {
  return new MCPBuilder(options);
}
