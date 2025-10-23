# Simply-MCP Interface API - Quick Reference Guide

**Level**: Beginner to Intermediate
**Time to Read**: 10 minutes
**Based On**: v3.2.0 testing with real-world Pokedex example

---

## What is the Interface API?

The cleanest way to build MCP servers using **pure TypeScript interfaces**. No decorators, no boilerplate, just types.

```typescript
// That's it! No decorators, no classes wrapping
import type { ITool, IServer } from 'simply-mcp';

interface GreetTool extends ITool {
  name: 'greet';
  params: { name: string };
  result: { greeting: string };
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
}

export default class MyServer implements MyServer {
  greet: GreetTool = async (params) => ({
    greeting: `Hello, ${params.name}!`
  });
}
```

**Run it**:
```bash
npx simply-mcp run server.ts
```

---

## Core Concepts

### 1. **Server Definition**

Define your server's metadata:

```typescript
import type { IServer } from 'simply-mcp';

interface MyServer extends IServer {
  name: 'my-server';           // Required: kebab-case
  version: '1.0.0';            // Required: semver
  description: 'My MCP server'; // Optional
}

export default class MyServer implements MyServer {
  // Tools, prompts, resources go here
}
```

### 2. **Tools** - Callable Functions

Tools are functions that Claude can call to perform actions.

```typescript
import type { ITool } from 'simply-mcp';

// Define the tool interface
interface GetWeatherTool extends ITool {
  name: 'get_weather';  // Required: snake_case
  description: 'Get weather for a location'; // Required
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit'; // Optional parameter
  };
  result: {
    temperature: number;
    conditions: string;
  };
}

// Implement in your server class
export default class WeatherServer implements IServer {
  // Method name: camelCase version of tool name (get_weather → getWeather)
  getWeather: GetWeatherTool = async (params) => {
    // Full type safety on params and return value!
    return {
      temperature: 72,
      conditions: 'Sunny'
    };
  };
}
```

**Key Points**:
- Tool name in interface: `snake_case` (e.g., `get_weather`)
- Method name in class: `camelCase` (e.g., `getWeather`)
- Parameters and return types inferred from interface
- Full TypeScript IntelliSense support

### 3. **Prompts** - Static Templates

Prompts are templates with placeholders that Claude uses.

#### Static Prompt (No Implementation Needed)

```typescript
import type { IPrompt } from 'simply-mcp';

interface WeatherReportPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate a weather report';
  args: {
    location: string;
    style?: 'casual' | 'formal';
  };
  template: 'Write a {style} weather report for {location}.';
}

// That's it! No implementation needed in your server class.
// The template is automatically extracted.
```

#### Dynamic Prompt (With Implementation)

When you need runtime logic (like current time, randomization, etc.):

```typescript
import type { IPrompt } from 'simply-mcp';

interface GreetingPrompt extends IPrompt {
  name: 'greeting';
  description: 'Generate a personalized greeting';
  args: {
    userName: string;
  };
  dynamic: true; // Mark as dynamic
}

export default class MyServer implements IServer {
  // Method name: camelCase version of prompt name
  greeting = (args: any) => {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 'evening';
    return `Good ${timeOfDay}, ${args.userName}!`;
  };
}
```

**Key Points**:
- Static prompts: Define `template` in interface, no method needed
- Dynamic prompts: Set `dynamic: true`, implement as method
- Method name: camelCase version of prompt name
- Access arguments through the method parameter

### 4. **Resources** - Static Data Files

Resources provide data that Claude can reference.

#### Static Resource

```typescript
import type { IResource } from 'simply-mcp';

interface ConfigResource extends IResource {
  uri: 'config://app';           // Unique identifier
  name: 'App Configuration';      // Display name
  description: 'Application config'; // User-friendly description
  mimeType: 'application/json';   // Content type
  data: {                         // Static data (no method needed)
    apiVersion: '2.0';
    features: ['tools', 'resources'];
  };
}

// That's it! No implementation needed. Data is auto-extracted.
```

#### Dynamic Resource

```typescript
import type { IResource } from 'simply-mcp';

interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  description: 'Real-time server stats';
  mimeType: 'application/json';
  dynamic: true;  // Mark as dynamic
  data?: {        // Optional - describes the return type
    requestCount: number;
    uptime: number;
  };
}

export default class MyServer implements IServer {
  // Method: Use URI as property name
  ['stats://server'] = async () => ({
    requestCount: await getRequestCount(),
    uptime: process.uptime()
  });
}
```

#### HTML Resource

```typescript
interface GuideResource extends IResource {
  uri: 'guides://help';
  name: 'Help Guide';
  mimeType: 'text/html';
  dynamic: true;
}

export default class MyServer implements IServer {
  ['guides://help'] = async () => `
    <html>
      <h1>User Guide</h1>
      <p>How to use this service...</p>
    </html>
  `;
}
```

**Key Points**:
- Static resources: Define `data` in interface, no method needed
- Dynamic resources: Set `dynamic: true`, implement with URI as property name
- Supported MIME types: `application/json`, `text/html`, `text/markdown`, `text/plain`
- Use square bracket notation for dynamic resource methods

---

## Full Example: Multi-Tool Server

Here's a real example with multiple tools and resources:

```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// ============= TOOL DEFINITIONS =============

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

interface ListUsersTool extends ITool {
  name: 'list_users';
  description: 'List all users with pagination';
  params: {
    page?: number;
    limit?: number;
  };
  result: {
    users: Array<{ id: number; name: string }>;
    total: number;
    page: number;
  };
}

// ============= PROMPT DEFINITIONS =============

interface UserSummaryPrompt extends IPrompt {
  name: 'user_summary';
  description: 'Generate user summary';
  args: {
    userName: string;
    style?: 'brief' | 'detailed';
  };
  template: 'Create a {style} summary of user {userName}.';
}

// ============= RESOURCE DEFINITIONS =============

interface UsersDatabaseResource extends IResource {
  uri: 'database://users';
  name: 'Users Database';
  mimeType: 'application/json';
  data: {
    totalUsers: number;
    lastUpdated: string;
  };
}

interface ServerStatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  mimeType: 'application/json';
  dynamic: true;
  data?: {
    uptime: number;
    requestsProcessed: number;
  };
}

// ============= SERVER DEFINITION =============

interface UserServer extends IServer {
  name: 'user-api';
  version: '1.0.0';
  description: 'User management API';
}

// ============= IMPLEMENTATION =============

let requestCount = 0;
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

export default class UserServer implements UserServer {
  // Tools
  getUser: GetUserTool = async (params) => {
    requestCount++;
    const user = users.find(u => u.id === params.userId);
    if (!user) {
      throw new Error(`User ${params.userId} not found`);
    }
    return user;
  };

  listUsers: ListUsersTool = async (params) => {
    requestCount++;
    const page = params.page || 1;
    const limit = params.limit || 10;
    return {
      users: users.slice(0, limit),
      total: users.length,
      page
    };
  };

  // Dynamic resource
  ['stats://server'] = async () => ({
    uptime: process.uptime(),
    requestsProcessed: requestCount
  });
}
```

**Run it**:
```bash
npx simply-mcp run server.ts
npx simply-mcp run server.ts --dry-run
npx simply-mcp run server.ts --watch
```

---

## Naming Conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Tool name (interface) | `snake_case` | `get_weather` |
| Tool method (class) | `camelCase` | `getWeather` |
| Prompt name (interface) | `snake_case` | `weather_report` |
| Prompt method (class) | `camelCase` | `weatherReport` |
| Resource URI | `scheme://path` | `pokemon://database` |
| Resource method | `[uri]` syntax | `['pokemon://database']` |
| Server name | `kebab-case` | `weather-service` |
| Server version | Semantic | `1.0.0` |

---

## Advanced Patterns

### Using Optional Parameters

```typescript
interface SearchTool extends ITool {
  name: 'search';
  params: {
    query: string;
    limit?: number;           // Optional
    offset?: number;          // Optional
    filters?: string[];       // Optional array
  };
  result: { results: any[] };
}
```

### Typed Prompt Arguments

```typescript
interface MyPrompt extends IPrompt {
  name: 'analyze';
  args: {
    topic: string;
    format: 'json' | 'markdown' | 'html'; // Limited choices
    depth?: 'shallow' | 'deep';
  };
  template: 'Analyze {topic} in {format} with {depth} analysis.';
}
```

### Resource with Markdown

```typescript
interface MarkdownResource extends IResource {
  uri: 'docs://guide';
  name: 'Documentation';
  mimeType: 'text/markdown';
  data?: never; // Indicate we'll provide in method
  dynamic: true;
}

export default class Server implements IServer {
  ['docs://guide'] = async () => `
# User Guide

## Getting Started

1. First step
2. Second step
  `;
}
```

### Error Handling in Tools

```typescript
interface GetUserTool extends ITool {
  name: 'get_user';
  params: { userId: number };
  result: { user: { id: number; name: string } } | { error: string };
}

export default class Server implements IServer {
  getUser: GetUserTool = async (params) => {
    try {
      const user = await fetchUser(params.userId);
      return { user };
    } catch (error) {
      return { error: error.message };
      // OR: throw error; // Propagate to Claude
    }
  };
}
```

---

## Common Mistakes

### ❌ Wrong: Tool name casing

```typescript
// ❌ Don't use camelCase in tool interface
interface GetWeatherTool extends ITool {
  name: 'getWeather'; // Wrong! Use snake_case
  // ...
}
```

### ✅ Correct: Tool name casing

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather'; // Correct!
  // ...
}
```

### ❌ Wrong: Mismatched method name

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  // ...
}

export default class Server implements IServer {
  // ❌ Wrong method name
  get_weather: GetWeatherTool = async (params) => {
    // Won't be called - wrong naming convention
  };
}
```

### ✅ Correct: Method name

```typescript
export default class Server implements IServer {
  // ✅ Correct - camelCase method
  getWeather: GetWeatherTool = async (params) => {
    // This will be called
  };
}
```

---

## Testing Your Server

### Dry Run (Validate without starting)

```bash
npx simply-mcp run server.ts --dry-run
```

Shows:
- Server configuration
- All tools with descriptions
- All prompts with argument types
- All resources with URIs
- Any validation warnings

### Watch Mode (Auto-reload on changes)

```bash
npx simply-mcp run server.ts --watch
```

### With Claude CLI

```bash
# Create configuration
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "myserver": {
      "command": "npx",
      "args": ["simply-mcp", "run", "server.ts"]
    }
  }
}
EOF

# Use with Claude
claude --mcp-config .mcp.json --permission-mode bypassPermissions
```

Then ask Claude to use your tools!

---

## Best Practices

### 1. Always Document Your Tools

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather conditions for a location. ' +
               'Returns temperature, conditions, and wind speed.'; // Detailed!
  params: {
    location: string; // What format? City name? Coordinates?
    units?: 'celsius' | 'fahrenheit'; // Why optional? What's default?
  };
  result: {
    temperature: number;   // In which unit?
    conditions: string;    // What values are possible?
    windSpeed: number;     // In km/h or mph?
  };
}
```

### 2. Use Union Types for Flexibility

```typescript
interface SearchTool extends ITool {
  name: 'search';
  params: {
    query: string | string[]; // Accept single or multiple queries
    sortBy?: 'relevance' | 'date' | 'popularity';
  };
  result: {
    results: Array<{
      id: string;
      title: string;
      score: number;
    }>;
  };
}
```

### 3. Consider Error Handling

```typescript
// Option 1: Return error result
result: { success: boolean; data?: any; error?: string };

// Option 2: Throw error (Claude will handle)
// throw new Error('User not found');
```

### 4. Keep Resources Lightweight

- Large data → implement as dynamic to control response
- Static data → define in interface for zero runtime overhead
- HTML/UI → use dynamic to avoid excessive code in interface

---

## Troubleshooting

### "Tool not found" error

**Check**:
1. Is method name camelCase? (get_weather → getWeather)
2. Is interface name exactly as declared?
3. Run `npx simply-mcp run server.ts --dry-run` to see registered tools

### "Prompt arguments not recognized"

**Check**:
1. Are args defined in IPrompt interface?
2. Is template string using {placeholders}?
3. Run dry-run to see what prompt args are registered

### "Resource URI not working"

**Check**:
1. Is URI in format `scheme://path`?
2. Is method property name in `[uri]` brackets?
3. Does method return correct MIME type content?

---

## Next Steps

1. **Read the main README** - Overview of all 4 API styles
2. **Check examples** - Look at real-world servers in `simply-mcp/examples/`
3. **Explore advanced topics** - Context system, lifecycle management
4. **Test with Claude** - Use `--mcp-config` and `--permission-mode bypassPermissions`

---

## Resources

- **Official Repo**: https://github.com/Clockwork-Innovations/simply-mcp-ts
- **NPM Package**: https://www.npmjs.com/package/simply-mcp
- **Documentation**: Linked from README
- **Examples**: 27+ production examples in repository

---

**Made with ❤️ by testing the simply-mcp beta.**

