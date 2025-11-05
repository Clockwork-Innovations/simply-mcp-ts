/**
 * Auto-Discovery Functions (v4.0)
 *
 * Functions to discover const-based implementations and class instantiations
 * in v4.0 interface-driven servers. Part of the zero-boilerplate auto-discovery system.
 */

import * as ts from 'typescript';
import type { DiscoveredImplementation, DiscoveredInstance, ParseResult } from './types.js';

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
 * Pattern: const add: ToolHelper<AddTool> = async (params) => { ... }
 */
export function discoverConstImplementation(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredImplementation | null {
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
export function discoverClassImplementations(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DiscoveredImplementation[] {
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
