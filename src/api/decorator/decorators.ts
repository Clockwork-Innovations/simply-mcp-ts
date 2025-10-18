/**
 * Decorator implementations for MCP servers
 *
 * This module provides TypeScript decorators for defining MCP servers,
 * tools, prompts, and resources using a class-based approach.
 *
 * Inspired by Python's FastMCP decorator pattern.
 */

import 'reflect-metadata';
import type { ServerConfig, JSDocInfo, RouterMetadata } from './types.js';

// Metadata keys
// CRITICAL: Use Symbol.for() to register symbols in the global symbol registry.
// This ensures symbols are shared across module instances, which is essential when
// the decorators module might be loaded multiple times (e.g., when tsx transpiles
// user code to CommonJS while importing from an ESM package).
const TOOLS_KEY = Symbol.for('mcp:tools');
const PROMPTS_KEY = Symbol.for('mcp:prompts');
const RESOURCES_KEY = Symbol.for('mcp:resources');
const SERVER_CONFIG_KEY = Symbol.for('mcp:config');
const ROUTERS_KEY = Symbol.for('mcp:routers');

// Note: We explored using a global registry to avoid requiring exports, but hit a fundamental limitation:
// Non-exported classes are never evaluated by the JavaScript engine (tree-shaking), so decorators never run.
// Therefore, exports ARE required for the decorator pattern to work. The UX improvement is better error messages.

/**
 * Convert class name to kebab-case
 *
 * @param str - String to convert
 * @returns Kebab-cased string
 *
 * @example
 * toKebabCase('WeatherService') // 'weather-service'
 * toKebabCase('MyAPIServer') // 'my-api-server'
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Get version from package.json
 *
 * Looks for package.json in current directory or parent directories.
 * Falls back to '1.0.0' if not found.
 *
 * @returns Version string from package.json or '1.0.0'
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
 * Extract docstring from function (legacy support)
 *
 * Extracts just the description from JSDoc comments.
 * For full JSDoc parsing, use extractJSDoc from metadata.ts
 *
 * @param fn - Function to extract docstring from
 * @returns Description string or undefined
 */
function extractDocstring(fn: Function): string | undefined {
  if (!fn) return undefined;
  const fnString = fn.toString();

  // Match JSDoc comment block
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

  return description || undefined;
}

/**
 * MCPServer class decorator
 *
 * Marks a class as an MCP server with smart defaults:
 * - name: kebab-case of class name (e.g., WeatherService -> weather-service)
 * - version: from package.json or '1.0.0'
 * - All other config optional
 *
 * @param config - Server configuration
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * import { MCPServer } from 'simply-mcp';
 *
 * // Minimal - uses all defaults
 * @MCPServer()
 * class MyServer { }
 *
 * // With custom name
 * @MCPServer({ name: 'custom-server' })
 * class MyServer { }
 *
 * // With full configuration
 * @MCPServer({
 *   name: 'my-server',
 *   version: '2.0.0',
 *   description: 'My custom server',
 *   transport: { type: 'http', port: 3001, stateful: true },
 *   capabilities: { sampling: true, logging: true }
 * })
 * class MyServer { }
 * ```
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
 *
 * Marks a method as an MCP tool. Supports both legacy and stage-3 decorator formats.
 *
 * @param description - Optional description for the tool.
 *                      If omitted, uses JSDoc comment or method name.
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * import { tool } from 'simply-mcp';
 *
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
  ) {
    // Handle both legacy and stage-3 decorator formats
    const isStage3 = typeof propertyKeyOrContext === 'object' && propertyKeyOrContext !== null && 'kind' in propertyKeyOrContext;

    if (isStage3) {
      // Stage-3 decorators
      const context = propertyKeyOrContext;
      const propertyKey = context.name;
      const fn = target;

      // Import extractJSDoc dynamically to avoid circular dependency
      const extractJSDoc = (fn: Function): JSDocInfo | undefined => {
        if (!fn) return undefined;
        const fnString = fn.toString();
        const jsdocMatch = fnString.match(/\/\*\*\s*([\s\S]*?)\*\//);
        if (!jsdocMatch) return undefined;

        const jsdocContent = jsdocMatch[1];
        const descMatch = jsdocContent.match(/^\s*\*?\s*(.+?)(?=\n\s*\*?\s*@|$)/s);
        const description = descMatch
          ? descMatch[1]
              .split('\n')
              .map(line => line.replace(/^\s*\*\s?/, '').trim())
              .filter(line => line)
              .join(' ')
          : '';

        const params = new Map<string, string>();
        const paramRegex = /@param\s+(?:\{[^}]+\}\s+)?(\[?[\w]+\]?)\s*-?\s*(.+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/gs;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(jsdocContent)) !== null) {
          const paramName = paramMatch[1].replace(/[\[\]]/g, '');
          const paramDesc = paramMatch[2].trim();
          params.set(paramName, paramDesc);
        }

        return { description, params };
      };

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

      // Import extractJSDoc dynamically to avoid circular dependency
      const extractJSDoc = (fn: Function): JSDocInfo | undefined => {
        if (!fn) return undefined;
        const fnString = fn.toString();
        const jsdocMatch = fnString.match(/\/\*\*\s*([\s\S]*?)\*\//);
        if (!jsdocMatch) return undefined;

        const jsdocContent = jsdocMatch[1];
        const descMatch = jsdocContent.match(/^\s*\*?\s*(.+?)(?=\n\s*\*?\s*@|$)/s);
        const description = descMatch
          ? descMatch[1]
              .split('\n')
              .map(line => line.replace(/^\s*\*\s?/, '').trim())
              .filter(line => line)
              .join(' ')
          : '';

        const params = new Map<string, string>();
        const paramRegex = /@param\s+(?:\{[^}]+\}\s+)?(\[?[\w]+\]?)\s*-?\s*(.+?)(?=\n\s*\*?\s*@|\n\s*\*?\s*$|$)/gs;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(jsdocContent)) !== null) {
          const paramName = paramMatch[1].replace(/[\[\]]/g, '');
          const paramDesc = paramMatch[2].trim();
          params.set(paramName, paramDesc);
        }

        return { description, params };
      };

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
 *
 * Marks a method as an MCP prompt generator. Supports both legacy and stage-3 decorator formats.
 *
 * @param description - Optional description for the prompt.
 *                      If omitted, uses JSDoc comment or method name.
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * import { prompt } from 'simply-mcp';
 *
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
  ) {
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
 *
 * Marks a method as an MCP resource provider. Supports both legacy and stage-3 decorator formats.
 *
 * @param uri - Resource URI (e.g., 'file://config', 'doc://readme')
 * @param options - Resource options
 * @param options.name - Display name (defaults to method name)
 * @param options.mimeType - MIME type (defaults to 'text/plain')
 * @returns Method decorator function
 *
 * @example
 * ```typescript
 * import { resource } from 'simply-mcp';
 *
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
  ) {
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
 * @uiResource decorator
 *
 * Marks a method as an MCP UI resource. Supports both legacy and stage-3 decorator formats.
 * This is a convenience decorator that automatically validates UI resource URIs and MIME types.
 *
 * UI resources are special resources that can be rendered as interactive UI elements in
 * MCP clients. They must use the "ui://" URI scheme and support specific MIME types:
 * - text/html: Inline HTML content (Foundation Layer)
 * - text/uri-list: External URL (Feature Layer)
 * - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM (Layer 3)
 *
 * @param uri - UI resource URI (must start with "ui://")
 * @param mimeType - MIME type indicating rendering method
 * @param options - UI resource options
 * @param options.name - Display name (defaults to method name)
 * @param options.description - Resource description
 * @returns Method decorator function
 *
 * @throws {TypeError} If URI doesn't start with "ui://"
 * @throws {TypeError} If MIME type is not a valid UI resource type
 *
 * @example
 * ```typescript
 * import { MCPServer, uiResource } from 'simply-mcp';
 *
 * @MCPServer()
 * class MyServer {
 *   // Static HTML UI resource
 *   @uiResource('ui://form/feedback', 'text/html', {
 *     name: 'Feedback Form',
 *     description: 'User feedback form'
 *   })
 *   getFeedbackForm() {
 *     return '<form><h2>Feedback</h2><textarea></textarea></form>';
 *   }
 *
 *   // Dynamic HTML UI resource
 *   @uiResource('ui://dashboard/stats', 'text/html', {
 *     name: 'Stats Dashboard'
 *   })
 *   async getStatsDashboard() {
 *     const stats = await this.getStats();
 *     return `<div><h1>Users: ${stats.users}</h1></div>`;
 *   }
 *
 *   // External URL UI resource
 *   @uiResource('ui://analytics/dashboard', 'text/uri-list', {
 *     name: 'Analytics Dashboard'
 *   })
 *   getAnalyticsDashboard() {
 *     return 'https://analytics.example.com/dashboard';
 *   }
 *
 *   // Remote DOM UI resource
 *   @uiResource('ui://counter/v1', 'application/vnd.mcp-ui.remote-dom+javascript', {
 *     name: 'Interactive Counter'
 *   })
 *   getCounterUI() {
 *     return `
 *       const card = remoteDOM.createElement('div', { style: { padding: '20px' } });
 *       const title = remoteDOM.createElement('h2');
 *       remoteDOM.setTextContent(title, 'Counter');
 *       remoteDOM.appendChild(card, title);
 *     `;
 *   }
 * }
 * ```
 *
 * @note The @uiResource decorator validates UI-specific constraints and delegates to @resource.
 *       It follows the same pattern as the BuildMCPServer.addUIResource() method.
 */
export function uiResource(
  uri: string,
  mimeType: string,
  options: { name?: string; description?: string } = {}
) {
  // Runtime validation - ensure uri is a string and starts with "ui://"
  if (typeof uri !== 'string') {
    throw new TypeError(
      `@uiResource decorator expects a string URI as the first parameter, got ${typeof uri}.\n\n` +
      `Correct usage:\n` +
      `  @uiResource('ui://form/v1', 'text/html')                    // Basic usage\n` +
      `  @uiResource('ui://form/v1', 'text/html', { name: 'Form' })  // With options\n\n` +
      `Invalid usage:\n` +
      `  @uiResource({ uri: '...' })  // Missing required parameters`
    );
  }

  if (!uri.startsWith('ui://')) {
    throw new TypeError(
      `UI resource URI must start with "ui://", got: "${uri}"\n\n` +
      `What went wrong:\n` +
      `  UI resources must use the "ui://" URI scheme to be recognized by MCP-UI clients.\n\n` +
      `To fix:\n` +
      `  Change the URI to start with "ui://"\n\n` +
      `Example:\n` +
      `  @uiResource(\n` +
      `    'ui://product-card/v1',  // Correct\n` +
      `    'text/html',\n` +
      `    { name: 'Product Card' }\n` +
      `  )\n\n` +
      `Tip: Use descriptive URIs like "ui://app-name/component-name/version"`
    );
  }

  // Runtime validation - ensure mimeType is valid for UI resources
  if (typeof mimeType !== 'string') {
    throw new TypeError(
      `@uiResource decorator expects a string MIME type as the second parameter, got ${typeof mimeType}.\n\n` +
      `Correct usage:\n` +
      `  @uiResource('ui://form/v1', 'text/html')  // Correct\n\n` +
      `Invalid usage:\n` +
      `  @uiResource('ui://form/v1', {})  // Wrong parameter type`
    );
  }

  const validMimeTypes = [
    'text/html',
    'text/uri-list',
    'application/vnd.mcp-ui.remote-dom+javascript'
  ];

  if (!validMimeTypes.includes(mimeType)) {
    throw new TypeError(
      `Invalid UI resource MIME type: "${mimeType}"\n\n` +
      `What went wrong:\n` +
      `  UI resources must use specific MIME types to indicate how they should be rendered.\n\n` +
      `Valid MIME types:\n` +
      `  - text/html: Inline HTML content (Foundation Layer)\n` +
      `  - text/uri-list: External URL (Feature Layer)\n` +
      `  - application/vnd.mcp-ui.remote-dom+javascript: Remote DOM (Layer 3)\n\n` +
      `To fix:\n` +
      `  Use one of the valid MIME types listed above\n\n` +
      `Example:\n` +
      `  @uiResource(\n` +
      `    'ui://product-card/v1',\n` +
      `    'text/html',  // Valid MIME type\n` +
      `    { name: 'Product Card' }\n` +
      `  );`
    );
  }

  return function (
    target: any,
    propertyKeyOrContext: string | any,
    descriptor?: PropertyDescriptor
  ) {
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
          description: options.description || extractDocstring(fn),
          mimeType,
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
        description: options.description || extractDocstring(fn),
        mimeType,
      });

      Reflect.defineMetadata(RESOURCES_KEY, resources, targetConstructor);
    }

    return descriptor;
  };
}

/**
 * @Router decorator
 *
 * Marks a class with router metadata for organizing tools into logical groups.
 * Routers create a hierarchical tool structure where tools are accessed through
 * a parent router tool.
 *
 * @param config - Router configuration
 * @param config.name - Router name (required, used as the router tool name)
 * @param config.description - Router description (required)
 * @param config.tools - Array of method names to assign to this router (required)
 * @param config.metadata - Optional metadata for the router
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * import { MCPServer, Router, tool } from 'simply-mcp';
 *
 * // Basic router usage
 * @MCPServer()
 * @Router({
 *   name: 'weather-tools',
 *   description: 'Weather-related operations',
 *   tools: ['getWeather', 'getForecast']
 * })
 * class WeatherServer {
 *   @tool('Get current weather')
 *   getWeather(city: string) {
 *     return `Weather in ${city}`;
 *   }
 *
 *   @tool('Get weather forecast')
 *   getForecast(city: string) {
 *     return `Forecast for ${city}`;
 *   }
 * }
 * ```
 *
 * @note Foundation layer supports single router per class.
 *       Multiple routers will be added in the feature layer.
 */
export function Router(config: {
  name: string;
  description: string;
  tools: string[];
  metadata?: Record<string, unknown>;
}) {
  // Runtime validation - ensure required fields are present
  if (!config || typeof config !== 'object') {
    throw new TypeError(
      `@Router decorator expects a configuration object, got ${typeof config}.\n\n` +
      `Correct usage:\n` +
      `  @Router({\n` +
      `    name: 'my-router',\n` +
      `    description: 'My router description',\n` +
      `    tools: ['tool1', 'tool2']\n` +
      `  })\n` +
      `  class MyServer { }\n\n` +
      `Invalid usage:\n` +
      `  @Router('my-router')  // Missing required fields`
    );
  }

  if (!config.name || typeof config.name !== 'string') {
    throw new TypeError(
      `@Router decorator requires a 'name' field (string), got ${typeof config.name}.\n\n` +
      `What went wrong:\n` +
      `  The router name is required and must be a string.\n\n` +
      `To fix:\n` +
      `  Add a 'name' field to the router configuration:\n` +
      `  @Router({\n` +
      `    name: 'weather-tools',  // Required\n` +
      `    description: 'Weather operations',\n` +
      `    tools: ['getWeather', 'getForecast']\n` +
      `  })\n\n` +
      `Tip: Use a descriptive name that indicates the router's purpose.`
    );
  }

  if (!config.description || typeof config.description !== 'string') {
    throw new TypeError(
      `@Router decorator requires a 'description' field (string), got ${typeof config.description}.\n\n` +
      `What went wrong:\n` +
      `  The router description is required and must be a string.\n\n` +
      `To fix:\n` +
      `  Add a 'description' field to the router configuration:\n` +
      `  @Router({\n` +
      `    name: 'weather-tools',\n` +
      `    description: 'Weather-related operations',  // Required\n` +
      `    tools: ['getWeather', 'getForecast']\n` +
      `  })\n\n` +
      `Tip: Describe what the router does and what tools it contains.`
    );
  }

  if (!Array.isArray(config.tools)) {
    throw new TypeError(
      `@Router decorator requires a 'tools' field (array), got ${typeof config.tools}.\n\n` +
      `What went wrong:\n` +
      `  The tools field must be an array of method names.\n\n` +
      `To fix:\n` +
      `  Add a 'tools' field with an array of method names:\n` +
      `  @Router({\n` +
      `    name: 'weather-tools',\n` +
      `    description: 'Weather-related operations',\n` +
      `    tools: ['getWeather', 'getForecast']  // Required array\n` +
      `  })\n\n` +
      `Tip: List the method names you want to assign to this router.`
    );
  }

  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const routers = Reflect.getMetadata(ROUTERS_KEY, constructor) || [];

    // Validate router name uniqueness
    const existingRouter = routers.find((r: RouterMetadata) => r.name === config.name);
    if (existingRouter) {
      const routerNames = routers.map((r: RouterMetadata) => r.name);
      throw new TypeError(
        `Duplicate router name: '${config.name}'\n\n` +
        `What went wrong:\n` +
        `  A router with the name '${config.name}' is already defined on this class.\n\n` +
        `Existing routers:\n` +
        routerNames.map(name => `  - ${name}`).join('\n') + '\n\n' +
        `To fix:\n` +
        `  Choose a unique name for this router.\n\n` +
        `Example:\n` +
        `  @Router({\n` +
        `    name: '${config.name}-v2',  // Changed to be unique\n` +
        `    description: '${config.description}',\n` +
        `    tools: ${JSON.stringify(config.tools)}\n` +
        `  })\n\n` +
        `Tip: Use descriptive names that indicate the router's specific purpose.`
      );
    }

    routers.push({
      name: config.name,
      description: config.description,
      tools: config.tools,
      metadata: config.metadata,
    });

    Reflect.defineMetadata(ROUTERS_KEY, routers, constructor);
    return constructor;
  };
}
