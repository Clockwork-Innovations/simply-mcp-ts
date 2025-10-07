/**
 * Metadata extraction functions for decorated classes
 *
 * This module provides functions to extract metadata from classes and methods
 * decorated with @MCPServer, @tool, @prompt, and @resource decorators.
 */

import 'reflect-metadata';
import type {
  ServerConfig,
  JSDocInfo,
  ToolMetadata,
  PromptMetadata,
  ResourceMetadata,
  ParameterInfo,
} from './types.js';

// Metadata keys (must match those in decorators.ts)
const TOOLS_KEY = Symbol.for('mcp:tools');
const PROMPTS_KEY = Symbol.for('mcp:prompts');
const RESOURCES_KEY = Symbol.for('mcp:resources');
const SERVER_CONFIG_KEY = Symbol.for('mcp:config');

/**
 * Get server configuration from decorated class
 *
 * Retrieves the configuration metadata set by @MCPServer decorator.
 *
 * @param target - The decorated class constructor
 * @returns Server configuration or undefined if not decorated
 *
 * @example
 * ```typescript
 * import { MCPServer, getServerConfig } from 'simply-mcp';
 *
 * @MCPServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer { }
 *
 * const config = getServerConfig(MyServer);
 * console.log(config?.name); // 'my-server'
 * console.log(config?.version); // '1.0.0'
 * ```
 */
export function getServerConfig(target: any): ServerConfig | undefined {
  return Reflect.getMetadata(SERVER_CONFIG_KEY, target);
}

/**
 * Get tools from decorated class
 *
 * Retrieves all tool metadata from methods decorated with @tool.
 *
 * @param target - The decorated class constructor
 * @returns Array of tool metadata (empty array if no tools)
 *
 * @example
 * ```typescript
 * import { MCPServer, tool, getTools } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @tool('Greet a user')
 *   greet(name: string) {
 *     return `Hello, ${name}!`;
 *   }
 * }
 *
 * const tools = getTools(MyServer);
 * console.log(tools.length); // 1
 * console.log(tools[0].methodName); // 'greet'
 * console.log(tools[0].description); // 'Greet a user'
 * ```
 */
export function getTools(target: any): ToolMetadata[] {
  return Reflect.getMetadata(TOOLS_KEY, target) || [];
}

/**
 * Get prompts from decorated class
 *
 * Retrieves all prompt metadata from methods decorated with @prompt.
 *
 * @param target - The decorated class constructor
 * @returns Array of prompt metadata (empty array if no prompts)
 *
 * @example
 * ```typescript
 * import { MCPServer, prompt, getPrompts } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @prompt('Generate a greeting')
 *   greetPrompt(name: string) {
 *     return {
 *       messages: [{
 *         role: 'user',
 *         content: { type: 'text', text: `Say hello to ${name}` }
 *       }]
 *     };
 *   }
 * }
 *
 * const prompts = getPrompts(MyServer);
 * console.log(prompts.length); // 1
 * console.log(prompts[0].methodName); // 'greetPrompt'
 * ```
 */
export function getPrompts(target: any): PromptMetadata[] {
  return Reflect.getMetadata(PROMPTS_KEY, target) || [];
}

/**
 * Get resources from decorated class
 *
 * Retrieves all resource metadata from methods decorated with @resource.
 *
 * @param target - The decorated class constructor
 * @returns Array of resource metadata (empty array if no resources)
 *
 * @example
 * ```typescript
 * import { MCPServer, resource, getResources } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   @resource('config://server', { mimeType: 'application/json' })
 *   serverConfig() {
 *     return { contents: [{ uri: 'config://server', text: '{}' }] };
 *   }
 * }
 *
 * const resources = getResources(MyServer);
 * console.log(resources.length); // 1
 * console.log(resources[0].uri); // 'config://server'
 * console.log(resources[0].mimeType); // 'application/json'
 * ```
 */
export function getResources(target: any): ResourceMetadata[] {
  return Reflect.getMetadata(RESOURCES_KEY, target) || [];
}

/**
 * Extract JSDoc information from function source code
 *
 * Parses JSDoc comments to extract description, param tags, returns, examples, and throws tags.
 * This is a comprehensive parser that handles all standard JSDoc annotations.
 *
 * @param fn - Function to extract JSDoc from
 * @returns Parsed JSDoc information or undefined if no JSDoc found
 *
 * @example
 * ```typescript
 * import { extractJSDoc } from 'simply-mcp';
 *
 * /**
 *  * Calculate the sum of two numbers
 *  * @param a First number to add
 *  * @param b Second number to add
 *  * @returns The sum of a and b
 *  * @example
 *  * add(2, 3) // returns 5
 *  * @throws {Error} If parameters are not numbers
 *  *\/
 * function add(a: number, b: number): number {
 *   if (typeof a !== 'number' || typeof b !== 'number') {
 *     throw new Error('Parameters must be numbers');
 *   }
 *   return a + b;
 * }
 *
 * const jsdoc = extractJSDoc(add);
 * console.log(jsdoc?.description); // "Calculate the sum of two numbers"
 * console.log(jsdoc?.params.get('a')); // "First number to add"
 * console.log(jsdoc?.returns); // "The sum of a and b"
 * console.log(jsdoc?.examples); // ["add(2, 3) // returns 5"]
 * console.log(jsdoc?.throws); // ["If parameters are not numbers"]
 * ```
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
 * Extract parameter information from function signature
 *
 * Detects optional parameters (with ?), default values, and TypeScript types
 * from the function signature string.
 *
 * @param fn - Function to extract parameter information from
 * @returns Array of parameter information
 *
 * @example
 * ```typescript
 * import { getParameterInfo } from 'simply-mcp';
 *
 * function greet(name: string, formal?: boolean, greeting: string = 'Hello') {
 *   const prefix = formal ? 'Good day' : greeting;
 *   return `${prefix}, ${name}!`;
 * }
 *
 * const params = getParameterInfo(greet);
 * console.log(params[0]); // { name: 'name', optional: false, hasDefault: false, type: String }
 * console.log(params[1]); // { name: 'formal', optional: true, hasDefault: false, type: Boolean }
 * console.log(params[2]); // { name: 'greeting', optional: true, hasDefault: true, defaultValue: 'Hello', type: String }
 * ```
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
 * Simple helper that returns just the parameter names.
 * For full parameter information, use getParameterInfo().
 *
 * @param fn - Function to extract parameter names from
 * @returns Array of parameter names
 *
 * @example
 * ```typescript
 * import { getParameterNames } from 'simply-mcp';
 *
 * function greet(name: string, formal?: boolean) {
 *   return formal ? `Good day, ${name}` : `Hi, ${name}!`;
 * }
 *
 * const names = getParameterNames(greet);
 * console.log(names); // ['name', 'formal']
 * ```
 */
export function getParameterNames(fn: Function): string[] {
  return getParameterInfo(fn).map(p => p.name);
}
