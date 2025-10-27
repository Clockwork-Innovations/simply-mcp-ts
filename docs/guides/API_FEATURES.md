# API Features

Tools, parameters, prompts, and resources for building MCP servers.

## Table of Contents

- [ITool](#itool)
- [IParam](#iparam)
- [Prompts: Static and Dynamic](#prompts-static-and-dynamic)
- [Resources: Static and Dynamic](#resources-static-and-dynamic)
- [Related Guides](#related-guides)

---

## ITool

```typescript
interface ITool {
  name: string;              // Tool name (camelCase or snake_case - auto-normalized)
  description: string;       // Tool description
  params: Record<string, any>;  // Parameter types
  result: any;               // Return type
}
```

**Tool Name Normalization:**
- Tool names can be written in `camelCase` (e.g., `'getWeather'`) or `snake_case` (e.g., `'get_weather'`)
- Both are automatically normalized to `snake_case` for MCP compliance
- This allows you to use natural TypeScript naming conventions

Implement as class method with camelCase name.

## IParam

`IParam` provides structured parameter definitions with explicit types, descriptions, and validation constraints. This **improves LLM accuracy** by providing richer metadata in the generated JSON Schema.

The IParam interface uses an explicit `type` field for type discrimination:

```typescript
// Single unified interface - all params extend this
interface IParam {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  description: string;       // Parameter description (required)
  required?: boolean;        // Is required (default: true)

  // String-specific fields
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'url' | 'uuid' | 'date-time' | 'uri' | 'ipv4' | 'ipv6';
  pattern?: string;          // Regex pattern
  enum?: string[];           // Allowed values

  // Number-specific fields
  min?: number;              // Inclusive minimum
  max?: number;              // Inclusive maximum
  exclusiveMin?: number;     // Exclusive minimum
  exclusiveMax?: number;     // Exclusive maximum
  multipleOf?: number;

  // Array-specific fields
  items?: IParam;            // Schema for array items
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object-specific fields
  properties?: Record<string, IParam>;
  requiredProperties?: string[];
  additionalProperties?: boolean;
}
```

**Basic Usage:**

```typescript
import type { IParam, ITool } from 'simply-mcp';

interface NameParam extends IParam {
  type: 'string';
  description: 'User full name';
  minLength: 1;
  maxLength: 100;
}

interface AgeParam extends IParam {
  type: 'integer';
  description: 'User age in years';
  min: 0;
  max: 150;
}

interface GreetTool extends ITool {
  name: 'greet_user';
  description: 'Greet a user';
  params: {
    name: NameParam;         // Structured parameter
    age: AgeParam;           // Structured parameter
    formal?: boolean;        // Can mix simple types
  };
  result: string;
}
```

**Why Use IParam:**

1. **Better LLM Accuracy**: Explicit types and descriptions help LLMs understand parameters
2. **Runtime Validation**: Constraints are enforced via Zod schemas
3. **Self-Documenting**: Validation rules visible in type definitions
4. **Type Discrimination**: The `type` field enables precise type checking
5. **IDE Support**: Full autocomplete for type-specific constraints
6. **Backward Compatible**: Mix with simple TypeScript types

**String Validation Examples:**

```typescript
// Basic string with length constraints
interface UsernameParam extends IParam {
  type: 'string';
  description: 'Username (alphanumeric only)';
  minLength: 3;
  maxLength: 20;
  pattern: '^[a-zA-Z0-9]+$';
}

// Email format validation
interface EmailParam extends IParam {
  type: 'string';
  description: 'Email address for notifications';
  required: false;
  format: 'email';
}

// URL with pattern constraint
interface ApiUrlParam extends IParam {
  type: 'string';
  description: 'API endpoint URL';
  format: 'uri';
  pattern: '^https://';
}

// String enum (restricted values)
interface RoleParam extends IParam {
  type: 'string';
  description: 'User role';
  enum: ['admin', 'user', 'guest'];
}
```

**Number Validation Examples:**

```typescript
// Integer with inclusive range
interface PortParam extends IParam {
  type: 'integer';
  description: 'Server port number';
  min: 1024;
  max: 65535;
}

// Float with exclusive bounds
interface PercentageParam extends IParam {
  type: 'number';
  description: 'Percentage value';
  exclusiveMin: 0;    // Must be > 0
  exclusiveMax: 100;  // Must be < 100
}

// Temperature with minimum
interface TemperatureParam extends IParam {
  type: 'number';
  description: 'Temperature in Celsius';
  min: -273.15;       // Absolute zero
  multipleOf: 0.1;    // One decimal place
}
```

**Available Constraint Properties:**

| Type | Constraint | Description |
|------|------------|-------------|
| `string` | `minLength`, `maxLength` | String length bounds |
| `string` | `pattern` | Regex validation pattern |
| `string` | `format` | Built-in formats: `email`, `uri`, `date-time` |
| `string` | `enum` | Allowed values list |
| `number`, `integer` | `min`, `max` | Inclusive bounds |
| `number`, `integer` | `exclusiveMin`, `exclusiveMax` | Exclusive bounds |
| `number`, `integer` | `multipleOf` | Value must be multiple of this |
| `array` | `minItems`, `maxItems` | Array size bounds |
| `array` | `uniqueItems` | Require unique elements |
| `array` | `items` | Schema for array elements |
| `object` | `properties` | Property schemas |
| `object` | `requiredProperties` | Required property names |
| `object` | `additionalProperties` | Allow extra properties |
| All types | `required` | Whether parameter is required (default: `true`) |
| All types | `default` | Default value if not provided |

**Complete Example:**

```typescript
interface LocationParam extends IParam {
  type: 'string';
  description: 'City or location name';
  minLength: 1;
  maxLength: 100;
}

interface DaysParam extends IParam {
  type: 'integer';
  description: 'Number of forecast days';
  required: false;
  min: 1;
  max: 14;
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: {
    location: LocationParam;
    days: DaysParam;
  };
  result: Array<{ date: string; temp: number }>;
}

export default class WeatherServer implements IServer {
  name: 'weather-service';
  version: '1.0.0';

  getForecast: GetForecastTool = async ({ location, days = 7 }) => {
    // Implementation
    return [];
  };
}
```

**See Also:** [examples/interface-params.ts](../../examples/interface-params.ts)

## Prompts: Static and Dynamic

Prompts can be static (template-based) or dynamic (runtime-generated).

### Static Prompts

Static prompts use a template string defined in the interface. No method implementation is needed.

```typescript
import type { IPrompt } from 'simply-mcp';

interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate a code review';
  args: {
    language: string;
    code: string;
    style?: 'detailed' | 'brief';
  };
  template: 'Review this {language} code in a {style} style:\n\n{code}';
}

// No implementation needed - template is extracted automatically
```

**Use static prompts when:**
- The prompt structure is fixed
- Placeholders are sufficient
- No runtime logic is needed

### Dynamic Prompts

Dynamic prompts require runtime logic to generate the prompt string.

```typescript
import type { IPrompt, IServer } from 'simply-mcp';

interface TimeBasedGreetingPrompt extends IPrompt {
  name: 'time_based_greeting';
  description: 'Generate a greeting based on current time';
  args: {
    userName: string;
    formal?: boolean;
  };
  dynamic: true;  // Mark as dynamic
}

interface MyServer extends IServer {
  name: 'greeting-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  // Method name: camelCase conversion of prompt name
  timeBasedGreeting = (args: any) => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const greeting = args.formal ? 'Good' : 'Hey';

    return `${greeting} ${timeOfDay}, ${args.userName}! How can I assist you today?`;
  };
}
```

**Use dynamic prompts when:**
- Prompts need current date/time
- Randomization is required
- Conditional logic determines prompt content
- External data affects the prompt

---

## Resources: Static and Dynamic

Resources provide data to Claude in various formats. They can be static (defined at compile time) or dynamic (generated at runtime).

### Static Resources

Static resources have data defined directly in the interface. No method implementation is needed.

```typescript
import type { IResource } from 'simply-mcp';

interface AppConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Configuration';
  description: 'App settings and metadata';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['auth', 'logging', 'caching'];
    maxConnections: 100;
  };
}

interface DocumentationResource extends IResource {
  uri: 'docs://readme';
  name: 'README Documentation';
  description: 'Project documentation';
  mimeType: 'text/markdown';
  data: `# Project Documentation

## Overview
This is the project documentation...`;
}

// No implementation needed - data is extracted automatically
```

**Supported MIME Types:**
- `application/json` - JSON data
- `text/html` - HTML content
- `text/markdown` - Markdown content
- `text/plain` - Plain text

### Dynamic Resources

Dynamic resources generate content at runtime using bracket notation methods.

```typescript
import type { IResource, IServer } from 'simply-mcp';

interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  description: 'Real-time server metrics';
  mimeType: 'application/json';
  dynamic: true;
  data?: {
    uptime: number;
    requests: number;
    memoryUsage: number;
  };
}

interface DashboardResource extends IResource {
  uri: 'dashboard://main';
  name: 'Dashboard';
  description: 'HTML dashboard with live stats';
  mimeType: 'text/html';
  dynamic: true;
}

interface MyServer extends IServer {
  name: 'monitoring-server';
  version: '1.0.0';
}

let requestCount = 0;
const startTime = Date.now();

export default class MyServer implements MyServer {
  // Method uses URI as property name with bracket notation
  ['stats://server'] = async () => {
    return {
      uptime: Math.floor((Date.now() - startTime) / 1000),
      requests: requestCount,
      memoryUsage: process.memoryUsage().heapUsed
    };
  };

  ['dashboard://main'] = async () => {
    const stats = await this['stats://server']();
    return `
      <!DOCTYPE html>
      <html>
        <head><title>Server Dashboard</title></head>
        <body>
          <h1>Server Statistics</h1>
          <ul>
            <li>Uptime: ${stats.uptime}s</li>
            <li>Requests: ${stats.requests}</li>
            <li>Memory: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB</li>
          </ul>
        </body>
      </html>
    `;
  };
}
```

**Use static resources when:**
- Data is fixed and known at compile time
- Configuration or metadata doesn't change
- Performance is critical (zero runtime overhead)

**Use dynamic resources when:**
- Data changes at runtime
- Current state needs to be reflected
- External systems need to be queried
- HTML/UI generation is required

---

## Related Guides

- [API Core](./API_CORE.md) - Basic API structure
- [API Protocol](./API_PROTOCOL.md) - Protocol features
- [Tools Guide](./TOOLS.md) - Detailed tool documentation
- [Prompts Guide](./PROMPTS.md) - Detailed prompt documentation
- [Resources Guide](./RESOURCES.md) - Detailed resource documentation

