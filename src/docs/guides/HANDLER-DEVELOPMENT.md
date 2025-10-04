# Handler Development Guide

**Version:** 1.0.0
**Last Updated:** 2025-09-29

Complete guide to creating and deploying custom handlers in the MCP Configurable Framework.

## Table of Contents

1. [Handler Basics](#handler-basics)
2. [File Handlers](#file-handlers)
3. [Inline Handlers](#inline-handlers)
4. [HTTP Handlers](#http-handlers)
5. [Registry Handlers](#registry-handlers)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)
8. [Async Operations](#async-operations)
9. [Testing Handlers](#testing-handlers)
10. [Security Considerations](#security-considerations)
11. [Performance Tips](#performance-tips)
12. [Complete Examples](#complete-examples)

---

## Handler Basics

### What is a Handler?

A handler is a function that executes the logic of an MCP tool. It receives input arguments and returns formatted results.

### Handler Interface

All handlers must follow this signature:

```typescript
type HandlerFunction = (
  args: Record<string, any>,
  context?: ExecutionContext
) => Promise<HandlerResult>;

interface HandlerResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
}
```

### Execution Context

Handlers receive an optional execution context with:

```typescript
interface ExecutionContext {
  // Session information
  sessionId?: string;

  // Logging
  logger: Logger;

  // Metadata
  metadata: {
    toolName: string;
  };
}
```

### Return Format

Handlers must return content in MCP format:

```typescript
// Text response
return {
  content: [
    { type: 'text', text: 'Result text' }
  ]
};

// Multiple items
return {
  content: [
    { type: 'text', text: 'First result' },
    { type: 'text', text: 'Second result' }
  ]
};

// Image (base64 encoded)
return {
  content: [
    {
      type: 'image',
      data: 'base64-encoded-image-data',
      mimeType: 'image/png'
    }
  ]
};
```

---

## File Handlers

### Overview

File handlers are TypeScript or JavaScript files that export a handler function. Best for reusable, complex logic.

### Creating a File Handler

**1. Create handler file** (`handlers/myHandler.ts`):

```typescript
// Simple handler
export default async (args: any) => {
  const { name } = args;

  return {
    content: [
      {
        type: 'text',
        text: `Hello, ${name}!`
      }
    ]
  };
};
```

**2. Configure in config.json**:

```json
{
  "name": "greet",
  "description": "Greets a person",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" }
    },
    "required": ["name"]
  },
  "handler": {
    "type": "file",
    "path": "./mcp/handlers/myHandler.ts"
  }
}
```

### TypeScript Handler with Types

```typescript
// Define input type
interface GreetInput {
  name: string;
  title?: string;
}

// Define output type
interface GreetOutput {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// Handler with types
const handler = async (args: GreetInput): Promise<GreetOutput> => {
  const greeting = args.title
    ? `Hello, ${args.title} ${args.name}!`
    : `Hello, ${args.name}!`;

  return {
    content: [
      { type: 'text', text: greeting }
    ]
  };
};

export default handler;
```

### Using Execution Context

```typescript
import { ExecutionContext } from '../core/types';

export default async (
  args: any,
  context?: ExecutionContext
) => {
  // Log execution
  context?.logger.info(`Executing with args:`, args);

  // Use session ID
  const sessionInfo = context?.sessionId
    ? `Session: ${context.sessionId}`
    : 'No session';

  try {
    // Your logic here
    const result = processData(args);

    return {
      content: [
        { type: 'text', text: result }
      ]
    };
  } catch (error) {
    context?.logger.error('Handler failed:', error);
    throw error;
  }
};
```

### Importing Node Modules

```typescript
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export default async (args: any) => {
  // Read file
  const content = await fs.readFile(
    path.join(__dirname, 'data.json'),
    'utf-8'
  );

  // Make HTTP request
  const response = await axios.get('https://api.example.com/data');

  // Process and return
  return {
    content: [
      { type: 'text', text: `Data: ${content}` },
      { type: 'text', text: `API: ${JSON.stringify(response.data)}` }
    ]
  };
};
```

### Example: Calculator Handler

```typescript
// handlers/examples/calculateHandler.ts

interface CalculateInput {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

export default async (args: CalculateInput) => {
  const { operation, a, b } = args;

  let result: number;

  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      result = a / b;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Result: ${a} ${operation} ${b} = ${result}`
      }
    ]
  };
};
```

---

## Inline Handlers

### Overview

Inline handlers are JavaScript code embedded directly in the configuration file. Best for simple, self-contained logic.

### Basic Inline Handler

```json
{
  "handler": {
    "type": "inline",
    "code": "async (args) => ({ content: [{ type: 'text', text: `Echo: ${args.message}` }] })"
  }
}
```

### Multi-Line Inline Handler

```json
{
  "handler": {
    "type": "inline",
    "code": "async (args) => {\n  const { a, b } = args;\n  const sum = a + b;\n  return {\n    content: [{\n      type: 'text',\n      text: `Sum: ${sum}`\n    }]\n  };\n}"
  }
}
```

### Using Context in Inline Handlers

```json
{
  "handler": {
    "type": "inline",
    "code": "async (args, context) => {\n  context?.logger.info('Processing', args);\n  return {\n    content: [{\n      type: 'text',\n      text: `Processed: ${JSON.stringify(args)}`\n    }]\n  };\n}"
  }
}
```

### Limitations

**Cannot do**:
- Import modules
- Use TypeScript
- Access filesystem directly
- Multi-file code

**Can do**:
- Simple calculations
- String manipulation
- Object transformations
- JSON operations
- Use built-in JavaScript features

### Best Practices for Inline Handlers

1. **Keep it simple**: One operation per handler
2. **No side effects**: Pure functions preferred
3. **Validate inputs**: Check args before using
4. **Handle errors**: Use try/catch
5. **Format output**: Always return proper structure

### Example: Data Transformation

```json
{
  "name": "transform-data",
  "description": "Transforms user data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "users": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "number" }
          }
        }
      }
    }
  },
  "handler": {
    "type": "inline",
    "code": "async (args) => {\n  const users = args.users || [];\n  const adults = users.filter(u => u.age >= 18);\n  const summary = `Found ${adults.length} adults out of ${users.length} users`;\n  return {\n    content: [{\n      type: 'text',\n      text: summary\n    }]\n  };\n}"
  }
}
```

---

## HTTP Handlers

### Overview

HTTP handlers make requests to external REST APIs. No code required - just configuration.

### Basic HTTP Handler

```json
{
  "handler": {
    "type": "http",
    "url": "https://api.example.com/endpoint",
    "method": "GET",
    "timeout": 5000
  }
}
```

### GET Request

```json
{
  "name": "fetch-joke",
  "description": "Fetches a random joke",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "handler": {
    "type": "http",
    "url": "https://official-joke-api.appspot.com/random_joke",
    "method": "GET",
    "timeout": 5000
  }
}
```

### POST Request with Body

```json
{
  "name": "create-user",
  "description": "Creates a new user",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["name", "email"]
  },
  "handler": {
    "type": "http",
    "url": "https://api.example.com/users",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${API_TOKEN}"
    },
    "body": {
      "name": "${args.name}",
      "email": "${args.email}",
      "source": "mcp-framework"
    }
  }
}
```

### Variable Substitution

HTTP handlers support variable substitution in URLs, headers, and body:

**Environment Variables**:
```json
{
  "headers": {
    "API-Key": "${API_KEY}"
  }
}
```

**Input Arguments**:
```json
{
  "url": "https://api.example.com/users/${args.userId}",
  "body": {
    "name": "${args.name}"
  }
}
```

### Query Parameters

Add query parameters to URL:

```json
{
  "handler": {
    "type": "http",
    "url": "https://api.example.com/search?q=${args.query}&limit=${args.limit}",
    "method": "GET"
  }
}
```

### Authentication

**Bearer Token**:
```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

**API Key**:
```json
{
  "headers": {
    "X-API-Key": "${API_KEY}"
  }
}
```

**Basic Auth**:
```json
{
  "headers": {
    "Authorization": "Basic ${BASIC_AUTH_TOKEN}"
  }
}
```

### Response Handling

HTTP handlers automatically:
- Parse JSON responses
- Handle errors (4xx, 5xx)
- Apply timeouts
- Format output as MCP content

---

## Registry Handlers

### Overview

Registry handlers are registered programmatically at runtime. Best for plugins, dynamic tools, and advanced use cases.

### Configuration

```json
{
  "name": "dynamic-tool",
  "description": "Dynamically registered tool",
  "inputSchema": { ... },
  "handler": {
    "type": "registry",
    "name": "my-handler"
  }
}
```

### Registering Handlers

```typescript
import { HandlerRegistry } from './mcp/core/HandlerManager';

// Get singleton instance
const registry = HandlerRegistry.getInstance();

// Register handler
registry.register('my-handler', async (args, context) => {
  // Handler logic here
  return {
    content: [
      {
        type: 'text',
        text: `Processed: ${JSON.stringify(args)}`
      }
    ]
  };
});
```

### With TypeScript Types

```typescript
import { HandlerFunction, ExecutionContext } from './mcp/core/types';

interface MyInput {
  userId: string;
  action: string;
}

const myHandler: HandlerFunction = async (
  args: MyInput,
  context?: ExecutionContext
) => {
  context?.logger.info('Dynamic handler called', args);

  // Your logic
  const result = await processUser(args.userId, args.action);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result)
      }
    ]
  };
};

// Register
HandlerRegistry.getInstance().register('my-handler', myHandler);
```

### Unregistering Handlers

```typescript
const registry = HandlerRegistry.getInstance();

// Unregister handler
registry.unregister('my-handler');

// Check if registered
if (registry.has('my-handler')) {
  console.log('Handler exists');
}
```

### Dynamic Handler Creation

```typescript
// Create handlers dynamically based on database
const createHandlersFromDB = async () => {
  const tools = await database.getTools();
  const registry = HandlerRegistry.getInstance();

  for (const tool of tools) {
    registry.register(tool.handlerName, async (args, context) => {
      // Execute tool-specific logic
      return await executeTool(tool.id, args);
    });
  }
};

// Initialize at startup
createHandlersFromDB();
```

---

## Best Practices

### 1. Input Validation

Always validate inputs even if schema exists:

```typescript
export default async (args: any) => {
  // Check required fields
  if (!args.userId) {
    throw new Error('userId is required');
  }

  // Validate format
  if (!/^[a-z0-9]+$/i.test(args.userId)) {
    throw new Error('Invalid userId format');
  }

  // Process
  const user = await getUser(args.userId);

  return {
    content: [
      { type: 'text', text: JSON.stringify(user) }
    ]
  };
};
```

### 2. Error Messages

Provide clear, actionable error messages:

```typescript
// Bad
throw new Error('Error');

// Good
throw new Error('Failed to fetch user: User ID "12345" not found in database');

// Better
throw new Error('User not found. Please verify the user ID and try again.');
```

### 3. Logging

Use the provided logger:

```typescript
export default async (args: any, context?: ExecutionContext) => {
  context?.logger.info('Starting processing', { args });

  try {
    const result = await process(args);
    context?.logger.info('Processing complete', { result });
    return formatResult(result);
  } catch (error) {
    context?.logger.error('Processing failed', { error, args });
    throw error;
  }
};
```

### 4. Timeout Handling

Be mindful of timeouts for long operations:

```typescript
export default async (args: any) => {
  // Set timeout signal
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s

  try {
    const result = await fetch('https://slow-api.com', {
      signal: controller.signal
    });

    return {
      content: [
        { type: 'text', text: await result.text() }
      ]
    };
  } finally {
    clearTimeout(timeout);
  }
};
```

### 5. Resource Cleanup

Always cleanup resources:

```typescript
export default async (args: any) => {
  const connection = await database.connect();

  try {
    const data = await connection.query(args.sql);

    return {
      content: [
        { type: 'text', text: JSON.stringify(data) }
      ]
    };
  } finally {
    await connection.close();
  }
};
```

### 6. Secrets Management

Never hardcode secrets:

```typescript
// Bad
const API_KEY = 'sk-1234567890';

// Good
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable not set');
}
```

---

## Error Handling

### Types of Errors

1. **Validation Errors**: Invalid input
2. **Business Logic Errors**: Operation failed
3. **External Service Errors**: API/database failure
4. **System Errors**: Unexpected errors

### Error Handling Pattern

```typescript
export default async (args: any) => {
  try {
    // Validate
    if (!args.id) {
      throw new ValidationError('id is required');
    }

    // Execute
    const result = await doWork(args.id);

    if (!result) {
      throw new BusinessError('Operation returned no results');
    }

    return {
      content: [
        { type: 'text', text: result }
      ]
    };

  } catch (error) {
    // Handle specific errors
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors
    }

    if (error instanceof BusinessError) {
      return {
        content: [
          { type: 'text', text: `Error: ${error.message}` }
        ]
      };
    }

    // Handle external service errors
    if (error.code === 'ECONNREFUSED') {
      throw new Error('External service unavailable. Please try again later.');
    }

    // Generic error handling
    throw new Error(`Unexpected error: ${error.message}`);
  }
};
```

### Custom Error Classes

```typescript
// errors.ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

// handler.ts
import { ValidationError, BusinessError } from './errors';

export default async (args: any) => {
  if (!args.email?.includes('@')) {
    throw new ValidationError('Invalid email format');
  }

  const user = await findUser(args.email);
  if (!user) {
    throw new BusinessError('User not found', 'USER_NOT_FOUND');
  }

  return formatUser(user);
};
```

---

## Async Operations

### Promises

All handlers must return promises:

```typescript
export default async (args: any) => {
  // Await async operations
  const data = await fetchData();
  const processed = await processData(data);

  return {
    content: [
      { type: 'text', text: processed }
    ]
  };
};
```

### Parallel Operations

Use `Promise.all` for parallel execution:

```typescript
export default async (args: any) => {
  // Execute in parallel
  const [users, posts, comments] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchComments()
  ]);

  return {
    content: [
      { type: 'text', text: `Users: ${users.length}` },
      { type: 'text', text: `Posts: ${posts.length}` },
      { type: 'text', text: `Comments: ${comments.length}` }
    ]
  };
};
```

### Sequential Operations

When order matters:

```typescript
export default async (args: any) => {
  // Must execute in order
  const user = await createUser(args.name);
  const profile = await createProfile(user.id);
  const permissions = await assignPermissions(user.id);

  return {
    content: [
      { type: 'text', text: `User created: ${user.id}` }
    ]
  };
};
```

### Error Handling with Promise.all

```typescript
export default async (args: any) => {
  try {
    const results = await Promise.all([
      fetch('https://api1.com'),
      fetch('https://api2.com'),
      fetch('https://api3.com')
    ]);

    return {
      content: results.map((r, i) => ({
        type: 'text',
        text: `API ${i + 1}: ${r.status}`
      }))
    };
  } catch (error) {
    // One failed = all failed
    throw new Error('One or more API calls failed');
  }
};
```

### Promise.allSettled for Partial Success

```typescript
export default async (args: any) => {
  const results = await Promise.allSettled([
    fetch('https://api1.com'),
    fetch('https://api2.com'),
    fetch('https://api3.com')
  ]);

  const content = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return {
        type: 'text',
        text: `API ${i + 1}: Success`
      };
    } else {
      return {
        type: 'text',
        text: `API ${i + 1}: Failed - ${result.reason}`
      };
    }
  });

  return { content };
};
```

---

## Testing Handlers

### Unit Testing File Handlers

```typescript
// handler.test.ts
import handler from './myHandler';

describe('myHandler', () => {
  it('should process valid input', async () => {
    const result = await handler({
      name: 'Alice',
      age: 30
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Alice');
  });

  it('should handle missing fields', async () => {
    await expect(handler({})).rejects.toThrow('name is required');
  });

  it('should validate input types', async () => {
    await expect(handler({
      name: 'Bob',
      age: 'invalid'
    })).rejects.toThrow();
  });
});
```

### Integration Testing

```bash
# test-handler.sh

# Start server
npx tsx mcp/configurableServer.ts test-config.json &
SERVER_PID=$!
sleep 2

# Initialize
SESSION_ID=$(curl -s -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  | jq -r '.result.sessionId')

# Test handler
curl -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"my-tool","arguments":{"test":"data"}}}'

# Cleanup
kill $SERVER_PID
```

### Mocking External Services

```typescript
// handler.test.ts
import handler from './apiHandler';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Handler', () => {
  it('should call external API', async () => {
    // Mock response
    mockedAxios.get.mockResolvedValue({
      data: { message: 'Success' }
    });

    const result = await handler({ userId: '123' });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.example.com/users/123'
    );
    expect(result.content[0].text).toContain('Success');
  });
});
```

---

## Security Considerations

### 1. Input Sanitization

Always sanitize user inputs:

```typescript
export default async (args: any) => {
  // Sanitize strings
  const safeName = args.name
    .replace(/<[^>]*>/g, '') // Remove HTML
    .replace(/[^\w\s]/g, '')  // Remove special chars
    .trim()
    .substring(0, 100);       // Limit length

  return {
    content: [
      { type: 'text', text: `Hello, ${safeName}!` }
    ]
  };
};
```

### 2. Path Traversal Prevention

```typescript
import path from 'path';

export default async (args: any) => {
  const basePath = '/safe/directory';

  // Prevent ../../../etc/passwd
  const safePath = path.join(
    basePath,
    path.basename(args.filename)
  );

  // Verify still within base path
  if (!safePath.startsWith(basePath)) {
    throw new Error('Invalid file path');
  }

  const content = await fs.readFile(safePath, 'utf-8');

  return {
    content: [
      { type: 'text', text: content }
    ]
  };
};
```

### 3. SQL Injection Prevention

```typescript
// Bad - SQL injection vulnerable
const query = `SELECT * FROM users WHERE id = ${args.userId}`;

// Good - Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [args.userId]);
```

### 4. Command Injection Prevention

```typescript
// Bad
exec(`ls ${args.directory}`);

// Good - Validate and sanitize
if (!/^[a-zA-Z0-9_\/-]+$/.test(args.directory)) {
  throw new Error('Invalid directory name');
}

// Better - Use safe libraries
import { readdir } from 'fs/promises';
const files = await readdir(args.directory);
```

### 5. Rate Limiting in Handler

```typescript
const requestCounts = new Map<string, number>();

export default async (args: any, context?: ExecutionContext) => {
  const sessionId = context?.sessionId || 'unknown';

  // Track requests
  const count = requestCounts.get(sessionId) || 0;

  if (count > 10) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  requestCounts.set(sessionId, count + 1);

  // Clear after 60 seconds
  setTimeout(() => requestCounts.delete(sessionId), 60000);

  // Process request
  return processRequest(args);
};
```

---

## Performance Tips

### 1. Caching

```typescript
const cache = new Map<string, any>();
const CACHE_TTL = 60000; // 1 minute

export default async (args: any) => {
  const cacheKey = JSON.stringify(args);

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // Fetch data
  const result = await expensiveOperation(args);

  // Cache result
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
};
```

### 2. Connection Pooling

```typescript
// Create pool once
const pool = createPool({
  host: 'localhost',
  user: 'user',
  password: 'pass',
  database: 'db',
  connectionLimit: 10
});

export default async (args: any) => {
  // Reuse connection from pool
  const connection = await pool.getConnection();

  try {
    const result = await connection.query('SELECT * FROM users');

    return {
      content: [
        { type: 'text', text: JSON.stringify(result) }
      ]
    };
  } finally {
    connection.release();
  }
};
```

### 3. Lazy Loading

```typescript
let heavyResource: any = null;

export default async (args: any) => {
  // Load only when needed
  if (!heavyResource) {
    heavyResource = await loadHeavyResource();
  }

  return processWithResource(heavyResource, args);
};
```

### 4. Streaming Large Results

```typescript
export default async (args: any) => {
  // Instead of loading all data at once
  const stream = createReadStream('large-file.txt');
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.toString());

    // Process in chunks
    if (chunks.length > 100) {
      break; // Limit to prevent memory issues
    }
  }

  return {
    content: [
      { type: 'text', text: chunks.join('') }
    ]
  };
};
```

---

## Complete Examples

### Example 1: Database Query Handler

```typescript
// handlers/database/queryHandler.ts
import { Pool } from 'pg';
import { ExecutionContext } from '../../core/types';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10
});

interface QueryInput {
  table: string;
  filters?: Record<string, any>;
  limit?: number;
}

export default async (
  args: QueryInput,
  context?: ExecutionContext
) => {
  context?.logger.info('Database query', args);

  // Validate table name (prevent SQL injection)
  const allowedTables = ['users', 'posts', 'comments'];
  if (!allowedTables.includes(args.table)) {
    throw new Error(`Invalid table: ${args.table}`);
  }

  // Build safe query
  let query = `SELECT * FROM ${args.table}`;
  const params: any[] = [];

  if (args.filters) {
    const conditions = Object.entries(args.filters).map(([key, value], i) => {
      params.push(value);
      return `${key} = $${i + 1}`;
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  }

  if (args.limit) {
    params.push(args.limit);
    query += ` LIMIT $${params.length}`;
  }

  // Execute query
  const client = await pool.connect();

  try {
    const result = await client.query(query, params);

    context?.logger.info('Query complete', {
      rowCount: result.rowCount
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  } catch (error) {
    context?.logger.error('Query failed', error);
    throw new Error(`Database query failed: ${error.message}`);
  } finally {
    client.release();
  }
};
```

### Example 2: File Processing Handler

```typescript
// handlers/files/processFileHandler.ts
import fs from 'fs/promises';
import path from 'path';
import { ExecutionContext } from '../../core/types';

interface FileInput {
  filename: string;
  operation: 'read' | 'parse' | 'analyze';
}

export default async (
  args: FileInput,
  context?: ExecutionContext
) => {
  const basePath = process.env.FILES_DIR || './uploads';

  // Secure path resolution
  const safePath = path.join(
    basePath,
    path.basename(args.filename)
  );

  // Verify path is within base directory
  if (!safePath.startsWith(path.resolve(basePath))) {
    throw new Error('Invalid file path');
  }

  context?.logger.info('Processing file', { path: safePath });

  try {
    // Check file exists
    await fs.access(safePath);

    // Perform operation
    switch (args.operation) {
      case 'read':
        const content = await fs.readFile(safePath, 'utf-8');
        return {
          content: [
            { type: 'text', text: content }
          ]
        };

      case 'parse':
        const data = await fs.readFile(safePath, 'utf-8');
        const parsed = JSON.parse(data);
        return {
          content: [
            { type: 'text', text: JSON.stringify(parsed, null, 2) }
          ]
        };

      case 'analyze':
        const stats = await fs.stat(safePath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile()
              }, null, 2)
            }
          ]
        };

      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
  } catch (error) {
    context?.logger.error('File processing failed', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
};
```

### Example 3: API Integration Handler

```typescript
// handlers/api/weatherHandler.ts
import axios from 'axios';
import { ExecutionContext } from '../../core/types';

interface WeatherInput {
  location: string;
  units?: 'metric' | 'imperial';
}

export default async (
  args: WeatherInput,
  context?: ExecutionContext
) => {
  const API_KEY = process.env.WEATHER_API_KEY;

  if (!API_KEY) {
    throw new Error('Weather API key not configured');
  }

  context?.logger.info('Fetching weather', args);

  try {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          q: args.location,
          units: args.units || 'metric',
          appid: API_KEY
        },
        timeout: 5000
      }
    );

    const weather = response.data;

    const summary = [
      `Weather in ${weather.name}:`,
      `Temperature: ${weather.main.temp}°${args.units === 'imperial' ? 'F' : 'C'}`,
      `Conditions: ${weather.weather[0].description}`,
      `Humidity: ${weather.main.humidity}%`,
      `Wind Speed: ${weather.wind.speed} ${args.units === 'imperial' ? 'mph' : 'm/s'}`
    ].join('\n');

    return {
      content: [
        { type: 'text', text: summary }
      ]
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Location not found: ${args.location}`);
    }

    context?.logger.error('Weather API error', error);
    throw new Error('Failed to fetch weather data');
  }
};
```

---

## Summary

### Handler Type Selection

| Use Case | Recommended Type | Reason |
|----------|-----------------|---------|
| Simple transformations | Inline | No file needed |
| Complex logic | File | Full IDE support |
| API wrapper | HTTP | No code required |
| Plugin system | Registry | Dynamic registration |
| Database queries | File | Connection pooling |
| File operations | File | Async operations |
| Data validation | File | Reusable logic |
| Prototyping | Inline | Fast iteration |

### Checklist for Handler Development

- [ ] Input validation
- [ ] Error handling
- [ ] Logging
- [ ] Security considerations
- [ ] Resource cleanup
- [ ] Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Secrets management

---

**Next Steps**:
- Review [Documentation Index](../INDEX.md) for framework overview
- Check [Deployment Guide](./DEPLOYMENT.md) for production deployment
- See [API Integration Guide](./API-INTEGRATION.md) for client integration examples

**Support**: GitHub Issues or community forums