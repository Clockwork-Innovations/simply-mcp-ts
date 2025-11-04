/**
 * SimplyMCP - Model Context Protocol Server Framework
 *
 * A comprehensive MCP server framework using the Interface-driven API.
 *
 * @example Interface-Driven API
 * ```typescript
 * import type { ITool, IServer } from 'simply-mcp';
 *
 * interface GreetTool extends ITool {
 *   name: 'greet';
 *   description: 'Greet a user';
 *   params: { name: string };
 *   result: string;
 * }
 *
 * interface MyServerInterface extends IServer {
 *   name: 'my-server';
 *   version: '1.0.0';
 * }
 *
 * export default class MyServer implements MyServerInterface {
 *   greet: GreetTool = async (params) => `Hello, ${params.name}!`;
 * }
 * ```
 */

// ============================================================================
// Schema Builder
// ============================================================================
export {
  schemaToZod,
  type Schema as SchemaType,
} from './core/schema-builder.js';

// ============================================================================
// Interface-Driven API (v3.0.0 - In Development)
// ============================================================================
export type {
  IParam,
  ITool,
  IToolAnnotations,
  IPrompt,
  IPromptArgument,
  IResource,
  IServer,
  IUI,
  IAuth,
  IApiKeyAuth,
  IApiKeyConfig,
  IOAuth2Auth,
  IOAuthClient,
  ISampling,
  ISamplingMessage,
  ISamplingOptions,
  IElicit,
  IRoots,
  ICompletion,
  ISubscription,
  ToolParams,
  ToolResult,
  PromptArgs,
  ResourceData,
  UIResourceDefinition,
  IUIResourceProvider,
  RouterToolDefinition,
  PromptMessage,
  SimpleMessage,
  InferArgType,
  InferArgs,
  IAudioContent,
  IAudioMetadata,
} from './server/interface-types.js';

export {
  loadInterfaceServer,
  isInterfaceFile,
  type InterfaceAdapterOptions,
} from './server/adapter.js';

export {
  InterfaceServer,
  type RuntimeConfig,
} from './server/interface-server.js';

export {
  parseInterfaceFile,
  snakeToCamel,
  type ParsedTool,
  type ParsedPrompt,
  type ParsedResource,
  type ParsedServer,
  type ParsedUI,
  type ParseResult,
} from './server/parser.js';

export { authConfigFromParsed } from './features/auth/adapter.js';

// ============================================================================
// OAuth 2.1 Storage Adapters (Built on MCP SDK)
// ============================================================================
/**
 * OAuth 2.1 storage adapters for token/client persistence.
 *
 * Works with any implementation of the MCP SDK's OAuthServerProvider interface.
 * For a complete provider implementation, see examples/reference-oauth-provider.ts
 *
 * @example Storage Adapters
 * ```typescript
 * import { InMemoryStorage, RedisStorage } from 'simply-mcp';
 *
 * const storage = new InMemoryStorage();
 * // or
 * const storage = new RedisStorage({ url: 'redis://localhost:6379' });
 * ```
 *
 * @see https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/server/auth
 * @see examples/reference-oauth-provider.ts
 */
export {
  InMemoryStorage,
  RedisStorage,
  createOAuthRouter,
  createOAuthMiddleware,
} from './features/auth/oauth/index.js';

export type {
  OAuthRouterConfig,
  OAuthProviderConfig,
  StoredToken,
  StoredAuthorizationCode,
  StoredClient,
  RedisStorageConfig,
  OAuthStorageProvider,
  OAuthStorageConfig,
  StorageStats,
  HealthCheckResult,
} from './features/auth/oauth/index.js';

// ============================================================================
// Core Types
// ============================================================================

// Export handler types
export type {
  HandlerContext,
  HandlerResult,
  ToolHandler,
  SamplingMessage,
  SamplingOptions,
  ResourceContents,
  TextContent,
  ImageContent,
  AudioContent,
  BinaryContent,
  Logger,
  Permissions,
  HandlerError,
  BatchContext,
} from './types/handler.js';

// ============================================================================
// Error Classes
// ============================================================================
export {
  HandlerExecutionError,
  HandlerLoadError,
  HandlerSyntaxError,
  HandlerTimeoutError,
  HandlerNetworkError,
  HandlerNotFoundError,
  HandlerConfigError,
  HandlerPermissionError,
} from './core/errors.js';

// ============================================================================
// Auto-Installation Types (Feature 3)
// ============================================================================
/**
 * Types for automatic dependency installation.
 * These types are useful for advanced users who want to customize
 * auto-installation behavior with progress tracking and error handling.
 */
export type {
  PackageManager,
  InstallOptions,
  InstallResult,
  InstallProgressEvent,
  InstallError,
  DependencyStatus,
  PackageManagerInfo,
} from './features/dependencies/installation-types.js';

// ============================================================================
// Configuration Types (re-exported for convenience)
// ============================================================================
/**
 * Configuration types and utilities for SimpleMCP CLI.
 *
 * These are re-exported from the main package for convenience.
 * In v3.0.0, the unified import pattern will become the primary approach.
 *
 * @example
 * ```typescript
 * // New unified pattern (v2.5.0+)
 * import { defineConfig, type CLIConfig } from 'simply-mcp';
 *
 * // Old pattern (still works but deprecated)
 * import { defineConfig, type CLIConfig } from 'simply-mcp/config';
 * ```
 */
export type {
  CLIConfig,
  ServerConfig as CLIServerConfig,
  DefaultsConfig,
  RunConfig,
  BundleConfig,
  APIStyle,
  TransportType,
} from './core/config.js';

export { defineConfig } from './core/config.js';

// ============================================================================
// Programmatic Server API
// ============================================================================
/**
 * Programmatic server builder for advanced use cases.
 *
 * Use this API when you need to:
 * - Create MCP servers programmatically without CLI
 * - Embed MCP servers in larger applications
 * - Customize server behavior at runtime
 *
 * @example
 * ```typescript
 * import { BuildMCPServer } from 'simply-mcp';
 *
 * const server = new BuildMCPServer({
 *   serverFilePath: './my-server.ts',
 *   transport: 'stdio'
 * });
 *
 * await server.start();
 * ```
 */
export { BuildMCPServer } from './server/builder-server.js';
export type { BuildMCPServerOptions, BatchingConfig } from './server/builder-types.js';

// ============================================================================
// MCP-UI Support (Foundation & Feature Layers)
// ============================================================================
/**
 * UI resource helpers and React compiler for building interactive UI components.
 *
 * Foundation Layer:
 * - createInlineHTMLResource: Create inline HTML UI resources
 * - isUIResource: Type guard for UI resources
 *
 * Feature Layer:
 * - compileReactComponent: Babel-based React/JSX compiler
 * - validateComponentCode: Validate React component structure
 *
 * @example Foundation Layer - Inline HTML
 * ```typescript
 * import { createInlineHTMLResource } from 'simply-mcp';
 *
 * const uiResource = createInlineHTMLResource(
 *   'ui://calculator/v1',
 *   '<div><h2>Calculator</h2><button>Calculate</button></div>'
 * );
 * ```
 *
 * @example Feature Layer - React Components
 * ```typescript
 * import { compileReactComponent } from 'simply-mcp';
 *
 * const result = await compileReactComponent({
 *   componentPath: './Counter.tsx',
 *   componentCode: `
 *     export default function Counter() {
 *       return <div>Count: 0</div>;
 *     }
 *   `,
 *   sourceMaps: true,
 * });
 * ```
 */

// Foundation Layer - UI resource helpers
export {
  createInlineHTMLResource,
  isUIResource,
} from './features/ui/ui-resource.js';

export type {
  UIContentType,
  UIResourcePayload,
  UIResource,
  UIResourceOptions,
} from './types/ui.js';

// SDK-Compatible UI Resource Creation (Official MCP-UI API)
export {
  createUIResource,
} from './features/ui/create-ui-resource.js';

export type {
  UIResourceOptions as CreateUIResourceOptions,
  UIResourceContent,
  UIResourceEncoding,
  UIResourceMetadata,
  RawHtmlContent,
  ExternalUrlContent,
  RemoteDomContent,
} from './features/ui/create-ui-resource.js';

// Feature Layer - React compiler
export {
  compileReactComponent,
  validateComponentCode,
} from './features/ui/ui-react-compiler.js';

export type {
  CompiledReactComponent,
  ReactCompilerOptions,
} from './features/ui/ui-react-compiler.js';

// Component Library Support
export {
  PackageResolver,
  resolver,
} from './features/ui/package-resolver.js';

export type {
  PackageResolution,
  ResolverOptions,
} from './features/ui/package-resolver.js';

export {
  ComponentRegistry,
  registry,
} from './features/ui/component-registry.js';

export type {
  ComponentMetadata,
} from './features/ui/component-registry.js';

// Theme System Support
export {
  ThemeManager,
  themeManager,
  type Theme,
} from './features/ui/theme-manager.js';

export {
  LIGHT_THEME,
  DARK_THEME,
} from './core/themes/prebuilt.js';
