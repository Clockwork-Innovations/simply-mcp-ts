/**
 * Server Interface Compiler
 *
 * Compiles IServer interfaces into ParsedServer metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedServer, ParsedAuth } from '../types.js';
import { toKebabCase } from '../utils.js';
import { extractStaticData } from '../compiler-helpers.js';
import { compileAuthInterface } from './auth-compiler.js';

export function compileServerInterface(
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
