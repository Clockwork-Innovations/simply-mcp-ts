/**
 * Simple validation utilities for wizard inputs
 *
 * Philosophy: Tools check FORMAT and STRUCTURE, not CONTENT
 * The LLM handles semantic validation and corrections
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate server name format
 *
 * Rules:
 * - Must be kebab-case (lowercase-with-hyphens)
 * - Only alphanumeric and hyphens
 * - Cannot start or end with hyphen
 */
export function validateServerName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Server name is required'
    };
  }

  // Check for kebab-case format
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(name)) {
    return {
      valid: false,
      error: `Server name must be in kebab-case format (e.g., "my-server")\n` +
             `Got: "${name}"\n` +
             `Fix: Use only lowercase letters, numbers, and hyphens (no spaces, underscores, or capital letters)`
    };
  }

  return { valid: true };
}

/**
 * Validate semver version format
 *
 * Rules:
 * - Must follow semver format: MAJOR.MINOR.PATCH
 * - Each part must be a number
 */
export function validateVersion(version: string): ValidationResult {
  if (!version || version.trim().length === 0) {
    return {
      valid: false,
      error: 'Version is required'
    };
  }

  // Check semver format
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    return {
      valid: false,
      error: `Version must follow semver format: MAJOR.MINOR.PATCH\n` +
             `Got: "${version}"\n` +
             `Fix: Use format like "1.0.0", "0.1.0", or "2.3.4"`
    };
  }

  return { valid: true };
}

/**
 * Validate tool name format
 *
 * Rules:
 * - Must be kebab-case
 * - Should be descriptive verb-noun format
 */
export function validateToolName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Tool name is required'
    };
  }

  // Check for kebab-case format
  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(name)) {
    return {
      valid: false,
      error: `Tool name must be in kebab-case format (e.g., "calculate-tip")\n` +
             `Got: "${name}"\n` +
             `Fix: Use only lowercase letters, numbers, and hyphens`
    };
  }

  return { valid: true };
}

/**
 * Validate parameters array structure
 *
 * Rules:
 * - Must be an array
 * - Each parameter must have required fields
 * - Parameter names must be snake_case
 */
export function validateParameters(params: any): ValidationResult {
  if (!Array.isArray(params)) {
    return {
      valid: false,
      error: `Parameters must be an array of parameter objects\n` +
             `Got: ${typeof params}\n` +
             `Fix: Provide an array like [{ name: "param1", type: "string", ... }]`
    };
  }

  if (params.length === 0) {
    return {
      valid: false,
      error: 'At least one parameter is required (or use empty object for no parameters)'
    };
  }

  // Validate each parameter
  for (let i = 0; i < params.length; i++) {
    const param = params[i];

    // Check required fields
    if (!param.name || typeof param.name !== 'string') {
      return {
        valid: false,
        error: `Parameter at index ${i} missing required field "name" (string)\n` +
               `Fix: Add name: "parameter_name"`
      };
    }

    if (!param.type || typeof param.type !== 'string') {
      return {
        valid: false,
        error: `Parameter "${param.name}" missing required field "type" (string)\n` +
               `Fix: Add type: "string" | "number" | "boolean" | "array" | "object"`
      };
    }

    if (!param.description || typeof param.description !== 'string') {
      return {
        valid: false,
        error: `Parameter "${param.name}" missing required field "description" (string)\n` +
               `Fix: Add description: "Clear description for AI agents"`
      };
    }

    if (typeof param.required !== 'boolean') {
      return {
        valid: false,
        error: `Parameter "${param.name}" missing required field "required" (boolean)\n` +
               `Fix: Add required: true or required: false`
      };
    }

    // Check name format (snake_case)
    const snakeRegex = /^[a-z][a-z0-9_]*$/;
    if (!snakeRegex.test(param.name)) {
      return {
        valid: false,
        error: `Parameter name "${param.name}" must be in snake_case format\n` +
               `Fix: Use lowercase letters, numbers, and underscores (e.g., "bill_amount")`
      };
    }

    // Validate type
    const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'any'];
    if (!validTypes.includes(param.type)) {
      return {
        valid: false,
        error: `Parameter "${param.name}" has invalid type "${param.type}"\n` +
               `Fix: Use one of: ${validTypes.join(', ')}`
      };
    }
  }

  return { valid: true };
}
