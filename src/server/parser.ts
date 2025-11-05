/**
 * Interface-Driven API Parser
 *
 * Parses TypeScript files to discover interfaces extending ITool, IPrompt, IResource, IServer.
 * Extracts metadata and type information for schema generation.
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { IDatabase } from './interface-types.js';

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
  annotations?: import('./interface-types.js').IToolAnnotations;
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
 * Discovered const implementation
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
 * Discovered class instance
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

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 * Examples: 'getWeather' -> 'get_weather', 'createUser' -> 'create_user'
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore
}

/**
 * Normalize tool name to snake_case (accepts both camelCase and snake_case)
 * If the name already contains underscores, assume it's snake_case and return as-is.
 * Otherwise, convert from camelCase to snake_case.
 *
 * Examples:
 * - 'getWeather' -> 'get_weather' (camelCase conversion)
 * - 'get_weather' -> 'get_weather' (already snake_case)
 * - 'greet' -> 'greet' (single word, unchanged)
 */
export function normalizeToolName(name: string): string {
  // If already snake_case (contains underscores), return as-is
  if (name.includes('_')) {
    return name;
  }
  // Otherwise convert camelCase to snake_case
  return camelToSnake(name);
}

/**
 * Convert string to kebab-case
 * Used for server names to enforce naming convention
 *
 * Examples:
 * - 'My Server' -> 'my-server' (spaces to hyphens)
 * - 'SimpleAPI' -> 'simple-api' (camelCase conversion)
 * - 'my_server' -> 'my-server' (underscores to hyphens)
 * - 'my-server' -> 'my-server' (already kebab-case)
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase → kebab-case
    .replace(/[\s_]+/g, '-')               // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/gi, '-')          // non-alphanumeric → hyphens
    .replace(/-+/g, '-')                   // multiple hyphens → single
    .replace(/^-+|-+$/g, '')               // trim leading/trailing hyphens
    .toLowerCase();
}

/**
 * Parse a TypeScript file to discover interface-driven API definitions
 */
export function parseInterfaceFile(filePath: string): ParseResult {
  const absolutePath = resolve(filePath);
  const sourceCode = readFileSync(absolutePath, 'utf-8');

  // Create a TypeScript program
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const result: ParseResult = {
    tools: [],
    prompts: [],
    resources: [],
    samplings: [],
    elicitations: [],
    roots: [],
    subscriptions: [],
    completions: [],
    uis: [],
    routers: [],
    validationErrors: [],
    implementations: [],
    instances: [],
  };

  // Store auth interfaces by name for resolution
  const authInterfaces = new Map<string, ParsedAuth>();

  // Visit all nodes in the source file
  function visit(node: ts.Node) {
    // NEW: Discover const server
    const constServer = discoverConstServer(node, sourceFile);
    if (constServer && !result.server) {
      // Extract server metadata from object literal
      const initializer = constServer.initializer;
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        const serverData: any = {};
        for (const prop of initializer.properties) {
          if (ts.isPropertyAssignment(prop)) {
            const name = prop.name.getText(sourceFile);
            const value = prop.initializer;

            if (ts.isStringLiteral(value) || ts.isNumericLiteral(value)) {
              serverData[name] = value.text;
            } else if (ts.isToken(value) && value.kind === ts.SyntaxKind.TrueKeyword) {
              serverData[name] = true;
            } else if (ts.isToken(value) && value.kind === ts.SyntaxKind.FalseKeyword) {
              serverData[name] = false;
            }
          }
        }

        result.server = {
          interfaceName: 'IServer',
          name: serverData.name || 'unknown',
          version: serverData.version || '1.0.0',
          description: serverData.description
        };
      }
    }

    // NEW: Discover const implementations
    const constImpl = discoverConstImplementation(node, sourceFile);
    if (constImpl) {
      result.implementations!.push(constImpl);
    }

    // NEW: Discover class instantiations
    const instance = discoverClassInstance(node, sourceFile);
    if (instance) {
      result.instances!.push(instance);
    }

    // Check for interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;

      // Check if it extends ITool, IPrompt, IResource, IServer, or IAuth types
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            const typeName = type.expression.getText(sourceFile);

            if (typeName === 'ITool') {
              const tool = parseToolInterface(node, sourceFile, result.validationErrors!);
              if (tool) result.tools.push(tool);
            } else if (typeName === 'IPrompt') {
              const prompt = parsePromptInterface(node, sourceFile);
              if (prompt) result.prompts.push(prompt);
            } else if (typeName === 'IResource') {
              const resource = parseResourceInterface(node, sourceFile);
              if (resource) result.resources.push(resource);
            } else if (typeName === 'ISampling') {
              const sampling = parseSamplingInterface(node, sourceFile);
              if (sampling) result.samplings.push(sampling);
            } else if (typeName === 'IElicit') {
              const elicit = parseElicitInterface(node, sourceFile);
              if (elicit) result.elicitations.push(elicit);
            } else if (typeName === 'IRoots') {
              const roots = parseRootsInterface(node, sourceFile);
              if (roots) result.roots.push(roots);
            } else if (typeName === 'ISubscription') {
              const subscription = parseSubscriptionInterface(node, sourceFile);
              if (subscription) result.subscriptions.push(subscription);
            } else if (typeName === 'ICompletion') {
              const completion = parseCompletionInterface(node, sourceFile);
              if (completion) result.completions.push(completion);
            } else if (typeName === 'IUI') {
              const ui = parseUIInterface(node, sourceFile);
              if (ui) result.uis.push(ui);
            } else if (typeName === 'IToolRouter' || typeName.startsWith('IToolRouter<')) {
              const router = parseRouterInterface(node, sourceFile);
              if (router) result.routers.push(router);
            } else if (typeName === 'IServer') {
              const server = parseServerInterface(node, sourceFile, authInterfaces);
              if (server) result.server = server;
            } else if (typeName === 'IAuth' || typeName === 'IApiKeyAuth') {
              const auth = parseAuthInterface(node, sourceFile);
              if (auth) authInterfaces.set(interfaceName, auth);
            }
          }
        }
      }
    }

    // Check for class declarations implementing IServer
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text;
      if (!className) {
        ts.forEachChild(node, visit);
        return;
      }

      // NEW: Discover class property implementations
      const classImpls = discoverClassImplementations(node, sourceFile);
      result.implementations!.push(...classImpls);

      const modifiers = node.modifiers ? Array.from(node.modifiers) : [];
      const hasDefaultExport = modifiers.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
      const hasExport = modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);

      // Priority 1: Explicit export default (backward compatible)
      if (hasExport && hasDefaultExport) {
        result.className = className;
        if (result.server) {
          result.server.className = className;
        }
      }

      // Priority 2: Class implements server interface
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
            for (const type of clause.types) {
              const typeName = type.expression.getText(sourceFile);
              if (result.server && typeName === result.server.interfaceName) {
                result.server.className = className;
                if (!result.className) {
                  result.className = className;
                }
              }
            }
          }
        }
      }

      // Priority 3: Auto-detect class by naming pattern (fallback)
      if (!result.className && !hasDefaultExport) {
        const isServerClass = /Server|Service|Impl|Handler|Provider|Manager$/i.test(className);
        if (isServerClass) {
          result.className = className;
          if (result.server) {
            result.server.className = className;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Link implementations to interfaces
  linkImplementationsToInterfaces(result);

  return result;
}

/**
 * Discover const server definition
 * Pattern: const server: IServer = { ... }
 */
function discoverConstServer(node: ts.Node, sourceFile: ts.SourceFile): ts.VariableDeclaration | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    const typeText = declaration.type.getText(sourceFile);
    if (typeText === 'IServer') {
      return declaration;
    }
  }

  return null;
}

/**
 * Discover const implementations
 * Pattern: const add: ToolHelper<AddTool> = async (params) => { ... }
 */
function discoverConstImplementation(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredImplementation | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    const typeText = declaration.type.getText(sourceFile);

    // Check for ToolHelper<X>, PromptHelper<X>, ResourceHelper<X>
    const helperMatch = typeText.match(/^(Tool|Prompt|Resource)Helper<(\w+)>$/);
    if (helperMatch) {
      const [, helper, interfaceName] = helperMatch;

      return {
        name: declaration.name.getText(sourceFile),
        helperType: `${helper}Helper` as any,
        interfaceName,
        kind: 'const'
      };
    }
  }

  return null;
}

/**
 * Discover class property implementations
 * Pattern: class C { getWeather: ToolHelper<GetWeatherTool> = async (params) => { ... } }
 */
function discoverClassImplementations(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DiscoveredImplementation[] {
  const implementations: DiscoveredImplementation[] = [];
  const className = node.name?.text;

  if (!className) return implementations;

  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.type) continue;

    const typeText = member.type.getText(sourceFile);
    const helperMatch = typeText.match(/^(Tool|Prompt|Resource)Helper<(\w+)>$/);

    if (helperMatch) {
      const [, helper, interfaceName] = helperMatch;

      implementations.push({
        name: member.name.getText(sourceFile),
        helperType: `${helper}Helper` as any,
        interfaceName,
        kind: 'class-property',
        className
      });
    }
  }

  return implementations;
}

/**
 * Discover class instantiations
 * Pattern: const weatherService = new WeatherService();
 */
function discoverClassInstance(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredInstance | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.initializer) continue;
    if (!ts.isNewExpression(declaration.initializer)) continue;

    const className = declaration.initializer.expression.getText(sourceFile);
    const instanceName = declaration.name.getText(sourceFile);

    return { instanceName, className };
  }

  return null;
}

/**
 * Link discovered implementations to their interfaces
 */
function linkImplementationsToInterfaces(result: ParseResult) {
  if (!result.implementations) return;

  for (const impl of result.implementations) {
    if (impl.helperType === 'ToolHelper') {
      const tool = result.tools.find(t => t.interfaceName === impl.interfaceName);
      if (tool) {
        (tool as any).implementation = impl;
      }
    } else if (impl.helperType === 'ResourceHelper') {
      const resource = result.resources.find(r => r.interfaceName === impl.interfaceName);
      if (resource) {
        (resource as any).implementation = impl;
      }
    } else if (impl.helperType === 'PromptHelper') {
      const prompt = result.prompts.find(p => p.interfaceName === impl.interfaceName);
      if (prompt) {
        (prompt as any).implementation = impl;
      }
    }
  }
}

/**
 * Validate that params use IParam interfaces (not plain TypeScript types)
 * Each parameter must have a description property (minimum requirement)
 */
function validateParamsUseIParam(paramsNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile, interfaceName: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!paramsNode) {
    return { valid: true, errors: [] }; // No params is fine
  }

  // Check if params is a TypeLiteral (object type like { name: string; age: number })
  if (ts.isTypeLiteralNode(paramsNode)) {
    for (const member of paramsNode.members) {
      if (ts.isPropertySignature(member) && member.type) {
        const paramName = member.name?.getText(sourceFile) || 'unknown';
        const paramType = member.type;

        // CRITICAL: Check for inline IParam intersection (& IParam)
        // This pattern does NOT work with type coercion - it's a known bug
        if (ts.isIntersectionTypeNode(paramType)) {
          // Check if one of the intersection types is IParam or a reference to IParam
          const hasIParam = paramType.types.some(type => {
            if (ts.isTypeReferenceNode(type)) {
              const typeName = type.typeName.getText(sourceFile);
              return typeName === 'IParam';
            }
            return false;
          });

          if (hasIParam) {
            const paramTypeText = paramType.getText(sourceFile);
            errors.push(
              `❌ CRITICAL ERROR: Parameter '${paramName}' in ${interfaceName} uses inline IParam intersection.\n` +
              `\n` +
              `  Current (BROKEN - type coercion fails):\n` +
              `    params: { ${paramName}: ${paramTypeText} }\n` +
              `\n` +
              `  Why this fails:\n` +
              `    • The schema generator does NOT support intersection types (& IParam)\n` +
              `    • Number/boolean parameters will be received as STRINGS\n` +
              `    • Arithmetic operations will fail silently (e.g., 42 + 58 = "4258")\n` +
              `    • This is a known framework limitation\n` +
              `\n` +
              `  ✅ REQUIRED FIX - Use separate interface:\n` +
              `    interface ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param extends IParam {\n` +
              `      type: 'number';  // or 'string', 'boolean', etc.\n` +
              `      description: 'Description of ${paramName}';\n` +
              `      // Add any validation constraints here\n` +
              `    }\n` +
              `\n` +
              `    params: { ${paramName}: ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param }\n` +
              `\n` +
              `  📚 See examples/interface-params.ts for correct patterns.`
            );
            continue; // Skip other checks for this parameter
          }
        }

        // Check if the parameter type references an interface (good)
        // vs. using a primitive type directly (bad)
        const isDirectType =
          paramType.kind === ts.SyntaxKind.StringKeyword ||
          paramType.kind === ts.SyntaxKind.NumberKeyword ||
          paramType.kind === ts.SyntaxKind.BooleanKeyword ||
          paramType.kind === ts.SyntaxKind.AnyKeyword ||
          ts.isArrayTypeNode(paramType) ||    // string[], number[]
          ts.isUnionTypeNode(paramType) ||    // 'a' | 'b'
          ts.isLiteralTypeNode(paramType);    // 'literal'

        if (isDirectType) {
          errors.push(
            `ERROR: Parameter '${paramName}' in ${interfaceName} uses a direct type instead of IParam.\n` +
            `  Current: params: { ${paramName}: ${paramType.getText(sourceFile)} }\n` +
            `  Required: params: { ${paramName}: ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param }\n` +
            `\n` +
            `  Fix: Define a parameter interface:\n` +
            `  interface ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param extends IParam {\n` +
            `    type: '${getIParamTypeFromTS(paramType)}';\n` +
            `    description: 'Description of ${paramName}';\n` +
            `  }\n` +
            `\n` +
            `  Why: IParam interfaces provide:\n` +
            `  - Required 'description' field for LLM documentation\n` +
            `  - Validation constraints (min/max, minLength/maxLength, pattern, etc.)\n` +
            `  - Better JSON Schema generation for tool calls\n` +
            `\n` +
            `  See examples/interface-params.ts for complete examples.`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Helper to suggest IParam type from TypeScript type
 */
function getIParamTypeFromTS(typeNode: ts.TypeNode): string {
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText();
    if (typeName === 'Array' || typeName.endsWith('[]')) return 'array';
  }
  if (ts.isArrayTypeNode(typeNode)) return 'array';

  const typeText = typeNode.getText();
  if (typeText === 'string') return 'string';
  if (typeText === 'number') return 'number';
  if (typeText === 'boolean') return 'boolean';
  if (/^\d+$/.test(typeText)) return 'integer';

  return 'string';
}

/**
 * Extract and validate tool annotations from an AST type node
 * @param typeNode - The TypeScript type node for annotations property
 * @param sourceFile - Source file for text extraction
 * @param interfaceName - Tool interface name (for error messages)
 * @param validationErrors - Array to collect validation errors
 * @returns Parsed annotations object or undefined if invalid
 */
function extractAnnotationsFromType(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  interfaceName: string,
  validationErrors: string[]
): import('./interface-types.js').IToolAnnotations | undefined {
  // Annotations must be an object literal type
  if (!ts.isTypeLiteralNode(typeNode)) {
    validationErrors.push(
      `Tool '${interfaceName}': annotations must be an object literal type`
    );
    return undefined;
  }

  const annotations: any = {};

  // Extract each property from the type literal
  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sourceFile);
      const propType = member.type;

      // Extract literal values
      if (ts.isLiteralTypeNode(propType)) {
        const literal = propType.literal;
        if (ts.isStringLiteral(literal)) {
          annotations[propName] = literal.text;
        } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          annotations[propName] = true;
        } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
          annotations[propName] = false;
        } else if (ts.isNumericLiteral(literal)) {
          annotations[propName] = Number(literal.text);
        }
      }
      // Handle boolean true/false keywords directly
      else if (propType.kind === ts.SyntaxKind.TrueKeyword) {
        annotations[propName] = true;
      } else if (propType.kind === ts.SyntaxKind.FalseKeyword) {
        annotations[propName] = false;
      }
    }
  }

  // Validate annotations
  validateAnnotations(annotations, interfaceName, validationErrors);

  return Object.keys(annotations).length > 0 ? annotations : undefined;
}

/**
 * Validate tool annotations according to business rules
 * @param annotations - Parsed annotations object
 * @param interfaceName - Tool interface name (for error messages)
 * @param validationErrors - Array to collect validation errors
 */
function validateAnnotations(
  annotations: any,
  interfaceName: string,
  validationErrors: string[]
): void {
  // Rule 1: Mutual exclusivity - readOnlyHint: true + destructiveHint: true → ERROR
  if (annotations.readOnlyHint === true && annotations.destructiveHint === true) {
    validationErrors.push(
      `Tool '${interfaceName}' cannot be both readOnlyHint and destructiveHint. ` +
      `A read-only tool cannot perform destructive operations.`
    );
  }

  // Rule 2: Enum validation - estimatedDuration must be 'fast' | 'medium' | 'slow'
  if (annotations.estimatedDuration !== undefined) {
    const validDurations = ['fast', 'medium', 'slow'];
    if (!validDurations.includes(annotations.estimatedDuration)) {
      validationErrors.push(
        `Tool '${interfaceName}': Invalid estimatedDuration '${annotations.estimatedDuration}'. ` +
        `Must be one of: ${validDurations.map(d => `'${d}'`).join(', ')}`
      );
    }
  }

  // Rule 3: Type checking - Boolean fields must be boolean
  const booleanFields = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint', 'requiresConfirmation'];
  for (const field of booleanFields) {
    if (annotations[field] !== undefined && typeof annotations[field] !== 'boolean') {
      validationErrors.push(
        `Tool '${interfaceName}': Field '${field}' must be a boolean value (true or false), ` +
        `got '${annotations[field]}'`
      );
    }
  }

  // Rule 4: String fields validation
  if (annotations.title !== undefined && typeof annotations.title !== 'string') {
    validationErrors.push(
      `Tool '${interfaceName}': Field 'title' must be a string, got '${annotations.title}'`
    );
  }

  if (annotations.category !== undefined && typeof annotations.category !== 'string') {
    validationErrors.push(
      `Tool '${interfaceName}': Field 'category' must be a string, got '${annotations.category}'`
    );
  }

  // Rule 5: Unknown fields are allowed (custom metadata) but warn about them
  const knownFields = [
    'title', 'readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint',
    'requiresConfirmation', 'category', 'estimatedDuration'
  ];
  for (const field of Object.keys(annotations)) {
    if (!knownFields.includes(field)) {
      console.warn(
        `\n⚠️  WARNING: Tool '${interfaceName}' has unknown annotation field '${field}'. ` +
        `This will be treated as custom metadata.\n`
      );
    }
  }
}

/**
 * Parse an ITool interface
 */
function parseToolInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile, validationErrors: string[]): ParsedTool | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let paramsType = 'any';
  let resultType = 'any';
  let paramsNode: ts.TypeNode | undefined;
  let resultNode: ts.TypeNode | undefined;
  let annotations: import('./interface-types.js').IToolAnnotations | undefined;

  // Extract JSDoc description
  const jsDocTags = ts.getJSDocTags(node);
  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  for (const comment of jsDocComments) {
    if (ts.isJSDoc(comment) && comment.comment) {
      description = typeof comment.comment === 'string' ? comment.comment : '';
    }
  }

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = normalizeToolName(literal.text);
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'params' && member.type) {
        paramsNode = member.type;
        paramsType = member.type.getText(sourceFile);
      } else if (memberName === 'result' && member.type) {
        resultNode = member.type;
        resultType = member.type.getText(sourceFile);
      } else if (memberName === 'annotations' && member.type) {
        // Extract annotations object literal
        annotations = extractAnnotationsFromType(member.type, sourceFile, interfaceName, validationErrors);
      }
    }
  }

  // Validate params use IParam (not direct types)
  // Note: This is now a warning, not an error, to maintain backward compatibility
  const validation = validateParamsUseIParam(paramsNode, sourceFile, interfaceName);
  if (!validation.valid) {
    // Print validation warnings (not errors) to encourage best practices
    for (const error of validation.errors) {
      console.warn('\n⚠️  WARNING: ' + error + '\n');
      // Add to validationErrors array for dry-run to report
      validationErrors.push(error);
    }
    // Don't return null - allow tool discovery to continue with warnings
  }

  // Phase 2.1: Tool name inference
  // If name is not provided, guess method name from interface name
  // e.g., "GetWeatherTool" → "getWeather", "MultiplyTool" → "multiply"
  let methodName: string;
  if (name) {
    methodName = snakeToCamel(name);
  } else {
    // Guess method name from interface name
    // Remove "Tool" suffix and lowercase first letter
    methodName = interfaceName
      .replace(/Tool$/, '')  // Remove "Tool" suffix
      .replace(/^([A-Z])/, (m: string) => m.toLowerCase()); // Lowercase first letter
  }

  return {
    interfaceName,
    name: name || undefined,  // Store undefined if not provided
    description,
    methodName,  // Guessed from interface if name not provided
    paramsType,
    resultType,
    paramsNode,
    resultNode,
    annotations,
  };
}

/**
 * Parse an IPrompt interface
 */
function parsePromptInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedPrompt | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let argsType = 'any';
  let argsMetadata: Record<string, { description?: string; required?: boolean }> | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = normalizeToolName(literal.text);
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'args' && member.type && ts.isTypeLiteralNode(member.type)) {
        // Parse args metadata: Record<string, IPromptArgument>
        // Note: Defaults are applied in the handler layer:
        //   - type defaults to 'string'
        //   - required defaults to true
        argsMetadata = {};
        for (const argMember of member.type.members) {
          if (ts.isPropertySignature(argMember) && argMember.name && argMember.type) {
            const argName = argMember.name.getText(sourceFile);
            const argMetadata: { description?: string; required?: boolean; type?: string; enum?: string[] } = {};

            // Parse IPromptArgument fields
            if (ts.isTypeLiteralNode(argMember.type)) {
              const argFieldCount = argMember.type.members.length;

              // Handle empty argument definition: { argName: {} }
              // Empty object means "use all defaults" (type='string', required=true)
              if (argFieldCount === 0) {
                // Store empty object to indicate all defaults should be applied
                argsMetadata[argName] = {};
                continue;
              }

              for (const argField of argMember.type.members) {
                if (ts.isPropertySignature(argField) && argField.name && argField.type) {
                  const fieldName = argField.name.getText(sourceFile);

                  if (fieldName === 'description' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (ts.isStringLiteral(literal)) {
                      argMetadata.description = literal.text;
                    }
                  } else if (fieldName === 'required' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                      argMetadata.required = true;
                    } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                      argMetadata.required = false;
                    }
                  } else if (fieldName === 'type' && ts.isLiteralTypeNode(argField.type)) {
                    const literal = argField.type.literal;
                    if (ts.isStringLiteral(literal)) {
                      argMetadata.type = literal.text;
                    }
                  } else if (fieldName === 'enum') {
                    // Extract enum values from tuple type (interface literals) or array literal (runtime values)
                    if (ts.isTupleTypeNode(argField.type)) {
                      // Tuple type: enum: ['a', 'b'] in interface
                      argMetadata.enum = argField.type.elements
                        .map(elem => {
                          const elementType = ts.isNamedTupleMember(elem) ? elem.type : elem;
                          if (ts.isLiteralTypeNode(elementType)) {
                            const literal = elementType.literal;
                            if (ts.isStringLiteral(literal)) {
                              return literal.text;
                            }
                          }
                          return null;
                        })
                        .filter((val): val is string => val !== null);
                    } else if (ts.isArrayLiteralExpression(argField.type)) {
                      // Array literal: enum: ['a', 'b'] (less common in interfaces)
                      argMetadata.enum = argField.type.elements
                        .filter(ts.isStringLiteral)
                        .map(elem => elem.text);
                    }
                  }
                }
              }
            }

            argsMetadata[argName] = argMetadata;
          }
        }
      }
    }

    // Check for callable signature (method implementation)
    // CallSignatureDeclaration is a different node type
    if (ts.isCallSignatureDeclaration(member)) {
      // Extract parameter type from callable signature
      if (member.parameters.length > 0) {
        const firstParam = member.parameters[0];
        if (firstParam.type) {
          argsType = firstParam.type.getText(sourceFile);
        }
      }
    }
  }

  if (!name) {
    console.warn(`Prompt interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    argsMetadata,
    argsType,
  };
}

/**
 * Extract static data from literal type nodes
 * Handles simple cases: string literals, number literals, booleans, null
 * For complex objects, returns undefined (requires dynamic: true)
 */
function extractStaticData(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): any {
  // String literal: 'hello', numbers, booleans, null
  if (ts.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.literal;
    // Template literal without substitutions: `hello world`
    if (ts.isNoSubstitutionTemplateLiteral(literal)) {
      return literal.text;
    }
    if (ts.isStringLiteral(literal)) {
      return literal.text;
    }
    if (ts.isNumericLiteral(literal)) {
      return Number(literal.text);
    }
    if (literal.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
    if (literal.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    if (literal.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }
    // Handle negative numbers: -10, -3.14
    if (ts.isPrefixUnaryExpression(literal) && literal.operator === ts.SyntaxKind.MinusToken) {
      const operand = literal.operand;
      if (ts.isNumericLiteral(operand)) {
        return -Number(operand.text);
      }
    }
  }

  // Object literal: { key: 'value', num: 42 }
  if (ts.isTypeLiteralNode(typeNode)) {
    const obj: any = {};
    let hasNonLiteralValue = false;

    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const key = member.name.getText(sourceFile);
        const value = extractStaticData(member.type, sourceFile);

        // Check if extraction failed (undefined returned, but it's not an UndefinedKeyword or NullKeyword)
        if (value === undefined &&
            member.type.kind !== ts.SyntaxKind.UndefinedKeyword) {
          // Complex type that we can't extract
          hasNonLiteralValue = true;
          break;
        }

        obj[key] = value;
      }
    }

    // Only return object if all values are simple literals
    return hasNonLiteralValue ? undefined : obj;
  }

  // Tuple type: ['a', 'b', 'c'] (readonly arrays with literal types)
  if (ts.isTupleTypeNode(typeNode)) {
    const arr: any[] = [];

    for (const element of typeNode.elements) {
      // Handle NamedTupleMember for labeled tuples
      const elementType = ts.isNamedTupleMember(element) ? element.type : element;
      const value = extractStaticData(elementType, sourceFile);

      if (value === undefined) {
        // Can't extract tuple with complex types
        return undefined;
      }

      arr.push(value);
    }

    return arr;
  }

  // Can't extract - requires dynamic implementation
  return undefined;
}

/**
 * Parse an IResource interface
 */
function parseResourceInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedResource | null {
  const interfaceName = node.name.text;
  let uri = '';
  let name = '';
  let description = '';
  let mimeType = '';
  let data: any = undefined;
  let dynamic = false;
  let dataType = 'any';
  let value: any = undefined;
  let returns: any = undefined;
  let hasValue = false;
  let hasReturns = false;
  let valueType = 'any';
  let returnsType = 'any';
  let database: IDatabase | undefined = undefined;

  // Parse interface members
  const invalidDataFields: string[] = [];

  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'mimeType' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          mimeType = literal.text;
        }
      } else if (memberName === 'value' && member.type) {
        // Static literal data
        valueType = member.type.getText(sourceFile);
        value = extractStaticData(member.type, sourceFile);
        hasValue = true;
      } else if (memberName === 'returns' && member.type) {
        // Dynamic type definition
        returnsType = member.type.getText(sourceFile);
        returns = extractStaticData(member.type, sourceFile); // Try extraction (usually undefined for types)
        hasReturns = true;
      } else if (memberName === 'database' && member.type) {
        // Database configuration
        database = extractStaticData(member.type, sourceFile) as IDatabase | undefined;

        // Validate database configuration
        if (database && typeof database === 'object') {
          if (!database.uri || typeof database.uri !== 'string') {
            throw new Error(
              `Resource interface ${interfaceName} has invalid database configuration. ` +
              `The 'uri' field is required and must be a string.`
            );
          }
        }
      } else if (memberName === 'text' || memberName === 'data' || memberName === 'content') {
        // Track invalid fields that look like they should be 'value' or 'returns'
        invalidDataFields.push(memberName);
      }
    }
  }

  if (!uri) {
    console.warn(`Resource interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  // Check for invalid data fields
  if (invalidDataFields.length > 0) {
    throw new Error(
      `Resource interface ${interfaceName} uses invalid field(s): ${invalidDataFields.join(', ')}.\n` +
      `\n` +
      `Resources must use one of these fields for data:\n` +
      `  - 'value' for static resources (literal data in the interface)\n` +
      `  - 'returns' for dynamic resources (type annotation, requires implementation)\n` +
      `\n` +
      `Examples:\n` +
      `\n` +
      `Static resource:\n` +
      `  interface ConfigResource extends IResource {\n` +
      `    uri: 'config://settings';\n` +
      `    value: { apiUrl: 'https://api.example.com' };  // Literal data\n` +
      `  }\n` +
      `\n` +
      `Dynamic resource:\n` +
      `  interface StatsResource extends IResource {\n` +
      `    uri: 'stats://current';\n` +
      `    returns: string;  // Type annotation\n` +
      `  }\n` +
      `  class MyServer {\n` +
      `    'stats://current': StatsResource = async () => { ... };  // Implementation\n` +
      `  }`
    );
  }

  // Validate mutual exclusivity of value and returns
  if (hasValue && hasReturns) {
    throw new Error(
      `Resource interface ${interfaceName} cannot have both 'value' and 'returns' fields. ` +
      `Use 'value' for static resources (literal data) or 'returns' for dynamic resources (type definitions).`
    );
  }

  // Determine if resource is dynamic based on which field is present
  const isDynamic = hasReturns;

  // Set data and dataType based on which field was used
  if (hasValue) {
    data = value;
    dataType = valueType;
  } else if (hasReturns) {
    data = returns;
    dataType = returnsType;
  }

  return {
    interfaceName,
    uri,
    name,
    description,
    // For dynamic resources, use the URI directly as the method/property name
    // JavaScript allows any string as a property key: server['config://server']
    methodName: uri,
    mimeType,
    data,
    dynamic: isDynamic,
    dataType,
    database,
  };
}

/**
 * Parse an ISampling interface
 */
function parseSamplingInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedSampling | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let messagesType = 'any';
  let optionsType: string | undefined;
  let isStatic = false;
  let messages: any = undefined;
  let options: any = undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'messages' && member.type) {
        messagesType = member.type.getText(sourceFile);
        // Try to extract static messages data
        messages = extractStaticData(member.type, sourceFile);
        if (messages !== undefined) {
          isStatic = true;
        }
      } else if (memberName === 'options' && member.type) {
        optionsType = member.type.getText(sourceFile);
        // Try to extract static options data
        options = extractStaticData(member.type, sourceFile);
      }
    }
  }

  return {
    interfaceName,
    name,
    messagesType,
    optionsType,
    isStatic,
    messages,
    options,
  };
}

/**
 * Parse an IElicit interface
 */
function parseElicitInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedElicit | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let prompt = '';
  let argsType = 'any';
  let resultType = 'any';
  let isStatic = false;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'prompt' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          prompt = literal.text;
          isStatic = true; // If prompt is a literal, it's static
        }
      } else if (memberName === 'args' && member.type) {
        argsType = member.type.getText(sourceFile);
      } else if (memberName === 'result' && member.type) {
        resultType = member.type.getText(sourceFile);
      }
    }
  }

  if (!prompt) {
    console.warn(`Elicit interface ${interfaceName} missing 'prompt' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    prompt,
    argsType,
    resultType,
    isStatic,
  };
}

/**
 * Parse an IRoots interface
 */
function parseRootsInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedRoots | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      }
    }
  }

  if (!name) {
    console.warn(`Roots interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
  };
}

/**
 * Parse an ISubscription interface
 */
function parseSubscriptionInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedSubscription | null {
  const interfaceName = node.name.text;
  let name = interfaceName; // Use interface name as identifier
  let uri = '';
  let description = '';
  let hasHandler = false;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'handler' && member.type) {
        // Check if handler property exists
        hasHandler = true;
      }
    }
  }

  if (!uri) {
    console.warn(`Subscription interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    uri,
    description,
    hasHandler,
    // Use URI as method name (like resources)
    methodName: uri,
  };
}

/**
 * Parse an ICompletion interface
 */
function parseCompletionInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedCompletion | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let refType = 'any';
  let hasCompleteFunction = false;
  let argType = 'any';
  let suggestionsType = 'any';

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'ref' && member.type) {
        refType = member.type.getText(sourceFile);
      } else if (memberName === 'complete' && member.type) {
        hasCompleteFunction = true;
        // Try to extract type parameters from the function type
        if (ts.isFunctionTypeNode(member.type)) {
          // Extract parameter types
          if (member.type.parameters.length > 0) {
            const firstParam = member.type.parameters[0];
            if (firstParam.type) {
              argType = firstParam.type.getText(sourceFile);
            }
          }
          // Extract return type
          if (member.type.type) {
            suggestionsType = member.type.type.getText(sourceFile);
          }
        }
      }
    }
  }

  if (!name) {
    console.warn(`Completion interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    refType,
    description,
    hasCompleteFunction,
    methodName: snakeToCamel(name),
    argType,
    suggestionsType,
  };
}

/**
 * Parse an IUI interface
 */
function parseUIInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedUI | null {
  const interfaceName = node.name.text;
  // DEBUG: Log when parsing UI interface
  console.error(`[DEBUG:UI-PARSER] Parsing UI interface: "${interfaceName}"`);

  let uri = '';
  let name = '';
  let description = '';
  let html: string | undefined;
  let css: string | undefined;
  let tools: string[] | undefined;
  let size: { width?: number; height?: number } | undefined;
  let subscribable: boolean | undefined;
  let dynamic = false;
  let dataType = 'any';

  // Feature Layer fields
  let file: string | undefined;
  let component: string | undefined;
  let script: string | undefined;
  let stylesheets: string[] | undefined;
  let scripts: string[] | undefined;
  let dependencies: string[] | undefined;
  let bundle:
    | boolean
    | { minify?: boolean; sourcemap?: boolean; external?: string[]; format?: 'iife' | 'esm' }
    | undefined;
  let imports: string[] | undefined;
  let theme: string | { name: string; variables: Record<string, string> } | undefined;

  // Polish Layer fields - Production Optimizations
  let minify: boolean | { html?: boolean; css?: boolean; js?: boolean } | undefined;
  let cdn:
    | boolean
    | { baseUrl?: string; sri?: boolean | 'sha256' | 'sha384' | 'sha512'; compression?: 'gzip' | 'brotli' | 'both' }
    | undefined;
  let performance:
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
      }
    | undefined;

  // Phase 3A: text/uri-list MIME type support
  let externalUrl: string | undefined;

  // Phase 3B: Remote DOM MIME type support
  let remoteDom: string | undefined;

  // v4.0: Unified source field
  let source: string | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'html' && member.type) {
        // Extract HTML content from string literal or template literal
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            html = literal.text;
            // DEBUG: Log HTML extraction
            console.error(`[DEBUG:UI-PARSER] Extracted HTML from template literal in interface "${interfaceName}", length=${html.length}`);
          }
        }
      } else if (memberName === 'css' && member.type) {
        // Extract CSS content from string literal or template literal
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            css = literal.text;
          }
        }
      } else if (memberName === 'tools' && member.type) {
        // Extract tools array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const toolsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                toolsArray.push(literal.text);
              }
            }
          }
          if (toolsArray.length > 0) {
            tools = toolsArray;
          }
        }
      } else if (memberName === 'size' && member.type) {
        // Extract size object from type literal
        if (ts.isTypeLiteralNode(member.type)) {
          const sizeObj: { width?: number; height?: number } = {};
          for (const sizeMember of member.type.members) {
            if (ts.isPropertySignature(sizeMember) && sizeMember.name && sizeMember.type) {
              const sizeMemberName = sizeMember.name.getText(sourceFile);
              if (ts.isLiteralTypeNode(sizeMember.type)) {
                const literal = sizeMember.type.literal;
                if (ts.isNumericLiteral(literal)) {
                  const value = parseInt(literal.text, 10);
                  if (sizeMemberName === 'width') {
                    sizeObj.width = value;
                  } else if (sizeMemberName === 'height') {
                    sizeObj.height = value;
                  }
                }
              }
            }
          }
          if (sizeObj.width !== undefined || sizeObj.height !== undefined) {
            size = sizeObj;
          }
        }
      } else if (memberName === 'subscribable' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          subscribable = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          subscribable = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            subscribable = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            subscribable = false;
          }
        }
      } else if (memberName === 'dynamic' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          dynamic = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            dynamic = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            dynamic = false;
          }
        }
      } else if (memberName === 'data' && member.type) {
        dataType = member.type.getText(sourceFile);
      } else if (memberName === 'file' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract file path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          file = literal.text;
        }
      } else if (memberName === 'component' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract component path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          component = literal.text;
        }
      } else if (memberName === 'script' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract script path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          script = literal.text;
        }
      } else if (memberName === 'stylesheets' && member.type) {
        // Extract stylesheets array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const stylesheetsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                stylesheetsArray.push(literal.text);
              }
            }
          }
          if (stylesheetsArray.length > 0) {
            stylesheets = stylesheetsArray;
          }
        }
      } else if (memberName === 'scripts' && member.type) {
        // Extract scripts array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const scriptsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                scriptsArray.push(literal.text);
              }
            }
          }
          if (scriptsArray.length > 0) {
            scripts = scriptsArray;
          }
        }
      } else if (memberName === 'dependencies' && member.type) {
        // Extract dependencies array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const dependenciesArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                dependenciesArray.push(literal.text);
              }
            }
          }
          if (dependenciesArray.length > 0) {
            dependencies = dependenciesArray;
          }
        }
      } else if (memberName === 'imports' && member.type) {
        // Extract imports array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const importsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                importsArray.push(literal.text);
              }
            }
          }
          if (importsArray.length > 0) {
            imports = importsArray;
          }
        }
      } else if (memberName === 'bundle' && member.type) {
        // Parse bundle configuration (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          bundle = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          bundle = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            bundle = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            bundle = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse bundle object with minify, sourcemap, external, format
          const bundleObj: { minify?: boolean; sourcemap?: boolean; external?: string[]; format?: 'iife' | 'esm' } = {};
          for (const bundleMember of member.type.members) {
            if (ts.isPropertySignature(bundleMember) && bundleMember.name && bundleMember.type) {
              const bundleMemberName = bundleMember.name.getText(sourceFile);

              if ((bundleMemberName === 'minify' || bundleMemberName === 'sourcemap') && bundleMember.type) {
                // Parse boolean fields
                if (bundleMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  bundleObj[bundleMemberName] = true;
                } else if (bundleMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  bundleObj[bundleMemberName] = false;
                } else if (ts.isLiteralTypeNode(bundleMember.type)) {
                  const literal = bundleMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    bundleObj[bundleMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    bundleObj[bundleMemberName] = false;
                  }
                }
              } else if (bundleMemberName === 'external' && ts.isTupleTypeNode(bundleMember.type)) {
                // Parse external array
                const externalArray: string[] = [];
                for (const element of bundleMember.type.elements) {
                  const elementType = ts.isNamedTupleMember(element) ? element.type : element;
                  if (ts.isLiteralTypeNode(elementType)) {
                    const literal = elementType.literal;
                    if (ts.isStringLiteral(literal)) {
                      externalArray.push(literal.text);
                    }
                  }
                }
                if (externalArray.length > 0) {
                  bundleObj.external = externalArray;
                }
              } else if (bundleMemberName === 'format' && ts.isLiteralTypeNode(bundleMember.type)) {
                // Parse format field
                const literal = bundleMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  if (literal.text === 'iife' || literal.text === 'esm') {
                    bundleObj.format = literal.text;
                  }
                }
              }
            }
          }
          bundle = bundleObj;
        }
      } else if (memberName === 'theme' && member.type) {
        // Parse theme field (string or object)
        if (ts.isLiteralTypeNode(member.type)) {
          // String theme name: theme: 'light'
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal)) {
            theme = literal.text;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Inline theme object: { name: 'custom'; variables: { ... } }
          const themeObj: { name?: string; variables?: Record<string, string> } = {};

          for (const themeMember of member.type.members) {
            if (ts.isPropertySignature(themeMember) && themeMember.name && themeMember.type) {
              const themeMemberName = themeMember.name.getText(sourceFile);

              if (themeMemberName === 'name' && ts.isLiteralTypeNode(themeMember.type)) {
                const literal = themeMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  themeObj.name = literal.text;
                }
              } else if (themeMemberName === 'variables' && ts.isTypeLiteralNode(themeMember.type)) {
                // Parse variables object
                const variables: Record<string, string> = {};
                for (const varMember of themeMember.type.members) {
                  if (ts.isPropertySignature(varMember) && varMember.name && varMember.type) {
                    const varKey = varMember.name.getText(sourceFile);
                    if (ts.isLiteralTypeNode(varMember.type)) {
                      const literal = varMember.type.literal;
                      if (ts.isStringLiteral(literal)) {
                        variables[varKey] = literal.text;
                      }
                    }
                  }
                }
                if (Object.keys(variables).length > 0) {
                  themeObj.variables = variables;
                }
              }
            }
          }

          if (themeObj.name && themeObj.variables) {
            theme = themeObj as { name: string; variables: Record<string, string> };
          }
        }
      } else if (memberName === 'minify' && member.type) {
        // Parse minify field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          minify = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          minify = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            minify = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            minify = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse minify object with html, css, js
          const minifyObj: { html?: boolean; css?: boolean; js?: boolean } = {};
          for (const minifyMember of member.type.members) {
            if (ts.isPropertySignature(minifyMember) && minifyMember.name && minifyMember.type) {
              const minifyMemberName = minifyMember.name.getText(sourceFile);
              if (
                (minifyMemberName === 'html' || minifyMemberName === 'css' || minifyMemberName === 'js') &&
                minifyMember.type
              ) {
                if (minifyMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  minifyObj[minifyMemberName] = true;
                } else if (minifyMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  minifyObj[minifyMemberName] = false;
                } else if (ts.isLiteralTypeNode(minifyMember.type)) {
                  const literal = minifyMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    minifyObj[minifyMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    minifyObj[minifyMemberName] = false;
                  }
                }
              }
            }
          }
          minify = minifyObj;
        }
      } else if (memberName === 'cdn' && member.type) {
        // Parse cdn field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          cdn = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          cdn = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            cdn = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            cdn = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse cdn object
          const cdnObj: {
            baseUrl?: string;
            sri?: boolean | 'sha256' | 'sha384' | 'sha512';
            compression?: 'gzip' | 'brotli' | 'both';
          } = {};
          for (const cdnMember of member.type.members) {
            if (ts.isPropertySignature(cdnMember) && cdnMember.name && cdnMember.type) {
              const cdnMemberName = cdnMember.name.getText(sourceFile);

              if (cdnMemberName === 'baseUrl' && ts.isLiteralTypeNode(cdnMember.type)) {
                const literal = cdnMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  cdnObj.baseUrl = literal.text;
                }
              } else if (cdnMemberName === 'sri' && cdnMember.type) {
                if (cdnMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  cdnObj.sri = true;
                } else if (cdnMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  cdnObj.sri = false;
                } else if (ts.isLiteralTypeNode(cdnMember.type)) {
                  const literal = cdnMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    cdnObj.sri = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    cdnObj.sri = false;
                  } else if (ts.isStringLiteral(literal)) {
                    // Validate SRI algorithm
                    if (literal.text === 'sha256' || literal.text === 'sha384' || literal.text === 'sha512') {
                      cdnObj.sri = literal.text;
                    }
                  }
                }
              } else if (cdnMemberName === 'compression' && ts.isLiteralTypeNode(cdnMember.type)) {
                const literal = cdnMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  if (
                    literal.text === 'gzip' ||
                    literal.text === 'brotli' ||
                    literal.text === 'both'
                  ) {
                    cdnObj.compression = literal.text;
                  }
                }
              }
            }
          }
          cdn = cdnObj;
        }
      } else if (memberName === 'performance' && member.type) {
        // Parse performance field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          performance = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          performance = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            performance = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            performance = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse performance object
          const perfObj: {
            track?: boolean;
            report?: boolean;
            thresholds?: {
              maxBundleSize?: number;
              maxCompilationTime?: number;
              minCacheHitRate?: number;
              minCompressionSavings?: number;
            };
          } = {};
          for (const perfMember of member.type.members) {
            if (ts.isPropertySignature(perfMember) && perfMember.name && perfMember.type) {
              const perfMemberName = perfMember.name.getText(sourceFile);

              if ((perfMemberName === 'track' || perfMemberName === 'report') && perfMember.type) {
                if (perfMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  perfObj[perfMemberName] = true;
                } else if (perfMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  perfObj[perfMemberName] = false;
                } else if (ts.isLiteralTypeNode(perfMember.type)) {
                  const literal = perfMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    perfObj[perfMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    perfObj[perfMemberName] = false;
                  }
                }
              } else if (perfMemberName === 'thresholds' && ts.isTypeLiteralNode(perfMember.type)) {
                // Parse thresholds object
                const thresholds: {
                  maxBundleSize?: number;
                  maxCompilationTime?: number;
                  minCacheHitRate?: number;
                  minCompressionSavings?: number;
                } = {};
                for (const threshMember of perfMember.type.members) {
                  if (ts.isPropertySignature(threshMember) && threshMember.name && threshMember.type) {
                    const threshName = threshMember.name.getText(sourceFile);
                    if (ts.isLiteralTypeNode(threshMember.type)) {
                      const literal = threshMember.type.literal;
                      if (ts.isNumericLiteral(literal)) {
                        const value = parseFloat(literal.text);
                        if (
                          threshName === 'maxBundleSize' ||
                          threshName === 'maxCompilationTime' ||
                          threshName === 'minCacheHitRate' ||
                          threshName === 'minCompressionSavings'
                        ) {
                          thresholds[threshName] = value;
                        }
                      }
                    }
                  }
                }
                if (Object.keys(thresholds).length > 0) {
                  perfObj.thresholds = thresholds;
                }
              }
            }
          }
          performance = perfObj;
        }
      } else if (memberName === 'externalUrl' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract external URL
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          externalUrl = literal.text;
        }
      } else if (memberName === 'remoteDom' && member.type) {
        // Extract Remote DOM content (string literal or template literal)
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            remoteDom = literal.text;
          }
        }
      } else if (memberName === 'source' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract source field (v4.0)
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
          const sourceValue = literal.text.trim();
          if (sourceValue) {  // Only set if non-empty
            source = sourceValue;
          }
        }
      }
    }
  }

  // Check for callable signature (dynamic UI)
  for (const member of node.members) {
    if (ts.isCallSignatureDeclaration(member)) {
      dynamic = true;

      // Extract return type if available
      if (member.type) {
        dataType = member.type.getText(sourceFile);
      }

      // Callable IUIs generate content dynamically
      break;
    }
  }

  // Validate required fields
  if (!uri) {
    console.warn(`UI interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  if (!name) {
    console.warn(`UI interface ${interfaceName} missing 'name' property`);
    return null;
  }

  if (!description) {
    console.warn(`UI interface ${interfaceName} missing 'description' property`);
    return null;
  }

  // v4.0: Validate source field or callable signature
  if (!source && !dynamic) {
    throw new Error(
      `UI interface ${interfaceName} must have either:\n` +
      `1. A 'source' field (URL, HTML, file path, folder), or\n` +
      `2. A callable signature: (): string | Promise<string>\n` +
      `\n` +
      `Example with source:\n` +
      `  interface MyUI extends IUI {\n` +
      `    uri: 'ui://example';\n` +
      `    name: 'Example';\n` +
      `    description: 'Example UI';\n` +
      `    source: './Dashboard.tsx';  // <-- Add this\n` +
      `  }\n` +
      `\n` +
      `Example with callable:\n` +
      `  interface MyUI extends IUI {\n` +
      `    uri: 'ui://example';\n` +
      `    name: 'Example';\n` +
      `    description: 'Example UI';\n` +
      `    (): Promise<string>;  // <-- Add this\n` +
      `  }`
    );
  }

  // Ensure source and callable are mutually exclusive
  if (source && dynamic) {
    throw new Error(
      `UI interface ${interfaceName} cannot have both 'source' field and callable signature.\n` +
      `These are mutually exclusive - use one or the other.`
    );
  }

  // Auto-infer dynamic flag:
  // If html/file/component/externalUrl/remoteDom was not extracted, it must be dynamic
  const isDynamic = dynamic || (html === undefined && file === undefined && component === undefined && externalUrl === undefined && remoteDom === undefined);

  // For dynamic UIs, generate method name from URI
  let methodName: string | undefined;
  if (isDynamic) {
    // Use URI as method name (like resources)
    methodName = uri;
  }

  // Auto-detect subscribable for file-based UIs if not explicitly set
  // Only set to true if file-based features are present, otherwise leave undefined
  if (subscribable === undefined && (file || component || scripts?.length || stylesheets?.length)) {
    subscribable = true;
  }

  // DEBUG: Log what's being returned
  console.error(`[DEBUG:UI-PARSER] Returning UI interface: "${interfaceName}", uri="${uri}", dynamic=${isDynamic}, html length=${html?.length || 'none'}, file="${file || 'none'}", component="${component || 'none'}", subscribable=${subscribable}`);

  return {
    interfaceName,
    uri,
    name,
    description,
    source,  // NEW v4.0
    html,
    css,
    tools,
    size,
    subscribable,
    dynamic: isDynamic,
    methodName,
    dataType,
    file,
    component,
    script,
    stylesheets,
    scripts,
    dependencies,
    bundle,
    imports,
    theme,
    minify,
    cdn,
    performance,
    externalUrl,
    remoteDom,
  };
}

/**
 * Parse an IToolRouter interface
 */
function parseRouterInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedRouter | null {
  const interfaceName = node.name.text;
  let name: string | undefined;
  let description = '';
  const tools: string[] = [];
  let metadata: ParsedRouter['metadata'];

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'tools' && member.type) {
        // Parse tools array: tools: [GetWeatherTool, GetForecastTool, ...]
        // The type can be:
        // - TupleTypeNode: [ToolA, ToolB] (expected format)
        // - ArrayTypeNode: ITool[] (generic, cannot extract names)

        if (ts.isTupleTypeNode(member.type)) {
          // Extract tool names from tuple of type references
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;

            // Handle type references (e.g., GetWeatherTool)
            if (ts.isTypeReferenceNode(elementType)) {
              const typeName = elementType.typeName.getText(sourceFile);
              // Convert interface name to tool name: GetWeatherTool -> get_weather_tool
              // We'll look up the actual tool name from the interface later in adapter
              // For now, store the interface name
              tools.push(typeName);
            }
            // Fallback: handle string literals (backward compatibility)
            else if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                tools.push(literal.text);
              }
            }
          }
        } else if (ts.isArrayTypeNode(member.type)) {
          // Array type without specific elements (tools: ITool[])
          // Cannot extract specific tools at compile time
          console.warn(`Router ${interfaceName}: tools must be specified as tuple [Tool1, Tool2], not generic array type`);
        }
      } else if (memberName === 'metadata' && member.type && ts.isTypeLiteralNode(member.type)) {
        // Parse metadata object
        metadata = {};
        for (const metaMember of member.type.members) {
          if (ts.isPropertySignature(metaMember) && metaMember.name && metaMember.type) {
            const metaKey = metaMember.name.getText(sourceFile);

            if (metaKey === 'category' && ts.isLiteralTypeNode(metaMember.type)) {
              const literal = metaMember.type.literal;
              if (ts.isStringLiteral(literal)) {
                metadata.category = literal.text;
              }
            } else if (metaKey === 'order' && ts.isLiteralTypeNode(metaMember.type)) {
              const literal = metaMember.type.literal;
              if (ts.isNumericLiteral(literal)) {
                metadata.order = parseInt(literal.text, 10);
              }
            } else if (metaKey === 'tags' && ts.isTupleTypeNode(metaMember.type)) {
              // Parse tags array
              metadata.tags = [];
              for (const tagElement of metaMember.type.elements) {
                const tagType = ts.isNamedTupleMember(tagElement) ? tagElement.type : tagElement;
                if (ts.isLiteralTypeNode(tagType)) {
                  const literal = tagType.literal;
                  if (ts.isStringLiteral(literal)) {
                    metadata.tags.push(literal.text);
                  }
                }
              }
            } else {
              // Handle other metadata fields (store as unknown)
              if (ts.isLiteralTypeNode(metaMember.type)) {
                const literal = metaMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  metadata[metaKey] = literal.text;
                } else if (ts.isNumericLiteral(literal)) {
                  metadata[metaKey] = parseInt(literal.text, 10);
                } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                  metadata[metaKey] = true;
                } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                  metadata[metaKey] = false;
                }
              }
            }
          }
        }
      }
    }
  }

  // Validation
  if (!description) {
    console.warn(`Router ${interfaceName}: description is required`);
    return null;
  }

  if (tools.length === 0) {
    console.warn(`Router ${interfaceName}: tools array must not be empty`);
    return null;
  }

  // Generate property name from interface name
  // WeatherRouter -> weatherRouter
  const propertyName = interfaceName.charAt(0).toLowerCase() + interfaceName.slice(1);

  return {
    interfaceName,
    name,
    description,
    tools,
    propertyName,
    metadata,
  };
}

/**
 * Parse an IServer interface
 */
function parseServerInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  authInterfaces: Map<string, ParsedAuth>
): ParsedServer | null {
  const interfaceName = node.name.text;
  let name = '';
  let version = '';
  let description: string | undefined;
  let transport: 'stdio' | 'http' | 'websocket' | undefined;
  let port: number | undefined;
  let stateful: boolean | undefined;
  let flattenRouters: boolean | undefined;
  let authInterfaceName: string | undefined;
  let websocketConfig: { port?: number; heartbeatInterval?: number; heartbeatTimeout?: number; maxMessageSize?: number } | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          const originalName = literal.text;
          const kebabName = toKebabCase(originalName);

          // Warn if conversion happened
          if (originalName !== kebabName) {
            console.warn(
              `\n⚠️  Server name '${originalName}' was auto-converted to kebab-case: '${kebabName}'` +
              `\n   Please use kebab-case (lowercase with hyphens) in your IServer interface.\n`
            );
          }

          name = kebabName;
        }
      } else if (memberName === 'version' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          version = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'transport' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          const value = literal.text;
          if (value === 'stdio' || value === 'http' || value === 'websocket') {
            transport = value as 'stdio' | 'http' | 'websocket';
          }
        }
      } else if (memberName === 'websocket' && member.type && ts.isTypeLiteralNode(member.type)) {
        // Parse websocket config object
        websocketConfig = {};
        for (const prop of member.type.members) {
          if (ts.isPropertySignature(prop) && prop.name) {
            const propName = prop.name.getText(sourceFile);
            if (prop.type && ts.isLiteralTypeNode(prop.type)) {
              const propLiteral = prop.type.literal;
              if (ts.isNumericLiteral(propLiteral)) {
                const value = parseInt(propLiteral.text, 10);
                if (propName === 'port') websocketConfig.port = value;
                else if (propName === 'heartbeatInterval') websocketConfig.heartbeatInterval = value;
                else if (propName === 'heartbeatTimeout') websocketConfig.heartbeatTimeout = value;
                else if (propName === 'maxMessageSize') websocketConfig.maxMessageSize = value;
              }
            }
          }
        }
      } else if (memberName === 'port' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isNumericLiteral(literal)) {
          port = parseInt(literal.text, 10);
        }
      } else if (memberName === 'stateful' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          stateful = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          stateful = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            stateful = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            stateful = false;
          }
        }
      } else if (memberName === 'flattenRouters' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          flattenRouters = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          flattenRouters = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            flattenRouters = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            flattenRouters = false;
          }
        }
      } else if (memberName === 'auth' && member.type && ts.isTypeReferenceNode(member.type)) {
        // Extract interface name being referenced
        authInterfaceName = member.type.typeName.getText(sourceFile);
      }
    }
  }

  if (!name) {
    console.warn(`Server interface ${interfaceName} missing required 'name' property`);
    return null;
  }

  if (!description) {
    console.warn(`Server interface ${interfaceName} missing required 'description' property`);
    return null;
  }

  // Default version to '1.0.0' if not specified
  if (!version) {
    version = '1.0.0';
  }

  // Infer transport from config if not explicitly specified
  if (!transport) {
    if (websocketConfig) {
      // If websocket config exists, infer websocket transport
      transport = 'websocket';
    } else if (port !== undefined || stateful !== undefined) {
      // If HTTP-related config exists, infer HTTP transport
      transport = 'http';
    } else {
      // Default to stdio (no config needed)
      transport = 'stdio';
    }
  }

  // Resolve auth interface if referenced
  let auth: ParsedAuth | undefined;
  if (authInterfaceName) {
    auth = authInterfaces.get(authInterfaceName);
    if (!auth) {
      console.warn(`Auth interface ${authInterfaceName} not found or not parsed yet`);
    }
  }

  return {
    interfaceName,
    name,
    version,
    description,
    transport,
    port,
    stateful,
    websocket: websocketConfig,
    flattenRouters,
    auth,
  };
}

/**
 * Parse an IAuth interface (IApiKeyAuth, etc.)
 */
function parseAuthInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedAuth | null {
  const interfaceName = node.name.text;
  let authType: 'apiKey' | 'oauth2' | 'database' | 'custom' | undefined;

  // API Key fields
  let headerName: string | undefined;
  let allowAnonymous: boolean | undefined;
  let keys: Array<{ name: string; key: string; permissions: string[] }> | undefined;

  // OAuth2 fields
  let issuerUrl: string | undefined;
  let clients: Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> | undefined;
  let tokenExpiration: number | undefined;
  let refreshTokenExpiration: number | undefined;
  let codeExpiration: number | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'type' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          const value = literal.text;
          if (value === 'apiKey' || value === 'oauth2' || value === 'database' || value === 'custom') {
            authType = value;
          }
        }
      }
      // API Key fields
      else if (memberName === 'headerName' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          headerName = literal.text;
        }
      } else if (memberName === 'allowAnonymous' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          allowAnonymous = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          allowAnonymous = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            allowAnonymous = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            allowAnonymous = false;
          }
        }
      } else if (memberName === 'keys' && member.type) {
        // Parse keys array - should be a tuple type with object literals
        keys = parseKeysArray(member.type, sourceFile);
      }
      // OAuth2 fields
      else if (memberName === 'issuerUrl' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          issuerUrl = literal.text;
        }
      } else if (memberName === 'clients' && member.type) {
        // Parse clients array - should be a tuple type with object literals
        clients = parseOAuthClientsArray(member.type, sourceFile);
      } else if (memberName === 'tokenExpiration' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isNumericLiteral(literal)) {
          tokenExpiration = parseInt(literal.text, 10);
        }
      } else if (memberName === 'refreshTokenExpiration' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isNumericLiteral(literal)) {
          refreshTokenExpiration = parseInt(literal.text, 10);
        }
      } else if (memberName === 'codeExpiration' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isNumericLiteral(literal)) {
          codeExpiration = parseInt(literal.text, 10);
        }
      }
    }
  }

  if (!authType) {
    console.warn(`Auth interface ${interfaceName} missing 'type' property`);
    return null;
  }

  return {
    type: authType,
    interfaceName,
    // API Key fields
    headerName,
    keys,
    allowAnonymous,
    // OAuth2 fields
    issuerUrl,
    clients,
    tokenExpiration,
    refreshTokenExpiration,
    codeExpiration,
  };
}

/**
 * Parse keys array from tuple type
 * Example: [{ name: 'admin', key: 'sk-123', permissions: ['*'] }]
 */
function parseKeysArray(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile
): Array<{ name: string; key: string; permissions: string[] }> | undefined {
  if (!ts.isTupleTypeNode(typeNode)) {
    return undefined;
  }

  const keys: Array<{ name: string; key: string; permissions: string[] }> = [];

  for (const element of typeNode.elements) {
    // Handle NamedTupleMember for labeled tuples
    const elementType = ts.isNamedTupleMember(element) ? element.type : element;

    if (ts.isTypeLiteralNode(elementType)) {
      const keyConfig = parseKeyConfig(elementType, sourceFile);
      if (keyConfig) {
        keys.push(keyConfig);
      }
    }
  }

  return keys.length > 0 ? keys : undefined;
}

/**
 * Parse a single key configuration object
 * Example: { name: 'admin', key: 'sk-123', permissions: ['*'] }
 */
function parseKeyConfig(
  typeNode: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile
): { name: string; key: string; permissions: string[] } | null {
  let name = '';
  let key = '';
  let permissions: string[] = [];

  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'key' && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          key = literal.text;
        }
      } else if (memberName === 'permissions' && ts.isTupleTypeNode(member.type)) {
        // Parse permissions array
        for (const element of member.type.elements) {
          const elementType = ts.isNamedTupleMember(element) ? element.type : element;
          if (ts.isLiteralTypeNode(elementType)) {
            const literal = elementType.literal;
            if (ts.isStringLiteral(literal)) {
              permissions.push(literal.text);
            }
          }
        }
      }
    }
  }

  if (!name || !key || permissions.length === 0) {
    return null;
  }

  return { name, key, permissions };
}

/**
 * Parse OAuth clients array from tuple type
 * Example: [{ clientId: 'web-app', clientSecret: 'secret', redirectUris: ['...'], scopes: ['read'] }]
 */
function parseOAuthClientsArray(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile
): Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> | undefined {
  if (!ts.isTupleTypeNode(typeNode)) {
    return undefined;
  }

  const clients: Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> = [];

  for (const element of typeNode.elements) {
    // Handle NamedTupleMember for labeled tuples
    const elementType = ts.isNamedTupleMember(element) ? element.type : element;

    if (ts.isTypeLiteralNode(elementType)) {
      const clientConfig = parseOAuthClientConfig(elementType, sourceFile);
      if (clientConfig) {
        clients.push(clientConfig);
      }
    }
  }

  return clients.length > 0 ? clients : undefined;
}

/**
 * Parse a single OAuth client configuration object
 * Example: { clientId: 'web-app', clientSecret: 'secret', redirectUris: ['http://localhost:3000'], scopes: ['read', 'write'], name: 'Web App' }
 */
function parseOAuthClientConfig(
  typeNode: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile
): { clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string } | null {
  let clientId = '';
  let clientSecret = '';
  let redirectUris: string[] = [];
  let scopes: string[] = [];
  let name: string | undefined;

  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'clientId' && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          clientId = literal.text;
        }
      } else if (memberName === 'clientSecret' && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          clientSecret = literal.text;
        }
      } else if (memberName === 'name' && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'redirectUris' && ts.isTupleTypeNode(member.type)) {
        // Parse redirectUris array
        for (const element of member.type.elements) {
          const elementType = ts.isNamedTupleMember(element) ? element.type : element;
          if (ts.isLiteralTypeNode(elementType)) {
            const literal = elementType.literal;
            if (ts.isStringLiteral(literal)) {
              redirectUris.push(literal.text);
            }
          }
        }
      } else if (memberName === 'scopes' && ts.isTupleTypeNode(member.type)) {
        // Parse scopes array
        for (const element of member.type.elements) {
          const elementType = ts.isNamedTupleMember(element) ? element.type : element;
          if (ts.isLiteralTypeNode(elementType)) {
            const literal = elementType.literal;
            if (ts.isStringLiteral(literal)) {
              scopes.push(literal.text);
            }
          }
        }
      }
    }
  }

  if (!clientId || !clientSecret || redirectUris.length === 0 || scopes.length === 0) {
    return null;
  }

  return { clientId, clientSecret, redirectUris, scopes, name };
}
