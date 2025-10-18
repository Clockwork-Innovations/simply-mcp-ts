# Router Testing Mode Example

This example demonstrates how to use `flattenRouters` for development and testing.

## Features

- **Environment-based configuration**: Control `flattenRouters` via env var
- **Production mode**: `flattenRouters=false` - Tools hidden from main list
- **Testing mode**: `flattenRouters=true` - All tools visible
- **Clear comparison**: See differences between modes

## Modes Explained

### Production Mode (flattenRouters=false)

**Default behavior** - Tools assigned to routers are hidden from main list.

**Visible Tools**:
- `api_router` (router)
- `general_tool` (unassigned)

**Hidden Tools** (in router):
- `call_api`
- `parse_response`
- `handle_error`

**Use Case**: Production deployment with organized tool discovery.

### Testing Mode (flattenRouters=true)

**All tools visible** - Every tool appears in main list.

**Visible Tools**:
- `api_router` (router)
- `call_api` (assigned to router)
- `parse_response` (assigned to router)
- `handle_error` (assigned to router)
- `general_tool` (unassigned)

**Use Case**: Development, testing, debugging, exploration.

## How to Run

### Production Mode (default)
```bash
npx tsx server.ts
```

Or explicitly:
```bash
FLATTEN_ROUTERS=false npx tsx server.ts
```

### Testing Mode
```bash
FLATTEN_ROUTERS=true npx tsx server.ts
```

Or using npm script:
```bash
npm run start:testing
```

### With HTTP Transport
```bash
npx tsx server.ts --http --port 3000
FLATTEN_ROUTERS=true npx tsx server.ts --http --port 3000
```

## Configuration

The example uses an environment variable to control the setting:

```javascript
const flattenRouters = process.env.FLATTEN_ROUTERS === 'true';

const server = new BuildMCPServer({
  name: 'testing-server',
  version: '1.0.0',
  flattenRouters, // Controlled by environment
});
```

### Environment Variable

See `.env.example` for configuration options:

```bash
# Production mode (default)
FLATTEN_ROUTERS=false

# Testing mode
FLATTEN_ROUTERS=true
```

## When to Use Each Mode

### Use Production Mode (flattenRouters=false) when:
- Deploying to production
- You want organized tool discovery
- Clients should follow the router pattern
- You need a cleaner tool list

### Use Testing Mode (flattenRouters=true) when:
- Developing and testing locally
- Debugging tool execution
- Exploring available tools
- Writing tests that need direct tool access
- Using tools with clients that don't support routers well

## Tools Included

### api_router (Router)
Discovery tool for API-related operations.

### call_api
Make HTTP requests to external APIs.

### parse_response
Parse and extract data from API responses.

### handle_error
Handle and format API error responses.

### general_tool
A tool not assigned to any router (always visible).

## Learning Points

- How to configure `flattenRouters` dynamically
- Differences between production and testing modes
- When to use each mode
- Using environment variables for configuration
- Trade-offs between organization and accessibility
