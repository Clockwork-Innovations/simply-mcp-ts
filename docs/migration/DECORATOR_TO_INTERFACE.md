# Decorator API to Interface API Migration Guide

## Table of Contents

- [Overview](#overview)
- [Why Migrate?](#why-migrate)
- [Quick Comparison](#quick-comparison)
- [Migration Steps](#migration-steps)
- [Side-by-Side Examples](#side-by-side-examples)
- [Feature Parity](#feature-parity)
- [Common Patterns](#common-patterns)
- [FAQ](#faq)

## Overview

This guide helps you migrate from the Decorator API to the Interface API. Both APIs are fully supported, but the Interface API offers a cleaner, more TypeScript-native approach with zero boilerplate.

**You don't have to migrate!** The Decorator API is fully supported and will continue to work. This guide is for those who prefer the Interface API's cleaner approach.

## Why Migrate?

### Benefits of Interface API

| Aspect | Decorator API | Interface API |
|--------|--------------|---------------|
| **Boilerplate** | Decorators + JSDoc | Just interfaces |
| **Schema definition** | Inferred from types | Auto-generated from types |
| **Type safety** | ✅ Full | ✅ Full |
| **IntelliSense** | ✅ Full | ✅ Full (better) |
| **Runtime overhead** | Decorators + metadata | Minimal (AST parsing) |
| **Code style** | Class + decorators | Pure interfaces |
| **Learning curve** | Easy | Very easy |
| **Static resources** | Not supported | ✅ Supported |
| **Static prompts** | Not supported | ✅ Supported |

### When to Use Each

**Use Interface API when:**
- You want the cleanest possible code
- You prefer interfaces over decorators
- You want static resources/prompts (no implementation needed)
- You like seeing all types defined upfront

**Stay with Decorator API when:**
- You prefer class-based organization
- You're already using decorators
- You like the `@tool`, `@prompt`, `@resource` syntax
- Your code is working well

## Quick Comparison

### Minimal Server

**Decorator API:**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class Calculator {
  @tool('Add two numbers')
  add(a: number, b: number) {
    return a + b;
  }
}
```

**Interface API:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

interface Calculator extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class CalculatorService implements Calculator {
  add: AddTool = async (params) => params.a + params.b;
}
```

**Key Differences:**
1. Interface API uses `type` imports
2. Tool definitions are explicit interfaces
3. Server metadata defined in interface
4. Implementation uses type annotations

## Migration Steps

### Step 1: Import Interface Types

**Before (Decorator):**
```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';
```

**After (Interface):**
```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';
```

### Step 2: Define Tool Interfaces

For each `@tool` method, create an interface:

**Before (Decorator):**
```typescript
@tool('Add two numbers')
add(a: number, b: number): number {
  return a + b;
}
```

**After (Interface):**
```typescript
// 1. Define the interface
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  result: number;
}

// 2. Implement with type annotation
add: AddTool = async (params) => {
  return params.a + params.b;
};
```

### Step 3: Convert Server Decorator to Interface

**Before (Decorator):**
```typescript
@MCPServer({ name: 'calculator', version: '1.0.0' })
export default class Calculator {
  // ...
}
```

**After (Interface):**
```typescript
// 1. Define server interface
interface CalculatorServer extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

// 2. Implement interface
export default class Calculator implements CalculatorServer {
  // ...
}
```

### Step 4: Convert Prompts

**Before (Decorator):**
```typescript
@prompt('Generate code review prompt')
codeReview(language: string, focus?: string): string {
  return `Review the following ${language} code.\n${focus || ''}`;
}
```

**After (Interface - Dynamic):**
```typescript
// 1. Define interface
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate code review prompt';
  args: { language: string; focus?: string };
  dynamic: true;  // Requires implementation
}

// 2. Implement
codeReview = (args) => {
  return `Review the following ${args.language} code.\n${args.focus || ''}`;
};
```

**Or Static (if template-based):**
```typescript
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate code review prompt';
  args: { language: string; focus?: string };
  template: `Review the following {language} code.
{focus}`;
}

// No implementation needed!
```

### Step 5: Convert Resources

**Before (Decorator):**
```typescript
@resource('config://server', { mimeType: 'application/json' })
getConfig() {
  return { name: 'my-server', version: '1.0.0' };
}
```

**After (Interface - Static):**
```typescript
// Static resource - no implementation needed!
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    name: 'my-server';
    version: '1.0.0';
  };
}
```

**Or Dynamic:**
```typescript
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: any;  // or specific type
}

// Implement using URI as property name
'config://server' = async () => {
  return { name: 'my-server', version: '1.0.0' };
};
```

## Side-by-Side Examples

### Example 1: Basic Tool

**Decorator API:**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class StringUtils {
  /**
   * Reverse a string
   * @param text - The text to reverse
   */
  @tool()
  reverse(text: string): string {
    return text.split('').reverse().join('');
  }
}
```

**Interface API:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface ReverseTool extends ITool {
  name: 'reverse';
  description: 'Reverse a string';
  params: {
    /** The text to reverse */
    text: string;
  };
  result: string;
}

interface StringUtils extends IServer {
  name: 'string-utils';
  version: '1.0.0';
}

export default class StringUtilsService implements StringUtils {
  reverse: ReverseTool = async (params) => {
    return params.text.split('').reverse().join('');
  };
}
```

### Example 2: Complex Tool with Validation

**Decorator API:**
```typescript
import { MCPServer, tool } from 'simply-mcp';

@MCPServer()
export default class UserService {
  /**
   * Create a new user
   * @param username - Username (3-20 chars)
   * @param email - Email address
   * @param age - User age (18+)
   */
  @tool()
  createUser(username: string, email: string, age: number) {
    // Manual validation needed
    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be 3-20 characters');
    }
    if (age < 18) {
      throw new Error('Age must be 18+');
    }

    return {
      id: Math.random().toString(36).substring(7),
      username,
      email,
      createdAt: new Date().toISOString()
    };
  }
}
```

**Interface API:**
```typescript
import type { ITool, IServer } from 'simply-mcp';

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user';
  params: {
    /**
     * Username (3-20 characters)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * Email address
     * @format email
     */
    email: string;

    /**
     * User age (must be 18+)
     * @min 18
     * @max 120
     */
    age: number;
  };
  result: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
  };
}

interface UserService extends IServer {
  name: 'user-service';
  version: '1.0.0';
}

export default class UserServiceImpl implements UserService {
  createUser: CreateUserTool = async (params) => {
    // Validation automatic from JSDoc tags!
    return {
      id: Math.random().toString(36).substring(7),
      username: params.username,
      email: params.email,
      createdAt: new Date().toISOString()
    };
  };
}
```

### Example 3: With Prompts and Resources

**Decorator API:**
```typescript
import { MCPServer, tool, prompt, resource } from 'simply-mcp';

@MCPServer({ name: 'weather-service', version: '2.0.0' })
export default class WeatherService {
  @tool('Get current weather')
  getWeather(location: string, units?: 'celsius' | 'fahrenheit') {
    const temp = 72;
    return {
      temperature: units === 'fahrenheit' ? temp : (temp - 32) * 5/9,
      conditions: 'Sunny'
    };
  }

  @prompt('Generate weather report prompt')
  weatherReport(location: string, style?: 'casual' | 'formal'): string {
    return `Generate a ${style || 'casual'} weather report for ${location}.`;
  }

  @resource('config://server', { mimeType: 'application/json' })
  getConfig() {
    return {
      version: '2.0.0',
      features: ['weather', 'forecasts']
    };
  }
}
```

**Interface API:**
```typescript
import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// Tool interface
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
  };
  result: {
    temperature: number;
    conditions: string;
  };
}

// Static prompt (no implementation needed)
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report prompt';
  args: {
    location: string;
    style?: 'casual' | 'formal';
  };
  template: `Generate a {style} weather report for {location}.`;
}

// Static resource (no implementation needed)
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  mimeType: 'application/json';
  data: {
    version: '2.0.0';
    features: ['weather', 'forecasts'];
  };
}

// Server interface
interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '2.0.0';
}

// Implementation
export default class WeatherServiceImpl implements WeatherServer {
  // Tool implementation
  getWeather: GetWeatherTool = async (params) => {
    const temp = 72;
    return {
      temperature: params.units === 'fahrenheit' ? temp : (temp - 32) * 5/9,
      conditions: 'Sunny'
    };
  };

  // Prompt - no implementation (static)
  // Resource - no implementation (static)
}
```

**Note:** Interface API saves you from implementing static prompts and resources!

## Feature Parity

### Feature Comparison Table

| Feature | Decorator API | Interface API | Notes |
|---------|--------------|---------------|-------|
| **Tools** | ✅ `@tool()` | ✅ `ITool` | Full parity |
| **Prompts** | ✅ `@prompt()` | ✅ `IPrompt` | Interface adds static prompts |
| **Resources** | ✅ `@resource()` | ✅ `IResource` | Interface adds static resources |
| **JSDoc descriptions** | ✅ | ✅ | Full parity |
| **JSDoc validation** | ❌ | ✅ | Interface only |
| **Optional parameters** | ✅ | ✅ | Full parity |
| **Type inference** | ✅ | ✅ | Full parity |
| **IntelliSense** | ✅ | ✅ | Interface slightly better |
| **Auto-registration** | ✅ Public methods | ❌ Explicit | Decorator only |
| **Static prompts** | ❌ | ✅ Template strings | Interface only |
| **Static resources** | ❌ | ✅ Literal data | Interface only |
| **Private helpers** | ✅ `_method()` | ✅ Standard private | Full parity |
| **Server metadata** | ✅ Decorator args | ✅ Interface | Full parity |

### Migration Checklist

When migrating, ensure you have:

- [ ] Converted all `@tool` decorators to `ITool` interfaces
- [ ] Converted all `@prompt` decorators to `IPrompt` interfaces
- [ ] Converted all `@resource` decorators to `IResource` interfaces
- [ ] Created `IServer` interface for server metadata
- [ ] Changed class to implement server interface
- [ ] Implemented all tool methods with proper signatures
- [ ] Decided static vs dynamic for prompts/resources
- [ ] Added JSDoc validation tags where needed
- [ ] Tested the migrated server
- [ ] Updated CLI command if using explicit commands

## Common Patterns

### Pattern 1: Optional Parameters

**Decorator API:**
```typescript
@tool()
greet(name: string, formal?: boolean): string {
  return formal ? `Good day, ${name}` : `Hello, ${name}!`;
}
```

**Interface API:**
```typescript
interface GreetTool extends ITool {
  name: 'greet';
  params: {
    name: string;
    formal?: boolean;  // Optional with ?
  };
  result: string;
}

greet: GreetTool = async (params) => {
  return params.formal ? `Good day, ${params.name}` : `Hello, ${params.name}!`;
};
```

### Pattern 2: Default Values

**Decorator API:**
```typescript
@tool()
format(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
```

**Interface API:**
```typescript
interface FormatTool extends ITool {
  name: 'format';
  params: {
    value: number;
    decimals?: number;  // Optional, handle default in implementation
  };
  result: string;
}

format: FormatTool = async (params) => {
  const decimals = params.decimals ?? 2;  // Default in implementation
  return params.value.toFixed(decimals);
};
```

### Pattern 3: Enum Types

**Decorator API:**
```typescript
@tool()
convert(temp: number, from: 'celsius' | 'fahrenheit'): number {
  return from === 'celsius' ? (temp * 9/5) + 32 : (temp - 32) * 5/9;
}
```

**Interface API:**
```typescript
interface ConvertTool extends ITool {
  name: 'convert';
  params: {
    temp: number;
    from: 'celsius' | 'fahrenheit';  // Literal union
  };
  result: number;
}

convert: ConvertTool = async (params) => {
  return params.from === 'celsius'
    ? (params.temp * 9/5) + 32
    : (params.temp - 32) * 5/9;
};
```

### Pattern 4: Nested Objects

**Decorator API:**
```typescript
@tool()
search(filters: { type?: string; tags?: string[] }): any {
  // ...
}
```

**Interface API:**
```typescript
interface SearchTool extends ITool {
  name: 'search';
  params: {
    filters: {
      type?: string;
      tags?: string[];
    };
  };
  result: any;
}

search: SearchTool = async (params) => {
  // Access: params.filters.type, params.filters.tags
};
```

### Pattern 5: Private Helper Methods

**Decorator API:**
```typescript
@MCPServer()
export default class Calculator {
  @tool()
  complexCalc(a: number, b: number): number {
    return this._helper(a) + this._helper(b);
  }

  _helper(x: number): number {
    return x * 2;
  }
}
```

**Interface API:**
```typescript
interface CalculatorServer extends IServer {
  name: 'calculator';
  version: '1.0.0';
}

export default class Calculator implements CalculatorServer {
  complexCalc: ComplexCalcTool = async (params) => {
    return this.helper(params.a) + this.helper(params.b);
  };

  private helper(x: number): number {
    return x * 2;
  }
}
```

## FAQ

### Do I have to migrate?

No! The Decorator API is fully supported and will continue to work. Migrate only if you prefer the Interface API's approach.

### Can I mix both APIs?

No, choose one API style per server. However, you can have different servers using different APIs.

### What about performance?

Both APIs have similar performance. Interface API has minimal AST parsing overhead at startup, while Decorator API has decorator metadata overhead. The difference is negligible.

### Can I use static resources with Decorator API?

No, static resources are an Interface API feature. With Decorator API, all resources require implementation.

### How do I handle validation?

Interface API supports JSDoc validation tags (`@min`, `@max`, `@pattern`, etc.) which automatically generate Zod refinements. Decorator API requires manual validation.

### What about CLI commands?

Both APIs work with the same CLI commands:
```bash
# Auto-detection (recommended)
npx simply-mcp run server.ts

# Explicit commands
npx simplymcp-class server.ts      # Decorator
npx simplymcp-interface server.ts  # Interface
```

### Can I convert back?

Yes! You can convert Interface API back to Decorator API by reversing the steps in this guide.

### Which API should I use for new projects?

Both are excellent choices:
- **Interface API**: Cleaner, more TypeScript-native, supports static resources/prompts
- **Decorator API**: Familiar class-based pattern, auto-registration of public methods

Choose based on your preference!

## Summary

**Interface API Benefits:**
- ✅ Zero boilerplate
- ✅ Pure TypeScript interfaces
- ✅ Static resources and prompts
- ✅ JSDoc validation tags
- ✅ Cleaner code

**Migration Process:**
1. Define interfaces for tools, prompts, resources
2. Create server interface
3. Implement interfaces in class
4. Choose static vs dynamic for prompts/resources
5. Test and verify

**Remember:** Both APIs are fully supported. Choose what works best for your project!

## See Also

- [Interface API Reference](../guides/INTERFACE_API_REFERENCE.md) - Complete documentation
- [Decorator API Reference](../guides/DECORATOR_API_REFERENCE.md) - Decorator reference
- [Examples](../../examples/) - See both APIs in action
  - `interface-*.ts` - Interface API examples
  - `class-*.ts` - Decorator API examples

---

**Questions?** Open an issue on [GitHub](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)!
