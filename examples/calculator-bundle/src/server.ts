/**
 * Calculator MCP Server - Minimal Package Bundle Example
 *
 * This is a minimal example of a SimpleMCP package bundle.
 * It demonstrates the basic structure with four simple arithmetic tools.
 */

export default {
  name: 'calculator-mcp-server',
  version: '1.0.0',
  description: 'Simple calculator with basic arithmetic operations',

  tools: [
    {
      name: 'add',
      description: 'Add two numbers together',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: 'First number'
          },
          b: {
            type: 'number',
            description: 'Second number'
          }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        return String(args.a + args.b);
      }
    },

    {
      name: 'subtract',
      description: 'Subtract second number from first number',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: 'First number (minuend)'
          },
          b: {
            type: 'number',
            description: 'Second number (subtrahend)'
          }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        return String(args.a - args.b);
      }
    },

    {
      name: 'multiply',
      description: 'Multiply two numbers',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: 'First number'
          },
          b: {
            type: 'number',
            description: 'Second number'
          }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        return String(args.a * args.b);
      }
    },

    {
      name: 'divide',
      description: 'Divide first number by second number',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: 'Numerator'
          },
          b: {
            type: 'number',
            description: 'Denominator (cannot be zero)'
          }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        if (args.b === 0) {
          return 'Error: Division by zero is undefined';
        }
        return String(args.a / args.b);
      }
    }
  ]
};
