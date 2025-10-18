/**
 * Decorator API
 *
 * TypeScript decorator-based API for defining MCP servers using classes.
 * Use this when you prefer an object-oriented, annotation-driven approach.
 *
 * This is one of four API styles provided by simply-mcp:
 * 1. **Decorator API** (this module) - Class-based with decorators (@MCPServer, @tool, etc.)
 * 2. Programmatic API - Imperative server building (new BuildMCPServer())
 * 3. Functional API - Functional style with builder pattern (mcp.tool(), mcp.prompt())
 * 4. Interface API - Define server via plain objects
 *
 * ## Quick Start
 *
 * ```typescript
 * import { MCPServer, tool, prompt, resource } from 'simply-mcp';
 *
 * @MCPServer({ name: 'my-server', version: '1.0.0' })
 * class MyServer {
 *   @tool('Greet a user by name')
 *   async greet(args: { name: string }) {
 *     return { content: [{ type: 'text', text: `Hello, ${args.name}!` }] };
 *   }
 *
 *   @prompt('Get greeting prompt')
 *   async greetingPrompt() {
 *     return {
 *       messages: [
 *         { role: 'user', content: { type: 'text', text: 'Say hello!' } }
 *       ]
 *     };
 *   }
 *
 *   @resource('user://info', { mimeType: 'application/json' })
 *   async userInfo() {
 *     return {
 *       contents: [{
 *         uri: 'user://info',
 *         mimeType: 'application/json',
 *         text: JSON.stringify({ name: 'User', role: 'admin' })
 *       }]
 *     };
 *   }
 * }
 *
 * export default MyServer;
 * ```
 *
 * ## Running Your Server
 *
 * ```bash
 * # Auto-detect API style and run
 * simplymcp run my-server.ts
 *
 * # Explicitly use decorator adapter
 * simplymcp-class my-server.ts
 *
 * # Run with HTTP transport
 * simplymcp run my-server.ts --http --port 3000
 * ```
 *
 * ## Features
 *
 * ### Smart Defaults
 * - Server name: kebab-case of class name (WeatherService → weather-service)
 * - Version: Automatically read from package.json or defaults to '1.0.0'
 * - Tool names: kebab-case of method names (getUserData → get-user-data)
 *
 * ### Type Inference
 * - TypeScript types automatically converted to Zod schemas
 * - Support for optional parameters (?) and default values
 * - JSDoc comments become parameter descriptions
 *
 * ### Auto-Registration
 * - Public methods without decorators are auto-registered as tools
 * - Private methods (prefixed with _) are ignored
 * - Explicit @tool decorator overrides auto-registration
 *
 * ## Advanced Examples
 *
 * ### Minimal Configuration
 * ```typescript
 * import { MCPServer, tool } from 'simply-mcp';
 *
 * // Uses all defaults: name from class, version from package.json
 * @MCPServer()
 * class WeatherService {
 *   @tool()
 *   async getWeather(city: string) {
 *     return `Weather in ${city}: Sunny`;
 *   }
 * }
 * ```
 *
 * ### Full Configuration
 * ```typescript
 * import { MCPServer, tool } from 'simply-mcp';
 *
 * @MCPServer({
 *   name: 'weather-api',
 *   version: '2.0.0',
 *   description: 'Weather information service',
 *   transport: { type: 'http', port: 3001, stateful: true },
 *   capabilities: { sampling: true, logging: true }
 * })
 * class WeatherService {
 *   @tool('Get current weather for a city')
 *   async getWeather(city: string, units: 'metric' | 'imperial' = 'metric') {
 *     // Implementation
 *   }
 * }
 * ```
 *
 * ### JSDoc Integration
 * ```typescript
 * import { MCPServer, tool } from 'simply-mcp';
 *
 * @MCPServer()
 * class Calculator {
 *   /**
 *    * Add two numbers together
 *    * @param a First number
 *    * @param b Second number
 *    * @returns Sum of a and b
 *    *\/
 *   @tool()
 *   add(a: number, b: number): number {
 *     return a + b;
 *   }
 * }
 * ```
 *
 * ### Programmatic Usage
 * ```typescript
 * import { loadClass, createServerFromClass } from 'simply-mcp';
 *
 * // Load class from file
 * const ServerClass = await loadClass('./my-server.ts');
 *
 * // Create server instance
 * const server = createServerFromClass(ServerClass, '/absolute/path/to/my-server.ts');
 *
 * // Start server
 * await server.start({ transport: 'stdio' });
 * ```
 *
 * @module decorator
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type {
  ServerConfig,
  JSDocInfo,
  ToolMetadata,
  PromptMetadata,
  ResourceMetadata,
  ParameterInfo,
  RouterMetadata,
} from './types.js';

// ============================================================================
// Decorators
// ============================================================================

export {
  MCPServer,
  tool,
  prompt,
  resource,
  Router,
} from './decorators.js';

// ============================================================================
// Metadata Extraction
// ============================================================================

export {
  getServerConfig,
  getTools,
  getPrompts,
  getResources,
  getRouters,
  extractJSDoc,
  getParameterInfo,
  getParameterNames,
} from './metadata.js';

// ============================================================================
// Type Inference & Schema Generation
// ============================================================================

export {
  inferZodSchema,
  parseTypeScriptFile,
  parseTypeScriptFileWithCache,
  getMethodParameterTypes,
} from './type-inference.js';

export type {
  MethodParameter,
  MethodSignature,
  ParsedClass,
} from './type-inference.js';

// ============================================================================
// Class Adapter
// ============================================================================

export {
  loadClass,
  createServerFromClass,
} from './adapter.js';
