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
import {
  discoverConstServer,
  discoverConstImplementation,
  discoverClassImplementations,
  discoverClassInstance,
  linkImplementationsToInterfaces
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
export function compileInterfaceFile(filePath: string): ParseResult {
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
    // NEW v4: Discover const server
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
          description: serverData.description,
          flattenRouters: serverData.flattenRouters
        };
      }
    }

    // NEW v4: Discover const implementations
    const constImpl = discoverConstImplementation(node, sourceFile);
    if (constImpl) {
      result.implementations!.push(constImpl);
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
        ts.forEachChild(node, visit);
        return;
      }

      // NEW v4: Discover class property implementations
      const classImpls = discoverClassImplementations(node, sourceFile);
      result.implementations!.push(...classImpls);

      const modifiers = node.modifiers ? Array.from(node.modifiers) : [];
      const hasDefaultExport = modifiers.some((mod: ts.Node) => mod.kind === ts.SyntaxKind.DefaultKeyword);
      const hasExport = modifiers.some((mod: ts.Node) => mod.kind === ts.SyntaxKind.ExportKeyword);

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

  // Link implementations to interfaces (v4 auto-discovery)
  linkImplementationsToInterfaces(result);

  // Validate implementations (Phase 2B: Auto-discovery validation)
  validateImplementations(result);

  return result;
}
