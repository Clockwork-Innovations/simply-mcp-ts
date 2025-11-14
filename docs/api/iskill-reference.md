# ISkill API Reference

> **Version:** 4.4.0+
> **Module:** `simply-mcp`
> **Layer:** Foundation (FL-2) + Feature (FT-1, FT-2)

## Table of Contents

- [Overview](#overview)
- [ISkill Interface](#iskill-interface)
- [ISkillComponents Interface](#iskillcomponents-interface)
- [SkillHelper Type](#skillhelper-type)
- [HiddenEvaluationContext Interface](#hiddenevaluationcontext-interface)
- [HiddenValue Type](#hiddenvalue-type)
- [Usage Patterns](#usage-patterns)
- [Type Guards](#type-guards)
- [Examples](#examples)

---

## Overview

The ISkill interface defines AI skills - meta-capabilities that provide documentation about tools, resources, and prompts. Skills enable progressive disclosure by allowing hidden capabilities to be discovered on-demand.

**Import:**
```typescript
import { ISkill, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';
```

**Two Patterns:**
1. **Manual Skills (FL-2)**: Handcrafted markdown documentation
2. **Auto-Generated Skills (FT-2)**: Documentation generated from component references

**Key Features:**
- Zero-boilerplate implementation for auto-generated skills
- Compile-time validation of component references
- Optional hidden flag for conditional disclosure
- Full TypeScript type safety with `SkillHelper`

---

## ISkill Interface

```typescript
interface ISkill {
  name: string;
  description: string;
  returns?: string;
  components?: ISkillComponents;
  hidden?: HiddenValue;
}
```

### Properties

#### `name: string` (Required)

**Description:** Unique identifier for the skill in snake_case.

**Constraints:**
- Must be unique across all skills in the server
- Should use snake_case convention
- Accessed via `resources/read` with URI `skill://name`

**Examples:**
```typescript
name: 'weather_analysis'
name: 'debug_toolkit'
name: 'admin_panel'
```

---

#### `description: string` (Required)

**Description:** Human-readable description (1-2 sentences) that helps LLMs understand when to use the skill.

**Best Practices:**
- Focus on WHEN to use the skill, not WHAT it contains
- Keep it concise (1-2 sentences)
- Use action-oriented language
- Think of it as a "trigger phrase" for AI

**Good Examples:**
```typescript
description: 'Analyze weather patterns and forecast data'
description: 'Debug TypeScript compilation errors'
description: 'Administrative operations for server management'
```

**Bad Examples:**
```typescript
description: 'This skill contains tools and resources'  // Too vague
description: 'A skill'  // Not descriptive enough
description: 'Use this skill when you need to do stuff with weather'  // Too wordy
```

---

#### `returns?: string` (Optional, mutually exclusive with `components`)

**Description:** Manual markdown content for the skill documentation.

**Use When:**
- You want complete control over documentation format
- Manual includes custom examples, guides, or narrative
- Skill explains concepts beyond component listings

**Constraints:**
- **Mutually exclusive** with `components` field
- Must provide either `returns` OR `components`, not both
- Compile-time validation enforces mutual exclusivity

**Format:**
- Markdown string
- Can include headings, lists, code blocks, tables
- Returned by `resources/read` when accessing `skill://name` URI

**Example:**
```typescript
interface WeatherSkill extends ISkill {
  name: 'weather_analysis';
  description: 'Analyze weather patterns and forecast data';
  returns: `
# Weather Analysis Skill

## Purpose
This skill helps you analyze weather patterns and forecast data.

## Tools

### \`get_weather\`
Get current weather conditions for a location.

**Parameters:**
- \`location\` (string): City name or coordinates

**Returns:** \`{ temp: number, conditions: string }\`

**Example:**
\`\`\`
get_weather({ location: "San Francisco" })
\`\`\`

### \`get_forecast\`
Get weather forecast for the next 7 days.

**Parameters:**
- \`location\` (string): City name or coordinates
- \`days\` (number, optional): Number of days (default: 7)

**Returns:** \`{ forecasts: Array<{date: string, temp: number}> }\`

## Best Practices
- Always specify location explicitly
- Use coordinates for accuracy
- Check forecast reliability score
  `.trim();
}
```

**Implementation:**
```typescript
const weatherAnalysis: SkillHelper<WeatherSkill> = () => {
  // Return the same markdown (can be dynamic)
  return `# Weather Analysis Skill\n...`;
};
```

---

#### `components?: ISkillComponents` (Optional, mutually exclusive with `returns`)

**Description:** Auto-generate documentation from component references.

**Use When:**
- Skill is primarily a collection of related components
- You want automatic documentation of parameters/types
- Component list changes frequently
- Manual would mostly duplicate component definitions

**Constraints:**
- **Mutually exclusive** with `returns` field
- Must provide either `returns` OR `components`, not both
- Component names are validated at compile time
- Missing components generate warnings (non-blocking)

**Benefits:**
- Zero maintenance (docs auto-update)
- Consistent formatting
- Compile-time validation
- ~70% less boilerplate vs manual

**Example:**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: {
    tools: ['inspect_state', 'trace_request', 'dump_logs'];
    resources: ['internal://config', 'internal://metrics'];
    prompts: ['debug_help'];
  };
}
```

**Implementation:**
```typescript
// No implementation needed! Docs generated automatically.
// Or optionally provide additional context:
const debugToolkit: SkillHelper<DebugSkill> = () => {
  return '## Additional Notes\nThese tools require admin access.';
};
```

**Generated Output:**
```markdown
# debug_toolkit

Debug and diagnostic tools

## Tools

### `inspect_state`
Inspect internal server state.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "component": {
      "type": "string",
      "description": "Component to inspect"
    }
  }
}
```

## Resources

### `internal://config`
**Name:** Internal Configuration
**Description:** Internal server configuration
**MIME Type:** application/json

### `internal://metrics`
**Name:** Performance Metrics
**Description:** Internal performance metrics
**MIME Type:** application/json

## Prompts

### `debug_help`
Debug assistance prompt.

**Arguments:**
```json
{
  "type": "object",
  "properties": {
    "issue": {
      "type": "string",
      "description": "Issue description"
    }
  }
}
```

## Additional Notes
These tools require admin access.
```

---

#### `hidden?: HiddenValue` (Optional)

**Description:** Hide this skill from `resources/list` responses (filtered to `skill://` URIs).

**Type:** `boolean | HiddenPredicate`

**Default:** `false` (visible)

**Static Hidden (Foundation Layer):**
```typescript
interface InternalSkill extends ISkill {
  name: 'internal_docs';
  description: 'Internal documentation';
  returns: '# Internal Docs\n...';
  hidden: true;  // Always hidden
}
```

**Dynamic Hidden (Feature Layer FT-1):**
```typescript
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Admin operations';
  components: { tools: ['reset', 'shutdown'] };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}
```

**Behavior:**
- When `true` (or predicate returns `true`):
  - Excluded from `resources/list` response (when filtering by `skill://`)
  - Still accessible via `resources/read` with `skill://name` URI (direct invocation)
- When `false` (or predicate returns `false`):
  - Included in `resources/list` response (when filtering by `skill://`)

**Use Cases:**
- Internal documentation (always hidden)
- Role-based access (dynamic)
- Feature flags (dynamic)
- Environment-based (dynamic)

**See Also:** [HiddenValue Type](#hiddenvalue-type)

---

## ISkillComponents Interface

```typescript
interface ISkillComponents {
  tools?: string[];
  resources?: string[];
  prompts?: string[];
}
```

### Properties

#### `tools?: string[]`

**Description:** List of tool names to include in auto-generated manual.

**Format:**
- Array of tool name strings
- Names must match registered tool names
- Validated at compile time

**Documentation:**
- Tool name, description
- Parameter schema (JSON Schema)
- Return type

**Example:**
```typescript
tools: ['get_weather', 'get_forecast', 'get_alerts']
```

---

#### `resources?: string[]`

**Description:** List of resource URIs to include in auto-generated manual.

**Format:**
- Array of resource URI strings
- Supports exact URIs and template patterns
- URIs must match registered resource URIs
- Validated at compile time

**Documentation:**
- Resource URI, name, description
- MIME type

**Example:**
```typescript
resources: [
  'config://weather_api',      // Exact URI
  'data://forecasts/{city}'    // Template pattern
]
```

---

#### `prompts?: string[]`

**Description:** List of prompt names to include in auto-generated manual.

**Format:**
- Array of prompt name strings
- Names must match registered prompt names
- Validated at compile time

**Documentation:**
- Prompt name, description
- Argument schema (JSON Schema)

**Example:**
```typescript
prompts: ['weather_help', 'forecast_help']
```

---

## SkillHelper Type

```typescript
type SkillHelper<T extends ISkill> = () => string;
```

**Description:** Type-safe helper for implementing skill functions with full type inference.

**Purpose:**
- Provides automatic type inference from skill interface
- Ensures return type matches skill definition
- Simplifies implementation with zero boilerplate

**Usage:**

**Manual Skill:**
```typescript
interface MySkill extends ISkill {
  name: 'my_skill';
  description: 'My skill';
  returns: string;
}

const mySkill: SkillHelper<MySkill> = () => {
  return '# My Skill\nContent here...';
};
```

**Auto-Generated Skill (no implementation needed):**
```typescript
interface MySkill extends ISkill {
  name: 'my_skill';
  description: 'My skill';
  components: { tools: ['foo', 'bar'] };
}

// Option 1: No implementation (empty export)
const mySkill = undefined;

// Option 2: Provide additional context
const mySkill: SkillHelper<MySkill> = () => {
  return '## Additional Notes\nRequires authentication.';
};
```

**Class Pattern:**
```typescript
export default class Server {
  mySkill: SkillHelper<MySkill> = () => {
    return '# My Skill\nContent...';
  };

  // Or for auto-generated:
  myAutoSkill = undefined as any;
}
```

**Const Pattern:**
```typescript
const mySkill: SkillHelper<MySkill> = () => {
  return '# My Skill\nContent...';
};

export { mySkill };
```

---

## HiddenEvaluationContext Interface

```typescript
interface HiddenEvaluationContext {
  mcp?: {
    server: {
      name: string;
      version: string;
      description?: string;
    };
    session?: any;
    request?: {
      request_id?: string;
      meta?: Record<string, unknown>;
    };
  };
  metadata?: Record<string, unknown>;
  server?: {
    isProduction?: boolean;
    startTime?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
```

**Description:** Context provided to hidden evaluation functions for making intelligent hiding decisions.

### Properties

#### `mcp?: object`

**Description:** MCP session metadata.

**Fields:**
- `server`: Server information (name, version, description)
- `session`: MCP SDK session object
- `request`: Request-specific context (request_id, meta)

**Use Cases:**
- Protocol-level information
- Session tracking
- Request correlation

---

#### `metadata?: Record<string, unknown>`

**Description:** Custom metadata passed by application.

**Use Cases:**
- User authentication/authorization data
- Feature flags
- Environment information
- Request-specific state

**Example:**
```typescript
{
  user: { id: 'user123', role: 'admin', permissions: ['debug'] },
  features: ['advanced_tools', 'experimental'],
  environment: 'production',
  requestTime: Date.now()
}
```

**Common Patterns:**

**Role-based:**
```typescript
const user = ctx?.metadata?.user as { role?: string } | undefined;
return user?.role !== 'admin';
```

**Permission-based:**
```typescript
const perms = ctx?.metadata?.permissions as string[] | undefined;
return !perms?.includes('debug:read');
```

**Feature flag:**
```typescript
const flags = ctx?.metadata?.feature_flags as string[] | undefined;
return !flags?.includes('experimental');
```

---

#### `server?: object`

**Description:** Server runtime state.

**Fields:**
- `isProduction`: Whether server is in production mode
- `startTime`: Server start time (timestamp)
- Additional custom fields

**Use Cases:**
- Environment-based hiding
- Uptime checks
- Server state queries

---

## HiddenValue Type

```typescript
type HiddenValue = boolean | HiddenPredicate;
type HiddenPredicate = (context?: HiddenEvaluationContext) => boolean | Promise<boolean>;
```

**Description:** Union type for the `hidden` field - supports static boolean or dynamic function.

**Static (Foundation Layer):**
```typescript
hidden: true   // Always hidden
hidden: false  // Always visible
```

**Dynamic (Feature Layer FT-1):**
```typescript
// Synchronous
hidden: (ctx) => {
  return ctx?.metadata?.user?.role !== 'admin';
}

// Asynchronous
hidden: async (ctx) => {
  return !(await checkPermission(ctx?.metadata?.user, 'debug'));
}
```

**Behavior:**
- Return `true` to **hide** the item
- Return `false` to **show** the item

**Performance:**
- Timeout: 100ms per function (prevents infinite loops)
- Overhead: ~5ms per list call with dynamic hidden

---

## Usage Patterns

### Pattern 1: Manual Skill with Examples

```typescript
interface DatabaseSkill extends ISkill {
  name: 'database_ops';
  description: 'Database operations and queries';
  returns: string;
}

const databaseOps: SkillHelper<DatabaseSkill> = () => {
  return `
# Database Operations

Tools for interacting with the database.

## Tools

### \`query\`
Execute a SQL query.

**Parameters:**
- \`sql\` (string): SQL query to execute

**Returns:** \`{ rows: any[] }\`

**Example:**
\`\`\`typescript
query({ sql: "SELECT * FROM users WHERE active = true" })
\`\`\`

**Best Practices:**
- Always use parameterized queries
- Limit result sets with LIMIT clause
- Use transactions for multiple operations

### \`migrate\`
Run database migrations.

**Parameters:**
- \`version\` (string): Target migration version

**Returns:** \`{ applied: string[], skipped: string[] }\`

## Resources

- \`db://schema\`: Current database schema
- \`db://stats\`: Performance statistics

## Safety Notes
- All queries are logged
- Destructive operations require confirmation
- Migrations are reversible
  `.trim();
};
```

### Pattern 2: Auto-Generated Skill

```typescript
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations for server management';
  components: {
    tools: ['reset_server', 'configure_server', 'shutdown_server'];
    resources: ['internal://config', 'internal://logs'];
  };
}

// No implementation needed!
// Or optionally add context:
const adminPanel: SkillHelper<AdminSkill> = () => {
  return '## ⚠️ Warning\nThese operations require admin privileges.';
};
```

### Pattern 3: Dynamic Hidden Skill

```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: {
    tools: ['inspect', 'trace', 'logs'];
  };
  hidden: (ctx?: HiddenEvaluationContext) => {
    // Hide in production
    return ctx?.server?.isProduction === true;
  };
}
```

### Pattern 4: Mixed Manual + Auto-Generated

```typescript
interface ComplexSkill extends ISkill {
  name: 'advanced_features';
  description: 'Advanced features and tools';
  components: {
    tools: ['feature_a', 'feature_b', 'feature_c'];
  };
}

const advancedFeatures: SkillHelper<ComplexSkill> = () => {
  // Auto-generated docs for tools + custom intro
  return `
## Overview

These features are experimental and may change in future releases.

## Prerequisites
- Admin access required
- Feature flag 'advanced' must be enabled
- API version 2.0 or higher

## Getting Started
1. Enable the 'advanced' feature flag
2. Authenticate with admin credentials
3. Review tool documentation below

---

  `.trim();
};
```

---

## Type Guards

### `isHiddenFunction()`

```typescript
function isHiddenFunction(hidden: HiddenValue | undefined): hidden is HiddenPredicate;
```

**Description:** Type guard to check if hidden value is a function.

**Example:**
```typescript
import { isHiddenFunction } from 'simply-mcp';

if (isHiddenFunction(skill.hidden)) {
  const shouldHide = await skill.hidden(context);
  console.log('Dynamic hidden:', shouldHide);
} else {
  console.log('Static hidden:', skill.hidden);
}
```

### `isHiddenBoolean()`

```typescript
function isHiddenBoolean(hidden: HiddenValue | undefined): hidden is boolean;
```

**Description:** Type guard to check if hidden value is a static boolean.

**Example:**
```typescript
import { isHiddenBoolean } from 'simply-mcp';

if (isHiddenBoolean(skill.hidden)) {
  console.log('Static hidden:', skill.hidden);
} else if (skill.hidden) {
  console.log('Dynamic hidden function');
}
```

---

## Examples

### Example 1: Complete Manual Skill

```typescript
import { ISkill, SkillHelper } from 'simply-mcp';

interface WeatherSkill extends ISkill {
  name: 'weather_analysis';
  description: 'Analyze weather patterns and forecast data';
  returns: string;
}

const weatherAnalysis: SkillHelper<WeatherSkill> = () => {
  return `
# Weather Analysis Skill

## Purpose
This skill provides tools for analyzing weather patterns and forecast data.

## Available Tools

### \`get_weather\`
Get current weather conditions.

**Parameters:**
- \`location\` (string): City name or coordinates

**Returns:**
\`\`\`json
{
  "temp": 72.5,
  "conditions": "Partly cloudy",
  "humidity": 65,
  "windSpeed": 8.2
}
\`\`\`

### \`get_forecast\`
Get 7-day weather forecast.

**Parameters:**
- \`location\` (string): City name or coordinates
- \`days\` (number, optional): Number of days (1-14, default: 7)

**Returns:**
\`\`\`json
{
  "forecasts": [
    {"date": "2025-11-13", "temp": 75, "conditions": "Sunny"},
    {"date": "2025-11-14", "temp": 68, "conditions": "Cloudy"}
  ]
}
\`\`\`

## Resources

- \`config://weather_api\`: API configuration and endpoints
- \`data://historical/{location}\`: Historical weather data

## Best Practices

1. **Specify Location Clearly**: Use city names or lat/long coordinates
2. **Check Data Freshness**: Weather data updates every 15 minutes
3. **Handle Errors**: Invalid locations return 404 errors

## Example Usage

\`\`\`typescript
// Get current weather
const current = await get_weather({ location: "San Francisco, CA" });

// Get 14-day forecast
const forecast = await get_forecast({ location: "San Francisco, CA", days: 14 });
\`\`\`
  `.trim();
};

export { weatherAnalysis };
```

### Example 2: Auto-Generated Skill with Context

```typescript
import { ISkill, SkillHelper } from 'simply-mcp';

interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools for troubleshooting';
  components: {
    tools: ['inspect_state', 'trace_request', 'dump_logs', 'benchmark'];
    resources: ['internal://config', 'internal://metrics'];
  };
}

// Optional: Add context to auto-generated docs
const debugToolkit: SkillHelper<DebugSkill> = () => {
  return `
## ⚠️ Important Notes

- These tools are for debugging purposes only
- Admin access required for all operations
- Debug output may contain sensitive information
- Not available in production environments

## Getting Started

1. Ensure you have admin privileges
2. Review the tool documentation below
3. Use \`inspect_state\` to begin investigation

---

  `.trim();
};

export { debugToolkit };
```

### Example 3: Role-Based Hidden Skill

```typescript
import { ISkill, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';

interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations (admin only)';
  components: {
    tools: ['delete_user', 'reset_database', 'configure_server'];
  };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}

// No implementation needed for auto-generated skills
const adminPanel = undefined;

export { adminPanel };
```

---

## See Also

- [Progressive Disclosure Guide](../guides/progressive-disclosure.md) - Complete feature documentation
- [Migration Guide](../guides/migration-fl-to-ft.md) - Upgrade from v4.3.x
- [Examples](../../examples/) - Real-world examples

---

**Version:** 4.4.0
**Last Updated:** 2025-11-12
