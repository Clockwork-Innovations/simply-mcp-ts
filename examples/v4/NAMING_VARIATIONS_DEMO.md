# Automatic Naming Convention Conversion Demo

This document demonstrates the automatic naming variation feature added in v4.0.4, where tool registration automatically tries multiple naming conventions to find matching methods.

## Overview

The Simply MCP framework now automatically converts between different naming conventions when matching tool names to implementation methods. This means:

- **Tool names** should use `snake_case` (MCP convention)
- **Method names** can use either `camelCase` (preferred) or `snake_case` (backward compatible)
- The adapter will automatically find the right method regardless of naming convention

## Feature Details

### 1. Automatic Naming Variation Matching

When registering a tool, the adapter will try these variations in order:

1. **Exact match** (highest priority)
2. **snake_case** variation
3. **camelCase** variation
4. **PascalCase** variation
5. **kebab-case** variation

### 2. Preference for Exact Match

If both naming conventions exist, the exact match is always preferred:

```typescript
interface GetTimeTool extends ITool {
  name: 'get_time';  // Tool name
  // ...
}

export default class MyServer {
  // If both methods exist:
  get_time = async () => { /* This will be called (exact match) */ };
  getTime = async () => { /* This will NOT be called */ };
}
```

### 3. Warning for snake_case Methods

When a snake_case method is matched, a warning is shown suggesting camelCase:

```
⚠️  [simply-mcp] Tool "create_user" matched method "create_user".
   Consider renaming to "createUser" for JavaScript naming conventions.
   (Both will work, but camelCase is preferred)
```

## Test Example

The `test-naming-variations.ts` file demonstrates three scenarios:

### Scenario 1: Preferred Pattern (camelCase method)

```typescript
interface GetUserTool extends ITool {
  name: 'get_user';  // snake_case tool name
  // ...
}

export default class MyServer {
  getUser: GetUserTool = async (params) => {
    // Tool 'get_user' automatically matches method 'getUser'
    // No warning - this is the preferred pattern
    return { user: params.name, found: true };
  };
}
```

**Result**: Works seamlessly, no warnings.

### Scenario 2: Backward Compatible (snake_case method)

```typescript
interface CreateUserTool extends ITool {
  name: 'create_user';  // snake_case tool name
  // ...
}

export default class MyServer {
  create_user: CreateUserTool = async (params) => {
    // Tool 'create_user' matches method 'create_user'
    // Warning shown suggesting 'createUser'
    return { created: true, userId: `user_${Date.now()}` };
  };
}
```

**Result**: Works with a helpful warning suggesting camelCase.

### Scenario 3: Exact Match Priority

```typescript
interface GetTimeTool extends ITool {
  name: 'get_time';
  // ...
}

export default class MyServer {
  // Exact match takes precedence
  get_time: GetTimeTool = async () => {
    return { time: 'EXACT: ' + new Date().toISOString() };
  };

  // This alternative won't be called
  getTime = async () => {
    return { time: 'CAMEL: ' + new Date().toISOString() };
  };
}
```

**Result**: `get_time` method is called because it's an exact match.

## Benefits

1. **Backward Compatibility**: Existing servers with snake_case methods continue to work
2. **Forward Compatibility**: New servers can use JavaScript-standard camelCase
3. **Zero Configuration**: Automatic detection, no setup required
4. **Helpful Warnings**: Guides developers toward best practices
5. **Explicit Control**: Exact matches always take precedence

## Enhanced Error Messages

If no method is found after trying all variations, you'll get a comprehensive error message:

```
❌ Tool "get_user" requires method "getUser" but it was not found on server class.

Expected pattern:
  interface GetUserTool extends ITool {
    name: 'get_user';  // ← Tool name (snake_case)
    // ...
  }

  export default class YourServer {
    getUser: GetUserTool = async (params) => { ... };  // ← Method (camelCase)
  }

🔤 Tried these naming variations automatically:
  - getUser
  - get_user
  - GetUser
  - get-user

💡 Did you mean one of these?
  - getUserInfo
  - getUsers

📋 Available methods on your class:
  - getUserInfo
  - getUsers
  - createUser
```

## Running the Test

```bash
npm run build
node dist/src/cli/index.js run examples/v4/test-naming-variations.ts --inspect
```

You'll see output like:

```
⚠️  [simply-mcp] Tool "create_user" matched method "create_user".
   Consider renaming to "createUser" for JavaScript naming conventions.
   (Both will work, but camelCase is preferred)

[Adapter] Server: naming-variations-test v1.0.0
[Adapter] Loaded: 3 tools, 0 prompts, 0 resources
```

## Implementation Details

The implementation is in `/mnt/Shared/cs-projects/simply-mcp-ts/src/server/adapter.ts`:

- `getNamingVariations()` function (lines 584-629): Generates all naming variations
- `registerTool()` function (lines 711-806): Implements the automatic matching logic
- Enhanced error messages with "did you mean" suggestions

## Related Files

- **Implementation**: `/mnt/Shared/cs-projects/simply-mcp-ts/src/server/adapter.ts`
- **Test Example**: `/mnt/Shared/cs-projects/simply-mcp-ts/examples/v4/test-naming-variations.ts`
- **Naming Utils**: `/mnt/Shared/cs-projects/simply-mcp-ts/src/server/compiler/utils.ts`
