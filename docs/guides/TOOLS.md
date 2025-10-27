# Tools Guide

Learn how to add capabilities (tools) to your MCP server using the Interface API.

**What are tools?** Functions that your server can perform - what the LLM can ask it to do.

**Implementation requirement:** ✅ **ALL TOOLS REQUIRE IMPLEMENTATION**

Every tool you define must have a corresponding implementation method in your server class. Unlike prompts and resources (which can be static), tools always execute custom logic.

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts), [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Basic Tool

A tool is defined using a TypeScript interface that extends `ITool` and requires:
- **name** - Unique identifier (camelCase or snake_case - auto-normalized to snake_case)
- **description** - What the tool does (used by LLM to decide when to call)
- **params** - Input parameter types
- **result** - Return type

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Say hello to someone';
  params: {
    /** Person to greet */
    name: string;
  };
  result: {
    greeting: string;
  };
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  greet: GreetTool = async (params) => {
    return {
      greeting: `Hello, ${params.name}!`
    };
  };
}
```

**Key Benefits:**
- Full type safety - IntelliSense on `params` and return values
- Auto-generated Zod schemas from TypeScript types
- Compile-time validation of implementation
- No schema boilerplate

---

## Method Naming Conventions

When you define a tool interface, the implementation method must match the tool name with proper camelCase conversion.

### Snake Case to Camel Case

Interface names are converted from **snake_case** to **camelCase**:

| Interface Name | Implementation Method |
|----------------|----------------------|
| `get_weather` | `getWeather` |
| `search_documents` | `searchDocuments` |
| `validate_email` | `validateEmail` |
| `sendEmail` | `sendEmail` (already camelCase) |
| `greet` | `greet` (no conversion needed) |

### Example

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';  // snake_case
  description: 'Get current weather';
  params: { location: string };
  result: { temperature: number };
}

// Implementation method MUST be named 'getWeather' (camelCase)
export default class MyServer implements IServer {
  getWeather: GetWeatherTool = async (params) => {
    return { temperature: 22 };
  };
}
```

### Why CamelCase?

TypeScript/JavaScript convention is camelCase for method names. The framework automatically converts snake_case tool names to camelCase method names for consistency with language conventions.

### Validation

If you use the wrong method name, you'll see a warning when running the server:

```
Warning: Tool 'get_weather' requires implementation as method 'getWeather'
```

To catch errors early, use dry-run mode during development:

```bash
npx simply-mcp run server.ts --dry-run
```

---

## Parameter Validation

### Using Plain TypeScript Types

```typescript
interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Do math operations';
  params: {
    /** Type of operation */
    operation: 'add' | 'subtract' | 'multiply';
    /** First number */
    a: number;
    /** Second number */
    b: number;
  };
  result: number;
}

export default class MathServer implements IServer {
  name: 'math-server';
  version: '1.0.0';

  calculate: CalculateTool = async (params) => {
    switch (params.operation) {
      case 'add': return params.a + params.b;
      case 'subtract': return params.a - params.b;
      case 'multiply': return params.a * params.b;
    }
  };
}
```

### Using IParam for Enhanced Validation

`IParam` provides structured parameter definitions with explicit types, descriptions, and validation constraints. This **improves LLM accuracy** by providing richer metadata in the generated JSON Schema.

```typescript
import type { ITool, IParam, IServer } from 'simply-mcp';

interface EmailParam extends IParam {
  type: 'string';
  description: 'Recipient email address';
  format: 'email';
}

interface SubjectParam extends IParam {
  type: 'string';
  description: 'Email subject line';
  minLength: 1;
  maxLength: 200;
}

interface SendEmailTool extends ITool {
  name: 'sendEmail';
  description: 'Send an email message';
  params: {
    to: EmailParam;
    subject: SubjectParam;
    /** Email body (plain text) */
    body: string;
  };
  result: {
    status: string;
    messageId: string;
  };
}

export default class EmailServer implements IServer {
  name: 'email-server';
  version: '1.0.0';

  sendEmail: SendEmailTool = async (params) => {
    return {
      status: 'sent',
      messageId: `msg-${Date.now()}`
    };
  };
}
```

For comprehensive parameter validation examples and all available constraint properties, see [API Features - IParam](./API_FEATURES.md#iparam-enhanced-parameters).

---

## Return Values

### Simple Values

```typescript
interface GetCountTool extends ITool {
  name: 'getCount';
  description: 'Get current count';
  params: {};
  result: number;
}

// Implementation
getCount: GetCountTool = async (params) => {
  return 42;
};
```

### Complex Objects

```typescript
interface GetUserTool extends ITool {
  name: 'getUser';
  description: 'Get user by ID';
  params: {
    userId: string;
  };
  result: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

// Implementation
getUser: GetUserTool = async (params) => {
  return {
    id: params.userId,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date().toISOString()
  };
};
```

### Arrays

```typescript
interface ListItemsTool extends ITool {
  name: 'listItems';
  description: 'List all items';
  params: {};
  result: Array<{
    id: number;
    name: string;
  }>;
}

// Implementation
listItems: ListItemsTool = async (params) => {
  return [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ];
};
```

### Optional Result Fields

```typescript
interface GetWeatherTool extends ITool {
  name: 'getWeather';
  description: 'Get weather for a location';
  params: {
    location: string;
    includeHourly?: boolean;
  };
  result: {
    location: string;
    temperature: number;
    conditions: string;
    hourly?: Array<{ hour: number; temp: number }>;
  };
}

// Implementation
getWeather: GetWeatherTool = async (params) => {
  return {
    location: params.location,
    temperature: 22,
    conditions: 'Partly cloudy',
    // Only include if requested
    hourly: params.includeHourly ? [
      { hour: 1, temp: 23 },
      { hour: 2, temp: 24 }
    ] : undefined
  };
};
```

---

## Async Tools

All tool implementations can be async and work with external APIs, databases, or file systems:

```typescript
interface FetchDataTool extends ITool {
  name: 'fetchData';
  description: 'Fetch data from external API';
  params: {
    query: string;
  };
  result: {
    data: any;
    timestamp: string;
  };
}

// Implementation
fetchData: FetchDataTool = async (params) => {
  const response = await fetch(`https://api.example.com/data?q=${params.query}`);
  const data = await response.json();

  return {
    data,
    timestamp: new Date().toISOString()
  };
};
```

---

## Error Handling

> **Error Handling:** See [Error Handling Guide](./ERROR_HANDLING.md) for comprehensive error patterns and best practices.

---

## Common Patterns

### API Integration

```typescript
interface FetchWeatherTool extends ITool {
  name: 'fetchWeather';
  description: 'Get weather for a city from external API';
  params: {
    city: string;
  };
  result: {
    city: string;
    temperature: number;
    conditions: string;
  };
}

// Implementation
fetchWeather: FetchWeatherTool = async (params) => {
  const response = await fetch(
    `https://api.weather.example.com?city=${encodeURIComponent(params.city)}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.WEATHER_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
};
```

### Database Query

```typescript
interface FindUserTool extends ITool {
  name: 'findUser';
  description: 'Find user by email';
  params: {
    email: string;
  };
  result: {
    id: string;
    email: string;
    name: string;
  };
}

// Implementation
findUser: FindUserTool = async (params) => {
  const user = await db.users.findOne({ email: params.email });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
};
```

### File Processing

```typescript
interface ReadConfigTool extends ITool {
  name: 'readConfig';
  description: 'Read configuration file';
  params: {
    filename: string;
  };
  result: {
    config: Record<string, any>;
  };
}

// Implementation
readConfig: ReadConfigTool = async (params) => {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(params.filename, 'utf-8');
    return {
      config: JSON.parse(content)
    };
  } catch (error) {
    throw new Error(`Failed to read config: ${error.message}`);
  }
};
```

### Data Transformation

```typescript
interface FormatCsvTool extends ITool {
  name: 'formatCsv';
  description: 'Format CSV data to JSON';
  params: {
    csv: string;
  };
  result: Array<Record<string, string>>;
}

// Implementation
formatCsv: FormatCsvTool = async (params) => {
  const lines = params.csv.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(
      headers.map((h, i) => [h, values[i]])
    );
  });
};
```

---

## Multiple Tools

A server can implement multiple tools - just define multiple tool interfaces:

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: number;
    b: number;
  };
  result: number;
}

interface SubtractTool extends ITool {
  name: 'subtract';
  description: 'Subtract two numbers';
  params: {
    a: number;
    b: number;
  };
  result: number;
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: {
    a: number;
    b: number;
  };
  result: number;
}

interface MathServer extends IServer {
  name: 'math-server';
  version: '1.0.0';
  description: 'Basic math operations';
}

export default class MathServer implements MathServer {
  add: AddTool = async (params) => params.a + params.b;

  subtract: SubtractTool = async (params) => params.a - params.b;

  multiply: MultiplyTool = async (params) => params.a * params.b;
}
```

---

## Best Practices

**DO:**
- Write clear, descriptive tool descriptions (LLM uses these to decide when to call)
- Use IParam for complex validation requirements
- Add JSDoc comments to parameter types for better documentation
- Validate input parameters and throw meaningful errors
- Return structured, consistent data types
- Test tools locally before deploying
- Use TypeScript's type system to its fullest

**DON'T:**
- Make tools too broad - each should have one clear responsibility
- Skip error handling
- Silently fail - always throw errors for failures
- Return unclear or inconsistent data structures
- Create tools for every possible action - keep the list focused

---

## Advanced Features

### Complex Nested Parameters

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface TimeoutParam extends IParam {
  type: 'integer';
  description: 'Request timeout in milliseconds';
  min: 100;
  max: 30000;
}

interface RetriesParam extends IParam {
  type: 'integer';
  description: 'Number of retry attempts';
  min: 0;
  max: 5;
}

interface ApiRequestTool extends ITool {
  name: 'apiRequest';
  description: 'Make API request with configuration';
  params: {
    url: string;
    config?: {
      timeout?: TimeoutParam;
      retries?: RetriesParam;
    };
    headers?: Record<string, string>;
  };
  result: {
    status: number;
    data: any;
  };
}
```

### Enum Parameters

```typescript
interface LogLevel extends IParam {
  type: 'string';
  description: 'Log level';
  enum: ['debug', 'info', 'warn', 'error'];
}

interface LogMessageTool extends ITool {
  name: 'logMessage';
  description: 'Log a message';
  params: {
    message: string;
    level: LogLevel;
  };
  result: {
    logged: boolean;
    timestamp: string;
  };
}
```

### Optional Parameters

```typescript
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search items with optional filters';
  params: {
    /** Search query (required) */
    query: string;
    /** Maximum results to return (optional) */
    limit?: number;
    /** Tags to filter by (optional) */
    tags?: string[];
    /** Sort order (optional) */
    sort?: 'asc' | 'desc';
  };
  result: {
    items: Array<{ id: string; name: string }>;
    total: number;
  };
}

// Implementation
search: SearchTool = async (params) => {
  // Use defaults for optional params
  const limit = params.limit ?? 10;
  const sort = params.sort ?? 'asc';

  return {
    items: [],
    total: 0
  };
};
```

---

## Debugging Tools

### Verbose Output

```bash
npx simply-mcp run server.ts --verbose
```

### Test Tool Locally

```bash
# Dry-run validates server starts correctly
npx simply-mcp run server.ts --dry-run

# Watch mode auto-reloads on changes
npx simply-mcp run server.ts --watch
```

### Type Checking

```bash
# Verify TypeScript compilation
npx tsc --noEmit server.ts
```

---

## Examples

**See working examples:**
- Basic tools: [examples/interface-minimal.ts](../../examples/interface-minimal.ts)
- Advanced tools: [examples/interface-advanced.ts](../../examples/interface-advanced.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)
- File-based prompts: [examples/interface-file-prompts.ts](../../examples/interface-file-prompts.ts)

---

## Next Steps

- **Add prompts?** See [PROMPTS.md](./PROMPTS.md)
- **Add resources?** See [RESOURCES.md](./RESOURCES.md)
- **Learn more about Interface API?** See [API_FEATURES.md](./API_FEATURES.md)
- **Deploy tools?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
