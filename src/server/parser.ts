/**
 * Interface Parser - Backwards Compatibility Wrapper
 *
 * This file maintains backwards compatibility by re-exporting
 * from the new modular compiler architecture.
 *
 * @deprecated Import from './compiler/index.js' instead
 */

// Re-export main parse function (renamed from compile to parse for compatibility)
export { compileInterfaceFile as parseInterfaceFile } from './compiler/main-compiler.js';

// Re-export all types
export type {
  ParseResult,
  ParsedTool,
  ParsedPrompt,
  ParsedResource,
  ParsedSampling,
  ParsedElicit,
  ParsedRoots,
  ParsedSubscription,
  ParsedCompletion,
  ParsedUI,
  ParsedRouter,
  ParsedServer,
  ParsedAuth,
  DiscoveredImplementation,
  DiscoveredInstance
} from './compiler/types.js';

// Re-export utilities
export {
  snakeToCamel,
  camelToSnake,
  normalizeToolName,
  toKebabCase
} from './compiler/utils.js';

// Re-export discovery functions (v4 auto-discovery)
export {
  discoverConstServer,
  discoverConstImplementation,
  discoverClassImplementations,
  discoverClassInstance,
  linkImplementationsToInterfaces
} from './compiler/discovery.js';

// Re-export validation
export {
  validateImplementations,
  validateParamsUseIParam,
  extractAnnotationsFromType,
  validateAnnotations,
  getIParamTypeFromTS
} from './compiler/validation-compiler.js';

// Re-export helpers
export { extractStaticData } from './compiler/compiler-helpers.js';
