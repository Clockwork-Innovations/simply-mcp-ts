/**
 * Single-File MCP Advanced Example
 *
 * This demonstrates advanced patterns including:
 * - Complex validation with Zod
 * - Context usage (logging)
 * - Structured return types
 * - Error handling
 * - Builder pattern (alternative to defineMCP)
 *
 * To run this server:
 *   simplymcp run mcp/examples/single-file-advanced.ts
 *   simplymcp run mcp/examples/single-file-advanced.ts --http --port 3001
 *   simplymcp-func mcp/examples/single-file-advanced.ts
 */

import { createMCP } from 'simply-mcp';
import { z } from 'zod';

// Create server using builder pattern
const mcp = createMCP({
  name: 'advanced-example',
  version: '2.0.0',
  port: 3001,
  defaultTimeout: 10000,
});

// Tool with complex validation
mcp.tool({
  name: 'create_user',
  description: 'Create a new user with validation',
  parameters: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .describe('Username for the new account'),
    email: z.string().email('Must be a valid email address').describe('User email address'),
    age: z
      .number()
      .int('Age must be an integer')
      .min(13, 'Must be at least 13 years old')
      .max(120, 'Age seems unrealistic')
      .describe('User age'),
    profile: z
      .object({
        firstName: z.string().min(1).describe('First name'),
        lastName: z.string().min(1).describe('Last name'),
        bio: z.string().max(500).optional().describe('Short biography'),
        website: z.string().url().optional().describe('Personal website'),
      })
      .describe('User profile information'),
    preferences: z
      .object({
        theme: z.enum(['light', 'dark', 'auto']).default('auto').describe('UI theme preference'),
        notifications: z.boolean().default(true).describe('Enable notifications'),
        language: z.string().length(2).default('en').describe('Preferred language (ISO 639-1)'),
      })
      .optional()
      .describe('User preferences'),
  }),
  execute: async (args, context) => {
    // Log the operation
    context?.logger.info(`Creating user: ${args.username}`);

    // Simulate user creation
    const user = {
      id: Math.random().toString(36).substring(7),
      username: args.username,
      email: args.email,
      age: args.age,
      profile: args.profile,
      preferences: args.preferences || {
        theme: 'auto',
        notifications: true,
        language: 'en',
      },
      createdAt: new Date().toISOString(),
    };

    context?.logger.info(`User created successfully: ${user.id}`);

    // Return structured data
    return {
      content: [
        {
          type: 'text',
          text: `User created successfully!\n\n${JSON.stringify(user, null, 2)}`,
        },
      ],
    };
  },
});

// Tool with error handling
mcp.tool({
  name: 'divide',
  description: 'Divide two numbers with error handling',
  parameters: z.object({
    numerator: z.number().describe('Number to divide'),
    denominator: z.number().describe('Number to divide by'),
    precision: z.number().int().min(0).max(10).optional().describe('Decimal places (0-10)'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Dividing ${args.numerator} by ${args.denominator}`);

    // Handle division by zero
    if (args.denominator === 0) {
      context?.logger.error('Division by zero attempted');
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Cannot divide by zero',
          },
        ],
        isError: true,
      };
    }

    const result = args.numerator / args.denominator;
    const precision = args.precision ?? 2;
    const formatted = result.toFixed(precision);

    return `${args.numerator} ÷ ${args.denominator} = ${formatted}`;
  },
});

// Tool that processes arrays
mcp.tool({
  name: 'process_data',
  description: 'Process an array of data with various operations',
  parameters: z.object({
    data: z.array(z.number()).min(1).max(1000).describe('Array of numbers to process'),
    operation: z
      .enum(['sum', 'average', 'min', 'max', 'sort'])
      .describe('Operation to perform'),
    sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (for sort operation)'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Processing ${args.data.length} items with ${args.operation}`);

    let result: any;

    switch (args.operation) {
      case 'sum':
        result = args.data.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        result = args.data.reduce((acc, val) => acc + val, 0) / args.data.length;
        break;
      case 'min':
        result = Math.min(...args.data);
        break;
      case 'max':
        result = Math.max(...args.data);
        break;
      case 'sort':
        result = [...args.data].sort((a, b) =>
          args.sortOrder === 'desc' ? b - a : a - b
        );
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              operation: args.operation,
              input: args.data,
              result,
              count: args.data.length,
            },
            null,
            2
          ),
        },
      ],
    };
  },
});

// Tool with async operations
mcp.tool({
  name: 'fetch_data',
  description: 'Simulate fetching data from an API',
  parameters: z.object({
    endpoint: z.string().url().describe('API endpoint URL'),
    timeout: z
      .number()
      .int()
      .min(100)
      .max(30000)
      .optional()
      .default(5000)
      .describe('Request timeout in milliseconds'),
  }),
  execute: async (args, context) => {
    context?.logger.info(`Fetching data from: ${args.endpoint}`);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate response
    const mockData = {
      url: args.endpoint,
      status: 200,
      data: {
        message: 'This is mock data',
        timestamp: new Date().toISOString(),
      },
      fetchedAt: new Date().toISOString(),
    };

    context?.logger.info('Data fetched successfully');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockData, null, 2),
        },
      ],
    };
  },
});

// Advanced prompt with complex template
mcp.prompt({
  name: 'detailed-code-review',
  description: 'Generate a comprehensive code review prompt',
  arguments: [
    { name: 'language', description: 'Programming language', required: true },
    { name: 'codeType', description: 'Type of code (frontend/backend/test)', required: true },
    { name: 'complexity', description: 'Code complexity (low/medium/high)', required: false },
    { name: 'focus', description: 'Specific focus areas', required: false },
  ],
  template: `# Code Review Request

**Language:** {{language}}
**Type:** {{codeType}}
{{complexity}}

## Review Criteria

Please conduct a thorough code review focusing on:

1. **Code Quality**
   - Readability and maintainability
   - Code organization and structure
   - Naming conventions
   - Comments and documentation

2. **Functionality**
   - Logic correctness
   - Edge cases handling
   - Error handling
   - Input validation

3. **Performance**
   - Algorithm efficiency
   - Resource usage
   - Potential bottlenecks
   - Optimization opportunities

4. **Security**
   - Input sanitization
   - Authentication/Authorization
   - Sensitive data handling
   - Common vulnerabilities

5. **Best Practices**
   - Design patterns
   - Framework conventions
   - Industry standards
   {{focus}}

## Deliverables

Provide:
- List of issues found (with severity: critical/major/minor)
- Specific code suggestions
- Recommended refactoring
- Overall assessment`,
});

// Resource with dynamic content
mcp.resource({
  uri: 'stats://server',
  name: 'Server Statistics',
  description: 'Live server statistics',
  mimeType: 'application/json',
  content: {
    name: 'advanced-example',
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    features: {
      tools: 4,
      prompts: 1,
      resources: 3,
    },
  },
});

// Resource with documentation
mcp.resource({
  uri: 'doc://api',
  name: 'API Documentation',
  description: 'Complete API documentation',
  mimeType: 'text/markdown',
  content: `# Advanced Example API Documentation

## Tools

### create_user
Create a new user with comprehensive validation.

**Parameters:**
- username: 3-20 characters, alphanumeric + underscore
- email: Valid email address
- age: 13-120 years
- profile: User profile (firstName, lastName, bio, website)
- preferences: Optional preferences (theme, notifications, language)

### divide
Divide two numbers with error handling.

**Parameters:**
- numerator: Number to divide
- denominator: Number to divide by (cannot be zero)
- precision: Optional decimal places (0-10)

### process_data
Process arrays of numbers with various operations.

**Parameters:**
- data: Array of numbers (1-1000 items)
- operation: sum, average, min, max, sort
- sortOrder: asc or desc (for sort operation)

### fetch_data
Simulate fetching data from an API.

**Parameters:**
- endpoint: API endpoint URL
- timeout: Request timeout in milliseconds (100-30000)

## Error Handling

All tools include comprehensive error handling and will return:
- Validation errors for invalid parameters
- Runtime errors with helpful messages
- Context-aware logging for debugging

## Best Practices

1. Always validate input parameters
2. Use appropriate timeout values
3. Handle errors gracefully
4. Check logs for debugging information
`,
});

// Resource with configuration
mcp.resource({
  uri: 'config://validation',
  name: 'Validation Rules',
  description: 'Server validation configuration',
  mimeType: 'application/json',
  content: {
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-zA-Z0-9_]+$',
    },
    email: {
      format: 'email',
    },
    age: {
      min: 13,
      max: 120,
    },
    bio: {
      maxLength: 500,
    },
    language: {
      format: 'iso639-1',
      length: 2,
    },
    arrays: {
      minItems: 1,
      maxItems: 1000,
    },
    timeouts: {
      min: 100,
      max: 30000,
      default: 5000,
    },
  },
});

// Export the built config
export default mcp.build();
