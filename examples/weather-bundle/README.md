# Weather MCP Server

A complete example of a SimpleMCP package bundle that provides weather forecast and current weather information.

## Features

- Get current weather conditions for any location
- Get multi-day forecasts (1-7 days)
- Get active weather alerts and warnings
- Support for Fahrenheit and Celsius units
- Uses mock data for demonstration purposes

## Installation

```bash
# Install dependencies
npm install

# Or use pnpm, yarn, or bun
pnpm install
yarn install
bun install
```

## Usage

### Run with SimpleMCP

```bash
# Run with STDIO transport (default)
npx simply-mcp run .

# Run with HTTP transport
npx simply-mcp run . --http --port 3000

# Run with verbose output
npx simply-mcp run . --verbose
```

### Run with npm scripts

```bash
# Start server
npm start

# Development with watch mode
npm run dev

# Validate server
npm run validate
```

## Tools

### get-current-weather

Get current weather conditions for a specific location.

**Parameters:**
- `location` (required): City name, address, or coordinates
- `units` (optional): Temperature units - `fahrenheit` or `celsius` (default: `fahrenheit`)

**Example:**
```json
{
  "location": "San Francisco",
  "units": "fahrenheit"
}
```

**Response:**
```
Current Weather for San Francisco:
Temperature: 65°F
Condition: partly cloudy
Humidity: 55%
Wind Speed: 12 mph

Note: This is mock data for demonstration purposes.
```

### get-forecast

Get multi-day weather forecast for a location.

**Parameters:**
- `location` (required): City name or address
- `days` (optional): Number of days (1-7, default: 3)
- `units` (optional): Temperature units - `fahrenheit` or `celsius`

**Example:**
```json
{
  "location": "New York",
  "days": 5,
  "units": "celsius"
}
```

**Response:**
```
5-Day Forecast for New York:

Monday: sunny, High: 23°C, Low: 13°C
Tuesday: partly cloudy, High: 25°C, Low: 15°C
Wednesday: cloudy, High: 20°C, Low: 10°C
Thursday: rainy, High: 18°C, Low: 8°C
Friday: stormy, High: 22°C, Low: 12°C

Note: This is mock data for demonstration purposes.
```

### get-weather-alerts

Get active weather alerts and warnings for a location.

**Parameters:**
- `location` (required): City name or address

**Example:**
```json
{
  "location": "Miami"
}
```

**Response:**
```
Weather Alert for Miami:

Type: Severe Thunderstorm Warning
Severity: Warning
Description: Severe thunderstorms with heavy rain and strong winds expected in the area.

This is a mock alert for demonstration purposes.
```

## Configuration

This server uses mock data and doesn't require any configuration. In a production version, you would:

1. Add environment variables for API keys
2. Integrate with a real weather API (OpenWeatherMap, Weather.gov, etc.)
3. Add error handling and rate limiting

**Example .env file (for production):**
```bash
WEATHER_API_KEY=your-api-key-here
WEATHER_API_URL=https://api.openweathermap.org/data/2.5
```

## Development

This bundle demonstrates SimpleMCP package bundle features:

1. **Package Structure**: Complete npm package with `package.json`
2. **Entry Point Resolution**: Uses `main` and `bin` fields
3. **Functional API**: Simple declarative server definition
4. **Mock Data**: Self-contained example with no external dependencies
5. **Documentation**: Comprehensive README with usage examples

## Testing

```bash
# Dry-run validation
npx simply-mcp run . --dry-run

# Test with different transports
npx simply-mcp run . --http --port 3000

# Test with specific API style
npx simply-mcp run . --style functional
```

## Distribution

### Publish to npm

```bash
# Login to npm
npm login

# Publish package
npm publish --access public
```

### Use from npm

```bash
# Install globally
npm install -g weather-mcp-server

# Run
simplymcp run weather-mcp-server
```

### Use from GitHub

```bash
# Clone repository
git clone https://github.com/yourusername/weather-mcp-server.git

# Install and run
cd weather-mcp-server
npm install
simplymcp run .
```

## Integration Examples

### Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "simply-mcp", "run", "/path/to/weather-bundle"]
    }
  }
}
```

### Custom Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['simply-mcp', 'run', './weather-bundle']
});

const client = new Client({
  name: 'weather-client',
  version: '1.0.0',
}, {
  capabilities: {}
});

await client.connect(transport);
```

## About

This is an example package bundle created with SimpleMCP. It demonstrates:

- Complete package structure
- Functional API usage
- Tool parameter validation
- Mock data generation
- Documentation best practices

For more information about SimpleMCP:
- GitHub: https://github.com/Clockwork-Innovations/simply-mcp-ts
- Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts/tree/main/docs

## License

MIT
