import { SecurityConfig } from './security/types.js';
import { HandlerConfig } from './core/types.js';

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

export interface ResourceConfig {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string | { [key: string]: any }; // Static content or path to file
}

export interface ServerConfig {
  name: string;
  version: string;
  port?: number;
  tools?: ToolConfig[];
  prompts?: PromptConfig[];
  resources?: ResourceConfig[];
  security?: SecurityConfig;
}