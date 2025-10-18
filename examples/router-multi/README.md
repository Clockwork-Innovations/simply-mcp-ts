# Multi-Router Pattern Example

This example demonstrates advanced router patterns where a single tool belongs to multiple routers.

## Features

- **Tool sharing**: One tool (`search`) belongs to THREE different routers
- **Router-specific tools**: Each router also has exclusive tools
- **Namespace equivalence**: `search_router__search` and `products_router__search` call the SAME tool
- **Testing mode**: `flattenRouters=true` shows all tools for exploration

## Architecture

### Shared Tool: `search`
This tool is shared across all three routers:
- `search_router__search`
- `products_router__search`
- `users_router__search`

**All three namespace calls execute the identical tool with identical logic.**

### Routers

#### search_router
General-purpose search functionality.

**Tools**: `search`

#### products_router
Product management with search.

**Tools**:
- `search` (shared)
- `create_product` (exclusive)
- `update_product` (exclusive)

#### users_router
User management with search.

**Tools**:
- `search` (shared)
- `create_user` (exclusive)
- `update_user` (exclusive)

## How to Run

### Stdio Transport (default)
```bash
npx tsx server.ts
```

### HTTP Transport
```bash
npx tsx server.ts --http --port 3000
```

## Understanding Tool Sharing

### Same Tool, Multiple Namespaces

The `search` tool can be called via three different namespaces:

```javascript
// All three calls execute the SAME tool:
search_router__search      // General search
products_router__search    // Product search context
users_router__search       // User search context
```

The tool receives context information about which router was used (if any):
- `context.metadata.namespace`: The router used for the call
- `context.metadata.routers`: All routers this tool belongs to

### Exclusive Tools

Each router also has tools that are exclusive to that router:

**Products Only**:
- `create_product`
- `update_product`

**Users Only**:
- `create_user`
- `update_user`

## Tool Visibility

With `flattenRouters=true` (testing mode):
- **All tools visible**: All 8 tools appear in main list
- **Direct calling**: Models can call any tool directly
- **Useful for**: Testing, debugging, exploration

## Use Cases

This pattern is useful when:
1. A common operation (like search) applies to multiple domains
2. You want to organize tools by domain while sharing common functionality
3. You need context-aware execution (tool knows which router called it)

## Learning Points

- How to assign one tool to multiple routers
- Namespace equivalence (different namespaces, same tool)
- Using `flattenRouters=true` for testing
- Router context in tool execution
- Balancing shared vs exclusive tools
