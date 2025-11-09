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
  let auth: ParsedAuth | undefined;
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
      } else if (memberName === 'auth') {
        // Handle both type reference (interface) and inline object literal
        if (member.type && ts.isTypeReferenceNode(member.type)) {
          // Pattern 1: Reference to an auth interface
          // Example: auth: AdminAuth
          authInterfaceName = member.type.typeName.getText(sourceFile);
        } else if (member.type && ts.isTypeLiteralNode(member.type)) {
          // Pattern 2: Inline auth object
          // Example: auth: { type: 'apiKey'; keys: [...]; }
          // Parse inline auth directly using compileAuthInterface logic
          auth = parseInlineAuthObject(member.type, sourceFile);
        }
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

  // Resolve auth interface if referenced (only if not already set by inline auth)
  if (authInterfaceName && !auth) {
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
 * Parse inline auth object from type literal node
 * Handles inline auth objects in server definitions
 * Example: auth: { type: 'apiKey'; keys: [...]; }
 */
function parseInlineAuthObject(typeNode: ts.TypeLiteralNode, sourceFile: ts.SourceFile): ParsedAuth | null {
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

  // Parse type literal members (same logic as compileAuthInterface)
  for (const member of typeNode.members) {
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
        keys = parseKeysArray(member.type, sourceFile);
      }
      // OAuth2 fields
      else if (memberName === 'issuerUrl' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          issuerUrl = literal.text;
        }
      } else if (memberName === 'clients' && member.type) {
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
    console.warn('Inline auth object missing required "type" property');
    return null;
  }

  return {
    type: authType,
    interfaceName: 'InlineAuth', // Mark as inline
    headerName,
    keys,
    allowAnonymous,
    issuerUrl,
    clients,
    tokenExpiration,
    refreshTokenExpiration,
    codeExpiration,
  };
}

/**
 * Helper functions imported from auth-compiler.ts logic
 * These parse array fields in auth objects
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

function parseOAuthClientsArray(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile
): Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> | undefined {
  if (!ts.isTupleTypeNode(typeNode)) {
    return undefined;
  }

  const clients: Array<{ clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string }> = [];

  for (const element of typeNode.elements) {
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

/**
 * Parse an IAuth interface (IApiKeyAuth, etc.)
 */
