/**
 * Database MCP Server - Bundle Test Fixture
 * Uses functional API with main field at root
 */

export default {
  name: 'db-server',
  version: '1.5.0',
  description: 'Mock database server with main at root',
  tools: [
    {
      name: 'query',
      description: 'Execute a query on the mock database',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL query to execute' }
        },
        required: ['sql']
      },
      execute: async (args: any) => {
        return `Executing query: ${args.sql}\nResult: 42 rows affected`;
      }
    },
    {
      name: 'get-record',
      description: 'Get a record by ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Record ID' }
        },
        required: ['id']
      },
      execute: async (args: any) => {
        const record = { id: args.id, data: 'mock-data', timestamp: Date.now() };
        return JSON.stringify(record, null, 2);
      }
    },
    {
      name: 'list-tables',
      description: 'List all database tables',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: async (args: any) => {
        return JSON.stringify(['users', 'products', 'orders', 'inventory'], null, 2);
      }
    }
  ]
};
