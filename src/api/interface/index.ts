/**
 * Interface-Driven API
 *
 * Export all interface API types, utilities, and adapters.
 */

// Type definitions
export type {
  IParam,
  ITool,
  IPrompt,
  IResource,
  IServer,
  ToolParams,
  ToolResult,
  PromptArgs,
  ResourceData,
  RouterToolDefinition,
} from './types.js';

// Parser
export type {
  ParsedTool,
  ParsedPrompt,
  ParsedResource,
  ParsedServer,
  ParseResult,
} from './parser.js';

export {
  parseInterfaceFile,
  snakeToCamel,
} from './parser.js';

// Schema Generator
export type {
  ValidationTags,
} from './schema-generator.js';

export {
  typeNodeToZodSchema,
  generateSchemaFromTypeString,
  extractValidationTags,
} from './schema-generator.js';

// Prompt Handler
export {
  extractPlaceholders,
  interpolateTemplate,
  registerStaticPrompt,
  registerDynamicPrompt,
  registerPrompts,
} from './prompt-handler.js';

// Resource Handler
export {
  registerStaticResource,
  registerDynamicResource,
  registerResources,
} from './resource-handler.js';

// InterfaceServer Wrapper
export { InterfaceServer } from './InterfaceServer.js';

// Adapter
export type {
  InterfaceAdapterOptions,
} from './adapter.js';

export {
  loadInterfaceServer,
  isInterfaceFile,
} from './adapter.js';
