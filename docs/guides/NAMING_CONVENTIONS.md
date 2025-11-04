# Naming Conventions Reference

Understanding how to name your interface properties and implementation methods.

---

## Overview

Simply MCP uses different naming patterns for different MCP primitives. This guide explains all three patterns and why they differ.

---

## Tools & Prompts: snake_case → camelCase

**Interface names** (in the `name` field) use `snake_case`, but **implementation methods** use `camelCase`.

### Tools Example

```typescript
// Interface: name is snake_case
interface GetWeatherTool extends ITool {
  name: 'get_weather';  // ← snake_case
  description: 'Get weather data';
  params: { city: string };
  result: { temp: number };
}

// Implementation: method name is camelCase
export default class MyServer {
  getWeather: GetWeatherTool = async (params) => {  // ← camelCase
    return { temp: 72 };
  };
}
```

**Conversion rules:**
- `get_weather` → `getWeather`
- `calculate_sum` → `calculateSum`
- `send_email` → `sendEmail`

### Prompts Example

```typescript
// Interface: name is snake_case
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';  // ← snake_case
  description: 'Review code';
  args: { code: string };
  dynamic: true;
}

// Implementation: method name is camelCase
export default class MyServer {
  codeReview: CodeReviewPrompt = (args) => {  // ← camelCase
    return `Review this code: ${args.code}`;
  };
}
```

**Why camelCase?**
JavaScript/TypeScript convention for method names is camelCase. This makes your server code feel natural and idiomatic.

---

## Resources: URI Strings (Exact Match)

**Resource URIs** remain unchanged - use the URI string **exactly as written** in the interface as the property name.

### Example

```typescript
// Interface: URI format
interface StatsResource extends IResource {
  uri: 'stats://weather';  // ← URI string
  name: 'Weather Stats';
  mimeType: 'application/json';
  returns: { temp: number };
}

// Implementation: property name is EXACT URI string
export default class MyServer {
  'stats://weather': StatsResource = async () => {  // ← Exact URI string
    return { temp: 72 };
  };
}
```

**No conversion happens:**
- `stats://weather` → `'stats://weather'` (exact match)
- `config://app` → `'config://app'` (exact match)
- `file:///data/log.txt` → `'file:///data/log.txt'` (exact match)

**Why URI strings?**
The MCP protocol identifies resources by URI. When a client requests a resource, it sends the exact URI. Your server must match that URI exactly to serve the resource.

---

## Quick Reference Table

| Primitive | Interface Name | Implementation Property | Example |
|-----------|----------------|------------------------|---------|
| **Tool** | `get_weather` (snake_case) | `getWeather` (camelCase) | Method name |
| **Prompt** | `code_review` (snake_case) | `codeReview` (camelCase) | Method name |
| **Resource** | `stats://data` (URI) | `'stats://data'` (URI string) | Property name |

---

## Common Patterns

### snake_case → camelCase Conversion

| snake_case (interface) | camelCase (implementation) |
|----------------------|---------------------------|
| `get_weather` | `getWeather` |
| `calculate_sum` | `calculateSum` |
| `send_email` | `sendEmail` |
| `fetch_user_data` | `fetchUserData` |
| `analyze_code` | `analyzeCode` |

### URI String Examples

| URI (interface) | Property (implementation) |
|----------------|--------------------------|
| `config://app` | `'config://app'` |
| `stats://server` | `'stats://server'` |
| `file:///data/log.txt` | `'file:///data/log.txt'` |
| `cache://session` | `'cache://session'` |

---

## Mental Model

Think of it this way:

**Tools & Prompts = Actions** (verb-like)
- Actions are methods → use camelCase
- `getWeather()`, `codeReview()`, `calculateSum()`

**Resources = Locations** (noun-like)
- Locations have addresses → use URIs
- `'stats://weather'`, `'config://app'`, `'file:///log.txt'`

---

## Common Mistakes

### ❌ Wrong: Using camelCase for Resources

```typescript
interface StatsResource extends IResource {
  uri: 'stats://weather';
}

export default class MyServer {
  statsWeather: StatsResource = async () => { };  // ❌ Wrong!
}
```

### ✅ Correct: Using URI String for Resources

```typescript
interface StatsResource extends IResource {
  uri: 'stats://weather';
}

export default class MyServer {
  'stats://weather': StatsResource = async () => { };  // ✅ Correct!
}
```

### ❌ Wrong: Using snake_case for Tools/Prompts

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
}

export default class MyServer {
  get_weather: GetWeatherTool = async () => { };  // ❌ Wrong!
}
```

### ✅ Correct: Using camelCase for Tools/Prompts

```typescript
interface GetWeatherTool extends ITool {
  name: 'get_weather';
}

export default class MyServer {
  getWeather: GetWeatherTool = async () => { };  // ✅ Correct!
}
```

---

## Validation

Use `--dry-run` to catch naming errors:

```bash
npx simply-mcp run server.ts --dry-run
```

The dry-run will warn you if:
- Tool/prompt method names don't match (e.g., `get_weather` instead of `getWeather`)
- Resource property names don't match the URI

**Example warning:**
```
Warning: Tool 'get_weather' requires implementation as method 'getWeather'
```

---

## Why These Conventions?

### Historical Context

Simply MCP follows the MCP protocol specification:

1. **MCP Protocol** defines tools/prompts with snake_case names (following Python conventions)
2. **TypeScript/JavaScript** uses camelCase for methods (language convention)
3. **MCP Resources** are identified by URIs in the protocol (must match exactly)

### Design Goals

- **Tools/Prompts:** Feel natural in JavaScript code (camelCase methods)
- **Resources:** Match protocol semantics (URI-based identification)
- **Balance:** Language idioms vs protocol requirements

### Trade-offs

**Current design:**
- ✅ Follows JavaScript conventions for methods
- ✅ Matches MCP protocol for resources
- ⚠️ Creates learning curve (two patterns)

**Alternative designs considered:**
- All camelCase: Would break URI semantics
- All URI strings: Would feel unnatural for methods
- All snake_case: Would violate JavaScript conventions

**Conclusion:** Current design balances language idioms with protocol requirements.

---

## See Also

- **[Features Guide - Tools](./FEATURES.md#tools)** - Detailed tool naming and implementation
- **[Features Guide - Prompts](./FEATURES.md#prompts)** - Prompt naming and patterns
- **[Features Guide - Resources](./FEATURES.md#resources)** - Resource URI naming
- **[Quick Start](./QUICK_START.md)** - Complete example showing all patterns

---

## Summary

**Remember:**
- 🔧 **Tools & Prompts:** `snake_case` → `camelCase` (actions = methods)
- 📦 **Resources:** URI strings (locations = addresses)
- ✅ **Use dry-run** to validate your naming

When in doubt, check the examples or run `--dry-run` to verify your implementation!
