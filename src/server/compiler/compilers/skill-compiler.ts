/**
 * Skill Interface Compiler
 *
 * Compiles ISkill interfaces into ParsedSkill metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedSkill, ParsedResource } from '../types.js';
import { snakeToCamel } from '../utils.js';

/**
 * Compile an ISkill interface into ParsedSkill metadata
 */
export function compileSkillInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  validationErrors: string[]
): ParsedSkill | null {
  const interfaceName = node.name.text;
  let name = '';
  let description = '';
  let returnsType = 'string';
  let returnsNode: ts.TypeNode | undefined;
  let hidden: boolean | undefined;
  let hiddenIsDynamic: boolean | undefined;

  // Flat structure fields
  let skill: string | undefined;
  let tools: string[] | undefined;
  let resources: string[] | undefined;
  let prompts: string[] | undefined;
  let sampling: object | undefined;

  // Track what's present
  let hasSkill = false;
  let hasFlatArrays = false;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'skill' && member.type) {
        hasSkill = true;
        skill = extractStringLiteral(member.type, sourceFile);
      } else if (memberName === 'tools' && member.type) {
        hasFlatArrays = true;
        tools = parseStringArray(member.type, sourceFile);
      } else if (memberName === 'resources' && member.type) {
        hasFlatArrays = true;
        resources = parseStringArray(member.type, sourceFile);
      } else if (memberName === 'prompts' && member.type) {
        hasFlatArrays = true;
        prompts = parseStringArray(member.type, sourceFile);
      } else if (memberName === 'sampling' && member.type) {
        // Parse sampling as object (we'll just store it as-is for now)
        sampling = parseSamplingObject(member.type, sourceFile);
      } else if (memberName === 'hidden' && member.type) {
        // Check if it's a static boolean literal
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            hidden = true;
            hiddenIsDynamic = false;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            hidden = false;
            hiddenIsDynamic = false;
          }
        } else {
          // It's a function type or other complex type - dynamic
          hidden = undefined; // Cannot extract function at compile time
          hiddenIsDynamic = true;
        }
      }
    }
  }

  // Validate mutual exclusivity: skill XOR flat arrays
  const hasManualContent = hasSkill;
  const hasAutoGen = hasFlatArrays;

  if (hasManualContent && hasAutoGen) {
    validationErrors.push(
      `Skill interface '${interfaceName}' has both manual content and auto-generation fields.\n` +
      `These are mutually exclusive - use one OR the other:\n` +
      `  - Manual: Use 'skill' field with markdown string\n` +
      `  - Auto-gen: Use 'tools', 'resources', or 'prompts' arrays\n\n` +
      `To fix: Remove either the manual content field or the component arrays.`
    );
    return null;
  }

  if (!hasManualContent && !hasAutoGen) {
    validationErrors.push(
      `Skill interface '${interfaceName}' must have either manual content or auto-generation fields.\n` +
      `  - Manual: skill: string;  // For custom documentation\n` +
      `  - Auto-gen: tools: ['tool1', 'tool2'];  // Component arrays\n\n` +
      `Example:\n` +
      `  skill: \`# My Skill\\n...\`;  // Manual\n` +
      `  OR\n` +
      `  tools: ['tool1'];  // Auto-gen`
    );
    return null;
  }

  // Validate required fields
  if (!name) {
    validationErrors.push(
      `Skill interface '${interfaceName}' is missing required 'name' field.\n` +
      `Skills must have a name in snake_case format (e.g., 'weather_analysis').`
    );
    return null;
  }

  if (!description) {
    validationErrors.push(
      `Skill interface '${interfaceName}' is missing required 'description' field.\n` +
      `Skills must have a description that acts as a trigger phrase for LLMs.`
    );
    return null;
  }

  // Validate name format (snake_case)
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    validationErrors.push(
      `Skill '${name}' has invalid name format.\n` +
      `Skill names must be in snake_case (lowercase with underscores).\n` +
      `Example: 'weather_analysis', 'typescript_debugging'`
    );
    return null;
  }


  // Derive method name from skill name (snake_case → camelCase)
  // e.g., 'weather_analysis' → 'weatherAnalysis'
  const methodName = snakeToCamel(name);

  // Generate MCP resource fields
  const uri = `skill://${name}`;
  const mimeType = 'text/markdown';

  return {
    interfaceName,
    name,
    description,
    methodName,
    returnsType,
    returnsNode,
    hidden,
    hiddenIsDynamic,
    uri,
    mimeType,
    skill,
    tools,
    resources,
    prompts,
    sampling,
    isAutoGenerated: hasAutoGen,
  };
}

/**
 * Extract string literal value from a type node
 */
function extractStringLiteral(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string | undefined {
  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return typeNode.literal.text;
  }
  // Handle template literals (backtick strings)
  if (ts.isTemplateLiteralTypeNode(typeNode) && typeNode.kind === ts.SyntaxKind.TemplateLiteralType) {
    // For simple template literals with no substitutions
    const head = (typeNode as any).head;
    if (head && head.text !== undefined) {
      return head.text;
    }
  }
  return undefined;
}

/**
 * Extract array of string literals from a type node
 */
function extractStringArrayLiteral(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string[] | undefined {
  // Handle tuple type: ['str1', 'str2', ...]
  if (ts.isTupleTypeNode(typeNode)) {
    const values: string[] = [];
    for (const element of typeNode.elements) {
      const value = extractStringLiteral(element, sourceFile);
      if (value !== undefined) {
        values.push(value);
      }
    }
    return values.length > 0 ? values : undefined;
  }
  return undefined;
}


/**
 * Parse string array type (string[] or tuple of string literals)
 */
function parseStringArray(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string[] | undefined {
  // Case 1: string[] type
  if (ts.isArrayTypeNode(typeNode)) {
    // Cannot extract values at compile time - return empty array to indicate presence
    return [];
  }

  // Case 2: Tuple of literals: ['a', 'b', 'c']
  if (ts.isTupleTypeNode(typeNode)) {
    const values: string[] = [];
    for (const element of typeNode.elements) {
      if (ts.isLiteralTypeNode(element) && ts.isStringLiteral(element.literal)) {
        values.push(element.literal.text);
      }
    }
    return values.length > 0 ? values : undefined;
  }

  return undefined;
}

/**
 * Parse sampling object type
 * For now, just return a placeholder object since we can't extract the full object at compile time
 */
function parseSamplingObject(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): object | undefined {
  // Check if it's a type literal (object type)
  if (ts.isTypeLiteralNode(typeNode)) {
    // Return a placeholder - actual values will come from runtime
    return {};
  }
  return undefined;
}

