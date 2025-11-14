/**
 * Prompt Handler
 *
 * Handles prompt registration with the MCP server.
 * All prompts now require implementation (no static templates).
 */

import type { ParsedPrompt } from '../server/parser.js';
import type { BuildMCPServer } from '../server/builder-server.js';

/**
 * Helper: Generate all naming variations for a prompt method name
 * Returns variations in different naming conventions (same logic as tools)
 */
function getNamingVariations(methodName: string): string[] {
  const variations: string[] = [];

  // Original name
  variations.push(methodName);

  // snake_case (if not already)
  if (!methodName.includes('_')) {
    const snakeCase = methodName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/-/g, '_');
    if (snakeCase !== methodName) {
      variations.push(snakeCase);
    }
  }

  // camelCase
  const camelCase = methodName
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, match => match.toLowerCase());
  if (camelCase !== methodName) {
    variations.push(camelCase);
  }

  // PascalCase
  const pascalCase = methodName
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());
  if (pascalCase !== methodName && pascalCase !== camelCase) {
    variations.push(pascalCase);
  }

  // kebab-case
  const kebabCase = methodName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
  if (kebabCase !== methodName) {
    variations.push(kebabCase);
  }

  // Remove duplicates
  return [...new Set(variations)];
}

/**
 * Register a prompt with the MCP server
 * All prompts require a method implementation on the server class
 */
export function registerPrompt(
  server: BuildMCPServer,
  serverInstance: any,
  prompt: ParsedPrompt
): void {
  const { name, description, methodName, argsMetadata, hidden } = prompt;

  // Generate all possible naming variations for the method name
  const possibleMethodNames = getNamingVariations(methodName);

  // Check for ambiguous naming collisions (both camelCase and snake_case exist)
  const existingVariations = possibleMethodNames.filter(v => typeof serverInstance[v] === 'function');
  if (existingVariations.length > 1) {
    throw new Error(
      `❌ Prompt "${name}" has ambiguous method names - multiple naming variations exist:\n` +
      existingVariations.map(v => `  - ${v}`).join('\n') + '\n\n' +
      `This is ambiguous. Please keep only ONE of these methods.\n` +
      `Recommended: Use camelCase "${methodName}" and remove the others.\n\n` +
      `Why this matters: Having multiple naming variations causes confusion about which ` +
      `method will be called and makes the codebase harder to maintain.`
    );
  }

  // Try exact match first (prefer explicit naming)
  let method = serverInstance[methodName];
  let foundMethodName = methodName;

  // If exact match not found, try naming variations
  if (!method) {
    for (const variationName of possibleMethodNames) {
      if (variationName !== methodName && serverInstance[variationName]) {
        method = serverInstance[variationName];
        foundMethodName = variationName;
        break;
      }
    }
  }

  // If still not found after trying all variations, show enhanced error
  if (!method) {
    // Get available methods for helpful error message
    const availableMethodNames = Object.keys(serverInstance)
      .filter(key => typeof serverInstance[key] === 'function');

    const availableMethods = availableMethodNames
      .map(key => `  - ${key}`)
      .join('\n');

    // Build comprehensive error message
    let errorMessage =
      `❌ Prompt "${name}" requires method "${methodName}" but it was not found on server class.\n\n` +
      `Expected pattern:\n` +
      `  interface ${prompt.interfaceName} extends IPrompt {\n` +
      `    name: '${name}';  // ← Prompt name\n` +
      `    // ...\n` +
      `  }\n\n` +
      `  export default class YourServer {\n` +
      `    ${methodName}: ${prompt.interfaceName} = (args) => { ... };  // ← Method\n` +
      `  }\n\n`;

    // Show naming variations that were tried
    if (possibleMethodNames.length > 1) {
      errorMessage +=
        `🔤 Tried these naming variations automatically:\n` +
        possibleMethodNames.map(v => `  - ${v}`).join('\n') + '\n\n';
    }

    // Show all available methods
    if (availableMethods) {
      errorMessage += `📋 Available methods on your class:\n${availableMethods}\n\n`;
    }

    throw new Error(errorMessage);
  }

  if (typeof method !== 'function') {
    throw new Error(
      `❌ Prompt "${name}" method "${methodName}" is not a function (found: ${typeof method})`
    );
  }

  // Validate and process argument metadata if present
  if (argsMetadata) {
    for (const [argName, metadata] of Object.entries(argsMetadata)) {
      // Validate type field if present
      if (metadata.type && !['string', 'number', 'boolean'].includes(metadata.type)) {
        console.warn(
          `Prompt '${name}': Argument '${argName}' has invalid type '${metadata.type}'. ` +
          `Valid types: 'string' | 'number' | 'boolean'. Defaulting to 'string'.`
        );
      }

      // Validate enum field if present
      if (metadata.enum && (!Array.isArray(metadata.enum) || metadata.enum.length === 0)) {
        console.warn(
          `Prompt '${name}': Argument '${argName}' has invalid enum definition. ` +
          `Expected non-empty array of strings. Enum validation will be skipped.`
        );
      }
    }
  }

  // Build MCP-compliant argument definitions with defaults applied
  let promptArgs: Array<{ name: string; description: string; required: boolean }> = [];

  if (argsMetadata) {
    promptArgs = Object.entries(argsMetadata).map(([argName, metadata]) => ({
      name: argName,
      description: metadata.description || `Argument: ${argName}`,
      required: metadata.required ?? true,  // Apply default: true
    }));
  }

  // Register the prompt with a function template
  // The function will be called at runtime when prompts/get is requested
  server.addPrompt({
    name,
    description: description || `Prompt: ${name}`,
    arguments: promptArgs,
    template: (args, context) => {
      // Call the method on the server instance with args only
      // (interface-style methods don't receive context parameter)
      return method.call(serverInstance, args);
    },
    ...(hidden !== undefined && { hidden }),
  });
}

/**
 * Register all prompts with the MCP server
 * All prompts now require implementation (no static/dynamic distinction)
 */
export function registerPrompts(
  server: BuildMCPServer,
  serverInstance: any,
  prompts: ParsedPrompt[],
  verbose?: boolean
): void {
  for (const prompt of prompts) {
    if (verbose) {
      console.log(`[Interface Adapter] Registering prompt: ${prompt.name}`);
    }

    registerPrompt(server, serverInstance, prompt);
  }
}
