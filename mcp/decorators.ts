/**
 * Decorator-based MCP Server Framework
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
const TOOLS_KEY = Symbol('mcp:tools');
const PROMPTS_KEY = Symbol('mcp:prompts');
const RESOURCES_KEY = Symbol('mcp:resources');
const SERVER_CONFIG_KEY = Symbol('mcp:config');

/**
 * Server configuration
 */
export interface ServerConfig {
  name?: string;
  version?: string;
  port?: number;
  description?: string;
}

/**
 * JSDoc comment information
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
 */
export interface ToolMetadata {
  methodName: string;
  description?: string;
  paramTypes?: any[];
  jsdoc?: JSDocInfo;
}

/**
 * Prompt metadata
 */
export interface PromptMetadata {
  methodName: string;
  description?: string;
  arguments?: Array<{ name: string; required: boolean }>;
}

/**
 * Resource metadata
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
 * MCPServer class decorator
 * Marks a class as an MCP server
 * If config is not provided, uses defaults based on class name
 */
export function MCPServer(config: ServerConfig = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Apply defaults if not provided
    const finalConfig: ServerConfig = {
      name: config.name || toKebabCase(constructor.name),
      version: config.version || '1.0.0',
      port: config.port,
      description: config.description,
    };

    Reflect.defineMetadata(SERVER_CONFIG_KEY, finalConfig, constructor);
    return constructor;
  };
}

/**
 * @tool decorator
 * Marks a method as an MCP tool
 */
export function tool(description?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const tools = Reflect.getMetadata(TOOLS_KEY, target.constructor) || [];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    // Support both legacy decorators (target[propertyKey]) and stage-3 decorators (descriptor.value)
    const fn = descriptor?.value || target[propertyKey];
    const jsdoc = extractJSDoc(fn);

    tools.push({
      methodName: propertyKey,
      description: description || jsdoc?.description || propertyKey,
      paramTypes,
      jsdoc,
    });

    Reflect.defineMetadata(TOOLS_KEY, tools, target.constructor);
    return descriptor;
  };
}

/**
 * @prompt decorator
 * Marks a method as an MCP prompt generator
 */
export function prompt(description?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const prompts = Reflect.getMetadata(PROMPTS_KEY, target.constructor) || [];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];

    // Support both legacy decorators (target[propertyKey]) and stage-3 decorators (descriptor.value)
    const fn = descriptor?.value || target[propertyKey];
    prompts.push({
      methodName: propertyKey,
      description: description || extractDocstring(fn),
      paramTypes,
    });

    Reflect.defineMetadata(PROMPTS_KEY, prompts, target.constructor);
    return descriptor;
  };
}

/**
 * @resource decorator
 * Marks a method as an MCP resource provider
 */
export function resource(uri: string, options: { name?: string; mimeType?: string } = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const resources = Reflect.getMetadata(RESOURCES_KEY, target.constructor) || [];

    // Support both legacy decorators (target[propertyKey]) and stage-3 decorators (descriptor.value)
    const fn = descriptor?.value || target[propertyKey];
    resources.push({
      methodName: propertyKey,
      uri,
      name: options.name || propertyKey,
      description: extractDocstring(fn),
      mimeType: options.mimeType || 'text/plain',
    });

    Reflect.defineMetadata(RESOURCES_KEY, resources, target.constructor);
    return descriptor;
  };
}

/**
 * Extract JSDoc information from function source code
 * Parses JSDoc comments to extract description, param tags, returns, examples, and throws tags
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
 */
export function getServerConfig(target: any): ServerConfig | undefined {
  return Reflect.getMetadata(SERVER_CONFIG_KEY, target);
}

/**
 * Get tools from decorated class
 */
export function getTools(target: any): ToolMetadata[] {
  return Reflect.getMetadata(TOOLS_KEY, target) || [];
}

/**
 * Get prompts from decorated class
 */
export function getPrompts(target: any): PromptMetadata[] {
  return Reflect.getMetadata(PROMPTS_KEY, target) || [];
}

/**
 * Get resources from decorated class
 */
export function getResources(target: any): ResourceMetadata[] {
  return Reflect.getMetadata(RESOURCES_KEY, target) || [];
}

/**
 * Convert TypeScript parameter to Zod schema with JSDoc descriptions
 * Now supports optional parameters, defaults, and better type inference
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
 */
export function getParameterNames(fn: Function): string[] {
  return getParameterInfo(fn).map(p => p.name);
}
