/**
 * Auto-Discovery Functions (v4.0)
 *
 * Functions to discover const-based implementations and class instantiations
 * in v4.0 interface-driven servers. Part of the zero-boilerplate auto-discovery system.
 */

import * as ts from 'typescript';
import type { DiscoveredImplementation, DiscoveredInstance, DiscoveredRouterProperty, DiscoveredUI, DiscoveredRouter, DiscoveredCompletion, DiscoveredRoots, DiscoveredSubscription, ParseResult } from './types.js';

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
      // Validate that initializer exists
      if (!declaration.initializer) {
        const varName = declaration.name.getText(sourceFile);
        console.warn(
          `\n⚠️  WARNING: Server config '${varName}' has type IServer but no initializer.\n` +
          `   Expected: const ${varName}: IServer = { name: '...', version: '...' };\n`
        );
      }
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

      // Validate initializer exists
      if (!declaration.initializer) {
        const varName = declaration.name.getText(sourceFile);
        console.warn(
          `\n⚠️  WARNING: ${helper} implementation '${varName}' has type ${helper}Helper<${interfaceName}> but no initializer.\n` +
          `   Expected: const ${varName}: ${helper}Helper<${interfaceName}> = async (params) => { ... };\n`
        );
      }

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

        // Validate initializer exists
        if (!declaration.initializer) {
          const varName = declaration.name.getText(sourceFile);
          console.warn(
            `\n⚠️  WARNING: ${suffix} implementation '${varName}' has type ${interfaceName} but no initializer.\n` +
            `   Expected: const ${varName}: ${interfaceName} = async (params) => { ... };\n` +
            `   Or use helper type: const ${varName}: ${helperType}<${interfaceName}> = async (params) => { ... };\n`
          );
        }

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
 * Discover const UI implementations
 * Pattern: const dashboard: DashboardUI = { source: '...' }
 *
 * This follows the same pattern as discoverConstImplementation but matches
 * UI interface names (ending with 'UI' suffix).
 */
export function discoverConstUI(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredUI | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    // Check for UI interface patterns
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);

      // Pattern 1 (preferred): const dashboard: IUI = { ... }
      // Pattern 2 (extended): const dashboard: DashboardUI = { ... } where DashboardUI extends IUI
      const isBaseIUI = interfaceName === 'IUI';
      const isExtendedUI = interfaceName.match(/^(\w+)UI$/);

      if (isBaseIUI || isExtendedUI) {
        return {
          name: declaration.name.getText(sourceFile),
          interfaceName,
          kind: 'const'
        };
      }
    }
  }

  return null;
}

/**
 * Discover class property UI implementations
 * Pattern: class C { dashboard: DashboardUI = { source: '...' } }
 */
export function discoverClassUIImplementations(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DiscoveredUI[] {
  const uis: DiscoveredUI[] = [];
  const className = node.name?.text;

  if (!className) return uis;

  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.type) continue;

    // Extract property name
    const propertyName = member.name.getText(sourceFile);

    // Check for UI interface pattern (XUI where X is any identifier)
    if (ts.isTypeReferenceNode(member.type)) {
      const interfaceName = member.type.typeName.getText(sourceFile);
      const uiMatch = interfaceName.match(/^(\w+)UI$/);

      if (uiMatch) {
        uis.push({
          name: propertyName,
          interfaceName,
          kind: 'class-property',
          className
        });
      }
    }
  }

  return uis;
}

/**
 * Discover const router implementations
 * Pattern 1 (base): const weatherRouter: IToolRouter = { ... }
 * Pattern 2 (extended): const weatherRouter: WeatherRouter = { ... } where WeatherRouter extends IToolRouter
 *
 * This follows the exact pattern from discoverConstUI() - just change IUI/XUI to IToolRouter/XRouter.
 */
export function discoverConstRouter(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredRouter | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    // Check for router interface patterns
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);

      // Match both base interface and extended interface
      const isBaseIToolRouter = interfaceName === 'IToolRouter';
      const isExtendedRouter = interfaceName.match(/^(\w+)Router$/);

      if (isBaseIToolRouter || isExtendedRouter) {
        return {
          name: declaration.name.getText(sourceFile),
          interfaceName,
          kind: 'const'
        };
      }
    }
  }

  return null;
}

/**
 * Discover const completion implementations
 * Pattern 1 (base): const cityComplete: ICompletion = { ... }
 * Pattern 2 (extended): const cityComplete: CityCompletion = { ... } where CityCompletion extends ICompletion
 *
 * This follows the exact pattern from discoverConstRouter() - just change IToolRouter/XRouter to ICompletion/XCompletion.
 */
export function discoverConstCompletion(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredCompletion | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    // Check for completion interface patterns
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);

      // Match both base interface and extended interface
      const isBaseCompletion = interfaceName === 'ICompletion' || interfaceName.startsWith('ICompletion<');
      const isExtendedCompletion = interfaceName.match(/^(\w+)Completion$/);

      if (isBaseCompletion || isExtendedCompletion) {
        return {
          name: declaration.name.getText(sourceFile),
          interfaceName,
          kind: 'const'
        };
      }
    }
  }

  return null;
}

/**
 * Discover const roots implementations
 * Pattern 1 (base): const projectRoots: IRoots = { ... }
 * Pattern 2 (extended): const projectRoots: ProjectRoots = { ... } where ProjectRoots extends IRoots
 *
 * This follows the exact pattern from discoverConstRouter() - just change IToolRouter/XRouter to IRoots/XRoots.
 */
export function discoverConstRoots(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredRoots | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    // Check for roots interface patterns
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);

      // Match both base interface and extended interface
      const isBaseRoots = interfaceName === 'IRoots';
      const isExtendedRoots = interfaceName.match(/^(\w+)Roots$/);

      if (isBaseRoots || isExtendedRoots) {
        return {
          name: declaration.name.getText(sourceFile),
          interfaceName,
          kind: 'const'
        };
      }
    }
  }

  return null;
}

/**
 * Discover const subscription implementations
 * Pattern 1 (base): const configSub: ISubscription = { ... }
 * Pattern 2 (extended): const configSub: ConfigSubscription = { ... } where ConfigSubscription extends ISubscription
 *
 * This follows the exact pattern from discoverConstRouter() - just change IToolRouter/XRouter to ISubscription/XSubscription.
 */
export function discoverConstSubscription(node: ts.Node, sourceFile: ts.SourceFile): DiscoveredSubscription | null {
  if (!ts.isVariableStatement(node)) return null;

  for (const declaration of node.declarationList.declarations) {
    if (!declaration.type) continue;

    // Check for subscription interface patterns
    if (ts.isTypeReferenceNode(declaration.type)) {
      const interfaceName = declaration.type.typeName.getText(sourceFile);

      // Match both base interface and extended interface
      const isBaseSubscription = interfaceName === 'ISubscription';
      const isExtendedSubscription = interfaceName.match(/^(\w+)Subscription$/);

      if (isBaseSubscription || isExtendedSubscription) {
        return {
          name: declaration.name.getText(sourceFile),
          interfaceName,
          kind: 'const'
        };
      }
    }
  }

  return null;
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

/**
 * Link discovered UIs to their interfaces
 * Adds 'constName' or 'propertyName' to parsed UIs
 */
export function linkUIsToInterfaces(result: ParseResult): void {
  if (!result.discoveredUIs) return;

  for (const ui of result.discoveredUIs) {
    const parsed = result.uis.find(p => p.interfaceName === ui.interfaceName);
    if (parsed) {
      if (ui.kind === 'const') {
        parsed.constName = ui.name;
      } else if (ui.kind === 'class-property') {
        parsed.propertyName = ui.name;
      }
    }
  }
}

/**
 * Link discovered routers to their interfaces
 * Adds 'constName' to parsed routers
 *
 * Matches discovered const routers to parsed router interfaces by the router's
 * `name` property value (not the TypeScript interface name).
 *
 * Example:
 *   const weatherRouter: WeatherRouter = { name: 'weather', ... }
 *   interface WeatherRouter extends IToolRouter { name: 'weather'; ... }
 *
 * Match: discoveredRouter.name='weatherRouter' links to parsedRouter.name='weather'
 */
export function linkRoutersToInterfaces(result: ParseResult, sourceFile: ts.SourceFile): void {
  if (!result.discoveredRouters) return;

  for (const discoveredRouter of result.discoveredRouters) {
    // For const routers, we need to extract the 'name' property from the object literal
    // to match it with the parsed router's name field
    if (discoveredRouter.kind === 'const') {
      // Find the const variable declaration to read its object literal
      const routerName = extractRouterNameFromConst(discoveredRouter.name, sourceFile);

      if (routerName) {
        // Match by the router's actual name property (e.g., 'weather_router')
        const parsedRouter = result.routers.find(r => r.name === routerName);
        if (parsedRouter) {
          parsedRouter.constName = discoveredRouter.name;
          // Clear propertyName for const routers (they are mutually exclusive)
          parsedRouter.propertyName = undefined as any;
        }
      } else {
        // Fallback: try matching by interface name (for backward compatibility)
        const parsedRouter = result.routers.find(r => r.interfaceName === discoveredRouter.interfaceName);
        if (parsedRouter) {
          parsedRouter.constName = discoveredRouter.name;
          // Clear propertyName for const routers (they are mutually exclusive)
          parsedRouter.propertyName = undefined as any;
        }
      }
    }
    // Note: For routers, we already handle class properties via discoverClassRouterProperties
    // so we don't need to set propertyName here (it's set in main-compiler.ts)
  }
}

/**
 * Link discovered completions to their interfaces
 * Adds 'constName' to parsed completions
 *
 * Matches discovered const completions to parsed completion interfaces by name property value.
 */
export function linkCompletionsToInterfaces(result: ParseResult, sourceFile: ts.SourceFile): void {
  if (!result.discoveredCompletions) return;

  for (const discoveredCompletion of result.discoveredCompletions) {
    // For const completions, extract the 'name' property from the object literal
    // to match it with the parsed completion's name field
    if (discoveredCompletion.kind === 'const') {
      const completionName = extractCompletionNameFromConst(discoveredCompletion.name, sourceFile);

      if (completionName) {
        // Match by the completion's actual name property
        const parsedCompletion = result.completions.find(c => c.name === completionName);
        if (parsedCompletion) {
          parsedCompletion.constName = discoveredCompletion.name;
        }
      } else {
        // Fallback: try matching by interface name (for backward compatibility)
        const parsedCompletion = result.completions.find(c => c.interfaceName === discoveredCompletion.interfaceName);
        if (parsedCompletion) {
          parsedCompletion.constName = discoveredCompletion.name;
        }
      }
    }
  }
}

/**
 * Link discovered roots to their interfaces
 * Adds 'constName' to parsed roots
 *
 * Matches discovered const roots to parsed roots interfaces by name property value.
 */
export function linkRootsToInterfaces(result: ParseResult, sourceFile: ts.SourceFile): void {
  if (!result.discoveredRoots) return;

  for (const discoveredRoot of result.discoveredRoots) {
    // For const roots, extract the 'name' property from the object literal
    // to match it with the parsed root's name field
    if (discoveredRoot.kind === 'const') {
      const rootsName = extractRootsNameFromConst(discoveredRoot.name, sourceFile);

      if (rootsName) {
        // Match by the root's actual name property
        const parsedRoot = result.roots.find(r => r.name === rootsName);
        if (parsedRoot) {
          parsedRoot.constName = discoveredRoot.name;
        }
      } else {
        // Fallback: try matching by interface name (for backward compatibility)
        const parsedRoot = result.roots.find(r => r.interfaceName === discoveredRoot.interfaceName);
        if (parsedRoot) {
          parsedRoot.constName = discoveredRoot.name;
        }
      }
    }
  }
}

/**
 * Link discovered subscriptions to their interfaces
 * Adds 'constName' to parsed subscriptions
 *
 * Matches discovered const subscriptions to parsed subscription interfaces by uri property value.
 * Note: Subscriptions use 'uri' as their unique identifier, not 'name'.
 */
export function linkSubscriptionsToInterfaces(result: ParseResult, sourceFile: ts.SourceFile): void {
  if (!result.discoveredSubscriptions) return;

  for (const discoveredSubscription of result.discoveredSubscriptions) {
    // For const subscriptions, extract the 'uri' property from the object literal
    // to match it with the parsed subscription's uri field
    if (discoveredSubscription.kind === 'const') {
      const subscriptionUri = extractSubscriptionUriFromConst(discoveredSubscription.name, sourceFile);

      if (subscriptionUri) {
        // Match by the subscription's actual uri property
        const parsedSubscription = result.subscriptions.find(s => s.uri === subscriptionUri);
        if (parsedSubscription) {
          parsedSubscription.constName = discoveredSubscription.name;
        }
      } else {
        // Fallback: try matching by interface name (for backward compatibility)
        const parsedSubscription = result.subscriptions.find(s => s.interfaceName === discoveredSubscription.interfaceName);
        if (parsedSubscription) {
          parsedSubscription.constName = discoveredSubscription.name;
        }
      }
    }
  }
}

/**
 * Extract the 'name' property value from a const router object literal
 *
 * Example:
 *   const weatherRouter: IToolRouter = { name: 'weather', ... }
 *   Returns: 'weather'
 */
function extractRouterNameFromConst(constName: string, sourceFile: ts.SourceFile): string | null {
  let routerName: string | null = null;

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const varName = declaration.name.getText(sourceFile);
        if (varName === constName && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          // Found the const router - extract the 'name' property
          for (const prop of declaration.initializer.properties) {
            if (ts.isPropertyAssignment(prop)) {
              const propName = prop.name.getText(sourceFile);
              if (propName === 'name') {
                const value = prop.initializer;
                if (ts.isStringLiteral(value)) {
                  routerName = value.text;
                  return;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routerName;
}

/**
 * Extract the 'name' property value from a const completion object literal
 *
 * Example:
 *   const cityComplete: ICompletion = { name: 'city_completion', ... }
 *   Returns: 'city_completion'
 */
function extractCompletionNameFromConst(constName: string, sourceFile: ts.SourceFile): string | null {
  let completionName: string | null = null;

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const varName = declaration.name.getText(sourceFile);
        if (varName === constName && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          // Found the const completion - extract the 'name' property
          for (const prop of declaration.initializer.properties) {
            if (ts.isPropertyAssignment(prop)) {
              const propName = prop.name.getText(sourceFile);
              if (propName === 'name') {
                const value = prop.initializer;
                if (ts.isStringLiteral(value)) {
                  completionName = value.text;
                  return;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return completionName;
}

/**
 * Extract the 'name' property value from a const roots object literal
 *
 * Example:
 *   const projectRoots: IRoots = { name: 'project_roots', ... }
 *   Returns: 'project_roots'
 */
function extractRootsNameFromConst(constName: string, sourceFile: ts.SourceFile): string | null {
  let rootsName: string | null = null;

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const varName = declaration.name.getText(sourceFile);
        if (varName === constName && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          // Found the const roots - extract the 'name' property
          for (const prop of declaration.initializer.properties) {
            if (ts.isPropertyAssignment(prop)) {
              const propName = prop.name.getText(sourceFile);
              if (propName === 'name') {
                const value = prop.initializer;
                if (ts.isStringLiteral(value)) {
                  rootsName = value.text;
                  return;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return rootsName;
}

/**
 * Extract the 'uri' property value from a const subscription object literal
 * Note: Subscriptions use 'uri' as their unique identifier, not 'name'
 *
 * Example:
 *   const configSub: ISubscription = { uri: 'config://server', ... }
 *   Returns: 'config://server'
 */
function extractSubscriptionUriFromConst(constName: string, sourceFile: ts.SourceFile): string | null {
  let subscriptionUri: string | null = null;

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const varName = declaration.name.getText(sourceFile);
        if (varName === constName && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
          // Found the const subscription - extract the 'uri' property
          for (const prop of declaration.initializer.properties) {
            if (ts.isPropertyAssignment(prop)) {
              const propName = prop.name.getText(sourceFile);
              if (propName === 'uri') {
                const value = prop.initializer;
                if (ts.isStringLiteral(value)) {
                  subscriptionUri = value.text;
                  return;
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return subscriptionUri;
}
