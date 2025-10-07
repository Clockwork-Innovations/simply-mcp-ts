/**
 * Extended Type Definitions
 *
 * Extended schema types with comprehensive validation options for advanced use cases.
 * Provides additional constraints and validation rules beyond the core types.
 *
 * @module types/extended
 *
 * @deprecated These types were previously exported from 'src/types-extended.ts'.
 * Import from 'simply-mcp' or 'simply-mcp/types' instead.
 */

import { SecurityConfig } from '../security/types.js';
import { HandlerConfig } from '../core/types.js';
import type { PromptConfig, ResourceConfig } from './core.js';

/**
 * Extended property schema with additional validation options
 */
export interface ExtendedPropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | string[];
  description: string;

  // Existing constraints
  enum?: any[];
  enumNames?: string[]; // Human-readable names for enum values
  default?: any;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'url' | 'uri' | 'uuid' | 'date-time' | 'date' | 'time' | 'hostname' | 'ipv4' | 'ipv6';

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number; // NEW: Value must be greater than (not equal to)
  exclusiveMaximum?: number; // NEW: Value must be less than (not equal to)
  multipleOf?: number; // NEW: Number must be a multiple of this value

  // Array constraints
  items?: ExtendedPropertySchema; // Schema for array items
  minItems?: number; // NEW: Minimum array length
  maxItems?: number; // NEW: Maximum array length
  uniqueItems?: boolean; // NEW: All items must be unique

  // Object constraints
  properties?: Record<string, ExtendedPropertySchema>;
  required?: string[];
  additionalProperties?: boolean | ExtendedPropertySchema;
  minProperties?: number; // NEW: Minimum number of properties
  maxProperties?: number; // NEW: Maximum number of properties

  // Conditional validation (advanced)
  const?: any; // NEW: Must equal this exact value
  oneOf?: ExtendedPropertySchema[]; // NEW: Must match exactly one schema
  anyOf?: ExtendedPropertySchema[]; // NEW: Must match at least one schema
  allOf?: ExtendedPropertySchema[]; // NEW: Must match all schemas
  not?: ExtendedPropertySchema; // NEW: Must NOT match this schema
}

/**
 * Extended tool configuration with comprehensive validation
 */
export interface ExtendedToolConfig {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, ExtendedPropertySchema>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: string | HandlerConfig;

  // Rate limiting
  rateLimit?: {
    window: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
  };

  // Additional metadata
  tags?: string[]; // For categorization
  version?: string; // Tool version
  deprecated?: boolean; // Mark as deprecated
  experimental?: boolean; // Mark as experimental
}

/**
 * Extended server configuration
 */
export interface ExtendedServerConfig {
  name: string;
  version: string;
  port?: number;
  tools?: ExtendedToolConfig[];
  prompts?: PromptConfig[];
  resources?: ResourceConfig[];
  security?: SecurityConfig;
}

// PromptConfig and ResourceConfig are imported from core.ts above
// and used in ExtendedServerConfig. They are not re-exported to avoid
// duplicate exports when both extended.ts and core.ts are exported from index.ts
