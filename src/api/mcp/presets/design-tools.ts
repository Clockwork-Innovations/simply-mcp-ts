/**
 * Design Tools Preset - Foundation Layer
 *
 * Tools for designing MCP tools and Zod schemas.
 * These tools help agents iteratively design high-quality MCP tools.
 *
 * @module api/mcp/presets/design-tools
 */

import { z } from 'zod';
import type { ToolPreset } from '../types.js';

/**
 * Design Tools Preset
 *
 * Provides tools for:
 * - Interactive tool design
 * - Zod schema generation
 * - Schema validation
 *
 * Foundation layer includes 3 essential tools.
 */
export const DesignToolsPreset: ToolPreset = {
  name: 'Design Tools',
  description: 'Tools for designing MCP tools and Zod schemas',
  tools: [
    {
      name: 'design_tool',
      description: 'Interactive assistant for designing MCP tools. Guides through tool conceptualization by asking about purpose, inputs, outputs, and edge cases. Returns structured tool design with recommendations.',
      category: 'design',
      parameters: z.object({
        purpose: z.string().describe('What the tool should accomplish. Be specific about the use case.'),
        expected_inputs: z.string().optional().describe('Description of what inputs the tool should accept'),
        expected_outputs: z.string().optional().describe('Description of what the tool should return'),
        edge_cases: z.string().optional().describe('Any edge cases or error conditions to consider')
      }),
      execute: async (args) => {
        // Build structured tool design
        const design = {
          tool_name: args.purpose.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          description: args.purpose,
          parameters: {
            suggestion: args.expected_inputs || 'Define input parameters based on tool purpose',
            schema_type: 'z.object({ ... })',
          },
          result_type: {
            suggestion: args.expected_outputs || 'Define return type based on tool purpose',
            format: 'string | object | HandlerResult'
          },
          considerations: {
            validation: 'Consider input validation using Zod refinements',
            error_handling: args.edge_cases || 'Define error cases and validation rules',
            description_clarity: 'Ensure description is clear for AI agents to understand',
            parameter_descriptions: 'Add .describe() to all schema fields for agent context'
          },
          next_steps: [
            '1. Refine the tool name (use snake_case)',
            '2. Create Zod schema using create_zod_schema tool',
            '3. Implement execute function with proper error handling',
            '4. Validate design using validate_schema tool',
            '5. Generate test cases for the tool'
          ],
          anthropic_principles: {
            strategic_selection: 'Is this tool necessary? Could existing tools be combined?',
            clear_naming: 'Use descriptive, unambiguous tool names',
            token_efficiency: 'Return only relevant information, avoid verbosity',
            flexible_formats: 'Consider supporting multiple output formats if appropriate'
          }
        };

        return JSON.stringify(design, null, 2);
      },
      examples: [
        {
          input: {
            purpose: 'Send email notifications',
            expected_inputs: 'recipient email, subject, message body',
            expected_outputs: 'success confirmation with message ID',
            edge_cases: 'invalid email format, missing required fields, email service errors'
          },
          output: '{ tool_name: "send_email", description: "...", parameters: {...}, ... }',
          description: 'Design an email notification tool'
        }
      ]
    },
    {
      name: 'create_zod_schema',
      description: 'Generate Zod schema code from TypeScript type definitions or natural language descriptions. Returns ready-to-use Zod schema code with proper validation and descriptions.',
      category: 'design',
      parameters: z.object({
        description: z.string().describe('Natural language description of the schema OR TypeScript type definition'),
        schema_name: z.string().optional().describe('Name for the schema (optional, for documentation)'),
        strict: z.boolean().optional().default(false).describe('Whether to use strict validation (no extra keys allowed)')
      }),
      execute: async (args) => {
        // Parse description and generate Zod schema
        const lines = args.description.split('\n');
        const fields: string[] = [];

        // Simple heuristic: look for field patterns
        // Format: "fieldName: type" or "- fieldName (type): description"
        for (const line of lines) {
          const trimmed = line.trim();

          // Pattern: "fieldName: string"
          const colonMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)/);
          if (colonMatch) {
            const [, fieldName, fieldType] = colonMatch;
            const zodType = mapTypeToZod(fieldType);
            fields.push(`  ${fieldName}: ${zodType}.describe('${fieldName}')`);
            continue;
          }

          // Pattern: "- fieldName (string): description" or "fieldName (string) - description"
          const dashMatch = trimmed.match(/^-?\s*(\w+)\s*\(([^)]+)\)\s*:?\s*-?\s*(.*)/);
          if (dashMatch) {
            const [, fieldName, fieldType, desc] = dashMatch;
            const zodType = mapTypeToZod(fieldType);
            const description = desc || fieldName;
            fields.push(`  ${fieldName}: ${zodType}.describe('${description}')`);
          }
        }

        // If no fields found, provide a template
        if (fields.length === 0) {
          fields.push('  // Define your schema fields here');
          fields.push('  // Example: name: z.string().describe("User name")');
        }

        const schemaCode = args.strict
          ? `z.object({\n${fields.join(',\n')}\n}).strict()`
          : `z.object({\n${fields.join(',\n')}\n})`;

        const result = {
          schema_code: schemaCode,
          usage_example: args.schema_name
            ? `const ${args.schema_name}Schema = ${schemaCode};`
            : `const parametersSchema = ${schemaCode};`,
          notes: [
            'Import zod: import { z } from "zod"',
            'Add .optional() for optional fields',
            'Use .refine() for custom validation',
            'Chain .min(), .max(), .email(), etc. for specific validations',
          ],
          next_steps: [
            'Review generated schema for accuracy',
            'Add custom validation with .refine() if needed',
            'Test schema with sample data',
            'Use in tool definition parameters field'
          ]
        };

        return JSON.stringify(result, null, 2);
      },
      examples: [
        {
          input: {
            description: 'email: string\nage: number\nactive: boolean',
            schema_name: 'User',
            strict: true
          },
          output: '{ schema_code: "z.object({...}).strict()", usage_example: "...", ... }',
          description: 'Generate schema from type definition'
        }
      ]
    },
    {
      name: 'validate_schema',
      description: 'Validate a Zod schema definition for quality, completeness, and best practices. Checks for proper descriptions, validation rules, and common issues. Returns validation report with suggestions.',
      category: 'design',
      parameters: z.object({
        schema_code: z.string().describe('Zod schema code to validate (as string)'),
        context: z.string().optional().describe('Context about what this schema is for')
      }),
      execute: async (args) => {
        const issues: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        const code = args.schema_code;

        // Check for describe() calls
        if (!code.includes('.describe(')) {
          issues.push('Schema fields lack .describe() calls - agents need field descriptions for context');
        }

        // Check for validation methods
        const hasValidation = /\.(min|max|email|url|regex|refine|transform|length|positive|negative)\(/.test(code);
        if (!hasValidation) {
          warnings.push('No validation methods found - consider adding .min(), .max(), .email(), etc.');
        }

        // Check for strict mode consideration
        if (!code.includes('.strict()') && !code.includes('passthrough')) {
          suggestions.push('Consider using .strict() to reject unknown keys, or .passthrough() to allow them explicitly');
        }

        // Check for optional fields
        const hasOptional = code.includes('.optional()');
        if (!hasOptional) {
          warnings.push('No optional fields found - confirm all fields are truly required');
        }

        // Check for default values
        const hasDefaults = code.includes('.default(');
        if (!hasDefaults && hasOptional) {
          suggestions.push('Consider using .default() for optional fields to provide sensible defaults');
        }

        // Check for complex types
        const hasUnion = code.includes('z.union') || code.includes('z.discriminatedUnion');
        const hasArray = code.includes('z.array');
        const hasNested = /z\.object\([^)]*z\.object/.test(code);

        if (hasUnion || hasArray || hasNested) {
          suggestions.push('Complex schema detected - ensure nested/union types have clear descriptions');
        }

        const result = {
          valid: issues.length === 0,
          score: Math.max(0, 100 - (issues.length * 30) - (warnings.length * 10)),
          issues: issues.length > 0 ? issues : ['No critical issues found'],
          warnings: warnings.length > 0 ? warnings : ['No warnings'],
          suggestions: suggestions.length > 0 ? suggestions : ['Schema looks good!'],
          best_practices: {
            descriptions: code.includes('.describe(') ? '✓ Has field descriptions' : '✗ Missing field descriptions',
            validation: hasValidation ? '✓ Includes validation rules' : '○ Could add more validation',
            optionality: hasOptional ? '✓ Has optional fields' : '○ All fields required',
            defaults: hasDefaults ? '✓ Uses default values' : '○ Could add defaults',
          },
          anthropic_alignment: {
            clear_intent: code.includes('.describe(') ? 'Good - descriptions help agents understand intent' : 'Needs improvement - add descriptions',
            validation: hasValidation ? 'Good - validation prevents errors' : 'Could improve - add validation rules',
            flexibility: hasOptional ? 'Good - optional fields provide flexibility' : 'Could improve - consider optional fields'
          }
        };

        return JSON.stringify(result, null, 2);
      },
      examples: [
        {
          input: {
            schema_code: 'z.object({ name: z.string(), age: z.number() })',
            context: 'User registration form'
          },
          output: '{ valid: false, score: 70, issues: ["Missing descriptions"], ... }',
          description: 'Validate a simple schema'
        }
      ]
    }
  ]
};

/**
 * Helper function to map TypeScript types to Zod types
 */
function mapTypeToZod(type: string): string {
  const lowerType = type.toLowerCase();

  // Handle optional marker
  const isOptional = lowerType.includes('?');
  const baseType = lowerType.replace('?', '').trim();

  // Map common types
  let zodType: string;
  switch (baseType) {
    case 'string':
      zodType = 'z.string()';
      break;
    case 'number':
      zodType = 'z.number()';
      break;
    case 'boolean':
    case 'bool':
      zodType = 'z.boolean()';
      break;
    case 'date':
      zodType = 'z.date()';
      break;
    case 'any':
      zodType = 'z.any()';
      break;
    case 'unknown':
      zodType = 'z.unknown()';
      break;
    case 'email':
      zodType = 'z.string().email()';
      break;
    case 'url':
      zodType = 'z.string().url()';
      break;
    case 'uuid':
      zodType = 'z.string().uuid()';
      break;
    default:
      // Check for array notation
      if (baseType.endsWith('[]')) {
        const elementType = mapTypeToZod(baseType.slice(0, -2));
        zodType = `z.array(${elementType})`;
      } else {
        zodType = 'z.string()'; // default fallback
      }
  }

  return isOptional ? `${zodType}.optional()` : zodType;
}
