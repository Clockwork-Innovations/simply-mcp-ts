/**
 * Variants MCP Server - Tests module field resolution
 * Uses functional API
 */

export default {
  name: 'variants-server',
  version: '1.0.0',
  description: 'Entry point variants test server (module field)',
  tools: [
    {
      name: 'echo',
      description: 'Echo a message back',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to echo' }
        },
        required: ['message']
      },
      execute: async (args: any) => {
        return `Echo: ${args.message}`;
      }
    },
    {
      name: 'get-info',
      description: 'Get server info',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async (args: any) => {
        return 'Variants Server - Testing module field entry point';
      }
    }
  ]
};
