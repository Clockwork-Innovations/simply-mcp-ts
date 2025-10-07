/**
 * Core Type Definitions
 *
 * Centralized type definitions for the simply-mcp framework.
 * These types are used across the framework for tool, prompt, and resource configurations.
 *
 * @module types/core
 *
 * @deprecated These types were previously exported from 'src/types.ts'.
 * Import from 'simply-mcp' or 'simply-mcp/types' instead.
 */

import { SecurityConfig } from '../security/types.js';
import { HandlerConfig } from '../core/types.js';

/**
 * Tool configuration interface
 * Defines the structure for MCP tool definitions
 */
export interface ToolConfig {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      enumNames?: string[];
      default?: any;
      minimum?: number;
      maximum?: number;
      format?: string;
      maxLength?: number;
    }>;
    required?: string[];
  };
  handler: string | HandlerConfig; // Path to handler function, inline code, or structured config
  rateLimit?: {
    window: number;
    maxRequests: number;
  };
}

/**
 * Prompt configuration interface
 * Defines the structure for MCP prompt definitions
 */
export interface PromptConfig {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string; // Template string with {{variable}} placeholders
}

/**
 * Resource configuration interface
 * Defines the structure for MCP resource definitions
 */
export interface ResourceConfig {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any }; // Static content or path to file
}

/**
 * Server configuration interface
 * Defines the complete structure for an MCP server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
  port?: number;
  tools?: ToolConfig[];
  prompts?: PromptConfig[];
  resources?: ResourceConfig[];
  security?: SecurityConfig;
}
