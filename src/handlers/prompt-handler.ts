/**
 * Prompt Template Handler
 *
 * Handles prompt template parsing, placeholder interpolation, and registration.
 * Supports both static prompts (pure template strings) and dynamic prompts (requiring implementation).
 */

import type { ParsedPrompt } from './parser.js';
import type { BuildMCPServer } from '../programmatic/BuildMCPServer.js';

/**
 * Parse args type string to generate argument definitions
 * Handles simple object types like "{ location: string; style?: string }"
 */
function parseArgsType(argsType: string): Array<{ name: string; description: string; required: boolean }> {
  const args: Array<{ name: string; description: string; required: boolean }> = [];

  // Simple regex to extract property names and optional markers
  // Matches: "propertyName:" or "propertyName?:"
  const propertyRegex = /(\w+)(\?)?:/g;
  let match;

  while ((match = propertyRegex.exec(argsType)) !== null) {
    const propertyName = match[1];
    const isOptional = !!match[2];

    args.push({
      name: propertyName,
      description: `Argument: ${propertyName}`,
      required: !isOptional,
    });
  }

  return args;
}

/**
 * Parse placeholder syntax from template string
 * Supports: {variable}, {variable ? 'text' : 'other'}
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  const regex = /\{(\w+)(?:\s*\?[^}]+)?\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1];
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }

  return placeholders;
}

/**
 * Interpolate template string with arguments
 * Supports simple placeholders: {name}, {location}
 * Supports conditional syntax: {includeExtended ? '- Extended forecast' : '- 3-day outlook'}
 */
export function interpolateTemplate(template: string, args: Record<string, any>): string {
  let result = template;

  // Replace conditional expressions: {variable ? 'true' : 'false'}
  result = result.replace(
    /\{(\w+)\s*\?\s*'([^']+)'\s*:\s*'([^']+)'\}/g,
    (_, variable, trueValue, falseValue) => {
      return args[variable] ? trueValue : falseValue;
    }
  );

  // Replace simple placeholders: {variable}
  result = result.replace(/\{(\w+)\}/g, (_, variable) => {
    const value = args[variable];
    return value !== undefined ? String(value) : `{${variable}}`;
  });

  return result;
}

/**
 * Register a static prompt with the MCP server
 */
export function registerStaticPrompt(
  server: BuildMCPServer,
  prompt: ParsedPrompt
): void {
  const { name, description, template } = prompt;

  if (!template) {
    throw new Error(
      `Static prompt "${name}" is missing template string. ` +
      `Add a 'template' property or set 'dynamic: true' and implement as a method.`
    );
  }

  // Extract placeholders from template
  const placeholders = extractPlaceholders(template);

  // Create prompt arguments definition
  const promptArgs = placeholders.map(placeholder => ({
    name: placeholder,
    description: `Argument: ${placeholder}`,
    required: !template.includes(`${placeholder}?`), // Optional if used with conditional
  }));

  // For static prompts, we create a simple template string
  // BuildMCPServer doesn't support template functions, so we use a placeholder approach
  // The template will be interpolated when the prompt is used
  server.addPrompt({
    name,
    description: description || `Prompt: ${name}`,
    arguments: promptArgs,
    template: template, // Store original template with placeholders
  });
}

/**
 * Register a dynamic prompt with the MCP server
 * Dynamic prompts require a method implementation on the server class
 */
export function registerDynamicPrompt(
  server: BuildMCPServer,
  serverInstance: any,
  prompt: ParsedPrompt
): void {
  const { name, description, methodName } = prompt;

  // Check if method exists on server instance
  const method = serverInstance[methodName];

  if (!method) {
    throw new Error(
      `Dynamic prompt "${name}" requires method "${methodName}" but it was not found on server class.\n` +
      `Expected: class implements { ${methodName}: ${prompt.interfaceName} }`
    );
  }

  if (typeof method !== 'function') {
    throw new Error(
      `Dynamic prompt "${name}" method "${methodName}" is not a function (found: ${typeof method})`
    );
  }

  // Parse args type to extract argument definitions
  const promptArgs = parseArgsType(prompt.argsType);

  // Register the prompt with a function template
  // The function will be called at runtime when prompts/get is requested
  server.addPrompt({
    name,
    description: description || `Prompt: ${name}`,
    arguments: promptArgs,
    template: (args) => {
      // Call the method on the server instance
      return method.call(serverInstance, args);
    },
  });
}

/**
 * Register all prompts (static and dynamic) with the MCP server
 */
export function registerPrompts(
  server: BuildMCPServer,
  serverInstance: any,
  prompts: ParsedPrompt[],
  verbose?: boolean
): void {
  for (const prompt of prompts) {
    if (verbose) {
      const type = prompt.dynamic ? 'dynamic' : 'static';
      console.log(`[Interface Adapter] Registering ${type} prompt: ${prompt.name}`);
    }

    if (prompt.dynamic) {
      registerDynamicPrompt(server, serverInstance, prompt);
    } else {
      registerStaticPrompt(server, prompt);
    }
  }
}
