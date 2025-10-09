/**
 * Decorator-based MCP Server Framework
 *
 * @deprecated Importing from 'simply-mcp/decorators' is deprecated as of v2.5.0.
 * Import from 'simply-mcp' instead:
 *
 * ```typescript
 * // New (v2.5.0+)
 * import { MCPServer, tool, prompt, resource } from 'simply-mcp';
 *
 * // Old (still works but deprecated)
 * import { MCPServer, tool, prompt, resource } from 'simply-mcp/decorators';
 * ```
 *
 * The subpath import will be removed in v4.0.0.
 *
 * Inspired by Python's FastMCP decorator pattern.
 * Define MCP servers using TypeScript classes with decorators.
 *
 * Usage:
 * ```typescript
 * @MCPServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer {
 *   @tool()
 *   greet(name: string, formal?: boolean): string {
 *     return `Hello, ${name}!`;
 *   }
 * }
 * ```
 */

import 'reflect-metadata';
import { z } from 'zod';

// Metadata keys
// CRITICAL: Use Symbol.for() to register symbols in the global symbol registry.
// This ensures symbols are shared across module instances, which is essential when
// the decorators module might be loaded multiple times (e.g., when tsx transpiles
// user code to CommonJS while importing from an ESM package).
const TOOLS_KEY = Symbol.for('mcp:tools');
const PROMPTS_KEY = Symbol.for('mcp:prompts');
const RESOURCES_KEY = Symbol.for('mcp:resources');
const SERVER_CONFIG_KEY = Symbol.for('mcp:config');
const SERVER_REGISTRY_KEY = Symbol.for('mcp:server-registry');

// Note: We explored using a global registry to avoid requiring exports, but hit a fundamental limitation:
// Non-exported classes are never evaluated by the JavaScript engine (tree-shaking), so decorators never run.
// Therefore, exports ARE required for the decorator pattern to work. The UX improvement is better error messages.

/**
 * Server configuration for @MCPServer decorator
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type ServerConfig } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type ServerConfig } from 'simply-mcp/decorators';
 */
export interface ServerConfig {
  name?: string;           // Defaults to kebab-case class name
  version?: string;        // Defaults to package.json version or '1.0.0'
  description?: string;    // Optional server description

  // Transport configuration
  transport?: {
    type?: 'stdio' | 'http';
    port?: number;         // HTTP port (default: 3000)
    stateful?: boolean;    // HTTP stateful mode (default: true)
  };

  // Server capabilities
  capabilities?: {
    sampling?: boolean;    // Enable LLM sampling
    logging?: boolean;     // Enable logging notifications
  };
}

/**
 * JSDoc comment information
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type JSDocInfo } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type JSDocInfo } from 'simply-mcp/decorators';
 */
export interface JSDocInfo {
  description: string;
  params: Map<string, string>;
  returns?: string;
  examples?: string[];
  throws?: string[];
}

/**
 * Tool metadata
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type ToolMetadata } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type ToolMetadata } from 'simply-mcp/decorators';
 */
export interface ToolMetadata {
  methodName: string;
  description?: string;
  paramTypes?: any[];
  jsdoc?: JSDocInfo;
}

/**
 * Prompt metadata
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type PromptMetadata } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type PromptMetadata } from 'simply-mcp/decorators';
 */
export interface PromptMetadata {
  methodName: string;
  description?: string;
  arguments?: Array<{ name: string; required: boolean }>;
}

/**
 * Resource metadata
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type ResourceMetadata } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type ResourceMetadata } from 'simply-mcp/decorators';
 */
export interface ResourceMetadata {
  methodName: string;
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

/**
 * Convert class name to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Get version from package.json
 * Looks for package.json in current directory or parent directories
 */
function getPackageVersion(): string {
  try {
    // Try to find package.json in current directory or parents
    const { existsSync, readFileSync } = require('node:fs');
    const { resolve, dirname } = require('node:path');

    let currentDir = process.cwd();
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const packagePath = resolve(currentDir, 'package.json');
      if (existsSync(packagePath)) {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        if (packageJson.version) {
          return packageJson.version;
        }
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
      attempts++;
    }
  } catch (error) {
    // Silently fail if package.json not found or can't be read
  }

  return '1.0.0'; // Fallback version
}

/**
 * MCPServer class decorator
 * Marks a class as an MCP server with smart defaults:
 * - name: kebab-case of class name (e.g., WeatherService -> weather-service)
 * - version: from package.json or '1.0.0'
 * - All other config optional
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { MCPServer } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { MCPServer } from 'simply-mcp/decorators';
 *
 * @example
 * // Minimal - uses all defaults
 * @MCPServer()
 * class MyServer { }
 *
 * @example
 * // With custom name
 * @MCPServer({ name: 'custom-server' })
 * class MyServer { }
 *
 * @example
 * // With full configuration
 * @MCPServer({
 *   name: 'my-server',
 *   version: '2.0.0',
 *   description: 'My custom server',
 *   transport: { type: 'http', port: 3001, stateful: true },
 *   capabilities: { sampling: true, logging: true }
 * })
 * class MyServer { }
 */
export function MCPServer(config: ServerConfig = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Apply smart defaults
    const finalConfig: ServerConfig = {
      name: config.name || toKebabCase(constructor.name),
      version: config.version || getPackageVersion(),
      description: config.description,
      transport: config.transport,
      capabilities: config.capabilities,
    };

    Reflect.defineMetadata(SERVER_CONFIG_KEY, finalConfig, constructor);
    return constructor;
  };
}

/**
 * @tool decorator
 * Marks a method as an MCP tool
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { tool } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { tool } from 'simply-mcp/decorators';
 *
 * @param description - Optional description for the tool.
 *                      If omitted, uses JSDoc comment or method name.
 *
 * @example
 * ```typescript
 * // With description
 * @tool('Greet a user by name')
 * greet(name: string) {
 *   return `Hello, ${name}!`;
 * }
 *
 * // Without description (uses JSDoc or method name)
 * /**
 *  * Calculate the sum of two numbers
 *  *\/
 * @tool()
 * add(a: number, b: number) {
 *   return a + b;
 * }
 * ```
 *
 * @note Currently only string parameters are supported.
 *       Object syntax `@tool({ description: '...' })` will be added in v3.0.0.
 *       Passing an object will throw a helpful TypeError.
 */
export function tool(description?: string) {
  // Runtime validation - ensure parameter is string or undefined
  if (description !== undefined && typeof description !== 'string') {
    throw new TypeError(
      `@tool decorator expects a string description, got ${typeof description}.\n\n` +
      `Correct usage:\n` +
      `  @tool('Description here')     // With description\n` +
      `  @tool()                       // Uses JSDoc or method name\n\n` +
      `Invalid usage:\n` +
      `  @tool({ description: '...' }) // Object syntax not yet supported\n\n` +
      `Note: Object syntax will be added in v3.0.0.\n` +
      `For now, use a string description or JSDoc comments.`
    );
  }

  return function (
    target: any,
    propertyKeyOrContext: string | any,
    descriptor?: PropertyDescriptor
  ): any {
    // Handle both legacy and stage-3 decorator formats
    const isStage3 = typeof propertyKeyOrContext === 'object' && propertyKeyOrContext !== null && 'kind' in propertyKeyOrContext;

    if (isStage3) {
      // Stage-3 decorators
      const context = propertyKeyOrContext;
      const propertyKey = context.name;
      const fn = target;
      const jsdoc = extractJSDoc(fn);

      // Use addInitializer to register metadata after class is constructed
      context.addInitializer(function(this: any) {
        const targetConstructor = this.constructor;
        const tools = Reflect.getMetadata(TOOLS_KEY, targetConstructor) || [];
        const paramTypes = Reflect.getMetadata('design:paramtypes', this, propertyKey) || [];

        tools.push({
          methodName: propertyKey,
          description: description || jsdoc?.description || propertyKey,
          paramTypes,
          jsdoc,
        });

        Reflect.defineMetadata(TOOLS_KEY, tools, targetConstructor);
      });
    } else {
      // Legacy decorators
      const propertyKey = propertyKeyOrContext;
      const targetConstructor = target.constructor;
      const tools = Reflect.getMetadata(TOOLS_KEY, targetConstructor) || [];
      const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
      const fn = descriptor?.value || target[propertyKey];
      const jsdoc = extractJSDoc(fn);

      tools.push({
        methodName: propertyKey,
        description: description || jsdoc?.description || propertyKey,
        paramTypes,
        jsdoc,
      });

      Reflect.defineMetadata(TOOLS_KEY, tools, targetConstructor);
    }

    return descriptor;
  };
}

/**
 * @prompt decorator
 * Marks a method as an MCP prompt generator
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { prompt } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { prompt } from 'simply-mcp/decorators';
 *
 * @param description - Optional description for the prompt.
 *                      If omitted, uses JSDoc comment or method name.
 *
 * @example
 * ```typescript
 * // With description
 * @prompt('Generate code review comments')
 * codeReview(language: string, code: string) {
 *   return {
 *     messages: [{
 *       role: 'user',
 *       content: { type: 'text', text: `Review this ${language} code...` }
 *     }]
 *   };
 * }
 *
 * // Without description (uses JSDoc or method name)
 * @prompt()
 * helpPrompt() {
 *   return { messages: [{ role: 'user', content: { type: 'text', text: 'Help' } }] };
 * }
 * ```
 *
 * @note Currently only string parameters are supported.
 *       Object syntax will be added in v3.0.0.
 */
export function prompt(description?: string) {
  // Runtime validation - ensure parameter is string or undefined
  if (description !== undefined && typeof description !== 'string') {
    throw new TypeError(
      `@prompt decorator expects a string description, got ${typeof description}.\n\n` +
      `Correct usage:\n` +
      `  @prompt('Description here')     // With description\n` +
      `  @prompt()                       // Uses JSDoc or method name\n\n` +
      `Invalid usage:\n` +
      `  @prompt({ description: '...' }) // Object syntax not yet supported\n\n` +
      `Note: Object syntax will be added in v3.0.0.`
    );
  }

  return function (
    target: any,
    propertyKeyOrContext: string | any,
    descriptor?: PropertyDescriptor
  ): any {
    // Handle both legacy and stage-3 decorator formats
    const isStage3 = typeof propertyKeyOrContext === 'object' && propertyKeyOrContext !== null && 'kind' in propertyKeyOrContext;

    if (isStage3) {
      // Stage-3 decorators
      const context = propertyKeyOrContext;
      const propertyKey = context.name;
      const fn = target;

      // Use addInitializer to register metadata after class is constructed
      context.addInitializer(function(this: any) {
        const targetConstructor = this.constructor;
        const prompts = Reflect.getMetadata(PROMPTS_KEY, targetConstructor) || [];
        const paramTypes = Reflect.getMetadata('design:paramtypes', this, propertyKey) || [];

        prompts.push({
          methodName: propertyKey,
          description: description || extractDocstring(fn),
          paramTypes,
        });

        Reflect.defineMetadata(PROMPTS_KEY, prompts, targetConstructor);
      });
    } else {
      // Legacy decorators
      const propertyKey = propertyKeyOrContext;
      const targetConstructor = target.constructor;
      const prompts = Reflect.getMetadata(PROMPTS_KEY, targetConstructor) || [];
      const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
      const fn = descriptor?.value || target[propertyKey];

      prompts.push({
        methodName: propertyKey,
        description: description || extractDocstring(fn),
        paramTypes,
      });

      Reflect.defineMetadata(PROMPTS_KEY, prompts, targetConstructor);
    }

    return descriptor;
  };
}

/**
 * @resource decorator
 * Marks a method as an MCP resource provider
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { resource } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { resource } from 'simply-mcp/decorators';
 *
 * @param uri - Resource URI (e.g., 'file://config', 'doc://readme')
 * @param options - Resource options
 * @param options.name - Display name (defaults to method name)
 * @param options.mimeType - MIME type (defaults to 'text/plain')
 *
 * @example
 * ```typescript
 * // Basic usage
 * @resource('config://server')
 * serverConfig() {
 *   return { contents: [{ uri: 'config://server', mimeType: 'application/json', text: '{}' }] };
 * }
 *
 * // With options
 * @resource('doc://readme', { name: 'README', mimeType: 'text/markdown' })
 * readme() {
 *   return { contents: [{ uri: 'doc://readme', mimeType: 'text/markdown', text: '# README' }] };
 * }
 * ```
 *
 * @note The @resource decorator has a different signature than @tool and @prompt.
 *       It requires a URI as the first parameter and accepts an options object as the second parameter.
 */
export function resource(uri: string, options: { name?: string; mimeType?: string } = {}) {
  // Runtime validation - ensure uri is a string
  if (typeof uri !== 'string') {
    throw new TypeError(
      `@resource decorator expects a string URI as the first parameter, got ${typeof uri}.\n\n` +
      `Correct usage:\n` +
      `  @resource('config://server')                    // Basic usage\n` +
      `  @resource('file://data', { mimeType: 'json' })  // With options\n\n` +
      `Invalid usage:\n` +
      `  @resource({ uri: '...' })  // Missing required URI parameter`
    );
  }

  return function (
    target: any,
    propertyKeyOrContext: string | any,
    descriptor?: PropertyDescriptor
  ): any {
    // Handle both legacy and stage-3 decorator formats
    const isStage3 = typeof propertyKeyOrContext === 'object' && propertyKeyOrContext !== null && 'kind' in propertyKeyOrContext;

    if (isStage3) {
      // Stage-3 decorators
      const context = propertyKeyOrContext;
      const propertyKey = context.name;
      const fn = target;

      // Use addInitializer to register metadata after class is constructed
      context.addInitializer(function(this: any) {
        const targetConstructor = this.constructor;
        const resources = Reflect.getMetadata(RESOURCES_KEY, targetConstructor) || [];

        resources.push({
          methodName: propertyKey,
          uri,
          name: options.name || propertyKey,
          description: extractDocstring(fn),
          mimeType: options.mimeType || 'text/plain',
        });

        Reflect.defineMetadata(RESOURCES_KEY, resources, targetConstructor);
      });
    } else {
      // Legacy decorators
      const propertyKey = propertyKeyOrContext;
      const targetConstructor = target.constructor;
      const resources = Reflect.getMetadata(RESOURCES_KEY, targetConstructor) || [];
      const fn = descriptor?.value || target[propertyKey];

      resources.push({
        methodName: propertyKey,
        uri,
        name: options.name || propertyKey,
        description: extractDocstring(fn),
        mimeType: options.mimeType || 'text/plain',
      });

      Reflect.defineMetadata(RESOURCES_KEY, resources, targetConstructor);
    }

    return descriptor;
  };
}

/**
 * Extract JSDoc information from function source code
 * Parses JSDoc comments to extract description, param tags, returns, examples, and throws tags
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { extractJSDoc } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { extractJSDoc } from 'simply-mcp/decorators';
 */
export function extractJSDoc(fn: Function): JSDocInfo | undefined {
  if (!fn) return undefined;  // Defensive check for undefined functions
  const fnString = fn.toString();

  // Match JSDoc comment block (handles both before and after function keyword)
  const jsdocMatch = fnString.match(/\/\*\*\s*([\s\S]*?)\*\//);
  if (!jsdocMatch) return undefined;

  const jsdocContent = jsdocMatch[1];

  // Extract description (all lines before first @tag)
  const descMatch = jsdocContent.match(/^\s*\*?\s*(.+?)(?=\n\s*\*?\s*@|$)/s);
  const description = descMatch
    ? descMatch[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line)
        .join(' ')
    : '';

  // Extract @param tags
  const params = new Map<string, string>();
  const paramRegex = /@param\s+(?:\{[^}]+\}\s+)?(\[?[\w]+\]?)\s*-?\s*(.+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/gs;
  let paramMatch;
  while ((paramMatch = paramRegex.exec(jsdocContent)) !== null) {
    const paramName = paramMatch[1].replace(/[\[\]]/g, ''); // Remove optional brackets
    const paramDesc = paramMatch[2].trim();
    params.set(paramName, paramDesc);
  }

  // Extract @returns tag
  const returnsMatch = jsdocContent.match(/@returns?\s+(?:\{[^}]+\}\s+)?(.+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/s);
  const returns = returnsMatch ? returnsMatch[1].trim() : undefined;

  // Extract @example tags
  const examples: string[] = [];
  const exampleRegex = /@example\s+([\s\S]+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/g;
  let exampleMatch;
  while ((exampleMatch = exampleRegex.exec(jsdocContent)) !== null) {
    const example = exampleMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => line)
      .join('\n');
    examples.push(example);
  }

  // Extract @throws tags
  const throwsArr: string[] = [];
  const throwsRegex = /@throws?\s+(?:\{[^}]+\}\s+)?(.+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/gs;
  let throwsMatch;
  while ((throwsMatch = throwsRegex.exec(jsdocContent)) !== null) {
    throwsArr.push(throwsMatch[1].trim());
  }

  return {
    description,
    params,
    returns,
    examples: examples.length > 0 ? examples : undefined,
    throws: throwsArr.length > 0 ? throwsArr : undefined,
  };
}

/**
 * Extract docstring from function (legacy support)
 * Use extractJSDoc for full JSDoc parsing
 */
function extractDocstring(fn: Function): string | undefined {
  const jsdoc = extractJSDoc(fn);
  return jsdoc?.description;
}

/**
 * Get server configuration from decorated class
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getServerConfig } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getServerConfig } from 'simply-mcp/decorators';
 */
export function getServerConfig(target: any): ServerConfig | undefined {
  return Reflect.getMetadata(SERVER_CONFIG_KEY, target);
}

/**
 * Get tools from decorated class
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getTools } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getTools } from 'simply-mcp/decorators';
 */
export function getTools(target: any): ToolMetadata[] {
  return Reflect.getMetadata(TOOLS_KEY, target) || [];
}

/**
 * Get prompts from decorated class
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getPrompts } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getPrompts } from 'simply-mcp/decorators';
 */
export function getPrompts(target: any): PromptMetadata[] {
  return Reflect.getMetadata(PROMPTS_KEY, target) || [];
}

/**
 * Get resources from decorated class
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getResources } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getResources } from 'simply-mcp/decorators';
 */
export function getResources(target: any): ResourceMetadata[] {
  return Reflect.getMetadata(RESOURCES_KEY, target) || [];
}

/**
 * Convert TypeScript parameter to Zod schema with JSDoc descriptions
 * Now supports optional parameters, defaults, and better type inference
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { inferZodSchema } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { inferZodSchema } from 'simply-mcp/decorators';
 *
 * @param paramTypes - Runtime parameter types from reflect-metadata
 * @param methodName - Name of the method (for debugging)
 * @param paramInfo - Parameter information with names, optionality, and defaults
 * @param jsdoc - Optional JSDoc information with parameter descriptions
 */
export function inferZodSchema(
  paramTypes: any[],
  methodName: string,
  paramInfo: ParameterInfo[] | string[],
  jsdoc?: JSDocInfo
): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Convert string[] to ParameterInfo[] for backward compatibility
  const params: ParameterInfo[] = Array.isArray(paramInfo) && typeof paramInfo[0] === 'string'
    ? (paramInfo as string[]).map(name => ({ name, optional: false, hasDefault: false }))
    : paramInfo as ParameterInfo[];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    // Try param.type first (from signature parsing), fall back to paramTypes[i] (from reflect-metadata)
    const paramType = param.type || paramTypes[i];

    // Basic type inference
    let zodType: z.ZodTypeAny;
    if (paramType === String) {
      zodType = z.string();
    } else if (paramType === Number) {
      zodType = z.number();
    } else if (paramType === Boolean) {
      zodType = z.boolean();
    } else if (paramType === Array) {
      zodType = z.array(z.any());
    } else if (paramType === Object) {
      zodType = z.object({}).passthrough();
    } else if (paramType === Date) {
      zodType = z.date();
    } else {
      // Default to any for unknown types
      zodType = z.any();
    }

    // Add description from JSDoc if available
    const paramDesc = jsdoc?.params.get(param.name);
    if (paramDesc) {
      zodType = zodType.describe(paramDesc);
    }

    // Handle optional parameters
    if (param.optional) {
      zodType = zodType.optional();
    }

    // Handle default values
    if (param.hasDefault && param.defaultValue !== undefined) {
      zodType = zodType.default(param.defaultValue);
    }

    shape[param.name] = zodType;
  }

  return z.object(shape);
}

/**
 * Parameter information including optionality and default values
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { type ParameterInfo } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { type ParameterInfo } from 'simply-mcp/decorators';
 */
export interface ParameterInfo {
  name: string;
  optional: boolean;
  hasDefault: boolean;
  defaultValue?: any;
  type?: any; // Runtime constructor (String, Number, Boolean, etc.)
}

/**
 * Extract parameter information from function signature
 * Detects optional parameters (with ?) and default values
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getParameterInfo } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getParameterInfo } from 'simply-mcp/decorators';
 */
export function getParameterInfo(fn: Function): ParameterInfo[] {
  const fnString = fn.toString();
  const match = fnString.match(/\(([^)]*)\)/);

  if (!match || !match[1]) return [];

  const params = match[1].split(',').map(p => p.trim()).filter(p => p);

  return params.map(param => {
    // Handle default values: param = value
    const hasDefault = param.includes('=');
    let name = param.split(/[=:]/)[0].trim();

    // Check for optional marker: param?
    const optional = name.endsWith('?');
    if (optional) {
      name = name.slice(0, -1).trim();
    }

    // Extract default value if present
    let defaultValue: any;
    if (hasDefault) {
      const defaultMatch = param.match(/=\s*(.+)/);
      if (defaultMatch) {
        try {
          // Try to parse as JSON for simple values
          defaultValue = JSON.parse(defaultMatch[1].trim());
        } catch {
          // Keep as string if not valid JSON
          defaultValue = defaultMatch[1].trim().replace(/['"]/g, '');
        }
      }
    }

    // Extract type from TypeScript signature: param: Type
    let type: any = undefined;
    const typeMatch = param.match(/:\s*([^=]+?)(?:\s*=|$)/);
    if (typeMatch) {
      const typeStr = typeMatch[1].trim();
      // Map common TypeScript types to runtime constructors
      if (typeStr === 'string') type = String;
      else if (typeStr === 'number') type = Number;
      else if (typeStr === 'boolean') type = Boolean;
      else if (typeStr.endsWith('[]') || typeStr.startsWith('Array<')) type = Array;
      else if (typeStr === 'object' || typeStr.startsWith('{')) type = Object;
      else if (typeStr === 'Date') type = Date;
    }

    return {
      name,
      optional: optional || hasDefault,
      hasDefault,
      defaultValue,
      type,
    };
  });
}

/**
 * Extract parameter names from function (legacy support)
 *
 * @deprecated Import from 'simply-mcp' instead of 'simply-mcp/decorators' (v2.5.0+)
 * This subpath will be removed in v4.0.0.
 *
 * @example
 * // New way (v2.5.0+)
 * import { getParameterNames } from 'simply-mcp';
 *
 * // Old way (deprecated)
 * import { getParameterNames } from 'simply-mcp/decorators';
 */
export function getParameterNames(fn: Function): string[] {
  return getParameterInfo(fn).map(p => p.name);
}
