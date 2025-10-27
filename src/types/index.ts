/**
 * Centralized Type Definitions
 *
 * All TypeScript type definitions for simply-mcp framework.
 * Organized by category for better maintainability.
 *
 * @module types
 *
 * This module consolidates all type definitions from across the framework
 * into a single, well-organized location.
 */

// Core framework types (tools, prompts, resources)
export type {
  ToolConfig,
  PromptConfig,
  ResourceConfig,
  ServerConfig as MCPServerConfig, // Renamed to avoid conflict with CLI ServerConfig
} from './core.js';

// Extended schema types with comprehensive validation
export type {
  ExtendedPropertySchema,
  ExtendedToolConfig,
  ExtendedServerConfig,
} from './extended.js';

// Configuration types (CLI and server config)
export type {
  APIStyle,
  TransportType,
  ServerConfig, // This is the CLI ServerConfig
  DefaultsConfig,
  RunConfig,
  BundleConfig,
  CLIConfig,
} from '../core/config.js';

// Schema builder types
export type {
  SchemaType,
  BaseSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  EnumSchema,
  ArraySchema,
  ObjectSchema,
  DateSchema,
  Schema,
} from './schema.js';

// UI resource types (MCP-UI Foundation Layer)
export type {
  UIContentType,
  UIResourcePayload,
  UIResource,
  UIResourceOptions,
} from './ui.js';

// Handler framework types (execution and routing)
export type {
  BaseHandlerConfig,
  InlineHandlerConfig,
  FileHandlerConfig,
  HttpHandlerConfig,
  RegistryHandlerConfig,
  HandlerConfig,
  HandlerContext,
  HandlerExecutionOptions,
} from './handler.js';
