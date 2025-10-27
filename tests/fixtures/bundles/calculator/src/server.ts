/**
 * Calculator MCP Server - Bundle Test Fixture
 * Uses functional API for reliability
 */

export default {
  name: 'calculator-server',
  version: '1.0.0',
  description: 'Simple calculator for testing bundle execution',
  tools: [
    {
      name: 'add',
      description: 'Add two numbers together',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        return String(args.a + args.b);
      }
    },
    {
      name: 'subtract',
      description: 'Subtract b from a',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
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
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        return String(args.a * args.b);
      }
    },
    {
      name: 'divide',
      description: 'Divide a by b',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'Numerator' },
          b: { type: 'number', description: 'Denominator' }
        },
        required: ['a', 'b']
      },
      execute: async (args: any) => {
        if (args.b === 0) {
          return 'Error: Division by zero';
        }
        return String(args.a / args.b);
      }
    }
  ]
};
