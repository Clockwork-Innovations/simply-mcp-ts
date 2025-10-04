/**
 * Single-File MCP Clean Example
 *
 * This demonstrates the cleanest way to define an MCP server using
 * our interface-based schema builder instead of Zod directly.
 *
 * To run this server:
 *   simplymcp run mcp/examples/single-file-clean.ts
 *   simplymcp run mcp/examples/single-file-clean.ts --http --port 3000
 *   simplymcp-func mcp/examples/single-file-clean.ts
 */

import { defineMCP, Schema } from 'simply-mcp';

export default defineMCP({
  name: 'clean-example',
  version: '1.0.0',

  tools: [
    {
      name: 'greet',
      description: 'Greet a user with a personalized message',
      parameters: Schema.object({
        name: Schema.string({
          description: 'The name of the person to greet',
          minLength: 1,
        }),
        formal: Schema.boolean({
          description: 'Use formal greeting',
          optional: true,
        }),
      }),
      execute: async (args) => {
        const greeting = args.formal ? 'Good day' : 'Hello';
        return `${greeting}, ${args.name}! Welcome!`;
      },
    },

    {
      name: 'calculate',
      description: 'Perform arithmetic operations',
      parameters: Schema.object({
        operation: Schema.enum(['add', 'subtract', 'multiply', 'divide'], {
          description: 'The operation to perform',
        }),
        a: Schema.number({
          description: 'First number',
        }),
        b: Schema.number({
          description: 'Second number',
        }),
      }),
      execute: async (args) => {
        let result: number;
        switch (args.operation) {
          case 'add':
            result = args.a + args.b;
            break;
          case 'subtract':
            result = args.a - args.b;
            break;
          case 'multiply':
            result = args.a * args.b;
            break;
          case 'divide':
            if (args.b === 0) return 'Error: Cannot divide by zero';
            result = args.a / args.b;
            break;
        }
        return `${args.a} ${args.operation} ${args.b} = ${result}`;
      },
    },

    {
      name: 'create_user',
      description: 'Create a new user with validation',
      parameters: Schema.object({
        username: Schema.string({
          description: 'Username (3-20 characters, alphanumeric)',
          minLength: 3,
          maxLength: 20,
          pattern: /^[a-zA-Z0-9_]+$/,
        }),
        email: Schema.email({
          description: 'User email address',
        }),
        age: Schema.int({
          description: 'User age (13-120)',
          min: 13,
          max: 120,
        }),
        website: Schema.url({
          description: 'Personal website',
          optional: true,
        }),
        profile: Schema.object({
          firstName: Schema.string({ description: 'First name' }),
          lastName: Schema.string({ description: 'Last name' }),
          bio: Schema.string({
            description: 'Short biography',
            maxLength: 500,
            optional: true,
          }),
        }),
        preferences: Schema.object({
          theme: Schema.enum(['light', 'dark', 'auto'], {
            description: 'UI theme',
            default: 'auto',
          }),
          notifications: Schema.boolean({
            description: 'Enable notifications',
            default: true,
          }),
        }, { optional: true }),
      }),
      execute: async (args) => {
        const user = {
          id: Math.random().toString(36).substring(7),
          ...args,
          preferences: args.preferences || {
            theme: 'auto',
            notifications: true,
          },
          createdAt: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: `User created successfully!\n\n${JSON.stringify(user, null, 2)}`,
            },
          ],
        };
      },
    },

    {
      name: 'process_list',
      description: 'Process a list of items with various operations',
      parameters: Schema.object({
        items: Schema.array(Schema.string(), {
          description: 'List of items to process',
          minItems: 1,
          maxItems: 100,
        }),
        operation: Schema.enum(['count', 'join', 'uppercase', 'lowercase'], {
          description: 'Operation to perform',
        }),
        separator: Schema.string({
          description: 'Separator for join operation',
          optional: true,
          default: ', ',
        }),
      }),
      execute: async (args) => {
        let result: any;

        switch (args.operation) {
          case 'count':
            result = `Count: ${args.items.length}`;
            break;
          case 'join':
            result = args.items.join(args.separator);
            break;
          case 'uppercase':
            result = args.items.map(item => item.toUpperCase());
            break;
          case 'lowercase':
            result = args.items.map(item => item.toLowerCase());
            break;
        }

        return typeof result === 'string'
          ? result
          : JSON.stringify(result, null, 2);
      },
    },

    {
      name: 'validate_data',
      description: 'Validate structured data',
      parameters: Schema.object({
        data: Schema.object({
          id: Schema.uuid({
            description: 'Unique identifier',
          }),
          email: Schema.email({
            description: 'Email address',
          }),
          website: Schema.url({
            description: 'Website URL',
          }),
          score: Schema.number({
            description: 'Score (0-100)',
            min: 0,
            max: 100,
          }),
        }),
      }),
      execute: async (args) => {
        return `✓ Data is valid!\n\n${JSON.stringify(args.data, null, 2)}`;
      },
    },
  ],

  prompts: [
    {
      name: 'code-review',
      description: 'Generate a code review prompt',
      arguments: [
        {
          name: 'language',
          description: 'Programming language',
          required: true,
        },
        {
          name: 'focus',
          description: 'Areas to focus on',
          required: false,
        },
      ],
      template: `Review the following {{language}} code:

{{focus}}

Look for:
- Code quality and readability
- Potential bugs
- Performance issues
- Security vulnerabilities
- Best practices

Provide specific, actionable feedback.`,
    },
  ],

  resources: [
    {
      uri: 'config://server',
      name: 'Server Configuration',
      description: 'Current server configuration',
      mimeType: 'application/json',
      content: {
        name: 'clean-example',
        version: '1.0.0',
        schemaStyle: 'interface-based',
        features: ['clean syntax', 'no Zod in config', 'full validation'],
      },
    },

    {
      uri: 'doc://schema-guide',
      name: 'Schema Guide',
      description: 'Guide to using the schema builder',
      mimeType: 'text/markdown',
      content: `# Schema Builder Guide

## Available Types

- **Schema.string()** - String values
- **Schema.email()** - Valid email addresses
- **Schema.url()** - Valid URLs
- **Schema.uuid()** - Valid UUIDs
- **Schema.number()** - Number values
- **Schema.int()** - Integer values
- **Schema.boolean()** - Boolean values
- **Schema.enum([...])** - Enum values
- **Schema.array(itemSchema)** - Arrays
- **Schema.object({...})** - Objects with properties
- **Schema.date()** - Date values

## Validation Options

### String
- minLength, maxLength
- pattern (regex)

### Number
- min, max
- int (boolean)

### Array
- minItems, maxItems

### All Types
- description
- optional
- default

## Example

\`\`\`typescript
parameters: Schema.object({
  name: Schema.string({
    description: 'User name',
    minLength: 3,
    maxLength: 50,
  }),
  age: Schema.int({
    description: 'User age',
    min: 0,
    max: 120,
  }),
  email: Schema.email(),
})
\`\`\`
`,
    },
  ],
});
