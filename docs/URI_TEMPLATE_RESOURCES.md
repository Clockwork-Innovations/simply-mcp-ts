# URI Template Resources

## Overview

URI template matching enables resources to be registered with parameterized URIs (e.g., `pokemon://{name}`) that can match multiple actual URIs (e.g., `pokemon://pikachu`, `pokemon://charizard`) and extract parameter values from them.

This feature makes it easy to create dynamic resources that respond to patterns rather than requiring exact URI matches.

## Key Features

- **Template Syntax**: Use `{param}` placeholders in resource URIs
- **Parameter Extraction**: Automatically extract parameter values from matched URIs
- **Exact Match Priority**: Exact URIs always take precedence over template matches
- **Multiple Parameters**: Support for multiple parameters in a single URI
- **Backward Compatible**: Existing exact-match resources work unchanged

## Template Syntax

### Simple Parameter
```typescript
uri: 'pokemon://{name}'
```
Matches: `pokemon://pikachu`, `pokemon://charizard`, etc.

### Multiple Parameters
```typescript
uri: 'api://{version}/{endpoint}'
```
Matches: `api://v1/users`, `api://v2/posts`, etc.

### Mixed Literal and Parameters
```typescript
uri: 'api://v1/{resource}/{id}'
```
Matches: `api://v1/users/123`, `api://v1/posts/456`, etc.

## Parameter Naming Rules

- Parameter names must be alphanumeric with underscores: `{name}`, `{user_id}`, `{version2}`
- Parameter names are case-sensitive: `{Name}` is different from `{name}`
- Parameters are extracted as strings

## Usage Examples

### Basic Template Resource

```typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({
  name: 'my-server',
  version: '1.0.0',
});

// Register a template resource
server.addResource({
  uri: 'pokemon://{name}',
  name: 'Pokemon Info',
  description: 'Get information about a specific Pokemon',
  mimeType: 'application/json',
  content: (params) => {
    // params.name contains the value from the URI
    return JSON.stringify({
      name: params?.name,
      level: 50,
      type: 'Unknown',
    });
  },
});

// When a client requests pokemon://pikachu:
// - The matcher finds the template
// - Extracts { name: 'pikachu' }
// - Calls content({ name: 'pikachu' })
// - Returns { name: 'pikachu', level: 50, type: 'Unknown' }
```

### Multiple Parameters

```typescript
server.addResource({
  uri: 'api://{version}/{endpoint}',
  name: 'API Endpoint',
  description: 'Access versioned API endpoints',
  mimeType: 'application/json',
  content: (params) => {
    return JSON.stringify({
      version: params?.version,
      endpoint: params?.endpoint,
      status: 'ok',
    });
  },
});

// Request: api://v2/users
// Params: { version: 'v2', endpoint: 'users' }
```

### Exact Match Override

```typescript
// Exact match (higher priority)
server.addResource({
  uri: 'pokemon://pikachu',
  name: 'Pikachu',
  description: 'The famous electric mouse',
  mimeType: 'application/json',
  content: JSON.stringify({
    name: 'Pikachu',
    level: 100,
    type: 'Electric',
    special: true,
  }),
});

// Template (lower priority)
server.addResource({
  uri: 'pokemon://{name}',
  name: 'Generic Pokemon',
  description: 'Any other Pokemon',
  mimeType: 'application/json',
  content: (params) => {
    return JSON.stringify({
      name: params?.name,
      level: 50,
      type: 'Unknown',
    });
  },
});

// Request pokemon://pikachu → Returns the exact match (special Pikachu)
// Request pokemon://charizard → Returns the template match (generic data)
```

### Backward Compatibility

All existing resource patterns continue to work:

```typescript
// Static content (unchanged)
server.addResource({
  uri: 'info://server',
  name: 'Server Info',
  description: 'Static information',
  mimeType: 'application/json',
  content: { status: 'online' },
});

// Dynamic content without parameters (unchanged)
server.addResource({
  uri: 'time://current',
  name: 'Current Time',
  description: 'Get current timestamp',
  mimeType: 'text/plain',
  content: () => new Date().toISOString(),
});

// Dynamic content with optional params (new)
server.addResource({
  uri: 'user://{id}',
  name: 'User Details',
  description: 'Get user by ID',
  mimeType: 'application/json',
  content: (params) => {
    return JSON.stringify({ id: params?.id });
  },
});
```

## Matching Algorithm

When a resource URI is requested, the matcher:

1. **Tries exact match first** - If a resource with the exact URI exists, use it
2. **Tries template matches** - Iterate through all resources looking for template matches
3. **Returns null** - If no match is found, throws an error

### Matching Logic

For each template URI:
1. Split both template and request URI into segments (by `://` and `/`)
2. Compare segment counts (must match exactly)
3. For each segment:
   - If template segment is `{param}`, extract the value
   - If template segment is literal, it must match exactly
4. Return matched resource with extracted parameters

### Examples

```typescript
// Template: pokemon://{name}
// Request:  pokemon://pikachu
// Segments: ['pokemon:', 'pikachu'] vs ['pokemon:', '{name}']
// Match:    ✓ (params: { name: 'pikachu' })

// Template: api://{version}/{endpoint}
// Request:  api://v1/users
// Segments: ['api:', 'v1', 'users'] vs ['api:', '{version}', '{endpoint}']
// Match:    ✓ (params: { version: 'v1', endpoint: 'users' })

// Template: api://v1/{resource}/{id}
// Request:  api://v2/users/123
// Segments: ['api:', 'v2', 'users', '123'] vs ['api:', 'v1', '{resource}', '{id}']
// Match:    ✗ (literal 'v1' doesn't match 'v2')

// Template: api://{version}/{endpoint}
// Request:  api://v1/users/extra
// Segments: ['api:', 'v1', 'users', 'extra'] vs ['api:', '{version}', '{endpoint}']
// Match:    ✗ (segment count mismatch)
```

## Real-World Use Cases

### RESTful API Resources

```typescript
// Collection endpoint
server.addResource({
  uri: 'api://users',
  name: 'Users List',
  description: 'List all users',
  mimeType: 'application/json',
  content: JSON.stringify([{ id: 1, name: 'Alice' }]),
});

// Individual resource
server.addResource({
  uri: 'api://users/{id}',
  name: 'User Details',
  description: 'Get user by ID',
  mimeType: 'application/json',
  content: (params) => {
    return JSON.stringify({
      id: params?.id,
      name: 'User',
    });
  },
});

// Nested resource
server.addResource({
  uri: 'api://users/{userId}/posts/{postId}',
  name: 'User Post',
  description: 'Get specific post by user',
  mimeType: 'application/json',
  content: (params) => {
    return JSON.stringify({
      userId: params?.userId,
      postId: params?.postId,
      title: 'Post Title',
    });
  },
});
```

### File System Access

```typescript
server.addResource({
  uri: 'file://{path}',
  name: 'File Access',
  description: 'Access files by path',
  mimeType: 'text/plain',
  content: async (params) => {
    const filePath = params?.path;
    // In a real implementation, you'd read the file
    return `Content of file: ${filePath}`;
  },
});
```

### Multi-Tenant Data

```typescript
server.addResource({
  uri: 'tenant://{tenantId}/data/{dataId}',
  name: 'Tenant Data',
  description: 'Access tenant-specific data',
  mimeType: 'application/json',
  content: async (params) => {
    const { tenantId, dataId } = params || {};
    // Fetch tenant-specific data
    return JSON.stringify({
      tenant: tenantId,
      data: dataId,
      value: 'some data',
    });
  },
});
```

## Type Safety

The `content` function signature supports optional parameters:

```typescript
type ContentFunction = (params?: Record<string, string>) =>
  string | object | Buffer | Uint8Array | Promise<...>
```

This means:
- Functions can accept `params` parameter
- `params` is optional for backward compatibility
- Non-template resources receive an empty params object `{}`
- Template resources receive extracted parameter values

## Testing

The implementation includes comprehensive test coverage:

- **Exact match priority**: Verifies exact matches take precedence
- **Simple templates**: Single parameter extraction
- **Multiple parameters**: Multiple parameter extraction
- **Complex patterns**: Mixed literal and parameter segments
- **No match cases**: Proper error handling
- **Edge cases**: Special characters, URL encoding, etc.

Run tests:
```bash
npx jest tests/unit/uri-template-matcher.test.ts
```

## Implementation Details

### Files
- **Matcher**: `/src/server/uri-template-matcher.ts` - Core matching logic
- **Types**: `/src/server/builder-types.ts` - Updated ResourceDefinition type
- **Server**: `/src/server/builder-server.ts` - Integration with BuildMCPServer

### Key Functions
- `matchResourceUri()` - Main matcher function
- `matchTemplate()` - Template matching logic
- `splitUri()` - URI segmentation

## Migration Guide

### From Exact URIs to Templates

**Before:**
```typescript
server.addResource({
  uri: 'pokemon://pikachu',
  content: { name: 'Pikachu' },
});
server.addResource({
  uri: 'pokemon://charizard',
  content: { name: 'Charizard' },
});
// ... one resource per pokemon
```

**After:**
```typescript
server.addResource({
  uri: 'pokemon://{name}',
  content: (params) => {
    return { name: params?.name };
  },
});
// Handles all pokemon with one resource!
```

### Adding Special Cases

You can combine templates with exact matches for special cases:

```typescript
// Special case (exact match)
server.addResource({
  uri: 'pokemon://pikachu',
  content: { name: 'Pikachu', special: true },
});

// General case (template)
server.addResource({
  uri: 'pokemon://{name}',
  content: (params) => {
    return { name: params?.name, special: false };
  },
});
```

## Limitations

1. **Parameter values are strings** - All extracted parameters are strings. Type conversion must be done in the content function.
2. **No regex patterns** - Only simple `{param}` placeholders are supported, not regex or wildcard patterns.
3. **Segment count must match** - The number of segments in the request must exactly match the template.
4. **No optional segments** - All segments in the template are required.

## Performance

- **Exact matches**: O(1) lookup via Map.get()
- **Template matches**: O(n) where n is the number of template resources
- **Exact matches are always tried first** for optimal performance

## Future Enhancements

Potential future improvements:
- Optional segments: `api://{version}/{endpoint?}`
- Wildcards: `files://path/**`
- Type hints: `user://{id:number}`
- Query parameters: `api://users?page={page}`

## Support

For issues or questions about URI template resources:
- Check the test suite: `tests/unit/uri-template-matcher.test.ts`
- Review this documentation
- Open an issue on GitHub
