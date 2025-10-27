/**
 * Interface-Driven API Parser
 *
 * Parses TypeScript files to discover interfaces extending ITool, IPrompt, IResource, IServer.
 * Extracts metadata and type information for schema generation.
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Parsed tool interface metadata
 */
export interface ParsedTool {
  /** Original interface name */
  interfaceName: string;
  /** Tool name from interface (snake_case) */
  name: string;
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
  /** Expected method name (camelCase) if dynamic */
  methodName: string;
  /** Template string (for static prompts) */
  template?: string;
  /** Whether this requires dynamic implementation */
  dynamic: boolean;
  /** Argument type information */
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
 * Parsed authentication configuration
 */
export interface ParsedAuth {
  /** Authentication type */
  type: 'apiKey' | 'oauth2' | 'database' | 'custom';
  /** Original interface name */
  interfaceName: string;
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
}

/**
 * Parsed server interface metadata
 */
export interface ParsedServer {
  /** Original interface name */
  interfaceName: string;
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server description */
  description?: string;
  /** Class name that implements this interface */
  className?: string;
  /** Transport type (stdio or http) */
  transport?: 'stdio' | 'http';
  /** Port number for HTTP transport */
  port?: number;
  /** Enable stateful session management */
  stateful?: boolean;
  /** Authentication configuration */
  auth?: ParsedAuth;
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
  className?: string;
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
  };

  // Store auth interfaces by name for resolution
  const authInterfaces = new Map<string, ParsedAuth>();

  // Visit all nodes in the source file
  function visit(node: ts.Node) {
    // Check for interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;

      // Check if it extends ITool, IPrompt, IResource, IServer, or IAuth types
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            const typeName = type.expression.getText(sourceFile);

            if (typeName === 'ITool') {
              const tool = parseToolInterface(node, sourceFile);
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

  return result;
}

/**
 * Parse an ITool interface
 */
function parseToolInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedTool | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let paramsType = 'any';
  let resultType = 'any';
  let paramsNode: ts.TypeNode | undefined;
  let resultNode: ts.TypeNode | undefined;

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
      }
    }
  }

  if (!name) {
    console.warn(`Tool interface ${interfaceName} missing 'name' property`);
    return null;
  }

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    paramsType,
    resultType,
    paramsNode,
    resultNode,
  };
}

/**
 * Parse an IPrompt interface
 */
function parsePromptInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedPrompt | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let template: string | undefined;
  let dynamic = false;
  let argsType = 'any';

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
      } else if (memberName === 'template' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
          template = literal.text;
        }
      } else if (memberName === 'dynamic' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        }
      } else if (memberName === 'args' && member.type) {
        argsType = member.type.getText(sourceFile);
      }
    }
  }

  if (!name) {
    console.warn(`Prompt interface ${interfaceName} missing 'name' property`);
    return null;
  }

  // Auto-infer dynamic flag:
  // If template was extracted, it's static
  // If no template and not marked dynamic, infer dynamic
  const isDynamic = dynamic || (template === undefined);

  return {
    interfaceName,
    name,
    description,
    methodName: snakeToCamel(name),
    template,
    dynamic: isDynamic,
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
      } else if (memberName === 'mimeType' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          mimeType = literal.text;
        }
      } else if (memberName === 'dynamic' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        }
      } else if (memberName === 'data' && member.type) {
        dataType = member.type.getText(sourceFile);
        // Try to extract static data from simple literal types
        data = extractStaticData(member.type, sourceFile);
      }
    }
  }

  if (!uri) {
    console.warn(`Resource interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  // Auto-infer dynamic flag if not explicitly set:
  // If data extraction failed (undefined) but developer didn't mark as dynamic, infer it
  // If data was extracted successfully, it's static (even if marked dynamic: false)
  const isDynamic = dynamic || (data === undefined);

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
      }
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

  // Validation: html, file, component, externalUrl, and remoteDom are mutually exclusive
  const hasInlineHtml = !!html;
  const hasFileReference = !!file;
  const hasComponentReference = !!component;
  const hasExternalUrl = !!externalUrl;
  const hasRemoteDom = !!remoteDom;
  const mutuallyExclusiveCount = [hasInlineHtml, hasFileReference, hasComponentReference, hasExternalUrl, hasRemoteDom].filter(Boolean).length;

  if (mutuallyExclusiveCount > 1) {
    throw new Error(
      `UI interface ${interfaceName} has conflicting fields: ` +
      `'html', 'file', 'component', 'externalUrl', and 'remoteDom' are mutually exclusive. ` +
      `Use only one: inline HTML (html), external file (file), React component (component), external URL (externalUrl), or Remote DOM (remoteDom).`
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
  if (subscribable === undefined) {
    subscribable = !!(file || component || scripts?.length || stylesheets?.length);
  }

  // DEBUG: Log what's being returned
  console.error(`[DEBUG:UI-PARSER] Returning UI interface: "${interfaceName}", uri="${uri}", dynamic=${isDynamic}, html length=${html?.length || 'none'}, file="${file || 'none'}", component="${component || 'none'}", subscribable=${subscribable}`);

  return {
    interfaceName,
    uri,
    name,
    description,
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
  let transport: 'stdio' | 'http' | undefined;
  let port: number | undefined;
  let stateful: boolean | undefined;
  let authInterfaceName: string | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = normalizeToolName(literal.text);
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
          if (value === 'stdio' || value === 'http') {
            transport = value;
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
      } else if (memberName === 'auth' && member.type && ts.isTypeReferenceNode(member.type)) {
        // Extract interface name being referenced
        authInterfaceName = member.type.typeName.getText(sourceFile);
      }
    }
  }

  if (!name || !version) {
    console.warn(`Server interface ${interfaceName} missing required properties`);
    return null;
  }

  // Default to 'stdio' if transport not specified
  if (!transport) {
    transport = 'stdio';
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
    auth,
  };
}

/**
 * Parse an IAuth interface (IApiKeyAuth, etc.)
 */
function parseAuthInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedAuth | null {
  const interfaceName = node.name.text;
  let authType: 'apiKey' | 'oauth2' | 'database' | 'custom' | undefined;
  let headerName: string | undefined;
  let allowAnonymous: boolean | undefined;
  let keys: Array<{ name: string; key: string; permissions: string[] }> | undefined;

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
      } else if (memberName === 'headerName' && member.type && ts.isLiteralTypeNode(member.type)) {
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
    }
  }

  if (!authType) {
    console.warn(`Auth interface ${interfaceName} missing 'type' property`);
    return null;
  }

  return {
    type: authType,
    interfaceName,
    headerName,
    keys,
    allowAnonymous,
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
