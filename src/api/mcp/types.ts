/**
 * MCP Builder API - Type Definitions (Foundation Layer)
 *
 * Types for the MCP Builder API - a specialized API for creating
 * MCP servers that help build other MCP servers.
 *
 * This API provides preset tool collections following Anthropic's
 * agent-driven development principles.
 *
 * @module api/mcp
 */

import type { ZodSchema } from 'zod';
import type { ExecuteFunction } from '../programmatic/types.js';

/**
 * MCP Builder tool definition
 *
 * Tools specifically designed for building other MCP tools.
 * These tools follow Anthropic's principles for agent-driven development.
 *
 * @example
 * ```typescript
 * const tool: MCPBuilderTool = {
 *   name: 'design_tool',
 *   description: 'Design a new MCP tool interactively',
 *   parameters: z.object({
 *     purpose: z.string().describe('What the tool should do')
 *   }),
 *   execute: async (args) => {
 *     // Implementation
 *     return 'Tool design created';
 *   },
 *   category: 'design'
 * };
 * ```
 */
export interface MCPBuilderTool<T = any> {
  /** Tool name (kebab-case recommended) */
  name: string;

  /** Clear description of what the tool does */
  description: string;

  /** Zod schema for parameters */
  parameters: ZodSchema<T>;

  /** Tool execution function */
  execute: ExecuteFunction<T>;

  /** Category for organization (optional) */
  category?: 'design' | 'test' | 'generate' | 'analyze';

  /** Usage examples (optional, helpful for agents) */
  examples?: Array<{
    input: T;
    output: string;
    description: string;
  }>;
}

/**
 * Tool preset - collection of related MCP builder tools
 *
 * Presets group tools by function (design, testing, generation, analysis).
 * Use presets to quickly assemble MCP development servers.
 *
 * @example
 * ```typescript
 * const DesignToolsPreset: ToolPreset = {
 *   name: 'Design Tools',
 *   description: 'Tools for designing MCP tools and schemas',
 *   tools: [
 *     { name: 'design_tool', ... },
 *     { name: 'create_zod_schema', ... }
 *   ]
 * };
 * ```
 */
export interface ToolPreset {
  /** Preset name */
  name: string;

  /** Description of what this preset provides */
  description: string;

  /** Collection of tools in this preset */
  tools: MCPBuilderTool[];
}

/**
 * Prompt preset - collection of workflow guidance prompts
 *
 * Prompts provide instructions and best practices for using the MCP Builder.
 * They guide users through the tool development process.
 *
 * @example
 * ```typescript
 * const WorkflowPromptsPreset: PromptPreset = {
 *   name: 'Workflow Prompts',
 *   description: 'Step-by-step workflow guidance',
 *   prompts: [
 *     {
 *       name: 'mcp_builder_workflow',
 *       description: 'Complete workflow guide',
 *       template: 'Step 1: ...'
 *     }
 *   ]
 * };
 * ```
 */
export interface PromptPreset {
  /** Preset name */
  name: string;

  /** Description of what this preset provides */
  description: string;

  /** Collection of prompts in this preset */
  prompts: Array<{
    /** Prompt name */
    name: string;

    /** Prompt description */
    description: string;

    /** Optional arguments for dynamic prompts */
    arguments?: Array<{
      name: string;
      description: string;
      required: boolean;
    }>;

    /** Template string or function */
    template: string | ((args: any) => string | Promise<string>);
  }>;
}

/**
 * Resource preset - collection of reference documentation
 *
 * Resources provide knowledge base content like MCP protocol reference,
 * Zod patterns, Anthropic principles, and examples.
 *
 * @example
 * ```typescript
 * const ReferenceResourcesPreset: ResourcePreset = {
 *   name: 'Reference Resources',
 *   description: 'MCP and Zod documentation',
 *   resources: [
 *     {
 *       uri: 'mcp://protocol-reference',
 *       name: 'MCP Protocol Reference',
 *       description: 'Complete MCP protocol documentation',
 *       mimeType: 'text/markdown',
 *       content: '# MCP Protocol...'
 *     }
 *   ]
 * };
 * ```
 */
export interface ResourcePreset {
  /** Preset name */
  name: string;

  /** Description of what this preset provides */
  description: string;

  /** Collection of resources in this preset */
  resources: Array<{
    /** Resource URI */
    uri: string;

    /** Resource name */
    name: string;

    /** Resource description */
    description: string;

    /** MIME type */
    mimeType: string;

    /** Content (static or dynamic) */
    content: string | { [key: string]: any } | (() => string | { [key: string]: any } | Promise<string | { [key: string]: any }>);
  }>;
}

/**
 * MCP Builder configuration (Layer 2 - Feature Layer)
 *
 * Configuration for creating an MCP Builder server with full feature set.
 * Supports tool presets, prompt presets, resource presets, and custom additions.
 *
 * @example Simple usage (Layer 1):
 * ```typescript
 * const config: MCPBuilderConfig = {
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [DesignToolsPreset]
 * };
 * ```
 *
 * @example Full usage (Layer 2):
 * ```typescript
 * const config: MCPBuilderConfig = {
 *   name: 'mcp-dev-complete',
 *   version: '1.0.0',
 *   description: 'Complete MCP development assistant',
 *   toolPresets: [ValidationToolsPreset, CollectionToolsPreset],
 *   promptPresets: [WorkflowPromptsPreset],
 *   resourcePresets: [ReferenceResourcesPreset],
 *   port: 3000
 * };
 * ```
 */
export interface MCPBuilderConfig {
  /** Server name */
  name: string;

  /** Server version */
  version: string;

  /** Server description (optional) */
  description?: string;

  /** Tool presets to include */
  toolPresets?: ToolPreset[];

  /** Prompt presets to include (Layer 2+) */
  promptPresets?: PromptPreset[];

  /** Resource presets to include (Layer 2+) */
  resourcePresets?: ResourcePreset[];

  /** Custom tools to add (Layer 2+) */
  customTools?: MCPBuilderTool[];

  /** Custom prompts to add (Layer 2+) */
  customPrompts?: Array<{
    name: string;
    description: string;
    arguments?: Array<{ name: string; description: string; required: boolean }>;
    template: string | ((args: any) => string | Promise<string>);
  }>;

  /** Custom resources to add (Layer 2+) */
  customResources?: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    content: string | { [key: string]: any } | (() => string | { [key: string]: any } | Promise<string | { [key: string]: any }>);
  }>;

  /** HTTP port (optional, for HTTP transport) */
  port?: number;

  /** Base path for file operations (optional) */
  basePath?: string;

  /** Default timeout in milliseconds (optional) */
  defaultTimeout?: number;
}
