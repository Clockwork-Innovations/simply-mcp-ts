/**
 * MCP Builder API Adapter - Layer 2 (Feature Layer)
 *
 * Converts MCP Builder configurations to BuildMCPServer instances.
 * Bridges the MCP Builder API to the core programmatic API.
 *
 * Layer 2 adds support for:
 * - Prompt presets and custom prompts
 * - Resource presets and custom resources
 * - Custom tools
 * - Sampling capability
 *
 * @module api/mcp/adapter
 */

import { BuildMCPServer } from '../programmatic/BuildMCPServer.js';
import type { MCPBuilderConfig } from './types.js';

/**
 * Create BuildMCPServer from MCP Builder configuration
 *
 * Converts an MCP Builder config (with presets) into a BuildMCPServer instance
 * by registering all tools from the included presets.
 *
 * @param config - MCP Builder configuration
 * @returns BuildMCPServer instance ready to start
 *
 * @example
 * ```typescript
 * import { createServerFromMCPBuilder } from './api/mcp/adapter';
 * import { DesignToolsPreset } from './api/mcp/presets';
 *
 * const config = {
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [DesignToolsPreset]
 * };
 *
 * const server = createServerFromMCPBuilder(config);
 * await server.start();
 * ```
 */
export function createServerFromMCPBuilder(config: MCPBuilderConfig): BuildMCPServer {
  // Validate config
  if (!config.name || !config.version) {
    throw new Error(
      'MCP Builder config must have "name" and "version" properties.\n\n' +
      'Example:\n' +
      '  { name: "my-server", version: "1.0.0", toolPresets: [...] }'
    );
  }

  // Create BuildMCPServer instance with sampling enabled
  const server = new BuildMCPServer({
    name: config.name,
    version: config.version,
    description: config.description,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
    transport: config.port ? {
      type: 'http',
      port: config.port,
    } : undefined,
    capabilities: {
      sampling: true  // Enable sampling for AI-powered validation
    }
  });

  let totalTools = 0;
  let totalPrompts = 0;
  let totalResources = 0;

  // Register tools from presets
  if (config.toolPresets && config.toolPresets.length > 0) {
    console.error(
      `[MCP Builder] Loading ${config.toolPresets.length} tool preset(s)...`
    );

    for (const preset of config.toolPresets) {
      console.error(`[MCP Builder]   - ${preset.name}: ${preset.tools.length} tools`);

      for (const tool of preset.tools) {
        server.addTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          execute: tool.execute,
        });
        totalTools++;
      }
    }
  }

  // Register custom tools (Layer 2+)
  if (config.customTools && config.customTools.length > 0) {
    console.error(`[MCP Builder] Loading ${config.customTools.length} custom tool(s)...`);

    for (const tool of config.customTools) {
      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        execute: tool.execute,
      });
      totalTools++;
    }
  }

  // Register prompts from presets (Layer 2+)
  if (config.promptPresets && config.promptPresets.length > 0) {
    console.error(
      `[MCP Builder] Loading ${config.promptPresets.length} prompt preset(s)...`
    );

    for (const preset of config.promptPresets) {
      console.error(`[MCP Builder]   - ${preset.name}: ${preset.prompts.length} prompts`);

      for (const prompt of preset.prompts) {
        server.addPrompt({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
          template: prompt.template,
        });
        totalPrompts++;
      }
    }
  }

  // Register custom prompts (Layer 2+)
  if (config.customPrompts && config.customPrompts.length > 0) {
    console.error(`[MCP Builder] Loading ${config.customPrompts.length} custom prompt(s)...`);

    for (const prompt of config.customPrompts) {
      server.addPrompt({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        template: prompt.template,
      });
      totalPrompts++;
    }
  }

  // Register resources from presets (Layer 2+)
  if (config.resourcePresets && config.resourcePresets.length > 0) {
    console.error(
      `[MCP Builder] Loading ${config.resourcePresets.length} resource preset(s)...`
    );

    for (const preset of config.resourcePresets) {
      console.error(`[MCP Builder]   - ${preset.name}: ${preset.resources.length} resources`);

      for (const resource of preset.resources) {
        server.addResource({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          content: resource.content,
        });
        totalResources++;
      }
    }
  }

  // Register custom resources (Layer 2+)
  if (config.customResources && config.customResources.length > 0) {
    console.error(`[MCP Builder] Loading ${config.customResources.length} custom resource(s)...`);

    for (const resource of config.customResources) {
      server.addResource({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        content: resource.content,
      });
      totalResources++;
    }
  }

  console.error(
    `[MCP Builder] Server "${config.name}" ready with ${totalTools} tools, ${totalPrompts} prompts, ${totalResources} resources`
  );

  return server;
}

/**
 * Load MCP Builder server from file
 *
 * Dynamically imports an MCP Builder config file and creates a server instance.
 * Useful for CLI tools that need to load configs from user files.
 *
 * @param filePath - Path to the MCP Builder config file
 * @returns Promise resolving to BuildMCPServer instance
 *
 * @example
 * ```typescript
 * const server = await loadMCPBuilderServer('./mcp-dev.ts');
 * await server.start();
 * ```
 */
export async function loadMCPBuilderServer(filePath: string): Promise<BuildMCPServer> {
  const { resolve } = await import('node:path');
  const { pathToFileURL } = await import('node:url');

  // Resolve to absolute path
  const absolutePath = resolve(filePath);

  // Convert to file URL for ESM import
  const fileUrl = pathToFileURL(absolutePath).href;

  // Dynamic import with cache busting
  const module = await import(`${fileUrl}?t=${Date.now()}`);

  // Get the default export
  const config = module.default;

  if (!config) {
    throw new Error(
      `MCP Builder file must have a default export.\n\n` +
      `File: ${filePath}\n\n` +
      `Example:\n` +
      `  import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';\n` +
      `  \n` +
      `  export default defineMCPBuilder({\n` +
      `    name: 'my-server',\n` +
      `    version: '1.0.0',\n` +
      `    toolPresets: [DesignToolsPreset]\n` +
      `  });`
    );
  }

  // Create server from config
  return createServerFromMCPBuilder(config);
}

/**
 * Check if a file is an MCP Builder config file
 *
 * Attempts to detect if a file uses the MCP Builder API by checking for
 * defineMCPBuilder or createMCPBuilder usage.
 *
 * @param filePath - Path to file to check
 * @returns True if file appears to be an MCP Builder config
 *
 * @example
 * ```typescript
 * if (await isMCPBuilderFile('./server.ts')) {
 *   const server = await loadMCPBuilderServer('./server.ts');
 * }
 * ```
 */
export async function isMCPBuilderFile(filePath: string): Promise<boolean> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');

    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');

    // Check for MCP Builder API usage
    const hasMCPBuilder = content.includes('defineMCPBuilder') ||
                          content.includes('createMCPBuilder') ||
                          content.includes('MCPBuilderConfig') ||
                          content.includes('ToolPreset');

    return hasMCPBuilder;
  } catch {
    return false;
  }
}
