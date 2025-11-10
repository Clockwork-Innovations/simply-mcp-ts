/**
 * TypeScript Type Declaration Generator for Tool Injection
 *
 * Converts MCP tool definitions (ITool/InternalTool) into TypeScript function declarations.
 * These declarations provide type safety when LLMs write TypeScript code calling tools.
 *
 * @example
 * ```typescript
 * // From ITool:
 * interface GetWeatherTool extends ITool {
 *   name: 'get_weather';
 *   params: { city: { type: 'string'; description: 'City name' } };
 *   result: { temp: number; conditions: string };
 * }
 *
 * // To TypeScript declaration:
 * declare function getWeather(params: { city: string }): Promise<{ temp: number; conditions: string }>;
 * ```
 */

import type { IParam } from '../../../server/types/params.js';
import type { ToolDefinition } from '../../../server/builder-types.js';

/**
 * Internal tool representation (from BuildMCPServer)
 *
 * This matches the InternalTool type in builder-types.ts
 */
export interface InternalTool {
  definition: ToolDefinition;
  jsonSchema: any;
}

/**
 * Generate TypeScript declarations for all server tools
 *
 * @param tools - Map of registered tools from server
 * @param excludeToolRunner - Exclude tool_runner to prevent recursion
 * @returns TypeScript declaration string ready for compilation
 *
 * @example
 * ```typescript
 * const tools = server.tools;
 * const declarations = generateTypeDeclarations(tools);
 * // Returns:
 * // declare function getWeather(params: { city: string }): Promise<WeatherResult>;
 * // declare function sendEmail(params: { to: string; body: string }): Promise<boolean>;
 * ```
 */
export function generateTypeDeclarations(
  tools: Map<string, InternalTool>,
  excludeToolRunner: boolean = true
): string {
  const declarations: string[] = [];

  for (const [toolName, tool] of tools) {
    // Skip tool_runner to prevent recursion
    if (excludeToolRunner && (toolName === 'tool_runner' || toolName === 'execute-code')) {
      continue;
    }

    const funcDeclaration = generateToolDeclaration(toolName, tool);
    declarations.push(funcDeclaration);
  }

  return declarations.join('\n\n');
}

/**
 * Generate TypeScript declaration for a single tool
 *
 * @param toolName - Tool name (snake_case)
 * @param tool - Internal tool definition
 * @returns TypeScript function declaration
 */
function generateToolDeclaration(toolName: string, tool: InternalTool): string {
  const funcName = snakeToCamel(toolName);
  const description = tool.definition.description || `Call ${toolName} tool`;

  // Extract params from JSON schema (pass full schema for required array)
  const paramsType = generateParamsType(tool.jsonSchema || {});

  // Result type defaults to 'any' (we don't have result metadata in current structure)
  const resultType = 'any';

  // Generate JSDoc comment
  const jsdoc = `/**\n * ${description}\n */`;

  // Generate function signature
  const signature = `declare function ${funcName}(params: ${paramsType}): Promise<${resultType}>;`;

  return `${jsdoc}\n${signature}`;
}

/**
 * Generate TypeScript type for tool parameters
 *
 * @param jsonSchema - Full JSON schema object with properties and required array
 * @returns TypeScript object type string
 */
function generateParamsType(jsonSchema: any): string {
  const properties = jsonSchema?.properties || {};
  const required = jsonSchema?.required || [];

  if (!properties || Object.keys(properties).length === 0) {
    return '{}';
  }

  const propertyTypes: string[] = [];

  for (const [key, schema] of Object.entries(properties)) {
    const isRequired = required.includes(key);
    const propType = jsonSchemaToTSType(schema);
    const description = (schema as any).description || '';

    // Add JSDoc for property if description exists
    const prop = description
      ? `  /** ${description} */\n  ${key}${isRequired ? '' : '?'}: ${propType};`
      : `  ${key}${isRequired ? '' : '?'}: ${propType};`;

    propertyTypes.push(prop);
  }

  return `{\n${propertyTypes.join('\n')}\n}`;
}

/**
 * Convert JSON Schema to TypeScript type string
 *
 * Handles JSON Schema from Zod's .toJsonSchema() output.
 * Supports primitives, arrays, objects, enums, and nested types.
 *
 * @param schema - JSON Schema object
 * @returns TypeScript type string
 */
function jsonSchemaToTSType(schema: any): string {
  // Handle enum first (anyOf with const values)
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const literals = schema.anyOf
      .filter((item: any) => item.const !== undefined)
      .map((item: any) => {
        const value = item.const;
        return typeof value === 'string' ? `'${value}'` : String(value);
      });

    if (literals.length > 0) {
      return literals.join(' | ');
    }
  }

  // Handle explicit enum array
  if (schema.enum && Array.isArray(schema.enum)) {
    const literals = schema.enum.map((v: any) =>
      typeof v === 'string' ? `'${v}'` : String(v)
    );
    return literals.join(' | ');
  }

  // Handle type field
  switch (schema.type) {
    case 'string':
      return 'string';

    case 'number':
    case 'integer':
      return 'number';

    case 'boolean':
      return 'boolean';

    case 'null':
      return 'null';

    case 'array':
      if (schema.items) {
        const itemType = jsonSchemaToTSType(schema.items);
        return `Array<${itemType}>`;
      }
      return 'Array<any>';

    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]) => {
            const required = schema.required && schema.required.includes(key);
            const propType = jsonSchemaToTSType(value);
            return `${key}${required ? '' : '?'}: ${propType}`;
          });
        return `{ ${props.join('; ')} }`;
      }
      // No properties defined - fallback to Record
      return 'Record<string, any>';

    default:
      // Unknown type - fallback to any
      return 'any';
  }
}

/**
 * Convert IParam to TypeScript type string (for direct IParam usage)
 *
 * Handles: primitives, arrays, objects, enums, nested types
 *
 * @param param - IParam definition
 * @returns TypeScript type string
 */
export function convertParamToTSType(param: IParam): string {
  // Handle enum first (literal union)
  if (param.enum && param.enum.length > 0) {
    const literals = param.enum.map(v =>
      typeof v === 'string' ? `'${v}'` : String(v)
    );
    return literals.join(' | ');
  }

  // Handle type field
  switch (param.type) {
    case 'string':
      return 'string';

    case 'number':
    case 'integer':
      return 'number';

    case 'boolean':
      return 'boolean';

    case 'null':
      return 'null';

    case 'array':
      if (param.items) {
        const itemType = convertParamToTSType(param.items as IParam);
        return `Array<${itemType}>`;
      }
      return 'Array<any>';

    case 'object':
      if (param.properties) {
        const props = Object.entries(param.properties as Record<string, IParam>)
          .map(([key, value]) => {
            const optional = value.required === false;
            const propType = convertParamToTSType(value);
            return `${key}${optional ? '?' : ''}: ${propType}`;
          });
        return `{ ${props.join('; ')} }`;
      }
      // No properties defined - fallback to Record
      return 'Record<string, any>';

    default:
      // Unknown type - fallback to any
      return 'any';
  }
}

/**
 * Convert snake_case to camelCase
 *
 * @example
 * ```typescript
 * snakeToCamel('get_weather') // 'getWeather'
 * snakeToCamel('send_email') // 'sendEmail'
 * snakeToCamel('get_user_by_id') // 'getUserById'
 * ```
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case (for reverse lookup)
 *
 * @example
 * ```typescript
 * camelToSnake('getWeather') // 'get_weather'
 * camelToSnake('sendEmail') // 'send_email'
 * camelToSnake('getUserById') // 'get_user_by_id'
 * ```
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
