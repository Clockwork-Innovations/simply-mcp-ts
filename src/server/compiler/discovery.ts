/**
 * Auto-Discovery Functions (v4.0)
 *
 * Functions to discover const-based implementations and class instantiations
 * in v4.0 interface-driven servers. Part of the zero-boilerplate auto-discovery system.
 */

import * as ts from 'typescript';
import type { DiscoveredImplementation, DiscoveredInstance, DiscoveredRouterProperty, ParseResult } from './types.js';

/**
 * Discover const server definition
 * Pattern: const server: IServer = { ... }
 */
export function discoverConstServer(node: ts.Node, sourceFile: ts.SourceFile): ts.VariableDeclaration | null {
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
 * Pattern 1 (preferred): const add: ToolHelper<AddTool> = async (params) => { ... }
 * Pattern 2 (bare interface): const add: AddTool = async (params) => { ... }
 */
export function discoverConstImplementation(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredImplementation | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    const typeText = declaration.type.getText(sourceFile);

    // Check for ToolHelper<X>, PromptHelper<X>, ResourceHelper<X> (Pattern 1 - CHECKED FIRST)
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

    // Fallback: Check for bare interface pattern (Pattern 2 - ONLY IF PATTERN 1 FAILS)
    // Match: XTool, XPrompt, XResource where X is any identifier
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);
      const bareMatch = interfaceName.match(/^(\w+)(Tool|Prompt|Resource)$/);

      if (bareMatch) {
        const [, , suffix] = bareMatch;
        // Infer helperType from the suffix
        const helperType = `${suffix}Helper` as 'ToolHelper' | 'PromptHelper' | 'ResourceHelper';

        return {
          name: declaration.name.getText(sourceFile),
          helperType,
          interfaceName,
          kind: 'const',
          isBareInterface: true  // Mark as bare interface detection
        };
      }
    }
  }

  return null;
}

/**
 * Discover class property implementations
 * Pattern 1 (preferred): class C { getWeather: ToolHelper<GetWeatherTool> = async (params) => { ... } }
 * Pattern 2 (bare interface): class C { getWeather: GetWeatherTool = async (params) => { ... } }
 */
export function discoverClassImplementations(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DiscoveredImplementation[] {
  const implementations: DiscoveredImplementation[] = [];
  const className = node.name?.text;

  if (!className) return implementations;

  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.type) continue;

    // Extract property name, handling quoted/computed properties
    let propertyName: string;
    if (ts.isStringLiteral(member.name)) {
      // String literal property: 'config://server'
      propertyName = member.name.text;
    } else if (ts.isComputedPropertyName(member.name)) {
      // Computed property: ['travel://destinations']
      const expr = member.name.expression;
      if (ts.isStringLiteral(expr)) {
        propertyName = expr.text;
      } else {
        // Skip non-string computed properties
        continue;
      }
    } else {
      // Regular identifier: getWeather
      propertyName = member.name.getText(sourceFile);
    }

    const typeText = member.type.getText(sourceFile);

    // Check for ToolHelper<X>, PromptHelper<X>, ResourceHelper<X> (Pattern 1 - CHECKED FIRST)
    const helperMatch = typeText.match(/^(Tool|Prompt|Resource)Helper<(\w+)>$/);

    if (helperMatch) {
      const [, helper, interfaceName] = helperMatch;

      implementations.push({
        name: propertyName,
        helperType: `${helper}Helper` as any,
        interfaceName,
        kind: 'class-property',
        className
      });
    } else if (ts.isTypeReferenceNode(member.type)) {
      // Fallback: Check for bare interface pattern (Pattern 2 - ONLY IF PATTERN 1 FAILS)
      // Match: XTool, XPrompt, XResource where X is any identifier
      const interfaceName = member.type.typeName.getText(sourceFile);
      const bareMatch = interfaceName.match(/^(\w+)(Tool|Prompt|Resource)$/);

      if (bareMatch) {
        const [, , suffix] = bareMatch;
        // Infer helperType from the suffix
        const helperType = `${suffix}Helper` as 'ToolHelper' | 'PromptHelper' | 'ResourceHelper';

        implementations.push({
          name: propertyName,
          helperType,
          interfaceName,
          kind: 'class-property',
          className,
          isBareInterface: true  // Mark as bare interface detection
        });
      }
    }
  }

  return implementations;
}

/**
 * Discover router properties in a class
 * Pattern: class C { battleRouter!: BattleRouter; }
 *
 * This discovers class properties that are typed with router interfaces,
 * allowing them to be matched to parsed router interfaces later.
 */
export function discoverClassRouterProperties(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, knownRouterInterfaces: Set<string>): DiscoveredRouterProperty[] {
  const routerProperties: DiscoveredRouterProperty[] = [];
  const className = node.name?.text;

  if (!className) return routerProperties;

  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.type) continue;

    // Get property name
    const propertyName = member.name.getText(sourceFile);

    // Check if the type is a TypeReferenceNode (interface reference)
    if (ts.isTypeReferenceNode(member.type)) {
      const interfaceName = member.type.typeName.getText(sourceFile);

      // Check if this interface is a known router interface
      if (knownRouterInterfaces.has(interfaceName)) {
        routerProperties.push({
          propertyName,
          interfaceName,
          className
        });
      }
    }
  }

  return routerProperties;
}

/**
 * Discover class instantiations
 * Pattern: const weatherService = new WeatherService();
 */
export function discoverClassInstance(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredInstance | null {
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
 * Adds 'implementation' property to parsed tools/prompts/resources
 */
export function linkImplementationsToInterfaces(result: ParseResult): void {
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
