/**
 * Interface-Driven API - IParam Example
 *
 * Demonstrates using IParam for structured parameter definitions with
 * descriptions, validation constraints, and the required field.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-params.ts
 */

import type { ITool, IParam, IServer } from 'simply-mcp';

// Define structured parameters with IParam
interface NameParam extends IParam {
  type: 'string';
  description: 'User full name';
  required: true;  // Default is true, but shown for clarity
  minLength: 1;
  maxLength: 100;
}

interface AgeParam extends IParam {
  type: 'integer';
  description: 'User age in years';
  required: true;
  min: 0;
  max: 150;
}

interface EmailParam extends IParam {
  type: 'string';
  description: 'Email address for notifications';
  required: false;  // Optional parameter
  format: 'email';
}

interface TitleParam extends IParam {
  type: 'string';
  description: 'Professional title or honorific';
  required: false;
  maxLength: 50;
}

/**
 * User registration tool with structured parameters
 */
interface RegisterUserTool extends ITool {
  name: 'register_user';
  description: 'Register a new user with validation';
  params: {
    name: NameParam;           // Required, validated string
    age: AgeParam;             // Required, validated number
    email: EmailParam;         // Optional email
    title: TitleParam;         // Optional title
    newsletter?: boolean;      // Can still mix simple types!
  };
  result: {
    userId: string;
    message: string;
  };
}

/**
 * Greeting tool mixing IParam and simple types
 */
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user by name';
  params: {
    name: NameParam;           // IParam with validation
    formal?: boolean;          // Simple TypeScript type
  };
  result: string;
}

/**
 * Server interface
 */
interface ParamsServer extends IServer {
  name: 'interface-params';
  version: '1.0.0';
  description: 'Demonstrates IParam for structured parameter definitions';
}

/**
 * Server implementation
 */
export default class ParamsServerImpl {
  /**
   * Register user with validated parameters
   */
  registerUser: RegisterUserTool = async (params) => {
    // All params are fully typed with validation
    const { name, age, email, title, newsletter } = params;

    // Build response
    const userId = Math.random().toString(36).substring(7);
    const parts = [
      `Registered: ${name}`,
      `Age: ${age}`,
      email ? `Email: ${email}` : null,
      title ? `Title: ${title}` : null,
      newsletter ? 'Subscribed to newsletter' : null,
    ].filter(Boolean);

    return {
      userId,
      message: parts.join(', '),
    };
  };

  /**
   * Greet with mixed parameter types
   */
  greet: GreetTool = async (params) => {
    const greeting = params.formal ? 'Good day' : 'Hello';
    return `${greeting}, ${params.name}!`;
  };
}

/**
 * Benefits of IParam:
 *
 * 1. **Self-documenting**: Descriptions are part of the type definition
 * 2. **Validation in TypeScript**: Constraints are visible in IDE
 * 3. **Explicit required/optional**: No ambiguity about parameter requirements
 * 4. **Reusable**: Define once, use in multiple tools
 * 5. **Backward compatible**: Mix with simple TypeScript types
 * 6. **Better IDE support**: Autocomplete shows descriptions and constraints
 */
