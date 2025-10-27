# Resources Guide

Learn how to expose data resources from your MCP server using the Interface API.

**What are resources?** Data that your server exposes to clients (config, logs, files, etc.)

**Implementation requirement:**
- ❌ **Static resources** (literal `data` values): No implementation needed - served directly
- ✅ **Dynamic resources** (type annotations in `data`): Implementation required

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

---

## IResource Interface

Resources in the Interface API are defined using TypeScript interfaces that extend `IResource`:

```typescript
import type { IResource } from 'simply-mcp';

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Configuration';
  description?: 'Server metadata and settings';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['auth', 'api', 'database'];
  };
}
```

Required fields:
- **uri** - Unique identifier (e.g., `file://path`, `config://key`)
- **name** - Human-readable name
- **mimeType** - Content type (text/plain, application/json, etc.)
- **data** - The actual content (literal values or type definitions)

Optional fields:
- **description** - Additional context about the resource
- **dynamic** - Explicitly mark as dynamic (usually auto-detected)

---

## Static vs Dynamic Resources

### Static Resources

Static resources have **literal data** values - the framework extracts this data and serves it directly:

```typescript
// Static - literal string array
interface TemplatesResource extends IResource {
  uri: 'templates://search';
  name: 'Search Templates';
  mimeType: 'application/json';
  data: ['quick_search', 'advanced_search', 'semantic_search'];
}

// Static - literal object
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '3.0.0';
    features: ['tools', 'prompts', 'resources'];
    limits: {
      maxQueryLength: 1000;
      maxResults: 100;
    };
  };
}
```

**No implementation needed** - the framework serves the literal data as-is.

### Dynamic Resources

Dynamic resources have **type definitions** instead of literal values - you must implement a method to generate the data at runtime:

```typescript
// Dynamic - non-literal types require implementation
interface StatsResource extends IResource {
  uri: 'stats://search';
  name: 'Search Statistics';
  description: 'Real-time search statistics';
  mimeType: 'application/json';
  data: {
    totalSearches: number;        // Type, not literal
    averageResponseTime: number;  // Type, not literal
    topQueries: string[];         // Type, not literal
    lastUpdated: string;          // Type, not literal
  };
}

// Implementation required
class MyServer implements MyServerInterface {
  StatsResource(): StatsResource['data'] {
    return {
      totalSearches: 1250,
      averageResponseTime: 125.5,
      topQueries: ['typescript', 'mcp', 'ai'],
      lastUpdated: new Date().toISOString()
    };
  }
}
```

You can also explicitly mark a resource as dynamic:

```typescript
interface CacheResource extends IResource {
  uri: 'cache://status';
  name: 'Cache Status';
  mimeType: 'application/json';
  dynamic: true;  // Explicit flag
  data: {
    size: number;
    hits: number;
    misses: number;
  };
}
```

---

## Property Naming for Dynamic Resources

**Different from tools/prompts**: Resource properties use the **URI string directly** as the property name.

### Why URIs?

In the MCP protocol, resources are identified by their URI. When a client requests:

```json
{
  "method": "resources/read",
  "params": { "uri": "stats://requests" }
}
```

The server looks up the property with that exact URI name:

```typescript
export default class MyServer implements IServer {
  'stats://requests': StatsResource = async () => {
    // This method is called when client requests 'stats://requests'
    return { count: 42 };
  };
}
```

### Property Naming Pattern

Use the URI string exactly as written in the interface:

| URI in Interface | Property Name |
|------------------|---------------|
| `config://server` | `'config://server'` |
| `stats://requests` | `'stats://requests'` |
| `database://users` | `'database://users'` |
| `file://path/to/data` | `'file://path/to/data'` |

### Example

```typescript
// Definition
interface UserStatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Statistics';
  data: { totalUsers: number };
}

// Implementation - property name MUST match URI exactly
export default class MyServer implements IServer {
  'stats://users': UserStatsResource = async () => {
    return { totalUsers: 42 };
  };
}
```

### TypeScript String Property Syntax

In TypeScript, you can use string literals as property names:

```typescript
// Standard property
const obj = { name: 'value' };

// String property (required for URIs with special characters)
const obj = { 'config://server': value };
```

### Multiple Dynamic Resources

```typescript
export default class MyServer implements IServer {
  'stats://requests': RequestStatsResource = async () => {
    return { total: 100 };
  };

  'cache://status': CacheStatusResource = async () => {
    return { size: 50 };
  };

  'env://config': EnvConfigResource = async () => {
    return { dbUrl: process.env.DATABASE_URL };
  };
}
```

### Common Mistakes

#### Implementation Naming

❌ **Wrong** - Using camelCase like tools:
```typescript
statsRequests: StatsResource = async () => { }; // Wrong!
```

✅ **Correct** - Using URI string:
```typescript
'stats://requests': StatsResource = async () => { }; // Correct!
```

#### Python MCP SDK: Comparing URIs

When using the Python MCP SDK, resource URIs are `AnyUrl` objects, not strings:

❌ **Wrong** - Direct string comparison:
```python
resources = await session.list_resources()
for resource in resources.resources:
    if resource.uri == "ui://test/dashboard":  # This fails silently!
        print("Found dashboard")
```

✅ **Correct** - Convert to string first:
```python
resources = await session.list_resources()
for resource in resources.resources:
    if str(resource.uri) == "ui://test/dashboard":  # Works!
        print("Found dashboard")
```

**Why this matters**: The comparison `AnyUrl('ui://...') == "ui://..."` returns `False` without error, making resources appear missing when they're actually present.

---

## MIME Types

Common MIME types for resources:

```typescript
'text/plain'           // Plain text files
'text/markdown'        // Markdown files
'text/html'           // HTML content
'application/json'    // JSON data
'application/xml'     // XML data
'text/csv'            // CSV data
```

---

## URI Schemes

Standard URI patterns:

```typescript
'file://path/to/file.txt'      // File reference
'config://app/setting'          // Configuration
'database://users/table'        // Database reference
'api://endpoint/resource'       // API reference
'memory://cache/key'            // In-memory data
'stats://metrics'               // Statistics/metrics
'templates://type'              // Template data
```

---

## Common Patterns

### Documentation Resource

```typescript
interface DocsResource extends IResource {
  uri: 'doc://api-reference';
  name: 'API Reference';
  mimeType: 'text/markdown';
  data: `
# API Reference

## GET /users
Retrieve all users

### Response
\`\`\`json
[
  { "id": 1, "name": "User 1" }
]
\`\`\`

## POST /users
Create a new user
`;
}
```

### Database Schema

```typescript
interface SchemaResource extends IResource {
  uri: 'database://schema';
  name: 'Database Schema';
  mimeType: 'text/plain';
  data: `
Table: users
- id (INTEGER, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- name (VARCHAR)
- created_at (TIMESTAMP)

Table: posts
- id (INTEGER, PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- title (VARCHAR)
- content (TEXT)
- created_at (TIMESTAMP)
`;
}
```

### Feature Flags (Static)

```typescript
interface FeaturesResource extends IResource {
  uri: 'config://features';
  name: 'Feature Flags';
  mimeType: 'application/json';
  data: {
    newUI: true;
    betaAPI: false;
    analytics: true;
    maintenance: false;
  };
}
```

### Sample Data (Static)

```typescript
interface UsersResource extends IResource {
  uri: 'data://users-sample';
  name: 'Sample Users';
  mimeType: 'application/json';
  data: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'user' }
  ];
}
```

---

## How to Determine: Static vs Dynamic

### Decision Tree

Use this flowchart to determine if your resource needs implementation:

```
1. Look at the `data` field in your interface
2. Are ALL values literal? (e.g., 123, 'text', { key: 'value' })
   ├─ YES → STATIC (no implementation needed)
   └─ NO  → Go to step 3

3. Do you see TypeScript types? (e.g., number, string, boolean, any[])
   ├─ YES → DYNAMIC (needs implementation)
   └─ NO  → Go to step 4

4. Do you have `dynamic: true` flag?
   ├─ YES → DYNAMIC (needs implementation)
   └─ NO  → STATIC (no implementation needed)
```

### Static Resources (No Implementation Needed)

A resource is **static** when ALL values in `data` are **literal**:

✅ Literal strings: `'hello'`, `"world"`
✅ Literal numbers: `42`, `3.14`
✅ Literal booleans: `true`, `false`
✅ Literal arrays: `['a', 'b', 'c']`, `[1, 2, 3]`
✅ Literal objects: `{ key: 'value', count: 10 }`

**Examples:**

```typescript
// Static - all literals
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  data: {
    version: '1.0.0';        // Literal string
    maxResults: 100;         // Literal number
    features: ['a', 'b'];    // Literal array
    enabled: true;           // Literal boolean
  };
}
// No implementation needed - framework serves this data directly
```

```typescript
// Static - nested literals
interface StatusResource extends IResource {
  uri: 'status://app';
  name: 'Application Status';
  data: {
    status: 'running';
    metrics: {
      uptime: 3600;
      requests: 1500;
    };
  };
}
// No implementation needed
```

### Dynamic Resources (Implementation Required)

A resource is **dynamic** when `data` contains **type annotations** instead of literal values:

❌ `number`, `string`, `boolean` (types, not values)
❌ `any`, `unknown`
❌ Array types: `string[]`, `number[]`, `Array<T>`
❌ Object types: `{ key: string }` (without literal values)

**Examples:**

```typescript
// Dynamic - uses types, not literals
interface StatsResource extends IResource {
  uri: 'stats://requests';
  name: 'Request Statistics';
  data: {
    count: number;           // Type annotation - NOT literal
    timestamp: string;       // Type annotation - NOT literal
    items: string[];         // Array type - NOT literal array
  };
}
// Needs implementation:
export default class MyServer implements IServer {
  'stats://requests': StatsResource = async () => {
    return {
      count: await getRequestCount(),
      timestamp: new Date().toISOString(),
      items: await getRecentRequests()
    };
  };
}
```

```typescript
// Dynamic - object with type annotations
interface UserResource extends IResource {
  uri: 'data://users';
  name: 'User Data';
  data: {
    users: Array<{ name: string; email: string }>;  // Array type
  };
}
// Needs implementation
```

### Mixed: Not Allowed

You cannot mix literal and type annotations in the same `data` field:

```typescript
// ❌ INVALID - mixed literals and types
interface MixedResource extends IResource {
  uri: 'mixed://data';
  data: {
    version: '1.0.0';  // Literal
    count: number;     // Type annotation
  };
}
// This will be treated as DYNAMIC (needs implementation for all fields)
```

**Rule**: If ANY field uses type annotations, the entire resource is dynamic.

### Explicit Marking

You can explicitly mark a resource as dynamic even with literal data:

```typescript
interface ExplicitResource extends IResource {
  uri: 'config://dynamic';
  name: 'Dynamic Config';
  dynamic: true;  // Force dynamic even with literals
  data: {
    version: '1.0.0';  // Literal, but resource marked dynamic
  };
}
// Needs implementation because of dynamic: true
```

---

## Dynamic Resource Implementations

### From Environment

```typescript
interface DatabaseConfigResource extends IResource {
  uri: 'config://database';
  name: 'Database URL';
  mimeType: 'text/plain';
  data: string;
}

class MyServer implements MyServerInterface {
  DatabaseConfigResource(): string {
    return process.env.DATABASE_URL || 'Not configured';
  }
}
```

### From File System

```typescript
import { readFileSync } from 'fs';

interface ConfigFileResource extends IResource {
  uri: 'file://config.json';
  name: 'Config File';
  mimeType: 'application/json';
  data: string;
}

class MyServer implements MyServerInterface {
  ConfigFileResource(): string {
    return readFileSync('./config.json', 'utf-8');
  }
}
```

### From Database

```typescript
interface UsersListResource extends IResource {
  uri: 'database://users';
  name: 'Users List';
  mimeType: 'application/json';
  data: { id: number; name: string; email: string }[];
}

class MyServer implements MyServerInterface {
  async UsersListResource(): Promise<UsersListResource['data']> {
    const users = await db.users.find();
    return users;
  }
}
```

### Runtime Statistics

```typescript
interface UserStatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Statistics';
  mimeType: 'application/json';
  data: {
    totalUsers: number;
    activeUsers: number;
    lastUpdated: string;
  };
}

class MyServer implements MyServerInterface {
  UserStatsResource(): UserStatsResource['data'] {
    return {
      totalUsers: getUserCount(),
      activeUsers: getActiveUserCount(),
      lastUpdated: new Date().toISOString()
    };
  }
}
```

---

## Complete Example

```typescript
import type { IResource, IServer } from 'simply-mcp';

// Static resource - no implementation needed
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Config';
  mimeType: 'application/json';
  data: {
    name: 'My App';
    version: '1.0.0';
    features: ['search', 'analytics'];
  };
}

// Dynamic resource - requires implementation
interface StatsResource extends IResource {
  uri: 'stats://app';
  name: 'Application Stats';
  mimeType: 'application/json';
  data: {
    uptime: number;
    requests: number;
  };
}

// Server interface combining resources
interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  resources: [ConfigResource, StatsResource];
}

// Implementation (only dynamic resource needs a method)
export default class implements MyServer {
  StatsResource(): StatsResource['data'] {
    return {
      uptime: process.uptime(),
      requests: getRequestCount()
    };
  }
}
```

---

## Best Practices

**DO:**
- Use consistent URI naming conventions
- Provide clear, descriptive resource names
- Document what each resource contains
- Keep resources focused and manageable
- Use static resources for constant data
- Use dynamic resources for runtime data

**DON'T:**
- Expose sensitive data (passwords, keys, tokens)
- Create too many resources (keep it focused)
- Forget to set correct MIME types
- Make resources that change constantly without clear purpose
- Expose unvalidated user data

---

## Security Considerations

**Never expose secrets:**

```typescript
// BAD - Never expose secrets!
interface SecretsResource extends IResource {
  uri: 'config://secrets';
  mimeType: 'application/json';
  data: {
    api_key: string;
    password: string;
  };
}

class BadServer implements BadServerInterface {
  SecretsResource() {
    return {
      api_key: process.env.SECRET_KEY!,
      password: process.env.DB_PASSWORD!
    };
  }
}
```

**Instead, use environment variables internally:**

```typescript
// GOOD - Use secrets internally, don't expose to LLM
class GoodServer implements GoodServerInterface {
  async GetData(): Promise<string> {
    const apiKey = process.env.API_KEY; // Used internally
    const response = await fetch('https://api.example.com', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.text(); // Return only public data
  }
}
```

---

## Examples

**See working examples:**
- Basic resources: [examples/interface-advanced.ts](../../examples/interface-advanced.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)
- Advanced patterns: [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

---

## Next Steps

- **Add tools?** See [TOOLS.md](./TOOLS.md)
- **Add prompts?** See [PROMPTS.md](./PROMPTS.md)
- **Learn more about Interface API?** See [API_FEATURES.md](./API_FEATURES.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
