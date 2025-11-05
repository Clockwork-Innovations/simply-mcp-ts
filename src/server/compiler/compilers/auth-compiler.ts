/**
 * Auth Interface Compiler
 *
 * Compiles IAuth interfaces into ParsedAuth metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedAuth } from '../types.js';
import { extractStaticData } from '../compiler-helpers.js';

export function compileAuthInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedAuth | null {
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
