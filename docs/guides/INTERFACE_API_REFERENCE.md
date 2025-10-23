# Interface API Reference

Type-safe API with strict TypeScript interfaces - best for critical applications.

**Quick Facts:**
- Full type safety with interfaces
- Strictest validation at compile time
- Excellent IDE support
- Best for: Enterprise teams, type-safe requirements

**See it in action:** [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

---

## Basic Structure

The Interface API uses TypeScript interfaces to define MCP primitives (tools, prompts, resources) and a class to implement them.

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Define tool interface
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: { name: string };
  result: { greeting: string };
}

// Define server interface
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

// Implement server
export default class MyServer implements MyServer {
  greet: GreetTool = async (params) => ({
    greeting: `Hello, ${params.name}!`
  });
}
```

**Run**: `npx simply-mcp run server.ts`

---

## Core Types

### IServer

```typescript
interface IServer {
  name: string;              // Server name (kebab-case)
  version: string;           // Semantic version
  description?: string;      // Optional description
}
```

### ITool

```typescript
interface ITool {
  name: string;              // Tool name (snake_case)
  description: string;       // Tool description
  params: Record<string, any>;  // Parameter types
  result: any;               // Return type
}
```

Implement as class method with camelCase name.

### Prompts: Static and Dynamic

Prompts can be static (template-based) or dynamic (runtime-generated).

#### Static Prompts

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

#### Dynamic Prompts

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

#### Static Resources

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

#### Dynamic Resources

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

## Naming Conventions

The Interface API uses a specific naming convention mapping between interface definitions and method implementations:

| Interface Type | Convention | Example Interface | Example Method |
|---------------|------------|-------------------|----------------|
| Tool name | snake_case | `name: 'get_weather'` | `getWeather()` |
| Prompt name | snake_case | `name: 'weather_report'` | `weatherReport()` |
| Resource URI | URI format | `uri: 'config://app'` | `['config://app']()` |
| Server name | kebab-case | `name: 'my-server'` | N/A |

### Complete Example

```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// Tool: snake_case in interface
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  params: { city: string };
  result: { temp: number };
}

// Prompt: snake_case in interface
interface WeatherReportPrompt extends IPrompt {
  name: 'weather_report';
  args: { city: string };
  template: 'Write a weather report for {city}';
}

// Resource: URI format
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Configuration';
  mimeType: 'application/json';
  data: { version: string };
}

interface MyServer extends IServer {
  name: 'weather-service';  // kebab-case
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  // Tool method: camelCase
  getWeather: GetWeatherTool = async (params) => {
    return { temp: 72 };
  };

  // Prompt is static - no method needed

  // Resource method: bracket notation with URI
  ['config://app'] = async () => {
    return { version: '1.0.0' };
  };
}
```

---

## Multi-Tool Servers

Building a server with multiple tools demonstrates naming consistency and type safety across all operations.

```typescript
import type { ITool, IServer } from 'simply-mcp';

// Define multiple tools with different parameter patterns
interface GetUserTool extends ITool {
  name: 'get_user';
  description: 'Get user information by ID';
  params: {
    userId: number;
  };
  result: {
    id: number;
    name: string;
    email: string;
  };
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user';
  params: {
    name: string;
    email: string;
    role?: 'admin' | 'user';  // Optional with specific values
  };
  result: {
    id: number;
    created: boolean;
  };
}

interface SearchUsersTool extends ITool {
  name: 'search_users';
  description: 'Search users with filters';
  params: {
    query: string;
    limit?: number;           // Optional numeric
    offset?: number;          // Optional numeric
    includeInactive?: boolean; // Optional boolean
  };
  result: {
    users: Array<{ id: number; name: string; email: string }>;
    total: number;
  };
}

interface DeleteUserTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user by ID';
  params: {
    userId: number;
    confirm: boolean;
  };
  result: {
    deleted: boolean;
    message: string;
  };
}

interface UserServer extends IServer {
  name: 'user-management';
  version: '1.0.0';
  description: 'User management API server';
}

// In-memory user database
const users = new Map<number, { id: number; name: string; email: string; role: string }>();
let nextId = 1;

export default class UserServer implements UserServer {
  // Tool implementations use camelCase
  getUser: GetUserTool = async (params) => {
    const user = users.get(params.userId);
    if (!user) {
      throw new Error(`User ${params.userId} not found`);
    }
    return { id: user.id, name: user.name, email: user.email };
  };

  createUser: CreateUserTool = async (params) => {
    const id = nextId++;
    users.set(id, {
      id,
      name: params.name,
      email: params.email,
      role: params.role || 'user'
    });
    return { id, created: true };
  };

  searchUsers: SearchUsersTool = async (params) => {
    const limit = params.limit || 10;
    const offset = params.offset || 0;

    let results = Array.from(users.values()).filter(user =>
      user.name.toLowerCase().includes(params.query.toLowerCase()) ||
      user.email.toLowerCase().includes(params.query.toLowerCase())
    );

    return {
      users: results.slice(offset, offset + limit).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email
      })),
      total: results.length
    };
  };

  deleteUser: DeleteUserTool = async (params) => {
    if (!params.confirm) {
      return {
        deleted: false,
        message: 'Deletion not confirmed'
      };
    }

    const existed = users.delete(params.userId);
    return {
      deleted: existed,
      message: existed ? 'User deleted successfully' : 'User not found'
    };
  };
}
```

**Key Points:**
- Each tool interface extends `ITool` with unique parameters
- Method names convert `snake_case` to `camelCase`
- Optional parameters use `?` notation
- Consistent type safety across all tools

---

## Comparison with Other APIs

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Setup lines | 3 | 10 | 15 | 8 |
| Type safety | Good | Good | Excellent | Good |
| Verbosity | Low | Low | High | Medium |
| Compile-time validation | ✅ | ✅ | ✅ | ✅ |

**See all APIs:** [API_GUIDE.md](./API_GUIDE.md)

---

## Examples

### Minimal Server
[examples/interface-minimal.ts](../../examples/interface-minimal.ts)

### Advanced Features
[examples/interface-advanced.ts](../../examples/interface-advanced.ts)

### Comprehensive Setup
[examples/interface-comprehensive.ts](../../examples/interface-comprehensive.ts)

---

## Running

```bash
# Basic run
npx tsx server.ts

# With CLI wrapper
npx simply-mcp run server.ts

# HTTP transport
npx simply-mcp run server.ts --http --port 3000

# Watch mode
npx simply-mcp run server.ts --watch
```

---

## When to Use This API

✅ **Use if:**
- You need strict type safety
- Your team has TypeScript standards
- Building critical applications
- You want compile-time validation

❌ **Don't use if:**
- Learning MCP for the first time → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- You prefer class-based code → Use [Decorator API](./DECORATOR_API_REFERENCE.md)
- You need simpler setup → Use [Functional API](./FUNCTIONAL_API_REFERENCE.md)

---

## Common Patterns

### Error Handling

Tools can handle errors in two ways: returning error objects or throwing exceptions.

#### Return Error Objects

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface GetDataTool extends ITool {
  name: 'get_data';
  description: 'Get data with error handling';
  params: {
    id: number;
  };
  result: {
    success: boolean;
    data?: { id: number; value: string };
    error?: string;
  };
}

interface MyServer extends IServer {
  name: 'data-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  getData: GetDataTool = async (params) => {
    // Validate input
    if (params.id < 0) {
      return {
        success: false,
        error: 'ID must be positive'
      };
    }

    // Simulate data retrieval
    try {
      const data = await fetchData(params.id);
      return {
        success: true,
        data: { id: params.id, value: data }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
}

async function fetchData(id: number): Promise<string> {
  return `Data for ID ${id}`;
}
```

**Use return error objects when:**
- Errors are expected and part of normal flow
- Claude should handle the error gracefully
- You want to provide structured error information

#### Throw Exceptions

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface ProcessDataTool extends ITool {
  name: 'process_data';
  description: 'Process data with exception handling';
  params: {
    data: string;
  };
  result: {
    processed: string;
    timestamp: number;
  };
}

interface MyServer extends IServer {
  name: 'processor-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  processData: ProcessDataTool = async (params) => {
    // Throw for validation errors
    if (!params.data || params.data.trim() === '') {
      throw new Error('Data cannot be empty');
    }

    // Throw for unexpected errors
    if (params.data.length > 10000) {
      throw new Error('Data exceeds maximum length of 10000 characters');
    }

    // Normal processing
    return {
      processed: params.data.toUpperCase(),
      timestamp: Date.now()
    };
  };
}
```

**Use thrown exceptions when:**
- Errors are unexpected or exceptional
- Operation cannot complete meaningfully
- Standard error propagation is desired
- Client should be notified of failure immediately

#### Async Error Handling

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface FetchUserTool extends ITool {
  name: 'fetch_user';
  description: 'Fetch user with comprehensive error handling';
  params: {
    userId: number;
  };
  result: {
    id: number;
    name: string;
    email: string;
  };
}

interface MyServer extends IServer {
  name: 'user-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  fetchUser: FetchUserTool = async (params) => {
    try {
      // Simulate async database call
      const user = await this.queryDatabase(params.userId);

      if (!user) {
        throw new Error(`User ${params.userId} not found`);
      }

      return user;
    } catch (error) {
      // Re-throw with context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
      throw new Error('Failed to fetch user: Unknown error');
    }
  };

  private async queryDatabase(userId: number) {
    // Simulate database query
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com'
    };
  }
}
```

---

## Complete Example: Multi-Feature Server

A comprehensive example demonstrating all features: multiple tools, static/dynamic prompts, static/dynamic resources, proper naming conventions, and error handling.

```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
  };
  result: {
    location: string;
    temperature: number;
    conditions: string;
    humidity: number;
  };
}

interface SearchLocationsTool extends ITool {
  name: 'search_locations';
  description: 'Search for locations matching a query';
  params: {
    query: string;
    limit?: number;
  };
  result: {
    locations: Array<{
      name: string;
      country: string;
      coordinates: { lat: number; lon: number };
    }>;
    count: number;
  };
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast for upcoming days';
  params: {
    location: string;
    days?: number;
  };
  result: {
    location: string;
    forecast: Array<{
      date: string;
      high: number;
      low: number;
      conditions: string;
    }>;
  };
}

// ============================================================================
// PROMPT DEFINITIONS
// ============================================================================

interface WeatherReportPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate a weather report';
  args: {
    location: string;
    style?: 'casual' | 'formal' | 'technical';
  };
  template: 'Create a {style} weather report for {location}. Include current conditions and forecast.';
}

interface WeatherAlertPrompt extends IPrompt {
  name: 'weather_alert';
  description: 'Generate real-time weather alert';
  args: {
    location: string;
    severity?: 'low' | 'medium' | 'high';
  };
  dynamic: true;
}

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

interface LocationDatabaseResource extends IResource {
  uri: 'weather://locations/database';
  name: 'Location Database';
  description: 'Available weather locations';
  mimeType: 'application/json';
  data: {
    totalLocations: number;
    regions: string[];
    lastUpdated: string;
  };
}

interface ServerStatsResource extends IResource {
  uri: 'weather://stats/server';
  name: 'Server Statistics';
  description: 'Real-time server metrics';
  mimeType: 'application/json';
  dynamic: true;
  data?: {
    uptime: number;
    requests: number;
    cacheHits: number;
  };
}

interface WeatherDashboardResource extends IResource {
  uri: 'weather://dashboard/main';
  name: 'Weather Dashboard';
  description: 'Interactive weather dashboard';
  mimeType: 'text/html';
  dynamic: true;
}

// ============================================================================
// SERVER DEFINITION
// ============================================================================

interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '1.0.0';
  description: 'Comprehensive weather information service';
}

// ============================================================================
// DATA LAYER
// ============================================================================

interface WeatherData {
  temperature: number;
  conditions: string;
  humidity: number;
}

const weatherCache = new Map<string, WeatherData>();
const locations = [
  { name: 'New York', country: 'USA', coordinates: { lat: 40.7128, lon: -74.0060 } },
  { name: 'London', country: 'UK', coordinates: { lat: 51.5074, lon: -0.1278 } },
  { name: 'Tokyo', country: 'Japan', coordinates: { lat: 35.6762, lon: 139.6503 } },
  { name: 'Paris', country: 'France', coordinates: { lat: 48.8566, lon: 2.3522 } },
  { name: 'Sydney', country: 'Australia', coordinates: { lat: -33.8688, lon: 151.2093 } }
];

let requestCount = 0;
let cacheHits = 0;
const serverStartTime = Date.now();

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class WeatherServer implements WeatherServer {
  // ==================== TOOLS ====================

  getWeather: GetWeatherTool = async (params) => {
    requestCount++;

    // Check cache
    const cacheKey = `${params.location}-${params.units || 'celsius'}`;
    if (weatherCache.has(cacheKey)) {
      cacheHits++;
      const cached = weatherCache.get(cacheKey)!;
      return {
        location: params.location,
        ...cached
      };
    }

    // Simulate weather API call
    const temperature = params.units === 'fahrenheit'
      ? Math.floor(Math.random() * 40) + 50  // 50-90°F
      : Math.floor(Math.random() * 20) + 10; // 10-30°C

    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][
      Math.floor(Math.random() * 4)
    ];

    const data: WeatherData = {
      temperature,
      conditions,
      humidity: Math.floor(Math.random() * 40) + 40 // 40-80%
    };

    // Cache the result
    weatherCache.set(cacheKey, data);

    return {
      location: params.location,
      ...data
    };
  };

  searchLocations: SearchLocationsTool = async (params) => {
    requestCount++;

    const query = params.query.toLowerCase();
    const limit = params.limit || 5;

    const results = locations.filter(loc =>
      loc.name.toLowerCase().includes(query) ||
      loc.country.toLowerCase().includes(query)
    ).slice(0, limit);

    if (results.length === 0) {
      throw new Error(`No locations found matching "${params.query}"`);
    }

    return {
      locations: results,
      count: results.length
    };
  };

  getForecast: GetForecastTool = async (params) => {
    requestCount++;

    const days = params.days || 5;

    if (days < 1 || days > 10) {
      throw new Error('Days must be between 1 and 10');
    }

    const forecast = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);

      return {
        date: date.toISOString().split('T')[0],
        high: Math.floor(Math.random() * 15) + 20, // 20-35°C
        low: Math.floor(Math.random() * 10) + 10,  // 10-20°C
        conditions: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][
          Math.floor(Math.random() * 4)
        ]
      };
    });

    return {
      location: params.location,
      forecast
    };
  };

  // ==================== PROMPTS ====================

  // Static prompt (weatherReport) - no implementation needed

  // Dynamic prompt
  weatherAlert = (args: any) => {
    const severity = args.severity || 'medium';
    const timestamp = new Date().toLocaleString();

    const severityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🔴'
    }[severity];

    return `${severityEmoji} WEATHER ALERT for ${args.location}
Generated: ${timestamp}
Severity: ${severity.toUpperCase()}

Provide current weather conditions and any warnings for ${args.location}.
${severity === 'high' ? 'Focus on immediate safety concerns and precautions.' :
  severity === 'medium' ? 'Include notable weather changes.' :
  'Brief overview of conditions.'}`;
  };

  // ==================== RESOURCES ====================

  // Static resource data defined in interface - no implementation needed

  // Dynamic resource: Server stats
  ['weather://stats/server'] = async () => {
    return {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      requests: requestCount,
      cacheHits: cacheHits
    };
  };

  // Dynamic resource: HTML dashboard
  ['weather://dashboard/main'] = async () => {
    const stats = await this['weather://stats/server']();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weather Service Dashboard</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .card {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
              padding: 20px;
              margin: 15px 0;
              backdrop-filter: blur(10px);
            }
            h1 { margin-top: 0; }
            .stat {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 18px;
            }
            .locations {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 10px;
            }
            .location-card {
              background: rgba(255, 255, 255, 0.15);
              padding: 15px;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <h1>🌤️ Weather Service Dashboard</h1>

          <div class="card">
            <h2>Server Statistics</h2>
            <div class="stat">
              <span>Uptime:</span>
              <strong>${stats.uptime}s</strong>
            </div>
            <div class="stat">
              <span>Total Requests:</span>
              <strong>${stats.requests}</strong>
            </div>
            <div class="stat">
              <span>Cache Hits:</span>
              <strong>${stats.cacheHits} (${stats.requests > 0 ? Math.round(stats.cacheHits / stats.requests * 100) : 0}%)</strong>
            </div>
          </div>

          <div class="card">
            <h2>Available Locations</h2>
            <div class="locations">
              ${locations.map(loc => `
                <div class="location-card">
                  <strong>${loc.name}</strong><br>
                  ${loc.country}<br>
                  <small>${loc.coordinates.lat.toFixed(2)}, ${loc.coordinates.lon.toFixed(2)}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <h2>Available Tools</h2>
            <ul>
              <li><strong>get_weather</strong> - Get current weather</li>
              <li><strong>search_locations</strong> - Search locations</li>
              <li><strong>get_forecast</strong> - Get weather forecast</li>
            </ul>
          </div>
        </body>
      </html>
    `;
  };
}
```

**This example demonstrates:**
- **3 tools** with different parameter patterns (required, optional, validation)
- **1 static prompt** (template-based)
- **1 dynamic prompt** (runtime generation with time-based logic)
- **1 static resource** (JSON configuration)
- **2 dynamic resources** (JSON stats + HTML dashboard)
- **Proper naming conventions** (snake_case → camelCase)
- **Error handling** (throw for validation, cache management)
- **Optional parameters** with defaults and conditional logic
- **Realistic data layer** with caching

**Run it:**
```bash
npx tsx server.ts
npx tsx server.ts --dry-run  # Validate without starting
```

---

## Full Working Example

See [examples/interface-minimal.ts](../../examples/interface-minimal.ts)

```bash
npx tsx examples/interface-minimal.ts
```

---

## Next Steps

- **Need simplicity?** Try [Functional API](./FUNCTIONAL_API_REFERENCE.md)
- **Prefer classes?** Try [Decorator API](./DECORATOR_API_REFERENCE.md)
- **Need more features?** Check [TOOLS.md](./TOOLS.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
