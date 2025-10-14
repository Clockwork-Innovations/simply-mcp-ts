/**
 * Validation utilities for Class Wrapper Wizard
 *
 * Reuses validation from the existing wizard validators
 */

export { validateServerName, validateVersion } from '../wizard/validators.js';

/**
 * Validate method description
 */
export function validateMethodDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  if (!description || description.trim().length === 0) {
    return {
      valid: false,
      error: 'Description is required',
    };
  }

  if (description.trim().length < 10) {
    return {
      valid: false,
      error: `Description too short: "${description}"\n` +
             `Tool descriptions must be at least 10 characters long.\n` +
             `Provide a clear, descriptive tool description.`,
    };
  }

  return { valid: true };
}
