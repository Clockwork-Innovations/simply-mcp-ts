/**
 * Parser Type Definitions
 *
 * All interface types returned by the parser when analyzing
 * TypeScript interface-driven MCP server definitions.
 */

import * as ts from 'typescript';
import type { IDatabase, IToolAnnotations } from '../interface-types.js';

/**
 * Parsed tool interface metadata
 */
export interface ParsedTool {
  /** Original interface name */
  interfaceName: string;
  /** Tool name from interface (snake_case) - if omitted, inferred from methodName */
  name?: string;
  /** Tool description */
  description: string;
  /** Expected method name (camelCase) */
  methodName: string;
  /** Parameter type information */
  paramsType: string;
  /** Result type information */
  resultType: string;
  /** Raw TypeScript node for params */
  paramsNode?: ts.TypeNode;
  /** Raw TypeScript node for result */
  resultNode?: ts.TypeNode;
  /** Tool annotations (optional) @since v4.1.0 */
  annotations?: IToolAnnotations;
}

/**
 * Parsed prompt interface metadata
 */
export interface ParsedPrompt {
  /** Original interface name */
  interfaceName: string;
  /** Prompt name from interface (snake_case) */
  name: string;
  /** Prompt description */
  description: string;
  /** Expected method name (camelCase) - all prompts require implementation */
  methodName: string;
  /** Arguments metadata extracted from interface */
  argsMetadata?: Record<string, {
    description?: string;
    required?: boolean;
    type?: string;
    enum?: string[];
  }>;
  /** Argument type information (for TypeScript type extraction) */
  argsType: string;
}

/**
 * Parsed resource interface metadata
 */
export interface ParsedResource {
  /** Original interface name */
  interfaceName: string;
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description: string;
  /** Expected method name (camelCase) if dynamic */
  methodName: string;
  /** MIME type */
  mimeType: string;
  /** Static data (for static resources) */
  data?: any;
  /** Whether this requires dynamic implementation */
  dynamic: boolean;
  /** Data type information */
  dataType: string;
  /** Database configuration (if resource uses database) */
  database?: IDatabase;
}

/**
 * Parsed sampling interface metadata
 */
export interface ParsedSampling {
  /** Original interface name */
  interfaceName: string;
  /** Sampling identifier name */
  name: string;
  /** Messages array type information */
  messagesType: string;
  /** Options type information */
  optionsType?: string;
  /** Whether this is static data or requires dynamic implementation */
  isStatic: boolean;
  /** Static messages data (if available) */
  messages?: any;
  /** Static options data (if available) */
  options?: any;
}

/**
 * Parsed elicitation interface metadata
 */
export interface ParsedElicit {
  /** Original interface name */
  interfaceName: string;
  /** Elicitation identifier name */
  name: string;
  /** Prompt text */
  prompt: string;
  /** Arguments schema type information */
  argsType: string;
  /** Result type information */
  resultType: string;
  /** Whether this is static or requires dynamic implementation */
  isStatic: boolean;
}

/**
 * Parsed roots interface metadata
 */
export interface ParsedRoots {
  /** Original interface name */
  interfaceName: string;
  /** Roots identifier name */
  name: string;
  /** Description */
  description: string;
}

/**
 * Parsed subscription interface metadata
 */
export interface ParsedSubscription {
  /** Original interface name */
  interfaceName: string;
  /** Subscription identifier name */
  name: string;
  /** Resource URI to subscribe to */
  uri: string;
  /** Description */
  description: string;
  /** Whether a handler function is provided */
  hasHandler: boolean;
  /** Expected method name (uses URI as method name) */
  methodName: string;
}

/**
 * Parsed completion interface metadata
 */
export interface ParsedCompletion {
  /** Original interface name */
  interfaceName: string;
  /** Completion identifier name */
  name: string;
  /** Reference type information (what is being completed) */
  refType: string;
  /** Description */
  description: string;
  /** Whether a complete function is provided */
  hasCompleteFunction: boolean;
  /** Expected method name (camelCase version of name) */
  methodName: string;
  /** Argument type information */
  argType: string;
  /** Suggestions type information */
  suggestionsType: string;
}

/**
 * Discovered const implementation (NEW v4 auto-discovery)
 */
export interface DiscoveredImplementation {
  /** Variable name (e.g., 'add', 'usersResource') */
  name: string;
  /** Type annotation (e.g., 'ToolHelper<AddTool>') */
  helperType: 'ToolHelper' | 'PromptHelper' | 'ResourceHelper';
  /** Generic type argument (e.g., 'AddTool') */
  interfaceName: string;
  /** Whether this is a const or class property */
  kind: 'const' | 'class-property';
  /** If class property, the class name */
  className?: string;
}

/**
 * Discovered class instance (NEW v4 auto-discovery)
 */
export interface DiscoveredInstance {
  /** Variable name (e.g., 'weatherService') */
  instanceName: string;
  /** Class name (e.g., 'WeatherService') */
  className: string;
}

/**
 * Parsed UI interface metadata
 */
export interface ParsedUI {
  /** Original interface name */
  interfaceName: string;
  /** UI resource URI */
  uri: string;
  /** UI name */
  name: string;
  /** UI description */
  description: string;

  // NEW v4.0: Unified source field
  /** Unified source field (URL, HTML, file path, or folder) */
  source?: string;

  /** Inline HTML content (for static UIs) */
  html?: string;
  /** Inline CSS styles (for static UIs) */
  css?: string;
  /** Array of tool names this UI can call */
  tools?: string[];
  /** Preferred UI size (rendering hint) */
  size?: { width?: number; height?: number };
  /** Whether this UI resource supports subscriptions */
  subscribable?: boolean;
  /** Whether this requires dynamic implementation */
  dynamic: boolean;
  /** Expected method name (camelCase) if dynamic */
  methodName?: string;
  /** Data type information */
  dataType: string;

  // Feature Layer fields
  /** Path to HTML file */
  file?: string;
  /** Path to React component */
  component?: string;
  /** Path to single JS file */
  script?: string;
  /** Paths to CSS files */
  stylesheets?: string[];
  /** Paths to JS files */
  scripts?: string[];
  /** NPM packages */
  dependencies?: string[];
  /** Bundle configuration */
  bundle?:
    | boolean
    | {
        minify?: boolean;
        sourcemap?: boolean;
        external?: string[];
        format?: 'iife' | 'esm';
      };
  /** Component imports from registry */
  imports?: string[];
  /** Theme name or inline theme object */
  theme?: string | { name: string; variables: Record<string, string> };

  // Polish Layer fields - Production Optimizations
  /** Minification configuration */
  minify?:
    | boolean
    | {
        html?: boolean;
        css?: boolean;
        js?: boolean;
      };
  /** CDN configuration */
  cdn?:
    | boolean
    | {
        baseUrl?: string;
        sri?: boolean | 'sha256' | 'sha384' | 'sha512';
        compression?: 'gzip' | 'brotli' | 'both';
      };
  /** Performance monitoring configuration */
  performance?:
    | boolean
    | {
        track?: boolean;
        report?: boolean;
        thresholds?: {
          maxBundleSize?: number;
          maxCompilationTime?: number;
          minCacheHitRate?: number;
          minCompressionSavings?: number;
        };
      };

  // Phase 3A: text/uri-list MIME type support
  /** External URL for text/uri-list MIME type */
  externalUrl?: string;

  // Phase 3B: Remote DOM MIME type support
  /** Remote DOM content or React component for application/vnd.mcp-ui.remote-dom MIME type */
  remoteDom?: string;
}

/**
 * Parsed router interface metadata
 */
export interface ParsedRouter {
  /** Original interface name */
  interfaceName: string;
  /** Router name (snake_case) - if omitted, inferred from property name */
  name?: string;
  /** Router description */
  description: string;
  /** Array of tool names to include in router */
  tools: string[];
  /** Expected property name (camelCase) */
  propertyName: string;
  /** Optional metadata */
  metadata?: {
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}

/**
 * Parsed authentication configuration
 */
export interface ParsedAuth {
  /** Authentication type */
  type: 'apiKey' | 'oauth2' | 'database' | 'custom';
  /** Original interface name */
  interfaceName: string;

  // API Key fields (when type === 'apiKey')
  /** HTTP header name for API key (apiKey type only) */
  headerName?: string;
  /** Array of API keys with permissions (apiKey type only) */
  keys?: Array<{
    name: string;
    key: string;
    permissions: string[];
  }>;
  /** Whether to allow anonymous access (apiKey type only) */
  allowAnonymous?: boolean;

  // OAuth2 fields (when type === 'oauth2')
  /** OAuth issuer URL (oauth2 type only) */
  issuerUrl?: string;
  /** Registered OAuth clients (oauth2 type only) */
  clients?: Array<{
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    scopes: string[];
    name?: string;
  }>;
  /** Access token expiration in seconds (oauth2 type only) */
  tokenExpiration?: number;
  /** Refresh token expiration in seconds (oauth2 type only) */
  refreshTokenExpiration?: number;
  /** Authorization code expiration in seconds (oauth2 type only) */
  codeExpiration?: number;
}

/**
 * Parsed server interface metadata
 */
export interface ParsedServer {
  /** Original interface name */
  interfaceName: string;
  /** Server name */
  name: string;
  /** Server version (defaults to '1.0.0' if not specified) */
  version: string;
  /** Server description */
  description: string;
  /** Class name that implements this interface */
  className?: string;
  /** Transport type (inferred from config if not explicit) */
  transport?: 'stdio' | 'http' | 'websocket';
  /** Port number for HTTP transport */
  port?: number;
  /** Enable stateful session management */
  stateful?: boolean;
  /** WebSocket configuration */
  websocket?: {
    port?: number;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    maxMessageSize?: number;
  };
  /** Authentication configuration */
  auth?: ParsedAuth;
  /** Control visibility of router-assigned tools */
  flattenRouters?: boolean;
}

/**
 * Complete parsing result
 */
export interface ParseResult {
  server?: ParsedServer;
  tools: ParsedTool[];
  prompts: ParsedPrompt[];
  resources: ParsedResource[];
  samplings: ParsedSampling[];
  elicitations: ParsedElicit[];
  roots: ParsedRoots[];
  subscriptions: ParsedSubscription[];
  completions: ParsedCompletion[];
  uis: ParsedUI[];
  routers: ParsedRouter[];
  className?: string;
  /** Validation errors encountered during parsing */
  validationErrors?: string[];
  /** Discovered implementations (NEW v4 auto-discovery) */
  implementations?: DiscoveredImplementation[];
  /** Discovered class instances (NEW v4 auto-discovery) */
  instances?: DiscoveredInstance[];
}
