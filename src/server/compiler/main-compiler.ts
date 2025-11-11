/**
 * Main Interface Compiler
 *
 * Orchestrates all interface compilers to parse TypeScript files
 * and compile interface-driven API definitions into runtime metadata.
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ParseResult, ParsedAuth } from './types.js';
import { programBuilder } from './program-builder.js';
import { implementsInterface, hasInterfaceShape } from './interface-checker.js';
import {
  discoverConstServer,
  discoverConstImplementation,
  discoverClassImplementations,
  discoverClassInstance,
  discoverClassRouterProperties,
  discoverConstUI,
  discoverClassUIImplementations,
  discoverConstRouter,
  discoverConstCompletion,
  discoverConstRoots,
  discoverConstSubscription,
  linkImplementationsToInterfaces,
  linkUIsToInterfaces,
  linkRoutersToInterfaces,
  linkCompletionsToInterfaces,
  linkRootsToInterfaces,
  linkSubscriptionsToInterfaces
} from './discovery.js';
import { validateImplementations } from './validation-compiler.js';
import { compileToolInterface } from './compilers/tool-compiler.js';
import { compilePromptInterface } from './compilers/prompt-compiler.js';
import { compileResourceInterface } from './compilers/resource-compiler.js';
import { compileSamplingInterface } from './compilers/sampling-compiler.js';
import { compileElicitInterface } from './compilers/elicit-compiler.js';
import { compileRootsInterface } from './compilers/roots-compiler.js';
import { compileSubscriptionInterface } from './compilers/subscription-compiler.js';
import { compileCompletionInterface } from './compilers/completion-compiler.js';
import { compileUIInterface } from './compilers/ui-compiler.js';
import { compileRouterInterface } from './compilers/router-compiler.js';
import { compileServerInterface } from './compilers/server-compiler.js';
import { compileAuthInterface } from './compilers/auth-compiler.js';

/**
 * Compile a TypeScript file to discover interface-driven API definitions
 *
 * This is the main entry point for the compiler system. It:
 * 1. Parses the TypeScript AST
 * 2. Discovers const server definitions (v4)
 * 3. Discovers const/class implementations (v4 auto-discovery)
 * 4. Compiles all interface types (ITool, IPrompt, IResource, etc.)
 * 5. Links implementations to interfaces
 * 6. Validates that all interfaces have implementations
 *
 * @param filePath - Path to TypeScript file to compile
 * @returns ParseResult with all discovered and compiled interfaces
 */
/**
 * Preprocess TypeScript source code to handle edge cases
 * Strips 'as const' from type positions in interfaces (invalid syntax)
 */
function preprocessSource(sourceCode: string): string {
  // Strip 'as const' from type positions within interfaces
  // Pattern: matches type definitions like "prop: Type as const;" in interfaces
  // This is invalid TypeScript but users may write it accidentally
  return sourceCode.replace(
    /(\s+\w+\s*:\s*(?:readonly\s+)?(?:\[[\w\s,.\[\]]+\]|[\w.<>]+))\s+as\s+const\s*;/g,
    '$1;'
  );
}

export function compileInterfaceFile(filePath: string): ParseResult {
  const absolutePath = resolve(filePath);
  let sourceCode = readFileSync(absolutePath, 'utf-8');

  // Preprocess source to handle edge cases like 'as const' in type positions
  sourceCode = preprocessSource(sourceCode);

  // Try program-based parsing first (with full type information and module resolution)
  // Falls back to syntax-only parsing if program creation fails
  try {
    return parseWithProgram(absolutePath, sourceCode);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `Program-based parsing failed for ${absolutePath}, falling back to syntax-only parsing: ${errorMessage}`
    );
    return parseWithSyntaxOnly(absolutePath, sourceCode);
  }
}

/**
 * Parse TypeScript file using full program with type information.
 *
 * This approach:
 * - Creates a TypeScript program with proper module resolution
 * - Uses type checker for accurate interface detection
 * - Can resolve imports and type aliases
 * - More accurate than syntax-only parsing
 *
 * @param absolutePath - Absolute path to the TypeScript file
 * @param sourceCode - The source code (unused but kept for API consistency)
 * @returns ParseResult with all discovered interfaces
 */
function parseWithProgram(absolutePath: string, sourceCode: string): ParseResult {
  // Create TypeScript program with type checker
  // This may throw if the file has severe errors or missing dependencies
  const { program, typeChecker, sourceFile } = programBuilder.createProgram(absolutePath);

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
    routerProperties: [],
    discoveredUIs: [],
    discoveredRouters: [],
    discoveredCompletions: [],
    discoveredRoots: [],
    discoveredSubscriptions: [],
  };

  // Store auth interfaces by name for resolution
  const authInterfaces = new Map<string, ParsedAuth>();

  // Visit all nodes in the source file
  // We use the same discovery logic as syntax-only parsing for now
  // In the future, we can enhance this to use type checker for better detection
  function visit(node: ts.Node) {
    visitNode(node, sourceFile, result, authInterfaces);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Run post-processing steps
  postProcessParseResult(result, sourceFile);

  return result;
}

/**
 * Parse TypeScript file using syntax-only parsing (no type information).
 *
 * This is the fallback approach:
 * - Creates source file without full program
 * - No type checker or module resolution
 * - Faster but less accurate
 * - Used when program creation fails or for bundled .js files
 *
 * @param absolutePath - Absolute path to the TypeScript file
 * @param sourceCode - The source code to parse
 * @returns ParseResult with all discovered interfaces
 */
function parseWithSyntaxOnly(absolutePath: string, sourceCode: string): ParseResult {
  // Create a TypeScript source file (syntax-only, no type information)
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
    routerProperties: [],
    discoveredUIs: [],
    discoveredRouters: [],
    discoveredCompletions: [],
    discoveredRoots: [],
    discoveredSubscriptions: [],
  };

  // Store auth interfaces by name for resolution
  const authInterfaces = new Map<string, ParsedAuth>();

  // Visit all nodes in the source file
  function visit(node: ts.Node) {
    visitNode(node, sourceFile, result, authInterfaces);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Post-processing: link implementations, validate, etc.
  postProcessParseResult(result, sourceFile);

  return result;
}

/**
 * Parse inline auth object from const server object literal
 * Handles runtime values in const servers (not compile-time types)
 * Example: const server: IServer = { auth: { type: 'apiKey', keys: [...] } }
 */
function parseConstServerAuth(authObj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): ParsedAuth | null {
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

  for (const prop of authObj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const propName = prop.name.getText(sourceFile);
      const value = prop.initializer;

      if (propName === 'type' && ts.isStringLiteral(value)) {
        const typeVal = value.text;
        if (typeVal === 'apiKey' || typeVal === 'oauth2' || typeVal === 'database' || typeVal === 'custom') {
          authType = typeVal;
        }
      }
      // API Key fields
      else if (propName === 'headerName' && ts.isStringLiteral(value)) {
        headerName = value.text;
      } else if (propName === 'allowAnonymous') {
        if (value.kind === ts.SyntaxKind.TrueKeyword) {
          allowAnonymous = true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          allowAnonymous = false;
        }
      } else if (propName === 'keys' && ts.isArrayLiteralExpression(value)) {
        keys = [];
        for (const element of value.elements) {
          if (ts.isObjectLiteralExpression(element)) {
            const keyConfig = parseConstKeyConfig(element, sourceFile);
            if (keyConfig) {
              keys.push(keyConfig);
            }
          }
        }
      }
      // OAuth2 fields
      else if (propName === 'issuerUrl' && ts.isStringLiteral(value)) {
        issuerUrl = value.text;
      } else if (propName === 'clients' && ts.isArrayLiteralExpression(value)) {
        clients = parseConstOAuthClients(value, sourceFile);
      } else if (propName === 'tokenExpiration' && ts.isNumericLiteral(value)) {
        tokenExpiration = parseInt(value.text, 10);
      } else if (propName === 'refreshTokenExpiration' && ts.isNumericLiteral(value)) {
        refreshTokenExpiration = parseInt(value.text, 10);
      } else if (propName === 'codeExpiration' && ts.isNumericLiteral(value)) {
        codeExpiration = parseInt(value.text, 10);
      }
    }
  }

  if (!authType) {
    console.warn('Inline auth object in const server missing required "type" property');
    return null;
  }

  return {
    type: authType,
    interfaceName: 'InlineAuth',
    // API Key fields
    headerName,
    keys,
    allowAnonymous,
    // OAuth2 fields
    issuerUrl,
    clients,
    tokenExpiration,
    refreshTokenExpiration,
    codeExpiration
  };
}

/**
 * Parse a single key config from const server auth
 */
function parseConstKeyConfig(
  keyObj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): { name: string; key: string; permissions: string[] } | null {
  let name = '';
  let key = '';
  let permissions: string[] = [];

  for (const prop of keyObj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const propName = prop.name.getText(sourceFile);
      const value = prop.initializer;

      if (propName === 'name' && ts.isStringLiteral(value)) {
        name = value.text;
      } else if (propName === 'key' && ts.isStringLiteral(value)) {
        key = value.text;
      } else if (propName === 'permissions' && ts.isArrayLiteralExpression(value)) {
        for (const element of value.elements) {
          if (ts.isStringLiteral(element)) {
            permissions.push(element.text);
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
 * Parse OAuth2 clients array from const server auth
 */
function parseConstOAuthClients(
  clientsArray: ts.ArrayLiteralExpression,
  sourceFile: ts.SourceFile
): Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> | undefined {
  const clients: Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> = [];

  for (const element of clientsArray.elements) {
    if (ts.isObjectLiteralExpression(element)) {
      const clientConfig = parseConstOAuthClientConfig(element, sourceFile);
      if (clientConfig) {
        clients.push(clientConfig);
      }
    }
  }

  return clients.length > 0 ? clients : undefined;
}

/**
 * Parse a single OAuth2 client config from const server auth
 */
function parseConstOAuthClientConfig(
  clientObj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): { clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string } | null {
  let clientId = '';
  let clientSecret = '';
  let redirectUris: string[] = [];
  let scopes: string[] = [];
  let name: string | undefined;

  for (const prop of clientObj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const propName = prop.name.getText(sourceFile);
      const value = prop.initializer;

      if (propName === 'clientId' && ts.isStringLiteral(value)) {
        clientId = value.text;
      } else if (propName === 'clientSecret' && ts.isStringLiteral(value)) {
        clientSecret = value.text;
      } else if (propName === 'name' && ts.isStringLiteral(value)) {
        name = value.text;
      } else if (propName === 'redirectUris' && ts.isArrayLiteralExpression(value)) {
        for (const element of value.elements) {
          if (ts.isStringLiteral(element)) {
            redirectUris.push(element.text);
          }
        }
      } else if (propName === 'scopes' && ts.isArrayLiteralExpression(value)) {
        for (const element of value.elements) {
          if (ts.isStringLiteral(element)) {
            scopes.push(element.text);
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

/**
 * Parse inline codeExecution config from const server object literal
 * Handles runtime values in const servers (not compile-time types)
 * Example: const server: IServer = { codeExecution: { mode: 'vm', timeout: 5000 } }
 */
function parseConstCodeExecutionConfig(
  codeExecObj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): { mode?: string; timeout?: number; captureOutput?: boolean; allowedLanguages?: string[]; language?: string; introspectTools?: boolean } | undefined {
  const config: { mode?: string; timeout?: number; captureOutput?: boolean; allowedLanguages?: string[]; language?: string; introspectTools?: boolean } = {};

  for (const prop of codeExecObj.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const propName = prop.name.getText(sourceFile);
      const value = prop.initializer;

      if (propName === 'mode' && ts.isStringLiteral(value)) {
        config.mode = value.text;
      } else if (propName === 'language' && ts.isStringLiteral(value)) {
        config.language = value.text;
      } else if (propName === 'timeout' && ts.isNumericLiteral(value)) {
        config.timeout = parseInt(value.text, 10);
      } else if (propName === 'captureOutput') {
        if (value.kind === ts.SyntaxKind.TrueKeyword) {
          config.captureOutput = true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          config.captureOutput = false;
        }
      } else if (propName === 'introspectTools') {
        if (value.kind === ts.SyntaxKind.TrueKeyword) {
          config.introspectTools = true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          config.introspectTools = false;
        }
      } else if (propName === 'allowedLanguages' && ts.isArrayLiteralExpression(value)) {
        config.allowedLanguages = [];
        for (const element of value.elements) {
          if (ts.isStringLiteral(element)) {
            config.allowedLanguages.push(element.text);
          }
        }
      }
    }
  }

  return config;
}

/**
 * Common node visiting logic for both program-based and syntax-only parsing.
 *
 * This function contains all the discovery logic for:
 * - Const servers
 * - Const implementations (tools, prompts, resources, etc.)
 * - Interface declarations
 * - Class declarations
 *
 * @param node - The AST node to visit
 * @param sourceFile - The source file being parsed
 * @param result - The parse result to populate
 * @param authInterfaces - Map to store auth interfaces
 */
function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  result: ParseResult,
  authInterfaces: Map<string, ParsedAuth>
): void {
  // NEW v4: Discover const server
  const constServer = discoverConstServer(node, sourceFile);
  if (constServer && !result.server) {
    // Extract server metadata from object literal
    const initializer = constServer.initializer;
    if (initializer && ts.isObjectLiteralExpression(initializer)) {
      const serverData: any = {};
      let inlineAuth: ParsedAuth | undefined;
      let codeExecutionConfig: any = undefined;

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
          } else if (name === 'auth' && ts.isObjectLiteralExpression(value)) {
            // Parse inline auth object from const server
            inlineAuth = parseConstServerAuth(value, sourceFile);
          } else if (name === 'codeExecution' && ts.isObjectLiteralExpression(value)) {
            // Parse inline codeExecution config from const server
            codeExecutionConfig = parseConstCodeExecutionConfig(value, sourceFile);
          }
        }
      }

      result.server = {
        interfaceName: 'IServer',
        name: serverData.name || 'unknown',
        version: serverData.version || '1.0.0',
        description: serverData.description,
        flattenRouters: serverData.flattenRouters,
        auth: inlineAuth,
        codeExecution: codeExecutionConfig
      };
    }
  }

  // NEW v4: Discover const implementations
  const constImpl = discoverConstImplementation(node, sourceFile);
  if (constImpl) {
    result.implementations!.push(constImpl);
  }

  // NEW v4: Discover const UI implementations
  const constUI = discoverConstUI(node, sourceFile);
  if (constUI) {
    result.discoveredUIs!.push(constUI);
  }

  // NEW v4: Discover const router implementations
  const constRouter = discoverConstRouter(node, sourceFile);
  if (constRouter) {
    result.discoveredRouters!.push(constRouter);
  }

  // NEW v4: Discover const completion implementations
  const constCompletion = discoverConstCompletion(node, sourceFile);
  if (constCompletion) {
    result.discoveredCompletions!.push(constCompletion);
  }

  // NEW v4: Discover const roots implementations
  const constRoots = discoverConstRoots(node, sourceFile);
  if (constRoots) {
    result.discoveredRoots!.push(constRoots);
  }

  // NEW v4: Discover const subscription implementations
  const constSubscription = discoverConstSubscription(node, sourceFile);
  if (constSubscription) {
    result.discoveredSubscriptions!.push(constSubscription);
  }

  // NEW v4: Discover class instantiations
  const instance = discoverClassInstance(node, sourceFile);
  if (instance) {
    result.instances!.push(instance);
  }

  // Compile interface declarations
  if (ts.isInterfaceDeclaration(node)) {
    const interfaceName = node.name.text;

    // Check if it extends ITool, IPrompt, IResource, IServer, or IAuth types
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        for (const type of clause.types) {
          const typeName = type.expression.getText(sourceFile);

          if (typeName === 'ITool') {
            const tool = compileToolInterface(node, sourceFile, result.validationErrors!);
            if (tool) result.tools.push(tool);
          } else if (typeName === 'IPrompt') {
            const prompt = compilePromptInterface(node, sourceFile);
            if (prompt) result.prompts.push(prompt);
          } else if (typeName === 'IResource') {
            const resource = compileResourceInterface(node, sourceFile);
            if (resource) result.resources.push(resource);
          } else if (typeName === 'ISampling') {
            const sampling = compileSamplingInterface(node, sourceFile);
            if (sampling) result.samplings.push(sampling);
          } else if (typeName === 'IElicit') {
            const elicit = compileElicitInterface(node, sourceFile);
            if (elicit) result.elicitations.push(elicit);
          } else if (typeName === 'IRoots') {
            const roots = compileRootsInterface(node, sourceFile);
            if (roots) result.roots.push(roots);
          } else if (typeName === 'ISubscription') {
            const subscription = compileSubscriptionInterface(node, sourceFile);
            if (subscription) result.subscriptions.push(subscription);
          } else if (typeName === 'ICompletion') {
            const completion = compileCompletionInterface(node, sourceFile);
            if (completion) result.completions.push(completion);
          } else if (typeName === 'IUI') {
            const ui = compileUIInterface(node, sourceFile);
            if (ui) result.uis.push(ui);
          } else if (typeName === 'IToolRouter' || typeName.startsWith('IToolRouter<')) {
            const router = compileRouterInterface(node, sourceFile);
            if (router) result.routers.push(router);
          } else if (typeName === 'IServer') {
            const server = compileServerInterface(node, sourceFile, authInterfaces);
            if (server) result.server = server;
          } else if (typeName === 'IAuth' || typeName === 'IApiKeyAuth') {
            const auth = compileAuthInterface(node, sourceFile);
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
      return;
    }

    // NEW v4: Discover class property implementations
    const classImpls = discoverClassImplementations(node, sourceFile);
    result.implementations!.push(...classImpls);

    // NEW v4: Discover class property UI implementations
    const classUIs = discoverClassUIImplementations(node, sourceFile);
    result.discoveredUIs!.push(...classUIs);

    const modifiers = node.modifiers ? Array.from(node.modifiers) : [];
    const hasDefaultExport = modifiers.some((mod: ts.Node) => mod.kind === ts.SyntaxKind.DefaultKeyword);
    const hasExport = modifiers.some((mod: ts.Node) => mod.kind === ts.SyntaxKind.ExportKeyword);

    // Priority 1: Explicit export default (backward compatible)
    if (hasExport && hasDefaultExport) {
      result.className = className;
      if (result.server) {
        result.server.className = className;
      }

      // Auto-instantiate export default classes
      // Classes marked with `export default` are automatically treated as instantiated
      // This eliminates the need for manual `const server = new Server()` boilerplate
      const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
      result.instances!.push({
        instanceName,
        className,
        isAutoInstantiated: true  // Mark as auto-instantiated for debugging
      } as any);
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
}

/**
 * Post-processing logic after AST traversal.
 *
 * This function:
 * - Discovers router properties in classes
 * - Links implementations to interfaces
 * - Links UIs, routers, completions, roots, subscriptions to interfaces
 * - Matches router properties to router interfaces
 * - Validates implementations
 *
 * @param result - The parse result to post-process
 * @param sourceFile - The source file that was parsed
 */
function postProcessParseResult(result: ParseResult, sourceFile: ts.SourceFile): void {
  // Second pass: Discover router properties in classes
  // This must happen AFTER all router interfaces have been parsed
  if (result.routers.length > 0) {
    const knownRouterInterfaces = new Set(result.routers.map(r => r.interfaceName));

    // Visit all class declarations again to discover router properties
    function discoverRouters(node: ts.Node) {
      if (ts.isClassDeclaration(node)) {
        const routerProps = discoverClassRouterProperties(node, sourceFile, knownRouterInterfaces);
        result.routerProperties!.push(...routerProps);
      }
      ts.forEachChild(node, discoverRouters);
    }

    discoverRouters(sourceFile);
  }

  // Link implementations to interfaces (v4 auto-discovery)
  linkImplementationsToInterfaces(result);

  // Link discovered UIs to interfaces (v4 const UI discovery)
  linkUIsToInterfaces(result);

  // Link discovered routers to interfaces (v4 const router discovery)
  // IMPORTANT: This must happen BEFORE matching router properties
  // so we can check if a router already has constName set
  linkRoutersToInterfaces(result, sourceFile);

  // Link discovered completions to interfaces (v4 const completion discovery)
  linkCompletionsToInterfaces(result, sourceFile);

  // Link discovered roots to interfaces (v4 const roots discovery)
  linkRootsToInterfaces(result, sourceFile);

  // Link discovered subscriptions to interfaces (v4 const subscription discovery)
  linkSubscriptionsToInterfaces(result, sourceFile);

  // Match router properties to router interfaces
  // This updates the propertyName field in routers based on discovered class properties
  // Only set propertyName if constName is not already set (they are mutually exclusive)
  if (result.routerProperties && result.routerProperties.length > 0) {
    for (const routerProp of result.routerProperties) {
      // Find the router interface that matches this property's type
      const router = result.routers.find(r => r.interfaceName === routerProp.interfaceName);
      if (router && !router.constName) {
        // Only set propertyName if this is NOT a const router
        // Const routers have constName set, class routers have propertyName set
        router.propertyName = routerProp.propertyName;
      }
    }
  }

  // Validate implementations (Phase 2B: Auto-discovery validation)
  validateImplementations(result);
}
