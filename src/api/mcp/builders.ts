/**
 * MCP Builder API - Builder Functions (Layer 2 - Feature Layer)
 *
 * Helper functions for creating MCP Builder configurations.
 * Provides type-safe builders following the same pattern as other APIs.
 *
 * Layer 2 adds MCPBuilderBuilder class for fluent builder pattern.
 *
 * @module api/mcp/builders
 */

import type { MCPBuilderConfig, ToolPreset, PromptPreset, ResourcePreset, MCPBuilderTool } from './types.js';

/**
 * Define an MCP Builder server configuration with type safety
 *
 * This is a simple pass-through function that provides TypeScript
 * type checking for MCP Builder configurations.
 *
 * @param config - MCP Builder configuration
 * @returns The same config, with type checking applied
 *
 * @example Basic usage:
 * ```typescript
 * import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [DesignToolsPreset]
 * });
 * ```
 *
 * @example With multiple presets:
 * ```typescript
 * import { defineMCPBuilder, DesignToolsPreset, TestToolsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev-full',
 *   version: '1.0.0',
 *   description: 'Complete MCP development assistant',
 *   toolPresets: [DesignToolsPreset, TestToolsPreset],
 *   port: 3000
 * });
 * ```
 */
export function defineMCPBuilder(config: MCPBuilderConfig): MCPBuilderConfig {
  return config;
}

/**
 * Builder pattern for creating MCP Builder configurations (Layer 2)
 *
 * Provides a fluent API for composing MCP Builder servers from presets
 * and custom additions.
 *
 * @example
 * ```typescript
 * import { createMCPBuilder, ValidationToolsPreset, WorkflowPromptsPreset } from 'simply-mcp';
 *
 * export default createMCPBuilder({
 *   name: 'mcp-dev-complete',
 *   version: '1.0.0',
 *   description: 'Complete MCP development assistant'
 * })
 *   .useToolPreset(ValidationToolsPreset)
 *   .useToolPreset(CollectionToolsPreset)
 *   .usePromptPreset(WorkflowPromptsPreset)
 *   .useResourcePreset(ReferenceResourcesPreset)
 *   .build();
 * ```
 */
export class MCPBuilderBuilder {
  private config: MCPBuilderConfig;

  constructor(options: { name: string; version: string; description?: string }) {
    this.config = {
      name: options.name,
      version: options.version,
      description: options.description,
      toolPresets: [],
      promptPresets: [],
      resourcePresets: [],
      customTools: [],
      customPrompts: [],
      customResources: [],
    };
  }

  /**
   * Add a tool preset to the configuration
   *
   * @param preset - Tool preset to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useToolPreset(ValidationToolsPreset)
   * ```
   */
  useToolPreset(preset: ToolPreset): this {
    this.config.toolPresets = this.config.toolPresets || [];
    this.config.toolPresets.push(preset);
    return this;
  }

  /**
   * Add a prompt preset to the configuration
   *
   * @param preset - Prompt preset to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.usePromptPreset(WorkflowPromptsPreset)
   * ```
   */
  usePromptPreset(preset: PromptPreset): this {
    this.config.promptPresets = this.config.promptPresets || [];
    this.config.promptPresets.push(preset);
    return this;
  }

  /**
   * Add a resource preset to the configuration
   *
   * @param preset - Resource preset to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useResourcePreset(ReferenceResourcesPreset)
   * ```
   */
  useResourcePreset(preset: ResourcePreset): this {
    this.config.resourcePresets = this.config.resourcePresets || [];
    this.config.resourcePresets.push(preset);
    return this;
  }

  /**
   * Add a custom tool to the configuration
   *
   * @param tool - Custom tool to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.addTool({
   *   name: 'custom_tool',
   *   description: 'My custom tool',
   *   parameters: z.object({ input: z.string() }),
   *   execute: async (args) => 'result'
   * })
   * ```
   */
  addTool(tool: MCPBuilderTool): this {
    this.config.customTools = this.config.customTools || [];
    this.config.customTools.push(tool);
    return this;
  }

  /**
   * Add a custom prompt to the configuration
   *
   * @param prompt - Custom prompt to add
   * @returns This builder for chaining
   */
  addPrompt(prompt: {
    name: string;
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>;
    template: string | ((args: any) => string | Promise<string>);
  }): this {
    this.config.customPrompts = this.config.customPrompts || [];
    this.config.customPrompts.push(prompt);
    return this;
  }

  /**
   * Add a custom resource to the configuration
   *
   * @param resource - Custom resource to add
   * @returns This builder for chaining
   */
  addResource(resource: {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    content: string | { [key: string]: any } | (() => string | { [key: string]: any } | Promise<string | { [key: string]: any }>);
  }): this {
    this.config.customResources = this.config.customResources || [];
    this.config.customResources.push(resource);
    return this;
  }

  /**
   * Set the HTTP port
   *
   * @param port - Port number
   * @returns This builder for chaining
   */
  withPort(port: number): this {
    this.config.port = port;
    return this;
  }

  /**
   * Set the base path
   *
   * @param basePath - Base path for file operations
   * @returns This builder for chaining
   */
  withBasePath(basePath: string): this {
    this.config.basePath = basePath;
    return this;
  }

  /**
   * Build and return the final configuration
   *
   * @returns Complete MCP Builder configuration
   */
  build(): MCPBuilderConfig {
    return this.config;
  }
}

/**
 * Create a new MCP Builder using the builder pattern
 *
 * @param options - Server name, version, and optional description
 * @returns MCPBuilderBuilder instance for chaining
 *
 * @example
 * ```typescript
 * const config = createMCPBuilder({
 *   name: 'mcp-dev',
 *   version: '1.0.0'
 * })
 *   .useToolPreset(ValidationToolsPreset)
 *   .usePromptPreset(WorkflowPromptsPreset)
 *   .build();
 * ```
 */
export function createMCPBuilder(options: {
  name: string;
  version: string;
  description?: string;
}): MCPBuilderBuilder {
  return new MCPBuilderBuilder(options);
}
