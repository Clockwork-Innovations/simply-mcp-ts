/**
 * Interface Compiler - Barrel Export
 *
 * Central export point for the modular interface compiler system.
 * Compiles TypeScript interface-driven API definitions into runtime metadata.
 */

// Main compiler function
export { compileInterfaceFile } from './main-compiler.js';

// Type definitions
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
} from './types.js';

// Utilities
export {
  snakeToCamel,
  camelToSnake,
  normalizeToolName,
  toKebabCase
} from './utils.js';

// Discovery functions (v4 auto-discovery)
export {
  discoverConstServer,
  discoverConstImplementation,
  discoverClassImplementations,
  discoverClassInstance,
  linkImplementationsToInterfaces
} from './discovery.js';

// Validation
export {
  validateImplementations,
  validateParamsUseIParam,
  extractAnnotationsFromType,
  validateAnnotations,
  getIParamTypeFromTS
} from './validation-compiler.js';

// Individual compilers (exported for direct use if needed)
export { compileToolInterface } from './compilers/tool-compiler.js';
export { compilePromptInterface } from './compilers/prompt-compiler.js';
export { compileResourceInterface } from './compilers/resource-compiler.js';
export { compileSamplingInterface } from './compilers/sampling-compiler.js';
export { compileElicitInterface } from './compilers/elicit-compiler.js';
export { compileRootsInterface } from './compilers/roots-compiler.js';
export { compileSubscriptionInterface } from './compilers/subscription-compiler.js';
export { compileCompletionInterface } from './compilers/completion-compiler.js';
export { compileUIInterface } from './compilers/ui-compiler.js';
export { compileRouterInterface } from './compilers/router-compiler.js';
export { compileServerInterface } from './compilers/server-compiler.js';
export { compileAuthInterface } from './compilers/auth-compiler.js';

// Helpers
export { extractStaticData } from './compiler-helpers.js';
