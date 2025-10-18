# Weather Router Example

This example demonstrates basic router usage with a familiar domain (weather service).

## Features

- **Router-based organization**: Weather tools grouped under `weather_router`
- **Multiple related tools**: Current weather, forecast, and alerts
- **Default behavior**: `flattenRouters=false` hides tools from main list
- **Namespace support**: Call tools via `weather_router__get_current_weather`

## Tools

### weather_router (Router)
Discovery tool that lists available weather tools.

**Usage**: Call this router first to see what weather operations are available.

### get_current_weather
Get current weather conditions for a location.

**Parameters**:
- `location` (string): City name or zip code
- `units` (optional): "celsius" or "fahrenheit" (default: "fahrenheit")

**Example namespace call**: `weather_router__get_current_weather`

### get_forecast
Get multi-day weather forecast.

**Parameters**:
- `location` (string): City name or zip code
- `days` (number): Number of days to forecast (1-10, default: 3)
- `units` (optional): "celsius" or "fahrenheit" (default: "fahrenheit")

**Example namespace call**: `weather_router__get_forecast`

### get_weather_alerts
Get active weather alerts and warnings.

**Parameters**:
- `location` (string): City name or zip code

**Example namespace call**: `weather_router__get_weather_alerts`

## How to Run

### Stdio Transport (default)
```bash
npx tsx server.ts
```

### HTTP Transport
```bash
npx tsx server.ts --http --port 3000
```

## Router Pattern Explained

1. **Call the router first**: `weather_router` → Returns list of available tools
2. **Call tools via namespace**: `weather_router__get_current_weather` → Executes the tool
3. **Direct calls work too**: `get_current_weather` (if client supports it)

## Tool Visibility

With `flattenRouters=false` (default):
- **Visible**: `weather_router`, unassigned tools
- **Hidden**: `get_current_weather`, `get_forecast`, `get_weather_alerts`

Models must call the router first to discover the hidden tools.

## Learning Points

- How to organize related tools under a router
- Default router behavior (tools hidden from main list)
- Namespace calling pattern
- Real-world API structure with routers
