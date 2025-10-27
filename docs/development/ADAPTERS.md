# Adapters Directory

This directory contains specialized adapters for registering different types of MCP resources with BuildMCPServer.

## Purpose

Adapters bridge the gap between parsed interface definitions (from the parser) and the BuildMCPServer runtime. Each adapter is responsible for:

1. Taking parsed interface metadata
2. Validating server implementation
3. Registering resources with BuildMCPServer
4. Handling runtime execution

## Available Adapters

### ui-adapter.ts

Registers UI resources (IUI interfaces) as MCP resources.

**Responsibilities**:
- Register static and dynamic UI resources
- Inject tool helper scripts (callTool, notify)
- Inject inline CSS
- Enforce tool allowlists (security)

**Usage**:
```typescript
import { registerUIResources } from './adapters/ui-adapter.js';

// After parsing interfaces
const parseResult = parseInterfaceFile('server.ts');

// Register UIs with server
if (parseResult.uis.length > 0) {
  await registerUIResources(
    buildServer,
    parseResult.uis,
    serverInstance,
    filePath
  );
}
```

**Features**:
- Static UIs: Use `html` field directly
- Dynamic UIs: Call method on server instance to generate HTML
- CSS injection: Injects `<style>` tags in HTML head
- Tool helpers: Provides `window.callTool()` and `window.notify()`
- Security: Enforces tool allowlist, prevents unauthorized tool calls

**See**: `ui-adapter.ts` for full implementation

## Adapter Pattern

All adapters follow a similar pattern:

```typescript
// 1. Main entry point
export async function registerXResources(
  server: BuildMCPServer,
  resources: ParsedX[],
  serverInstance: any,
  serverFilePath: string
): Promise<void>

// 2. Single resource registration
async function registerSingleX(
  server: BuildMCPServer,
  resource: ParsedX,
  serverInstance: any,
  serverFilePath: string
): Promise<void>

// 3. Helper functions (as needed)
```

## Integration with Parser

Adapters consume parsed interface metadata from the parser:

```typescript
// Parser extracts interfaces
export interface ParsedUI {
  interfaceName: string;
  uri: string;
  name: string;
  description: string;
  html?: string;
  css?: string;
  tools?: string[];
  dynamic: boolean;
  methodName?: string;
  // ...
}

// Adapter registers based on metadata
await registerUIResources(server, parseResult.uis, ...);
```

## Integration with BuildMCPServer

Adapters use the BuildMCPServer API to register resources:

```typescript
// For static content
server.addResource({
  uri: 'ui://example',
  name: 'Example UI',
  description: 'An example',
  mimeType: 'text/html',
  content: processedHtml, // String
});

// For dynamic content
server.addResource({
  uri: 'ui://example',
  name: 'Example UI',
  description: 'An example',
  mimeType: 'text/html',
  content: async () => {
    // Generate content dynamically
    return processedHtml;
  },
});
```

## Future Adapters

Potential future adapters could include:

- **auth-adapter.ts**: Register authentication handlers
- **middleware-adapter.ts**: Register request/response middleware
- **validation-adapter.ts**: Register input validation rules
- **subscription-adapter.ts**: Register resource subscriptions

## Design Principles

1. **Lazy Loading**: Adapters are only loaded when needed (e.g., only import ui-adapter if UIs exist)
2. **Single Responsibility**: Each adapter handles one type of resource
3. **Error Handling**: Clear, actionable error messages
4. **Type Safety**: Strongly typed using ParsedX interfaces
5. **Testability**: Pure functions where possible
6. **Security**: Validate and sanitize inputs

## Related Files

- **src/parser.ts**: Defines ParsedX interfaces
- **src/adapter.ts**: Main adapter that loads specialized adapters
- **src/api/programmatic/BuildMCPServer.ts**: Registration API
- **src/handlers/**: Runtime handlers for different resource types
