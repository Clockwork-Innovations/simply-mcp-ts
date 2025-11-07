/**
 * Validation Compiler
 *
 * Validates that interface definitions follow v4.0 patterns and constraints.
 * Includes IParam validation and implementation validation for auto-discovery.
 */

import * as ts from 'typescript';
import type { ParseResult } from './types.js';

/**
 * Validate implementations and their links to interfaces
 * Ensures every interface has implementation and vice versa (Phase 2B)
 */
export function validateImplementations(result: ParseResult): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.implementations) {
    result.implementations = [];
  }

  // Step 1: Check that every tool/prompt/resource interface has an implementation
  for (const tool of result.tools) {
    const hasImpl = result.implementations.some(
      impl => impl.helperType === 'ToolHelper' && impl.interfaceName === tool.interfaceName
    );

    if (!hasImpl) {
      const exampleName = tool.methodName; // camelCase version
      errors.push(
        `Tool '${tool.interfaceName}' defined but not implemented.\n` +
        `  Add one of:\n` +
        `    • Bare interface: const ${exampleName}: ${tool.interfaceName} = async (params) => { ... }\n` +
        `    • Helper wrapper: const ${exampleName}: ToolHelper<${tool.interfaceName}> = async (params) => { ... }`
      );
    }
  }

  for (const prompt of result.prompts) {
    const hasImpl = result.implementations.some(
      impl => impl.helperType === 'PromptHelper' && impl.interfaceName === prompt.interfaceName
    );

    if (!hasImpl) {
      const exampleName = prompt.methodName;
      errors.push(
        `Prompt '${prompt.interfaceName}' defined but not implemented.\n` +
        `  Add one of:\n` +
        `    • Bare interface: const ${exampleName}: ${prompt.interfaceName} = async (args) => { ... }\n` +
        `    • Helper wrapper: const ${exampleName}: PromptHelper<${prompt.interfaceName}> = async (args) => { ... }`
      );
    }
  }

  for (const resource of result.resources) {
    // Only check dynamic resources
    if (resource.dynamic) {
      const hasImpl = result.implementations.some(
        impl => impl.helperType === 'ResourceHelper' && impl.interfaceName === resource.interfaceName
      );

      if (!hasImpl) {
        const exampleName = resource.methodName;
        errors.push(
          `Resource '${resource.interfaceName}' defined but not implemented.\n` +
          `  Add one of:\n` +
          `    • Bare interface: const ${exampleName}: ${resource.interfaceName} = async () => { ... }\n` +
          `    • Helper wrapper: const ${exampleName}: ResourceHelper<${resource.interfaceName}> = async () => { ... }`
        );
      }
    }
  }

  // Step 2: Check that every implementation has a matching interface
  for (const impl of result.implementations) {
    let found = false;

    if (impl.helperType === 'ToolHelper') {
      found = result.tools.some(t => t.interfaceName === impl.interfaceName);
      if (!found) {
        errors.push(
          `Implementation '${impl.name}' references unknown tool interface '${impl.interfaceName}'.\n` +
          `  Define: interface ${impl.interfaceName} extends ITool { ... }`
        );
      }
    } else if (impl.helperType === 'PromptHelper') {
      found = result.prompts.some(p => p.interfaceName === impl.interfaceName);
      if (!found) {
        errors.push(
          `Implementation '${impl.name}' references unknown prompt interface '${impl.interfaceName}'.\n` +
          `  Define: interface ${impl.interfaceName} extends IPrompt { ... }`
        );
      }
    } else if (impl.helperType === 'ResourceHelper') {
      found = result.resources.some(r => r.interfaceName === impl.interfaceName);
      if (!found) {
        errors.push(
          `Implementation '${impl.name}' references unknown resource interface '${impl.interfaceName}'.\n` +
          `  Define: interface ${impl.interfaceName} extends IResource { ... }`
        );
      }
    }
  }

  // Step 3: Check that classes with implementations have instantiation
  const classImplementations = result.implementations.filter(impl => impl.kind === 'class-property');
  const classNamesWithImpls = new Set(classImplementations.map(impl => impl.className!));

  for (const className of classNamesWithImpls) {
    const hasInstance = result.instances?.some(inst => inst.className === className);

    if (!hasInstance) {
      const lowerCaseName = className.charAt(0).toLowerCase() + className.slice(1);
      errors.push(
        `Class '${className}' has tool/prompt/resource implementations but is not instantiated.\n` +
        `  Add: const ${lowerCaseName} = new ${className}();`
      );
    }
  }

  // Step 4: Add warnings for unused instances (class instantiated but no implementations found)
  if (result.instances) {
    for (const instance of result.instances) {
      const hasImpls = result.implementations.some(
        impl => impl.kind === 'class-property' && impl.className === instance.className
      );

      if (!hasImpls) {
        warnings.push(
          `Class instance '${instance.instanceName}' (${instance.className}) created but has no tool/prompt/resource implementations.\n` +
          `  Either add implementations to ${instance.className} or remove the instance.`
        );
      }
    }
  }

  // Add errors to result
  if (errors.length > 0) {
    if (!result.validationErrors) {
      result.validationErrors = [];
    }
    result.validationErrors.push(...errors);
  }

  // Note: We don't fail on warnings, just add them for informational purposes
  // You could add a result.validationWarnings field if desired
}

/**
 * Validate that params use IParam interfaces (not plain TypeScript types)
 * Each parameter must have a description property (minimum requirement)
 */
export function validateParamsUseIParam(
  paramsNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  interfaceName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!paramsNode) {
    return { valid: true, errors: [] }; // No params is fine
  }

  // Check if params is a TypeLiteral (object type like { name: string; age: number })
  if (ts.isTypeLiteralNode(paramsNode)) {
    for (const member of paramsNode.members) {
      if (ts.isPropertySignature(member) && member.type) {
        const paramName = member.name?.getText(sourceFile) || 'unknown';
        const paramType = member.type;

        // CRITICAL: Check for inline IParam intersection (& IParam)
        // This pattern does NOT work with type coercion - it's a known bug
        if (ts.isIntersectionTypeNode(paramType)) {
          // Check if one of the intersection types is IParam or a reference to IParam
          const hasIParam = paramType.types.some(type => {
            if (ts.isTypeReferenceNode(type)) {
              const typeName = type.typeName.getText(sourceFile);
              return typeName === 'IParam';
            }
            return false;
          });

          if (hasIParam) {
            const paramTypeText = paramType.getText(sourceFile);
            errors.push(
              `❌ CRITICAL ERROR: Parameter '${paramName}' in ${interfaceName} uses inline IParam intersection.\n` +
              `\n` +
              `  Current (BROKEN - type coercion fails):\n` +
              `    params: { ${paramName}: ${paramTypeText} }\n` +
              `\n` +
              `  Why this fails:\n` +
              `    • The schema generator does NOT support intersection types (& IParam)\n` +
              `    • Number/boolean parameters will be received as STRINGS\n` +
              `    • Arithmetic operations will fail silently (e.g., 42 + 58 = "4258")\n` +
              `    • This is a known framework limitation\n` +
              `\n` +
              `  ✅ REQUIRED FIX - Use separate interface:\n` +
              `    interface ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param extends IParam {\n` +
              `      type: 'number';  // or 'string', 'boolean', etc.\n` +
              `      description: 'Description of ${paramName}';\n` +
              `      // Add any validation constraints here\n` +
              `    }\n` +
              `\n` +
              `    params: { ${paramName}: ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param }\n` +
              `\n` +
              `  📚 See examples/interface-params.ts for correct patterns.`
            );
            continue; // Skip other checks for this parameter
          }
        }

        // Check if the parameter type references an interface (good)
        // vs. using a primitive type directly (bad)
        const isDirectType =
          paramType.kind === ts.SyntaxKind.StringKeyword ||
          paramType.kind === ts.SyntaxKind.NumberKeyword ||
          paramType.kind === ts.SyntaxKind.BooleanKeyword ||
          paramType.kind === ts.SyntaxKind.AnyKeyword ||
          ts.isArrayTypeNode(paramType) ||    // string[], number[]
          ts.isUnionTypeNode(paramType) ||    // 'a' | 'b'
          ts.isLiteralTypeNode(paramType);    // 'literal'

        if (isDirectType) {
          errors.push(
            `ERROR: Parameter '${paramName}' in ${interfaceName} uses a direct type instead of IParam.\n` +
            `  Current: params: { ${paramName}: ${paramType.getText(sourceFile)} }\n` +
            `  Required: params: { ${paramName}: ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param }\n` +
            `\n` +
            `  Fix: Define a parameter interface:\n` +
            `  interface ${paramName.charAt(0).toUpperCase() + paramName.slice(1)}Param extends IParam {\n` +
            `    type: '${getIParamTypeFromTS(paramType)}';\n` +
            `    description: 'Description of ${paramName}';\n` +
            `  }\n` +
            `\n` +
            `  Why: IParam interfaces provide:\n` +
            `  - Required 'description' field for LLM documentation\n` +
            `  - Validation constraints (min/max, minLength/maxLength, pattern, etc.)\n` +
            `  - Better JSON Schema generation for tool calls\n` +
            `\n` +
            `  See examples/interface-params.ts for complete examples.`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Helper to suggest IParam type from TypeScript type
 */
export function getIParamTypeFromTS(typeNode: ts.TypeNode): string {
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText();
    if (typeName === 'Array' || typeName.endsWith('[]')) return 'array';
  }
  if (ts.isArrayTypeNode(typeNode)) return 'array';

  const typeText = typeNode.getText();
  if (typeText === 'string') return 'string';
  if (typeText === 'number') return 'number';
  if (typeText === 'boolean') return 'boolean';
  if (/^\d+$/.test(typeText)) return 'integer';

  return 'string';
}

/**
 * Extract and validate tool annotations from an AST type node
 */
export function extractAnnotationsFromType(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
  interfaceName: string,
  validationErrors: string[]
): any | undefined {
  // Annotations must be an object literal type
  if (!ts.isTypeLiteralNode(typeNode)) {
    validationErrors.push(
      `Tool '${interfaceName}': annotations must be an object literal type`
    );
    return undefined;
  }

  const annotations: any = {};

  // Extract each property from the type literal
  for (const member of typeNode.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sourceFile);
      const propType = member.type;

      // Extract literal values
      if (ts.isLiteralTypeNode(propType)) {
        const literal = propType.literal;
        if (ts.isStringLiteral(literal)) {
          annotations[propName] = literal.text;
        } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
          annotations[propName] = true;
        } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
          annotations[propName] = false;
        } else if (ts.isNumericLiteral(literal)) {
          annotations[propName] = Number(literal.text);
        }
      }
      // Handle boolean true/false keywords directly
      else if (propType.kind === ts.SyntaxKind.TrueKeyword) {
        annotations[propName] = true;
      } else if (propType.kind === ts.SyntaxKind.FalseKeyword) {
        annotations[propName] = false;
      }
    }
  }

  // Validate annotations
  validateAnnotations(annotations, interfaceName, validationErrors);

  return Object.keys(annotations).length > 0 ? annotations : undefined;
}

/**
 * Validate tool annotations according to business rules
 */
export function validateAnnotations(
  annotations: any,
  interfaceName: string,
  validationErrors: string[]
): void {
  // Rule 1: Mutual exclusivity - readOnlyHint: true + destructiveHint: true → ERROR
  if (annotations.readOnlyHint === true && annotations.destructiveHint === true) {
    validationErrors.push(
      `Tool '${interfaceName}' cannot be both readOnlyHint and destructiveHint. ` +
      `A read-only tool cannot perform destructive operations.`
    );
  }

  // Rule 2: Enum validation - estimatedDuration must be 'fast' | 'medium' | 'slow'
  if (annotations.estimatedDuration !== undefined) {
    const validDurations = ['fast', 'medium', 'slow'];
    if (!validDurations.includes(annotations.estimatedDuration)) {
      validationErrors.push(
        `Tool '${interfaceName}': Invalid estimatedDuration '${annotations.estimatedDuration}'. ` +
        `Must be one of: ${validDurations.map(d => `'${d}'`).join(', ')}`
      );
    }
  }

  // Rule 3: Type checking - Boolean fields must be boolean
  const booleanFields = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint', 'requiresConfirmation'];
  for (const field of booleanFields) {
    if (annotations[field] !== undefined && typeof annotations[field] !== 'boolean') {
      validationErrors.push(
        `Tool '${interfaceName}': Field '${field}' must be a boolean value (true or false), ` +
        `got '${annotations[field]}'`
      );
    }
  }

  // Rule 4: String fields validation
  if (annotations.title !== undefined && typeof annotations.title !== 'string') {
    validationErrors.push(
      `Tool '${interfaceName}': Field 'title' must be a string, got '${annotations.title}'`
    );
  }

  if (annotations.category !== undefined && typeof annotations.category !== 'string') {
    validationErrors.push(
      `Tool '${interfaceName}': Field 'category' must be a string, got '${annotations.category}'`
    );
  }

  // Rule 5: Unknown fields are allowed (custom metadata) but warn about them
  const knownFields = [
    'title', 'readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint',
    'requiresConfirmation', 'category', 'estimatedDuration'
  ];
  for (const field of Object.keys(annotations)) {
    if (!knownFields.includes(field)) {
      console.warn(
        `\n⚠️  WARNING: Tool '${interfaceName}' has unknown annotation field '${field}'. ` +
        `This will be treated as custom metadata.\n`
      );
    }
  }
}
