/**
 * Interface-Driven API - HTTP Server with Authentication
 *
 * Demonstrates:
 * - HTTP transport configuration in IServer
 * - API key authentication with IApiKeyAuth
 * - Multiple API keys with different permission levels
 * - Stateful session management
 * - Secure tool implementation
 *
 * This example shows how to create a production-ready HTTP MCP server with
 * authentication, allowing you to control access to your tools and resources
 * using API keys with granular permissions.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-http-auth.ts
 *
 * Test with curl:
 *   # Initialize session with admin key
 *   curl -H "x-api-key: sk-admin-demo" \
 *     -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # List available tools (use session ID from initialize response)
 *   curl -H "x-api-key: sk-admin-demo" \
 *     -H "mcp-session-id: <session-id>" \
 *     -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
 *
 *   # Call weather tool
 *   curl -H "x-api-key: sk-admin-demo" \
 *     -H "mcp-session-id: <session-id>" \
 *     -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_weather","arguments":{"location":"San Francisco"}},"id":3}'
 *
 *   # Try readonly key (should fail for tools that modify state)
 *   curl -H "x-api-key: sk-read-demo" \
 *     -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 */

import type { IServer, ITool, IPrompt, IResource, IApiKeyAuth } from 'simply-mcp';

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

/**
 * API Key Authentication Configuration
 *
 * Defines three levels of access:
 * - admin: Full access to all tools and resources (['*'])
 * - developer: Read and execute tools (['tool:*', 'resource:*'])
 * - readonly: Only read operations (['read:*'])
 *
 * The permissions array controls what each key can access:
 * - '*': Full access to everything
 * - 'tool:*': Access to all tools
 * - 'tool:get_weather': Access to specific tool
 * - 'resource:*': Access to all resources
 * - 'read:*': Read-only access
 */
interface ServerAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName: 'x-api-key';
  keys: [
    { name: 'admin', key: 'sk-admin-demo', permissions: ['*'] },
    { name: 'developer', key: 'sk-dev-demo', permissions: ['tool:*', 'resource:*'] },
    { name: 'readonly', key: 'sk-read-demo', permissions: ['read:*'] }
  ];
  allowAnonymous: false;
}

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

/**
 * HTTP Server with Authentication and Session Management
 *
 * - transport: 'http' - Enables HTTP server instead of stdio
 * - port: 3000 - HTTP server port
 * - stateful: true - Enables session management for stateful interactions
 * - auth: ServerAuth - Enables API key authentication
 */
interface SecureWeatherServer extends IServer {
  name: 'secure-weather-server';
  version: '1.0.0';
  description: 'Weather server with API key authentication and session management';
  transport: 'http';
  port: 3000;
  stateful: true;
  auth: ServerAuth;
}

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * Get current weather for a location
 *
 * Requires authentication - will reject requests without valid API key.
 * Accessible with 'admin', 'developer', or 'tool:get_weather' permissions.
 */
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location (requires authentication)';
  params: {
    /** Location to get weather for (e.g., "San Francisco", "London") */
    location: string;
    /** Temperature units */
    units?: 'celsius' | 'fahrenheit';
  };
  result: {
    location: string;
    temperature: number;
    conditions: string;
    humidity: number;
    wind_speed: number;
  };
}

/**
 * Get multi-day weather forecast
 *
 * Requires authentication with tool access permissions.
 */
interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get multi-day weather forecast (requires authentication)';
  params: {
    /** Location for forecast */
    location: string;
    /** Number of days to forecast (1-7) */
    days?: number;
  };
  result: {
    location: string;
    forecast: Array<{
      date: string;
      high: number;
      low: number;
      conditions: string;
      precipitation_chance: number;
    }>;
  };
}

/**
 * Get severe weather alerts
 *
 * Requires authentication - provides critical weather information.
 */
interface GetAlertsTool extends ITool {
  name: 'get_alerts';
  description: 'Get active severe weather alerts for a location';
  params: {
    /** Location to check for alerts */
    location: string;
  };
  result: {
    location: string;
    alerts: Array<{
      id: string;
      severity: 'minor' | 'moderate' | 'severe' | 'extreme';
      event: string;
      headline: string;
      description: string;
      start: string;
      end: string;
    }>;
  };
}

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Weather summary prompt
 *
 * Generates a natural language weather summary for a location.
 */
interface WeatherSummaryPrompt extends IPrompt {
  name: 'weather_summary';
  description: 'Generate a natural language weather summary';
  args: {
    location: string;
    conditions: string;
    temperature: number;
    units: 'C' | 'F';
  };
  template: `Provide a brief, friendly weather summary for {location}. Current conditions are {conditions} with a temperature of {temperature}°{units}. Keep the summary conversational and helpful for planning daily activities.`;
}

/**
 * Weather alert prompt
 *
 * Generates a detailed alert message for severe weather.
 */
interface WeatherAlertPrompt extends IPrompt {
  name: 'weather_alert';
  description: 'Generate a detailed weather alert message';
  args: {
    location: string;
    severity: string;
    event: string;
  };
  template: `⚠️ WEATHER ALERT for {location}

Severity: {severity}
Event: {event}

Provide safety recommendations and precautions for this weather event. Be specific and actionable.`;
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Server configuration resource
 *
 * Static resource containing server capabilities and settings.
 */
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Server capabilities and authentication info';
  mimeType: 'application/json';
  data: {
    version: '1.0.0';
    features: ['weather', 'forecasts', 'alerts'];
    authentication: {
      enabled: true;
      type: 'apiKey';
      headerName: 'x-api-key';
    };
    limits: {
      maxForecastDays: 7;
      rateLimit: '100 requests/minute';
    };
  };
}

/**
 * API documentation resource
 *
 * Static markdown resource with API usage examples.
 */
interface ApiDocsResource extends IResource {
  uri: 'docs://api';
  name: 'API Documentation';
  description: 'Authentication and usage guide';
  mimeType: 'text/markdown';
  data: `# Weather Server API

## Authentication

All requests require an API key in the \`x-api-key\` header:

\`\`\`bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/mcp
\`\`\`

## Permission Levels

- **Admin** (\`sk-admin-demo\`): Full access to all tools and resources
- **Developer** (\`sk-dev-demo\`): Access to tools and resources
- **Readonly** (\`sk-read-demo\`): Read-only access

## Available Tools

1. **get_weather** - Get current weather
2. **get_forecast** - Get multi-day forecast (1-7 days)
3. **get_alerts** - Get severe weather alerts

## Example Usage

\`\`\`bash
# Initialize session
curl -H "x-api-key: sk-admin-demo" \\
  -H "Content-Type: application/json" \\
  http://localhost:3000/mcp \\
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'

# Call get_weather tool
curl -H "x-api-key: sk-admin-demo" \\
  -H "mcp-session-id: <session-id>" \\
  -H "Content-Type: application/json" \\
  http://localhost:3000/mcp \\
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_weather","arguments":{"location":"San Francisco","units":"fahrenheit"}},"id":2}'
\`\`\`
`;
}

/**
 * Server statistics resource
 *
 * Dynamic resource showing real-time server metrics.
 * Refreshed on each request to provide current data.
 */
interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  description: 'Real-time server usage statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    uptime: number;
    requests: number;
    activeKeys: number;
    lastRequest: string;
  };
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Secure Weather Server Implementation
 *
 * All tools are protected by API key authentication. The server validates
 * API keys and permissions before executing any tool.
 */
export default class SecureWeatherServerImpl implements SecureWeatherServer {
  // Server metadata - extracted from interface during parsing
  // No need to redefine properties that are in the interface

  // Track server statistics
  private startTime = Date.now();
  private requestCount = 0;
  private lastRequestTime = new Date().toISOString();
  private activeApiKeys = new Set<string>();

  // ========================================================================
  // TOOL IMPLEMENTATIONS
  // ========================================================================

  /**
   * Get current weather
   *
   * In production, this would call a real weather API (e.g., OpenWeatherMap).
   * Here we simulate weather data for demonstration.
   */
  getWeather: GetWeatherTool = async ({ location, units = 'celsius' }) => {
    this.requestCount++;
    this.lastRequestTime = new Date().toISOString();

    // Simulate weather data
    const baseTemp = 20 + Math.random() * 10; // 20-30°C
    const temperature = units === 'celsius'
      ? Math.round(baseTemp)
      : Math.round((baseTemp * 9/5) + 32);

    const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Light rain', 'Clear'][
      Math.floor(Math.random() * 5)
    ];

    return {
      location,
      temperature,
      conditions,
      humidity: 50 + Math.floor(Math.random() * 30),
      wind_speed: Math.floor(Math.random() * 20),
    };
  };

  /**
   * Get multi-day forecast
   *
   * Generates a realistic forecast with varying conditions.
   */
  getForecast: GetForecastTool = async ({ location, days = 5 }) => {
    this.requestCount++;
    this.lastRequestTime = new Date().toISOString();

    // Validate days range
    const forecastDays = Math.min(Math.max(days, 1), 7);

    // Generate forecast data
    const forecast = Array.from({ length: forecastDays }, (_, i) => {
      const date = new Date(Date.now() + i * 86400000);
      const baseHigh = 25 + Math.floor(Math.random() * 10);
      const baseLow = 15 + Math.floor(Math.random() * 8);

      return {
        date: date.toISOString().split('T')[0],
        high: baseHigh,
        low: baseLow,
        conditions: ['Sunny', 'Partly cloudy', 'Cloudy', 'Rain', 'Thunderstorms'][
          Math.floor(Math.random() * 5)
        ],
        precipitation_chance: Math.floor(Math.random() * 100),
      };
    });

    return { location, forecast };
  };

  /**
   * Get severe weather alerts
   *
   * Returns active weather alerts for the location.
   */
  getAlerts: GetAlertsTool = async ({ location }) => {
    this.requestCount++;
    this.lastRequestTime = new Date().toISOString();

    // Simulate alerts (in production, fetch from weather API)
    const hasAlerts = Math.random() > 0.7; // 30% chance of alerts

    if (!hasAlerts) {
      return {
        location,
        alerts: [],
      };
    }

    const now = new Date();
    const end = new Date(now.getTime() + 6 * 3600000); // 6 hours from now

    return {
      location,
      alerts: [
        {
          id: `alert-${Date.now()}`,
          severity: 'moderate',
          event: 'Thunderstorm Warning',
          headline: 'Thunderstorm Warning until 6:00 PM',
          description: 'Severe thunderstorms possible with heavy rain, lightning, and gusty winds.',
          start: now.toISOString(),
          end: end.toISOString(),
        },
      ],
    };
  };

  // ========================================================================
  // STATIC PROMPTS - No implementation needed
  // ========================================================================

  // WeatherSummaryPrompt - template auto-interpolated
  // WeatherAlertPrompt - template auto-interpolated

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // ConfigResource - data served as-is
  // ApiDocsResource - markdown documentation served as-is (template literal)

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Server statistics resource
   *
   * Returns real-time server metrics including uptime, request count,
   * and active API key usage.
   */
  'stats://server': StatsResource = async () => {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: this.requestCount,
      activeKeys: this.activeApiKeys.size,
      lastRequest: this.lastRequestTime,
    };
  };
}

// ============================================================================
// TESTING GUIDE
// ============================================================================

/*
COMPLETE TESTING GUIDE
======================

1. START THE SERVER
-------------------
npx simply-mcp run examples/interface-http-auth.ts

The server will start on http://localhost:3000/mcp


2. INITIALIZE SESSION (ADMIN KEY)
----------------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'

Expected response includes a session ID - save it for subsequent requests.


3. LIST AVAILABLE TOOLS
------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id-from-step-2>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'

Expected: List of tools (get_weather, get_forecast, get_alerts)


4. CALL GET_WEATHER TOOL
-------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {
        "location": "San Francisco",
        "units": "fahrenheit"
      }
    },
    "id": 3
  }'

Expected: Current weather data for San Francisco in Fahrenheit


5. CALL GET_FORECAST TOOL
--------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_forecast",
      "arguments": {
        "location": "London",
        "days": 7
      }
    },
    "id": 4
  }'

Expected: 7-day forecast for London


6. GET WEATHER ALERTS
----------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_alerts",
      "arguments": {
        "location": "Miami"
      }
    },
    "id": 5
  }'

Expected: Weather alerts (if any) for Miami


7. LIST RESOURCES
-----------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","method":"resources/list","id":6}'

Expected: List of resources (config://server, docs://api, stats://server)


8. READ STATIC RESOURCE
------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/read",
    "params": {"uri": "config://server"},
    "id": 7
  }'

Expected: Server configuration data


9. READ DYNAMIC RESOURCE
-------------------------
curl -H "x-api-key: sk-admin-demo" \
  -H "mcp-session-id: <session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/read",
    "params": {"uri": "stats://server"},
    "id": 8
  }'

Expected: Real-time server statistics


10. TEST WITH READONLY KEY
---------------------------
curl -H "x-api-key: sk-read-demo" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'

Then try to call a tool:
curl -H "x-api-key: sk-read-demo" \
  -H "mcp-session-id: <readonly-session-id>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_weather",
      "arguments": {"location": "NYC"}
    },
    "id": 2
  }'

Expected: Permission denied (readonly key doesn't have tool:* permission)


11. TEST WITH INVALID KEY
--------------------------
curl -H "x-api-key: invalid-key" \
  -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'

Expected: Authentication error (invalid API key)


12. TEST WITHOUT API KEY
-------------------------
curl -H "Content-Type: application/json" \
  http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'

Expected: Authentication error (missing API key)


PERMISSION LEVELS SUMMARY
==========================

Admin Key (sk-admin-demo):
  - Permissions: ['*']
  - Can do: Everything

Developer Key (sk-dev-demo):
  - Permissions: ['tool:*', 'resource:*']
  - Can do: Call tools, read resources
  - Cannot do: Administrative operations

Readonly Key (sk-read-demo):
  - Permissions: ['read:*']
  - Can do: Read resources only
  - Cannot do: Call tools, modify state


SECURITY FEATURES
=================

1. API Key Authentication
   - All requests require valid API key in x-api-key header
   - Keys validated before processing any request

2. Permission-Based Access Control
   - Granular permissions per API key
   - Wildcard (*) and specific permissions supported

3. Session Management
   - Stateful sessions track client state
   - Session ID required after initialization

4. Rate Limiting
   - 100 requests per minute per API key (default)
   - Prevents abuse and ensures fair usage

5. Audit Logging
   - All requests logged for security auditing
   - Tracks who accessed what and when
*/
