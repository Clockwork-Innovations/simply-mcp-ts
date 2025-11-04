# IToolRouter Implementation Plan

**Status**: Planning Phase
**Target Version**: v4.1.0
**Last Updated**: 2025-10-31

---

## Executive Summary

Implement `IToolRouter` interface for the Interface API (v4.0+) to provide type-safe, declarative router tool definitions that match the interface-driven design philosophy. This brings router functionality from legacy APIs (BuildMCPServer) to the modern Interface API.

---

## Table of Contents

1. [Background](#background)
2. [Goals & Non-Goals](#goals--non-goals)
3. [Design Overview](#design-overview)
4. [Detailed Design](#detailed-design)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Documentation Plan](#documentation-plan)
8. [Migration Guide](#migration-guide)
9. [Future Considerations](#future-considerations)

---

## Background

### Current State

- **Router tools exist** in BuildMCPServer (programmatic API)
- **Not available** in Interface API (v4.0.0)
- **Workaround**: Load interface server, then use programmatic methods
- **Problem**: Breaks the interface-driven, declarative paradigm

### Existing Router Implementation (BuildMCPServer)

```typescript
// From builder-types.ts
export interface RouterToolDefinition {
  name: string;
  description: string;
  tools?: string[];  // Tool names to include
  metadata?: Record<string, unknown>;
}

// Usage (programmatic)
server.addRouterTool({
  name: 'weather_router',
  description: 'Weather information tools',
  tools: ['get_weather', 'get_forecast']
});

server.assignTools('weather_router', ['get_weather', 'get_forecast']);
```

### Key Features to Preserve

1. **Tool Grouping**: Group related tools under a single router
2. **Discovery**: Router acts as table of contents
3. **Namespace Calling**: `router_name__tool_name` pattern
4. **flattenRouters**: Control visibility in tools/list
5. **Multi-Router Assignment**: Tools can belong to multiple routers

---

## Goals & Non-Goals

### Goals

✅ **Type-Safe Router Definitions**: Full TypeScript inference for router tools
✅ **Declarative Syntax**: Define routers in interfaces, not imperative code
✅ **Tool Name Validation**: Compile-time checking that assigned tools exist
✅ **AST-Based Discovery**: Parser automatically finds and extracts routers
✅ **Backward Compatible**: Existing programmatic API still works
✅ **Zero Breaking Changes**: Additive feature for v4.1.0

### Non-Goals

❌ **Pattern Matching**: No wildcard tool assignment (`weather_*`) in v4.1
❌ **Dynamic Routers**: No runtime router modification after server start
❌ **Nested Routers**: No router-within-router support in v4.1
❌ **Router-Specific Permissions**: Defer to v4.2 with auth system

---

## Design Overview

### Core Interface Design

```typescript
/**
 * IToolRouter - Interface-driven router tool definition
 *
 * Routers group related tools for better organization and discovery.
 * Tools can be assigned to multiple routers.
 *
 * @template TTools - Union type of tool names to include in router
 */
export interface IToolRouter<TTools extends string = string> {
  /**
   * Router name (snake_case recommended)
   * Optional - inferred from property name if omitted
   */
  name?: string;

  /**
   * Human-readable description of router's purpose
   */
  description: string;

  /**
   * Array of tool names to include in this router
   * Must reference tools defined elsewhere in the server
   *
   * Type safety: TTools ensures only valid tool names are used
   */
  tools: readonly TTools[];

  /**
   * Optional metadata for router
   * Can include category, tags, ordering hints, etc.
   */
  metadata?: {
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}
```

### Usage Example

```typescript
import type { IServer, ITool, IToolRouter } from 'simply-mcp';

// Define tools
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather';
  params: { location: string };
  result: { temperature: number; conditions: string };
}

interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: { location: string; days: number };
  result: { forecast: string[] };
}

// Define router - Type-safe tool references!
interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  name: 'weather_router';
  description: 'Weather information tools';
  tools: ['get_weather', 'get_forecast'];
  metadata: {
    category: 'weather';
    tags: ['forecast', 'conditions'];
  };
}

// Server with tools and router
interface WeatherServer extends IServer {
  name: 'weather-service';
  version: '1.0.0';
  description: 'Weather information service';
  flattenRouters: false; // Hide router-assigned tools from main list
}

export default class WeatherService implements WeatherServer {
  // Tool implementations
  getWeather: GetWeatherTool = async (params) => {
    return { temperature: 72, conditions: 'Sunny' };
  };

  getForecast: GetForecastTool = async (params) => {
    return { forecast: ['Sunny', 'Cloudy', 'Rainy'] };
  };

  // Router implementation - NO implementation needed!
  // Parser extracts metadata from interface
  weatherRouter!: WeatherRouter;
}
```

### Type Safety Benefits

```typescript
// ✅ Type-safe: TypeScript validates tool names at compile time
interface ValidRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  tools: ['get_weather', 'get_forecast']; // ✓ Valid
}

// ❌ Type error: 'invalid_tool' not in union type
interface InvalidRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  tools: ['get_weather', 'invalid_tool']; // ✗ Compile error!
}

// Type utilities for extracting router metadata
type RouterTools<T extends IToolRouter> = T extends IToolRouter<infer Tools> ? Tools : never;
type WeatherRouterTools = RouterTools<WeatherRouter>; // 'get_weather' | 'get_forecast'
```

---

## Detailed Design

### 1. Interface Definition (interface-types.ts)

```typescript
/**
 * Base Tool Router interface
 *
 * Routers are organizational tools that group related tools together.
 * They appear in the tools list as special tools, but when called,
 * they return a list of their assigned tools in MCP format.
 *
 * Unlike ITool, routers do NOT require implementation - they are pure metadata.
 * The framework automatically generates the router execution logic.
 *
 * @template TTools - Union type of tool names included in router
 *
 * @example Basic Router
 * ```typescript
 * interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
 *   name: 'weather_router';
 *   description: 'Weather information tools';
 *   tools: ['get_weather', 'get_forecast'];
 * }
 * ```
 *
 * @example Router with Metadata
 * ```typescript
 * interface ApiRouter extends IToolRouter<'call_api' | 'list_endpoints'> {
 *   name: 'api_router';
 *   description: 'API interaction tools';
 *   tools: ['call_api', 'list_endpoints'];
 *   metadata: {
 *     category: 'integration';
 *     tags: ['rest', 'api'];
 *     order: 10;
 *   };
 * }
 * ```
 *
 * @example Multi-Router Assignment (Same tool in multiple routers)
 * ```typescript
 * interface AdminRouter extends IToolRouter<'delete_user' | 'view_logs'> {
 *   tools: ['delete_user', 'view_logs'];
 * }
 *
 * interface DeveloperRouter extends IToolRouter<'view_logs' | 'run_query'> {
 *   tools: ['view_logs', 'run_query']; // 'view_logs' in both routers
 * }
 * ```
 */
export interface IToolRouter<TTools extends string = string> {
  /**
   * Router name in snake_case (e.g., 'weather_router')
   * Optional - if omitted, will be inferred from property name
   * (e.g., property 'weatherRouter' → router name 'weather_router')
   */
  name?: string;

  /**
   * Human-readable description of what tools this router groups
   */
  description: string;

  /**
   * Array of tool names to include in this router
   *
   * Tool names must reference tools defined elsewhere in the server.
   * Type parameter TTools provides compile-time validation.
   *
   * Use readonly array to ensure immutability.
   */
  tools: readonly TTools[];

  /**
   * Optional metadata for advanced router features
   *
   * Suggested fields:
   * - category: Organizational category
   * - tags: Searchable tags
   * - order: Display order hint (lower = earlier)
   */
  metadata?: {
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}

/**
 * Type utility to extract tool names from router
 *
 * @example
 * ```typescript
 * type WeatherTools = RouterTools<WeatherRouter>;
 * // Result: 'get_weather' | 'get_forecast'
 * ```
 */
export type RouterTools<T extends IToolRouter> =
  T extends IToolRouter<infer Tools> ? Tools : never;

/**
 * Type utility to validate router tool assignments
 *
 * @example
 * ```typescript
 * type MyServer = {
 *   tools: { getTool1: ITool; getTool2: ITool };
 *   routers: { myRouter: IToolRouter<'getTool1' | 'getTool2'> };
 * };
 *
 * type Valid = ValidateRouterTools<MyServer>; // ✓ Valid
 * ```
 */
export type ValidateRouterTools<
  TServer extends { tools?: Record<string, ITool>; routers?: Record<string, IToolRouter> }
> = {
  [K in keyof TServer['routers']]: TServer['routers'][K] extends IToolRouter<infer Tools>
    ? Tools extends keyof TServer['tools']
      ? TServer['routers'][K]
      : never
    : never;
};
```

### 2. Server Configuration Extension

```typescript
export interface IServer {
  // ... existing fields ...

  /**
   * Control router tool visibility in tools/list
   *
   * - false (default): Production mode
   *   - Only routers and non-assigned tools appear in main list
   *   - Assigned tools are hidden (accessed via router)
   *   - Use namespace pattern: router_name__tool_name
   *
   * - true: Development/testing mode
   *   - ALL tools appear in main list
   *   - Includes router-assigned tools
   *   - Useful for testing individual tools
   *
   * @default false
   *
   * @example Production (flattenRouters: false)
   * tools/list returns:
   * - weather_router (router)
   * - standalone_tool (regular tool)
   *
   * @example Development (flattenRouters: true)
   * tools/list returns:
   * - weather_router (router)
   * - get_weather (assigned to router, but visible)
   * - get_forecast (assigned to router, but visible)
   * - standalone_tool (regular tool)
   */
  flattenRouters?: boolean;
}
```

### 3. Parser Updates (parser.ts)

```typescript
/**
 * Detect IToolRouter interface definitions in AST
 */
function detectRouters(sourceFile: ts.SourceFile): RouterMetadata[] {
  const routers: RouterMetadata[] = [];

  function visit(node: ts.Node) {
    // Look for interface declarations extending IToolRouter
    if (ts.isInterfaceDeclaration(node)) {
      const extendsClause = node.heritageClauses?.find(
        clause => clause.token === ts.SyntaxKind.ExtendsKeyword
      );

      if (extendsClause) {
        for (const type of extendsClause.types) {
          const typeName = type.expression.getText();

          // Check if extends IToolRouter
          if (typeName === 'IToolRouter') {
            const router = parseRouterInterface(node, type);
            if (router) {
              routers.push(router);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routers;
}

/**
 * Parse IToolRouter interface to extract metadata
 */
function parseRouterInterface(
  node: ts.InterfaceDeclaration,
  heritageType: ts.ExpressionWithTypeArguments
): RouterMetadata | null {
  const interfaceName = node.name.text;

  // Extract generic type parameter (tool names)
  const toolUnion = extractToolUnionFromGeneric(heritageType);

  // Extract properties
  let routerName: string | undefined;
  let description: string | undefined;
  let tools: string[] = [];
  let metadata: Record<string, unknown> | undefined;

  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const propName = member.name.getText();

      switch (propName) {
        case 'name':
          routerName = extractStringLiteral(member.type);
          break;
        case 'description':
          description = extractStringLiteral(member.type);
          break;
        case 'tools':
          tools = extractToolsArray(member.type);
          break;
        case 'metadata':
          metadata = extractMetadataObject(member.type);
          break;
      }
    }
  }

  // Validation
  if (!description) {
    throw new Error(`Router '${interfaceName}' missing required 'description' field`);
  }

  if (tools.length === 0) {
    throw new Error(`Router '${interfaceName}' must specify at least one tool`);
  }

  // Validate tools against type parameter
  if (toolUnion && toolUnion.length > 0) {
    const invalidTools = tools.filter(t => !toolUnion.includes(t));
    if (invalidTools.length > 0) {
      throw new Error(
        `Router '${interfaceName}' includes invalid tools: ${invalidTools.join(', ')}\n` +
        `Valid tools from type parameter: ${toolUnion.join(', ')}`
      );
    }
  }

  return {
    interfaceName,
    routerName: routerName || camelToSnakeCase(interfaceName),
    description,
    tools,
    metadata,
    toolUnion, // For type validation
  };
}

/**
 * Extract tool names from generic type parameter
 * IToolRouter<'tool1' | 'tool2'> → ['tool1', 'tool2']
 */
function extractToolUnionFromGeneric(
  heritageType: ts.ExpressionWithTypeArguments
): string[] | null {
  if (!heritageType.typeArguments || heritageType.typeArguments.length === 0) {
    return null; // No type parameter (generic IToolRouter)
  }

  const typeArg = heritageType.typeArguments[0];

  if (ts.isUnionTypeNode(typeArg)) {
    const toolNames: string[] = [];
    for (const type of typeArg.types) {
      if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
        toolNames.push(type.literal.text);
      }
    }
    return toolNames;
  } else if (ts.isLiteralTypeNode(typeArg) && ts.isStringLiteral(typeArg.literal)) {
    return [typeArg.literal.text];
  }

  return null;
}

/**
 * Extract tools array from type node
 * tools: ['tool1', 'tool2'] → ['tool1', 'tool2']
 */
function extractToolsArray(typeNode?: ts.TypeNode): string[] {
  if (!typeNode || !ts.isTypeReferenceNode(typeNode)) {
    return [];
  }

  // Handle tuple type: ['tool1', 'tool2']
  if (ts.isTupleTypeNode(typeNode)) {
    return typeNode.elements
      .filter(ts.isLiteralTypeNode)
      .map(lit => (lit.literal as ts.StringLiteral).text);
  }

  // Handle array literal in initializer (from implementation, not interface)
  // This would be extracted from class property, not interface
  return [];
}

interface RouterMetadata {
  interfaceName: string;        // TypeScript interface name
  routerName: string;            // MCP router name (snake_case)
  description: string;           // Router description
  tools: string[];               // Tool names to include
  metadata?: Record<string, unknown>; // Optional metadata
  toolUnion: string[] | null;    // Tool names from generic type parameter
}
```

### 4. Adapter Updates (adapter.ts)

```typescript
/**
 * Register routers after tools are loaded
 */
async function registerRouters(
  server: BuildMCPServer,
  routerMetadata: RouterMetadata[],
  serverInstance: any,
  options: { flattenRouters?: boolean }
): Promise<void> {
  for (const router of routerMetadata) {
    // Validate that all referenced tools exist
    const missingTools: string[] = [];
    for (const toolName of router.tools) {
      if (!server.tools.has(toolName)) {
        missingTools.push(toolName);
      }
    }

    if (missingTools.length > 0) {
      throw new Error(
        `Router '${router.routerName}' references non-existent tools: ${missingTools.join(', ')}\n\n` +
        `Available tools: ${Array.from(server.tools.keys()).join(', ')}\n\n` +
        `To fix:\n` +
        `  1. Ensure all tools are defined before routers\n` +
        `  2. Check tool names match exactly (case-sensitive)\n` +
        `  3. Verify tools are implemented in the server class`
      );
    }

    // Register router with BuildMCPServer
    server.addRouterTool({
      name: router.routerName,
      description: router.description,
      tools: router.tools,
      metadata: router.metadata,
    });

    // Assign tools to router
    server.assignTools(router.routerName, router.tools);
  }

  // Apply flattenRouters setting
  if (options.flattenRouters !== undefined) {
    server.setFlattenRouters(options.flattenRouters);
  }
}

/**
 * Generate router tool handler
 *
 * When a router is called, it returns the list of assigned tools.
 * This is automatically generated - no user implementation needed.
 */
function generateRouterHandler(
  routerName: string,
  tools: string[],
  server: BuildMCPServer
): ToolDefinition {
  return {
    name: routerName,
    description: `Router for: ${tools.join(', ')}`,
    parameters: z.object({}), // Routers take no parameters
    execute: async () => {
      // Return list of assigned tools in MCP format
      const toolDefinitions = tools.map(toolName => {
        const tool = server.tools.get(toolName);
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found in router '${routerName}'`);
        }

        return {
          name: toolName,
          description: tool.definition.description,
          inputSchema: tool.jsonSchema,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(toolDefinitions, null, 2),
          },
        ],
      };
    },
  };
}
```

### 5. Namespace Calling Pattern

```typescript
/**
 * Handle namespace calling: router_name__tool_name
 *
 * When a tool is called with the namespace pattern, resolve it to the actual tool.
 */
function handleToolCall(toolName: string, args: any, context: HandlerContext): Promise<any> {
  // Check for namespace pattern (double underscore)
  const NAMESPACE_SEPARATOR = '__';

  if (toolName.includes(NAMESPACE_SEPARATOR)) {
    const [routerName, actualToolName] = toolName.split(NAMESPACE_SEPARATOR);

    // Validate router exists
    const router = server.routers.get(routerName);
    if (!router) {
      throw new Error(
        `Router '${routerName}' not found\n\n` +
        `What went wrong:\n` +
        `  Tool call used namespace pattern '${toolName}' but router '${routerName}' doesn't exist.\n\n` +
        `Available routers:\n` +
        `  ${Array.from(server.routers.keys()).join('\n  ')}\n\n` +
        `To fix:\n` +
        `  1. Check router name spelling\n` +
        `  2. Ensure router is registered\n` +
        `  3. Call router first to list available tools`
      );
    }

    // Validate tool is assigned to router
    if (!router.tools.includes(actualToolName)) {
      throw new Error(
        `Tool '${actualToolName}' not assigned to router '${routerName}'\n\n` +
        `What went wrong:\n` +
        `  Tool call used '${toolName}' but tool is not in router.\n\n` +
        `Tools in '${routerName}':\n` +
        `  ${router.tools.join('\n  ')}\n\n` +
        `To fix:\n` +
        `  1. Add tool to router's tools array\n` +
        `  2. Or call tool directly without router prefix`
      );
    }

    // Execute the actual tool
    return executeToolByName(actualToolName, args, context);
  }

  // Normal tool call (no namespace)
  return executeToolByName(toolName, args, context);
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Task 1.1**: Add IToolRouter interface to interface-types.ts
- Define base interface with generics
- Add type utilities (RouterTools, ValidateRouterTools)
- Add JSDoc documentation with examples
- **Deliverable**: Updated interface-types.ts

**Task 1.2**: Add flattenRouters to IServer interface
- Add optional boolean field
- Document production vs development modes
- Add examples
- **Deliverable**: Updated IServer interface

**Task 1.3**: Update parser.ts for router detection
- Implement detectRouters() function
- Implement parseRouterInterface() function
- Add validation logic
- Add error messages
- **Deliverable**: Parser can extract router metadata from AST

**Task 1.4**: Write unit tests for parser
- Test valid router interface parsing
- Test error cases (missing fields, invalid tools)
- Test generic type parameter extraction
- **Deliverable**: parser.test.ts with router tests

### Phase 2: Runtime Integration (Week 1-2)

**Task 2.1**: Update adapter.ts for router registration
- Implement registerRouters() function
- Add tool existence validation
- Integrate with BuildMCPServer.addRouterTool()
- **Deliverable**: Routers registered at server startup

**Task 2.2**: Implement namespace calling pattern
- Update tool call handler
- Add router/tool validation
- Add helpful error messages
- **Deliverable**: router_name__tool_name calls work

**Task 2.3**: Implement flattenRouters logic
- Update tools/list endpoint
- Filter assigned tools based on flag
- Test both modes
- **Deliverable**: flattenRouters configuration works

**Task 2.4**: Write integration tests
- Test router registration
- Test namespace calling
- Test flattenRouters behavior
- Test multi-router assignment
- **Deliverable**: router-integration.test.ts

### Phase 3: Examples & Documentation (Week 2)

**Task 3.1**: Create example interfaces
- Basic router example
- Multi-router example
- Router with metadata example
- **Deliverable**: examples/interface-router*.ts

**Task 3.2**: Update ROUTER_TOOLS.md
- Add Interface API section
- Add IToolRouter examples
- Update alternatives section
- Add migration guide link
- **Deliverable**: Updated ROUTER_TOOLS.md

**Task 3.3**: Create migration guide
- Document programmatic → interface transition
- Provide code examples
- List breaking changes (none)
- **Deliverable**: docs/guides/ROUTER_MIGRATION.md

**Task 3.4**: Update main documentation
- Update API_REFERENCE.md
- Update QUICK_START.md (optional router section)
- Add to FEATURES.md
- **Deliverable**: Updated core docs

### Phase 4: Polish & Release (Week 2)

**Task 4.1**: Code review and refinement
- Review type safety
- Review error messages
- Review documentation
- **Deliverable**: Code review complete

**Task 4.2**: Performance testing
- Test with many routers
- Test with large tool sets
- Optimize if needed
- **Deliverable**: Performance benchmarks

**Task 4.3**: Final testing
- Run full test suite
- Manual testing with examples
- Test edge cases
- **Deliverable**: All tests passing

**Task 4.4**: Release preparation
- Update CHANGELOG.md
- Tag version v4.1.0
- Update npm package
- **Deliverable**: v4.1.0 released

---

## Testing Strategy

### Unit Tests

**Parser Tests** (parser.test.ts)
```typescript
describe('IToolRouter Parser', () => {
  it('should extract router with basic configuration', () => {
    const source = `
      interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
        description: 'Weather tools';
        tools: ['get_weather', 'get_forecast'];
      }
    `;
    const routers = parseRouters(source);
    expect(routers).toHaveLength(1);
    expect(routers[0].routerName).toBe('weather_router');
    expect(routers[0].tools).toEqual(['get_weather', 'get_forecast']);
  });

  it('should validate tools against generic type parameter', () => {
    const source = `
      interface BadRouter extends IToolRouter<'tool1' | 'tool2'> {
        description: 'Test';
        tools: ['tool1', 'invalid_tool'];
      }
    `;
    expect(() => parseRouters(source)).toThrow('includes invalid tools');
  });

  it('should throw error if description missing', () => {
    const source = `
      interface BadRouter extends IToolRouter {
        tools: ['tool1'];
      }
    `;
    expect(() => parseRouters(source)).toThrow('missing required \'description\'');
  });
});
```

**Type Inference Tests** (type-inference.test.ts)
```typescript
describe('IToolRouter Type Inference', () => {
  it('should infer tool names from router', () => {
    type MyRouter = IToolRouter<'tool1' | 'tool2'>;
    type Tools = RouterTools<MyRouter>;

    const tools: Tools = 'tool1'; // ✓ Valid
    const tools2: Tools = 'tool2'; // ✓ Valid
    // const invalid: Tools = 'tool3'; // ✗ Type error
  });

  it('should validate router tool assignments', () => {
    interface MyServer extends IServer {
      tools: { tool1: ITool; tool2: ITool };
      routers: { myRouter: IToolRouter<'tool1' | 'tool2'> };
    }

    type Valid = ValidateRouterTools<MyServer>;
    // Should compile without errors
  });
});
```

### Integration Tests

**Router Registration Tests** (router-integration.test.ts)
```typescript
describe('Router Registration', () => {
  it('should register router and assign tools', async () => {
    const server = await loadInterfaceServer({
      filePath: './fixtures/router-server.ts'
    });

    // Verify router registered
    expect(server.routers.has('weather_router')).toBe(true);

    // Verify tools assigned
    const router = server.routers.get('weather_router');
    expect(router.tools).toEqual(['get_weather', 'get_forecast']);
  });

  it('should throw error for non-existent tools', async () => {
    await expect(
      loadInterfaceServer({ filePath: './fixtures/bad-router.ts' })
    ).rejects.toThrow('references non-existent tools');
  });
});

describe('Namespace Calling', () => {
  it('should call tool via namespace', async () => {
    const server = await loadInterfaceServer({
      filePath: './fixtures/router-server.ts'
    });

    await server.start({ transport: 'stdio' });

    // Call via namespace
    const result = await server.callTool('weather_router__get_weather', {
      location: 'Seattle'
    });

    expect(result).toHaveProperty('temperature');
  });

  it('should throw error for invalid namespace', async () => {
    const server = await loadInterfaceServer({
      filePath: './fixtures/router-server.ts'
    });

    await expect(
      server.callTool('invalid_router__tool', {})
    ).rejects.toThrow('Router \'invalid_router\' not found');
  });
});

describe('flattenRouters Configuration', () => {
  it('should hide assigned tools when flattenRouters=false', async () => {
    const server = await loadInterfaceServer({
      filePath: './fixtures/router-server.ts'
    });

    const tools = await server.listTools();

    // Should include router
    expect(tools.some(t => t.name === 'weather_router')).toBe(true);

    // Should NOT include assigned tools
    expect(tools.some(t => t.name === 'get_weather')).toBe(false);
  });

  it('should show all tools when flattenRouters=true', async () => {
    const server = await loadInterfaceServer({
      filePath: './fixtures/router-server-flatten.ts'
    });

    const tools = await server.listTools();

    // Should include router
    expect(tools.some(t => t.name === 'weather_router')).toBe(true);

    // Should include assigned tools
    expect(tools.some(t => t.name === 'get_weather')).toBe(true);
  });
});
```

### Manual Tests

**Test Fixtures**
- `fixtures/interface-router-basic.ts` - Basic router example
- `fixtures/interface-router-multi.ts` - Multiple routers
- `fixtures/interface-router-metadata.ts` - Router with metadata
- `fixtures/interface-router-invalid.ts` - Error cases

**Manual Test Plan**
1. Load each fixture server
2. Call router to list tools
3. Call tool via namespace
4. Verify flattenRouters behavior
5. Test with Claude Desktop integration

---

## Documentation Plan

### API Reference Documentation

**docs/guides/API_REFERENCE.md**
```markdown
## IToolRouter

Define router tools to group related tools for better organization.

### Interface

\`\`\`typescript
interface IToolRouter<TTools extends string = string> {
  name?: string;
  description: string;
  tools: readonly TTools[];
  metadata?: {
    category?: string;
    tags?: string[];
    order?: number;
    [key: string]: unknown;
  };
}
\`\`\`

### Example

\`\`\`typescript
interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  name: 'weather_router';
  description: 'Weather information tools';
  tools: ['get_weather', 'get_forecast'];
}

export default class MyServer implements IServer {
  weatherRouter!: WeatherRouter; // No implementation needed!
}
\`\`\`

### Benefits

- **Type Safety**: Tool names validated at compile time
- **Organization**: Group related tools logically
- **Discovery**: Routers act as table of contents
- **Scalability**: 50 tools → 5-6 routers
```

### Router Tools Guide

**docs/guides/ROUTER_TOOLS.md** (update)
```markdown
## Interface API Implementation (v4.1.0+)

### Defining Routers

\`\`\`typescript
import type { IServer, ITool, IToolRouter } from 'simply-mcp';

interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  description: 'Weather information tools';
  tools: ['get_weather', 'get_forecast'];
}

interface WeatherServer extends IServer {
  name: 'weather-service';
  flattenRouters: false; // Hide assigned tools from main list
}

export default class WeatherService implements WeatherServer {
  // Tools
  getWeather: GetWeatherTool = async (params) => { ... };
  getForecast: GetForecastTool = async (params) => { ... };

  // Router - no implementation needed!
  weatherRouter!: WeatherRouter;
}
\`\`\`

### Calling Router Tools

1. **Discover tools**: Call the router
   \`\`\`
   tools/call: weather_router
   → Returns list of tools in router
   \`\`\`

2. **Call via namespace**: Use `router_name__tool_name`
   \`\`\`
   tools/call: weather_router__get_weather
   → Executes get_weather tool
   \`\`\`

3. **Direct call** (if flattenRouters=true):
   \`\`\`
   tools/call: get_weather
   → Executes get_weather directly
   \`\`\`
```

### Migration Guide

**docs/guides/ROUTER_MIGRATION.md** (new)
```markdown
# Router Migration Guide

## Migrating from Programmatic API to Interface API

### Before (BuildMCPServer)

\`\`\`typescript
import { BuildMCPServer } from 'simply-mcp';

const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });

server.addTool({ name: 'get_weather', ... });
server.addTool({ name: 'get_forecast', ... });

server.addRouterTool({
  name: 'weather_router',
  description: 'Weather tools',
  tools: ['get_weather', 'get_forecast']
});

await server.start();
\`\`\`

### After (Interface API v4.1.0+)

\`\`\`typescript
import type { IServer, ITool, IToolRouter } from 'simply-mcp';

interface WeatherRouter extends IToolRouter<'get_weather' | 'get_forecast'> {
  name: 'weather_router';
  description: 'Weather tools';
  tools: ['get_weather', 'get_forecast'];
}

interface MyServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  flattenRouters: false;
}

export default class MyServerImpl implements MyServer {
  getWeather: GetWeatherTool = async (params) => { ... };
  getForecast: GetForecastTool = async (params) => { ... };
  weatherRouter!: WeatherRouter; // Declarative!
}
\`\`\`

### Benefits of Migration

✅ **Type Safety**: Tool names validated at compile time
✅ **Declarative**: No imperative addRouterTool() calls
✅ **AST-Based**: Parser extracts metadata automatically
✅ **Less Code**: No manual registration logic

### Breaking Changes

None! Existing programmatic API still works.
```

---

## Migration Guide

### For Users of Programmatic API

**Option 1: Keep Using Programmatic API** (No migration needed)
```typescript
// This still works in v4.1.0+
const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });
server.addRouterTool({ name: 'router', description: '...', tools: [...] });
```

**Option 2: Hybrid Approach** (Mix interface + programmatic)
```typescript
// Interface-based tools
const server = await loadInterfaceServer({ filePath: './server.ts' });

// Programmatic routers
server.addRouterTool({ name: 'router', description: '...', tools: [...] });

await server.start();
```

**Option 3: Pure Interface API** (Recommended for new projects)
```typescript
// Everything defined in interfaces
interface MyRouter extends IToolRouter<'tool1' | 'tool2'> {
  description: 'My tools';
  tools: ['tool1', 'tool2'];
}

export default class MyServer implements IServer {
  myRouter!: MyRouter;
}
```

### Migration Checklist

- [ ] Review existing router definitions
- [ ] Create IToolRouter interfaces for each router
- [ ] Add type parameter with tool names
- [ ] Add router properties to server class (with `!` definite assignment)
- [ ] Set flattenRouters in IServer interface if needed
- [ ] Test router discovery and tool calling
- [ ] Update documentation

---

## Future Considerations

### v4.2: Advanced Router Features

**Pattern Matching** (Deferred)
```typescript
interface AllWeatherTools extends IToolRouter {
  tools: { pattern: 'weather_*' }; // Match all tools starting with weather_
}
```

**Nested Routers** (Deferred)
```typescript
interface AdminRouter extends IToolRouter {
  routers: ['user_admin_router', 'system_admin_router']; // Include other routers
}
```

**Dynamic Router Membership** (Deferred)
```typescript
interface DynamicRouter extends IToolRouter {
  dynamic: true;
  tools: (context: ServerContext) => string[]; // Runtime tool list
}
```

**Router-Specific Permissions** (v4.2 with auth)
```typescript
interface SecureRouter extends IToolRouter {
  permissions: ['admin', 'developer']; // Require permissions to access router
}
```

### v5.0: Router Enhancements

**Router Hierarchies**: Tree structure with parent/child relationships
**Router Metadata Queries**: Search/filter routers by category, tags
**Router Analytics**: Track router usage, tool discovery patterns
**Router Versioning**: Versioned routers with deprecation support

---

## Success Criteria

### Functional Requirements

✅ IToolRouter interface supports type-safe tool references
✅ Parser extracts router metadata from interfaces
✅ Routers registered automatically at server startup
✅ Namespace calling pattern works (router_name__tool_name)
✅ flattenRouters configuration controls tool visibility
✅ Multi-router assignment supported (tool in multiple routers)
✅ Helpful error messages for common mistakes

### Non-Functional Requirements

✅ No breaking changes to existing APIs
✅ Performance: <5ms overhead per router registration
✅ Documentation: Complete examples and API reference
✅ Test coverage: >90% for new code
✅ Type safety: Full TypeScript inference

### Acceptance Tests

1. **Basic Router**: Define and use a simple router
2. **Multi-Router**: Same tool in multiple routers
3. **Type Validation**: Invalid tool names cause compile error
4. **Namespace Calling**: Call tool via router_name__tool_name
5. **flattenRouters**: Toggle visibility modes
6. **Error Handling**: Clear errors for missing tools, invalid routers
7. **Documentation**: Examples work out of the box

---

## Timeline

**Week 1**
- Days 1-3: Core infrastructure (interface, parser, adapter)
- Days 4-5: Runtime integration (namespace calling, flattenRouters)

**Week 2**
- Days 1-2: Testing (unit + integration)
- Days 3-4: Documentation and examples
- Day 5: Polish, review, release

**Total Estimated Time**: 2 weeks (10 working days)

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Type inference too complex | Medium | High | Simplify generic constraints, provide helper types |
| Parser can't extract generic type | Medium | High | Fallback to runtime validation, clear error messages |
| Namespace pattern conflicts | Low | Medium | Reserve `__` separator, document pattern |
| Performance degradation | Low | Medium | Benchmark early, optimize registration |
| Documentation insufficient | Medium | High | Start docs early, get feedback from users |

---

## Open Questions

1. **Should routers support default tools?** (e.g., if tools array omitted, include all tools)
2. **Should we support router inheritance?** (e.g., AdminRouter extends BaseRouter)
3. **Should routers have their own permissions?** (defer to v4.2 auth)
4. **Should we support router templates?** (e.g., reusable router patterns)

---

## Approval & Sign-off

**Prepared By**: Claude Code Assistant
**Date**: 2025-10-31
**Status**: Draft - Awaiting Review

**Reviewers**:
- [ ] Architecture Review
- [ ] API Design Review
- [ ] Documentation Review
- [ ] Security Review

**Approved for Implementation**: [ ] Yes [ ] No

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | Claude | Initial draft |

---

**Next Steps**:
1. Review this plan
2. Get feedback on design decisions
3. Resolve open questions
4. Begin implementation (Phase 1)
