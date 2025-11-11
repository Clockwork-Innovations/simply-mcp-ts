/**
 * Interface Detection for TypeScript Types
 *
 * Provides utilities to detect if a TypeScript type implements specific MCP interfaces
 * (ITool, IServer, IPrompt, IResource, etc.) through both explicit implementation
 * and structural typing (duck typing).
 *
 * This is used during program-based AST parsing to accurately identify interface
 * implementations when full type information is available.
 */

import * as ts from 'typescript';

/**
 * Required properties for each MCP interface type
 * Used for structural compatibility checking (duck typing)
 */
const INTERFACE_REQUIREMENTS: Record<string, string[]> = {
  'ITool': ['name', 'description', 'inputSchema', 'execute'],
  'IServer': ['name', 'version'],
  'IPrompt': ['name', 'description'],
  'IResource': ['uri', 'name'],
  'ISampling': ['name'],
  'IElicit': ['name'],
  'IRoots': ['roots'],
  'ISubscription': ['uri'],
  'ICompletion': ['ref'],
  'IUI': ['name'],
  'IToolRouter': ['prefix', 'description']
};

/**
 * Check if a TypeScript type explicitly implements one of the given interface names.
 *
 * This handles:
 * 1. Explicit class implementation: `class MyTool implements ITool { ... }`
 * 2. Explicit type annotations: `const tool: ITool = { ... }`
 * 3. Type aliases: `type MyTool = ITool & { ... }`
 *
 * @param type - The TypeScript type to check
 * @param typeChecker - Type checker from the program
 * @param interfaceNames - Array of interface names to check (e.g., ['ITool', 'IPrompt'])
 * @returns True if the type explicitly implements any of the interfaces
 *
 * @example
 * ```typescript
 * const type = typeChecker.getTypeAtLocation(node);
 * if (implementsInterface(type, typeChecker, ['ITool'])) {
 *   // This is a tool implementation
 * }
 * ```
 */
export function implementsInterface(
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  interfaceNames: string[]
): boolean {
  // Get the symbol for this type
  const symbol = type.getSymbol();
  if (!symbol) {
    return false;
  }

  // Check if the type's name matches any of the interface names
  const typeName = typeChecker.typeToString(type);
  for (const interfaceName of interfaceNames) {
    if (typeName === interfaceName || typeName.startsWith(`${interfaceName}<`)) {
      return true;
    }
  }

  // Check base types (for classes implementing interfaces)
  const baseTypes = type.getBaseTypes();
  if (baseTypes) {
    for (const baseType of baseTypes) {
      if (implementsInterface(baseType, typeChecker, interfaceNames)) {
        return true;
      }
    }
  }

  // Check if the symbol's declarations have explicit heritage clauses
  const declarations = symbol.getDeclarations();
  if (declarations) {
    for (const declaration of declarations) {
      if (ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
        if (declaration.heritageClauses) {
          for (const clause of declaration.heritageClauses) {
            for (const typeNode of clause.types) {
              const clauseType = typeChecker.getTypeAtLocation(typeNode);
              const clauseTypeName = typeChecker.typeToString(clauseType);

              for (const interfaceName of interfaceNames) {
                if (clauseTypeName === interfaceName || clauseTypeName.startsWith(`${interfaceName}<`)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Check if a type has the structural shape (properties) of a specific interface.
 *
 * This performs "duck typing" - checking if the type has all the required properties
 * for an interface, even if it doesn't explicitly implement it.
 *
 * Useful for detecting:
 * - Object literals: `{ name: 'foo', description: 'bar', ... }`
 * - Structural implementations: `const tool = { name, description, execute }`
 *
 * @param type - The TypeScript type to check
 * @param typeChecker - Type checker from the program
 * @param interfaceName - The interface name to check against (e.g., 'ITool')
 * @returns True if the type has all required properties for the interface
 *
 * @example
 * ```typescript
 * const type = typeChecker.getTypeAtLocation(objectLiteral);
 * if (hasInterfaceShape(type, typeChecker, 'ITool')) {
 *   // This object has all ITool properties
 * }
 * ```
 */
export function hasInterfaceShape(
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  interfaceName: string
): boolean {
  const requiredProps = INTERFACE_REQUIREMENTS[interfaceName];
  if (!requiredProps) {
    return false;
  }

  // Get all properties of the type
  const properties = type.getProperties();
  const propertyNames = new Set(properties.map(prop => prop.getName()));

  // Check if all required properties exist
  for (const requiredProp of requiredProps) {
    if (!propertyNames.has(requiredProp)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a type implements any MCP interface (explicit or structural).
 *
 * Convenience function that checks both explicit implementation and structural shape.
 *
 * @param type - The TypeScript type to check
 * @param typeChecker - Type checker from the program
 * @param interfaceName - The interface name to check (e.g., 'ITool')
 * @returns True if the type implements the interface explicitly or structurally
 *
 * @example
 * ```typescript
 * const type = typeChecker.getTypeAtLocation(node);
 * if (implementsInterfaceOrShape(type, typeChecker, 'ITool')) {
 *   // This is a tool (either explicit or duck-typed)
 * }
 * ```
 */
export function implementsInterfaceOrShape(
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  interfaceName: string
): boolean {
  return (
    implementsInterface(type, typeChecker, [interfaceName]) ||
    hasInterfaceShape(type, typeChecker, interfaceName)
  );
}

/**
 * Get all implemented MCP interfaces for a type.
 *
 * Returns an array of interface names that the type implements.
 * Useful for discovering what kind of MCP component a type represents.
 *
 * @param type - The TypeScript type to check
 * @param typeChecker - Type checker from the program
 * @returns Array of implemented interface names
 *
 * @example
 * ```typescript
 * const type = typeChecker.getTypeAtLocation(node);
 * const interfaces = getImplementedInterfaces(type, typeChecker);
 * // interfaces might be: ['ITool', 'IResource']
 * ```
 */
export function getImplementedInterfaces(
  type: ts.Type,
  typeChecker: ts.TypeChecker
): string[] {
  const implemented: string[] = [];

  for (const interfaceName of Object.keys(INTERFACE_REQUIREMENTS)) {
    if (implementsInterfaceOrShape(type, typeChecker, interfaceName)) {
      implemented.push(interfaceName);
    }
  }

  return implemented;
}
