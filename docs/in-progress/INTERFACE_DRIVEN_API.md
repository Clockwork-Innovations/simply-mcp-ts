# Interface-Driven API Proposal

**Status:** Proposal
**Created:** 2025-10-06
**Target Version:** v3.0.0

## Overview

This document proposes a new **interface-driven API paradigm** for SimpleMCP that provides the cleanest, most TypeScript-native way to define MCP servers. Developers define interfaces that extend base types (`Tool`, `Prompt`, `Resource`, `Server`), and the framework handles everything else via AST parsing.

**This is a 4th API paradigm that works alongside the existing decorator, functional, and programmatic APIs.** It does not replace them - it's simply another option for developers who prefer a pure TypeScript interface-based approach.

## Philosophy

**Write TypeScript interfaces. Get an MCP server.**

- **Tools**: Interfaces + class method implementations (for dynamic logic)
- **Prompts**: Pure interfaces with template strings (static)
- **Resources**: Pure interfaces with data (static)
- **Server**: Pure interface with metadata

Zero boilerplate. Maximum type safety. Pure TypeScript.

### Coexistence with Other APIs

The interface-driven API is **additive**, not replacement:

- ✅ Use alongside decorator API in the same project
- ✅ Mix and match paradigms as needed
- ✅ All APIs are fully interoperable
- ✅ Existing code continues to work unchanged

**Example - Mixed Usage:**
```typescript
// File 1: Using decorator API
@MCPServer({ name: 'legacy-server' })
class LegacyServer {
  @tool() myTool() { }
}

// File 2: Using interface-driven API
interface NewTool extends Tool { /* ... */ }
class NewServer implements MyServer {
  newTool: NewTool = (params) => { }
}

// Both work together seamlessly
```

## The Base Interface System

SimpleMCP provides these foundation interfaces:

```typescript
// Exported from 'simply-mcp/types'

/**
 * Base Tool interface
 * Tools have dynamic logic, so they require class method implementations
 */
export interface Tool<TParams = any, TResult = any> {
  (params: TParams): TResult | Promise<TResult>;
}

/**
 * Base Prompt interface
 * Prompts are static templates defined entirely in the interface
 */
export interface Prompt<TArgs = any> {
  // No callable signature - prompts are pure data
}

/**
 * Base Resource interface
 * Resources are static data defined entirely in the interface
 */
export interface Resource<TData = any> {
  // No callable signature - resources are pure data
}

/**
 * Base Server interface
 * Server metadata only
 */
export interface Server {
  // Just metadata - tools/prompts/resources auto-discovered
}
```

## Complete Example: Weather Service

```typescript
// weather-server.ts
import type { Tool, Prompt, Resource, Server } from 'simply-mcp/types';

// ============================================================================
// TOOL INTERFACES - Require implementation in class
// ============================================================================

/**
 * Get current weather for a location
 */
interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get current weather for a location';

  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
    includeHourly?: boolean;
  };

  result: {
    location: string;
    temperature: number;
    conditions: string;
    humidity: number;
    hourly?: Array<{ hour: number; temp: number }>;
  };
}

/**
 * Get weather forecast for multiple days
 */
interface GetForecastTool extends Tool {
  name: 'get_forecast';
  description: 'Get weather forecast for multiple days';

  params: {
    location: string;
    days: number;
    units?: 'celsius' | 'fahrenheit';
  };

  result: {
    location: string;
    days: number;
    forecast: Array<{
      day: number;
      high: number;
      low: number;
      conditions: string;
    }>;
  };
}

/**
 * Search for weather alerts
 */
interface SearchAlertsTool extends Tool {
  name: 'search_alerts';
  description: 'Search for active weather alerts';

  params: {
    location: string;
    severity?: 'minor' | 'moderate' | 'severe' | 'extreme';
  };

  result: {
    alerts: Array<{
      id: string;
      title: string;
      severity: string;
      description: string;
    }>;
  };
}

// ============================================================================
// PROMPT INTERFACES - Pure static templates (no implementation needed)
// ============================================================================

/**
 * Generate a weather report prompt
 */
interface WeatherReportPrompt extends Prompt {
  name: 'weather_report';
  description: 'Generate a weather report prompt in various styles';

  args: {
    location: string;
    style?: 'casual' | 'formal' | 'technical';
    includeExtendedForecast?: boolean;
  };

  // Template string with placeholders
  template: `Generate a {style} weather report for {location}.

Include:
- Current conditions and temperature
- Humidity and wind information
- UV index and visibility
{includeExtendedForecast ? '- 7-day extended forecast' : '- 3-day outlook'}

Make it {style === 'casual' ? 'conversational and friendly' : style === 'formal' ? 'professional and precise' : 'detailed with meteorological terms'}.`;
}

/**
 * Weather alert notification prompt
 */
interface WeatherAlertPrompt extends Prompt {
  name: 'weather_alert';
  description: 'Generate weather alert notification text';

  args: {
    location: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    alertType: 'storm' | 'flood' | 'heat' | 'cold' | 'wind';
  };

  template: `Generate a {severity} severity weather alert for {location}.

Alert Type: {alertType}
Severity: {severity}

The notification should:
- Be clear and urgent for {severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'moderate'} severity
- Include safety recommendations
- Specify affected areas and timeframe
- Provide actionable next steps`;
}

/**
 * Travel weather advisory prompt
 */
interface TravelAdvisoryPrompt extends Prompt {
  name: 'travel_advisory';
  description: 'Generate travel weather advisory';

  args: {
    origin: string;
    destination: string;
    date: string;
  };

  template: `Generate a travel weather advisory for a trip from {origin} to {destination} on {date}.

Include:
- Weather conditions at origin and destination
- Weather along the route
- Travel recommendations (delays, road conditions, etc.)
- Best time of day to travel
- What to pack based on conditions`;
}

// ============================================================================
// RESOURCE INTERFACES - Pure static data (no implementation needed)
// ============================================================================

/**
 * Weather service configuration
 */
interface WeatherConfigResource extends Resource {
  uri: 'config://weather';
  name: 'Weather Service Configuration';
  description: 'Configuration and settings for the weather service';
  mimeType: 'application/json';

  // Static JSON data defined directly in interface
  data: {
    apiVersion: '2.0';
    defaultUnits: 'celsius';
    maxForecastDays: 14;
    supportedRegions: ['US', 'EU', 'Asia', 'Global'];
    features: {
      alerts: true;
      radar: true;
      satellite: false;
    };
    rateLimits: {
      requestsPerMinute: 60;
      requestsPerHour: 1000;
    };
  };
}

/**
 * API documentation
 */
interface ApiDocsResource extends Resource {
  uri: 'doc://api-guide';
  name: 'Weather API Documentation';
  description: 'Complete API usage guide and reference';
  mimeType: 'text/markdown';

  // Static markdown content
  data: `# Weather API Guide

## Overview
This API provides weather data, forecasts, and alerts for locations worldwide.

## Available Tools

### get_weather
Get current weather conditions for any location.

**Parameters:**
- \`location\` (string, required): City name, coordinates, or location identifier
- \`units\` (enum, optional): Temperature units - 'celsius' or 'fahrenheit' (default: celsius)
- \`includeHourly\` (boolean, optional): Include hourly forecast data (default: false)

**Returns:**
- \`location\`: Resolved location name
- \`temperature\`: Current temperature
- \`conditions\`: Weather conditions description
- \`humidity\`: Relative humidity percentage
- \`hourly\`: Array of hourly forecasts (if requested)

**Example:**
\`\`\`json
{
  "location": "San Francisco",
  "units": "fahrenheit",
  "includeHourly": true
}
\`\`\`

### get_forecast
Get multi-day weather forecast.

**Parameters:**
- \`location\` (string, required): City name or coordinates
- \`days\` (number, required): Number of forecast days (1-14)
- \`units\` (enum, optional): Temperature units

**Returns:**
Forecast data for the requested number of days.

### search_alerts
Search for active weather alerts.

**Parameters:**
- \`location\` (string, required): Location to check
- \`severity\` (enum, optional): Filter by severity level

**Returns:**
Array of active weather alerts.

## Rate Limits
- 60 requests per minute
- 1000 requests per hour

## Supported Regions
US, EU, Asia, Global

## Best Practices
1. Cache responses when possible
2. Use appropriate units for your region
3. Handle rate limit errors gracefully
4. Subscribe to webhooks for alert notifications
`;
}

/**
 * Supported locations list
 */
interface LocationsResource extends Resource {
  uri: 'data://locations';
  name: 'Supported Locations';
  description: 'List of all supported locations and their identifiers';
  mimeType: 'application/json';

  data: {
    majorCities: [
      { id: 'nyc', name: 'New York City', country: 'US', coordinates: { lat: 40.7128, lon: -74.0060 } },
      { id: 'lon', name: 'London', country: 'UK', coordinates: { lat: 51.5074, lon: -0.1278 } },
      { id: 'tok', name: 'Tokyo', country: 'JP', coordinates: { lat: 35.6762, lon: 139.6503 } },
      { id: 'sfo', name: 'San Francisco', country: 'US', coordinates: { lat: 37.7749, lon: -122.4194 } },
    ];
    regions: ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
    totalLocations: 50000;
  };
}

// ============================================================================
// SERVER INTERFACE - Just metadata
// ============================================================================

/**
 * Weather information service
 */
interface WeatherServiceServer extends Server {
  name: 'weather-service';
  version: '1.0.0';
  description: 'Comprehensive weather information and forecasting service with alerts';
}

// ============================================================================
// IMPLEMENTATION - Only tool methods (prompts/resources auto-handled)
// ============================================================================

export default class WeatherService implements WeatherServiceServer {
  // ========================================
  // TOOL IMPLEMENTATIONS
  // ========================================

  /**
   * Get current weather - maps to GetWeatherTool
   * Method name 'getWeather' automatically mapped from tool name 'get_weather'
   */
  getWeather: GetWeatherTool = async (params) => {
    // params is fully typed as GetWeatherTool['params']
    // IntelliSense shows: location, units?, includeHourly?

    const temp = Math.round(Math.random() * 30);

    return {
      location: params.location,
      temperature: params.units === 'fahrenheit' ? (temp * 9/5) + 32 : temp,
      conditions: 'Partly cloudy',
      humidity: 65,
      hourly: params.includeHourly ? [
        { hour: 1, temp: temp + 1 },
        { hour: 2, temp: temp + 2 },
        { hour: 3, temp: temp },
      ] : undefined,
    };
  }

  /**
   * Get weather forecast - maps to GetForecastTool
   */
  getForecast: GetForecastTool = async (params) => {
    // params is fully typed as GetForecastTool['params']
    // IntelliSense shows: location, days, units?

    const forecast = Array.from({ length: params.days }, (_, i) => ({
      day: i + 1,
      high: Math.round(Math.random() * 30),
      low: Math.round(Math.random() * 15),
      conditions: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
    }));

    return {
      location: params.location,
      days: params.days,
      forecast,
    };
  }

  /**
   * Search for weather alerts - maps to SearchAlertsTool
   */
  searchAlerts: SearchAlertsTool = async (params) => {
    // Mock implementation - in production, would query real alert database
    const alerts = [
      {
        id: 'alert-001',
        title: 'Severe Thunderstorm Warning',
        severity: params.severity || 'moderate',
        description: `Severe thunderstorm warning for ${params.location} area`,
      },
    ];

    return {
      alerts: params.severity
        ? alerts.filter(a => a.severity === params.severity)
        : alerts,
    };
  }

  // ========================================
  // NO PROMPT OR RESOURCE IMPLEMENTATIONS NEEDED
  // Framework automatically handles prompts and resources from interfaces
  // ========================================
}
```

## How It Works

### 1. AST Parsing and Discovery

When you run `npx simply-mcp run weather-server.ts`, SimpleMCP:

1. **Parses the TypeScript file** using TypeScript Compiler API
2. **Discovers interfaces** that extend `Tool`, `Prompt`, `Resource`, `Server`
3. **Extracts metadata** from interface properties
4. **Maps to implementations**:
   - Tools → class methods (snake_case `name` → camelCase method)
   - Prompts → template strings in interface
   - Resources → static data in interface

### 2. Schema Generation from Interfaces

From the interface:

```typescript
interface GetWeatherTool extends Tool {
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
  };
}
```

SimpleMCP generates:

```typescript
// Auto-generated Zod schema
z.object({
  location: z.string().describe('location'),
  units: z.enum(['celsius', 'fahrenheit']).optional().describe('units'),
})
```

### 3. Name Mapping (snake_case → camelCase)

```typescript
// Interface name → Method name
'get_weather' → getWeather()
'get_forecast' → getForecast()
'weather_report' → weatherReport (prompt - no method needed)
'config://weather' → weatherConfig (resource - no method needed)
```

### 4. Tool Registration

```typescript
// Framework automatically registers:
server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: generatedZodSchema,
  execute: async (params) => {
    const instance = new WeatherService();
    return instance.getWeather(params);
  }
});
```

### 5. Prompt Registration (No Implementation Needed)

```typescript
// Framework parses template string and registers:
server.addPrompt({
  name: 'weather_report',
  description: 'Generate a weather report prompt in various styles',
  arguments: extractedArgsSchema,
  template: (args) => {
    // Framework interpolates template string with args
    return interpolate(WeatherReportPrompt['template'], args);
  }
});
```

### 6. Resource Registration (No Implementation Needed)

```typescript
// Framework extracts static data and registers:
server.addResource({
  uri: 'config://weather',
  name: 'Weather Service Configuration',
  description: 'Configuration and settings for the weather service',
  mimeType: 'application/json',
  handler: async () => {
    // Framework returns static data from interface
    return WeatherConfigResource['data'];
  }
});
```

## Benefits

### 1. **Minimal Boilerplate**

**Before (functional API):**
```typescript
interface WeatherParams { location: string; units?: string; }
interface WeatherResult { temperature: number; conditions: string; }

const schema = {
  location: { type: 'string', description: 'Location' },
  units: { type: 'enum', values: ['celsius', 'fahrenheit'], optional: true }
};

export const getWeather = {
  name: 'get_weather',
  description: 'Get weather',
  schema,
  handler: async (params: WeatherParams): Promise<WeatherResult> => { /* ... */ }
};
```

**After (interface-driven API):**
```typescript
interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get weather';
  params: { location: string; units?: 'celsius' | 'fahrenheit'; };
  result: { temperature: number; conditions: string; };
}

class WeatherService implements WeatherServiceServer {
  getWeather: GetWeatherTool = async (params) => { /* ... */ }
}
```

### 2. **Full Type Safety**

TypeScript validates everything:

```typescript
class WeatherService implements WeatherServiceServer {
  getWeather: GetWeatherTool = async (params) => {
    // ✅ params.location is string
    // ✅ params.units is 'celsius' | 'fahrenheit' | undefined
    // ❌ params.invalid - TypeScript error

    return {
      location: params.location,
      temperature: 72,
      conditions: 'Sunny',
      // ❌ Missing 'humidity' - TypeScript error if required
    };
  }
}
```

### 3. **Automatic Schema Generation**

No need to maintain separate schema definitions:

```typescript
// TypeScript types ARE the schema
params: {
  location: string;              // → z.string()
  units?: 'celsius' | 'fahrenheit';  // → z.enum(['celsius', 'fahrenheit']).optional()
  days: number;                  // → z.number()
}
```

### 4. **IntelliSense Everywhere**

Full autocomplete in method implementations:

```typescript
getWeather: GetWeatherTool = async (params) => {
  params. // ← IDE shows: location, units, includeHourly

  if (params.units === 'celsius') { // ← Autocomplete for enum values
    // ...
  }
}
```

### 5. **No Implementation Needed for Static Content**

Prompts and resources are pure data:

```typescript
// Just define the interface - framework handles the rest
interface WeatherConfigResource extends Resource {
  uri: 'config://weather';
  data: { apiVersion: '2.0'; defaultUnits: 'celsius'; };
}

// NO CLASS METHOD NEEDED!
```

### 6. **Refactoring Safety**

Change an interface, TypeScript shows all affected code:

```typescript
// Add new parameter to interface
interface GetWeatherTool extends Tool {
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit' | 'kelvin'; // Added kelvin
  };
}

// TypeScript immediately shows:
// ❌ Error in schema generation: enum values don't match
// ❌ Error in tests that use hardcoded values
```

### 7. **Self-Documenting**

Interfaces serve as complete documentation:

```typescript
/**
 * Get current weather for a location
 */
interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get current weather for a location';

  params: {
    /** City name, coordinates, or location identifier */
    location: string;

    /** Temperature units - celsius or fahrenheit */
    units?: 'celsius' | 'fahrenheit';
  };

  result: {
    location: string;
    temperature: number;
    conditions: string;
  };
}
```

## Advanced Features

### Validation Constraints via JSDoc

For advanced validation, use JSDoc tags:

```typescript
interface CreateUserTool extends Tool {
  name: 'create_user';
  description: 'Create a new user account';

  params: {
    /**
     * Username (3-20 characters, alphanumeric)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;

    /**
     * User email address
     * @format email
     */
    email: string;

    /**
     * User age (must be 13 or older)
     * @min 13
     * @max 120
     * @int
     */
    age: number;

    /**
     * Profile tags (1-10 tags)
     * @minItems 1
     * @maxItems 10
     */
    tags: string[];
  };

  result: {
    id: string;
    username: string;
    createdAt: string;
  };
}
```

Framework extracts JSDoc tags and applies validation:

```typescript
// Generated schema with validation
z.object({
  username: z.string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .describe('Username (3-20 characters, alphanumeric)'),
  email: z.string()
    .email()
    .describe('User email address'),
  age: z.number()
    .int()
    .min(13)
    .max(120)
    .describe('User age (must be 13 or older)'),
  tags: z.array(z.string())
    .min(1)
    .max(10)
    .describe('Profile tags (1-10 tags)'),
})
```

### Dynamic Prompts with Logic

For prompts that need logic, implement as tool methods:

```typescript
interface DynamicWeatherPrompt extends Prompt {
  name: 'dynamic_weather';
  description: 'Generate context-aware weather prompt';

  args: {
    location: string;
    userPreferences?: Record<string, any>;
  };

  // Mark as requiring implementation
  dynamic: true;
}

class WeatherService implements WeatherServiceServer {
  // Implement as method when marked dynamic
  dynamicWeather = (args) => {
    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 18 ? 'Good afternoon' : 'Good evening';

    return `${greeting}! Here's the weather for ${args.location}...`;
  }
}
```

### Dynamic Resources with Logic

Similar pattern for dynamic resources:

```typescript
interface UserStatsResource extends Resource {
  uri: 'stats://user';
  name: 'User Statistics';
  description: 'Current user statistics';
  mimeType: 'application/json';

  // Mark as requiring implementation
  dynamic: true;

  data: {
    requestCount: number;
    lastAccess: string;
  };
}

class WeatherService implements WeatherServiceServer {
  // Implement as method when marked dynamic
  userStats = async () => {
    return {
      requestCount: await this.getRequestCount(),
      lastAccess: new Date().toISOString(),
    };
  }
}
```

## Modular Structure for Large Projects

Organize interfaces by domain:

```
src/
├── interfaces/
│   ├── tools/
│   │   ├── weather-tools.ts       # Weather tool interfaces
│   │   └── alert-tools.ts         # Alert tool interfaces
│   ├── prompts/
│   │   └── weather-prompts.ts     # Prompt interfaces
│   ├── resources/
│   │   └── weather-resources.ts   # Resource interfaces
│   └── server.ts                  # Server interface
├── services/
│   ├── weather-service.ts         # Business logic
│   └── alert-service.ts
└── server.ts                      # Main implementation class
```

### Example: Modular Structure

```typescript
// interfaces/tools/weather-tools.ts
export interface GetWeatherTool extends Tool { /* ... */ }
export interface GetForecastTool extends Tool { /* ... */ }

// interfaces/prompts/weather-prompts.ts
export interface WeatherReportPrompt extends Prompt { /* ... */ }

// interfaces/resources/weather-resources.ts
export interface WeatherConfigResource extends Resource { /* ... */ }

// interfaces/server.ts
export interface WeatherServiceServer extends Server {
  name: 'weather-service';
  version: '1.0.0';
}

// server.ts - Main implementation
import type { GetWeatherTool, GetForecastTool } from './interfaces/tools/weather-tools';
import type { WeatherServiceServer } from './interfaces/server';

export default class WeatherService implements WeatherServiceServer {
  getWeather: GetWeatherTool = async (params) => { /* ... */ }
  getForecast: GetForecastTool = async (params) => { /* ... */ }
}
```

## Usage

```bash
# Run the server (auto-detects interface-driven style)
npx simply-mcp run weather-server.ts

# HTTP transport
npx simply-mcp run weather-server.ts --http --port 3000

# Watch mode (auto-reload on changes)
npx simply-mcp run weather-server.ts --watch

# Debug mode
npx simply-mcp run weather-server.ts --inspect

# Validate interfaces without running
npx simply-mcp validate weather-server.ts

# Generate documentation from interfaces
npx simply-mcp docs weather-server.ts
```

## Implementation Plan

### Phase 1: Core Type Definitions (Week 1)
1. Create `src/types/interface-api.ts` with base interfaces:
   - `Tool<TParams, TResult>` as callable type
   - `Prompt<TArgs>` with template field
   - `Resource<TData>` with data field
   - `Server` with metadata only
2. Export from `simply-mcp/types`
3. Add comprehensive JSDoc documentation
4. Create TypeScript utility types for extracting params/results

### Phase 2: AST Parser (Week 2-3)
1. Create `src/parsers/interface-parser.ts`:
   - Parse TypeScript AST using `ts-morph` or TypeScript Compiler API
   - Find all interfaces extending `Tool`, `Prompt`, `Resource`, `Server`
   - Extract interface properties (name, description, params, result, etc.)
   - Extract JSDoc validation tags (@minLength, @max, @format, etc.)
   - Map snake_case names to camelCase method names

2. Create `src/parsers/template-parser.ts`:
   - Parse prompt template strings
   - Extract placeholders (e.g., `{location}`, `{style}`)
   - Generate template interpolation function

### Phase 3: Schema Generator (Week 3-4)
1. Create `src/generators/schema-generator.ts`:
   - Convert TypeScript types to JSON Schema
   - Apply JSDoc validation constraints
   - Generate Zod schemas from JSON Schema
   - Handle complex types (unions, nested objects, arrays)

2. Support validation tags:
   - String: minLength, maxLength, pattern, format (email/url/uuid)
   - Number: min, max, int
   - Array: minItems, maxItems
   - Object: nested properties

### Phase 4: Runtime Bridge (Week 4-5)
1. Create `src/loaders/interface-loader.ts`:
   - Load and parse TypeScript file
   - Instantiate implementation class
   - Map tool interfaces to class methods
   - Register tools with MCP server

2. Handle prompts and resources:
   - Extract static template strings from prompt interfaces
   - Extract static data from resource interfaces
   - Register prompts/resources with MCP server
   - Support dynamic flag for logic-based prompts/resources

### Phase 5: CLI Integration (Week 5-6)
1. Update `src/cli/api-style-detector.ts`:
   - Detect interface-driven style (class implementing Server)
   - Check for interface extensions
   - Validate interface structure

2. Add validation and error handling:
   - Missing method implementations for tools
   - Type mismatches between interface and implementation
   - Invalid interface definitions
   - Helpful error messages with suggestions

3. Add CLI commands:
   - `validate`: Check interfaces without running
   - `docs`: Generate documentation from interfaces

### Phase 6: Testing & Documentation (Week 6-7)
1. Unit tests:
   - AST parsing correctness
   - Schema generation from types
   - Name mapping (snake_case → camelCase)
   - JSDoc tag extraction

2. Integration tests:
   - Complete interface-driven servers
   - Tool execution with validation
   - Prompt template interpolation
   - Resource data serving

3. Documentation:
   - Complete API guide
   - Migration guides from other APIs
   - Best practices
   - Troubleshooting guide
   - Example projects

### Phase 7: Advanced Features (Week 8+)
1. Dynamic prompts/resources
2. Interface composition and inheritance
3. Shared parameter types
4. Auto-documentation generation
5. IDE plugin for validation

## Comparison with Other APIs

All four API paradigms in SimpleMCP are stable and production-ready (interface-driven will be when released). Choose the one that fits your development style:

| Feature | Decorator | Functional | Programmatic | **Interface-Driven** |
|---------|-----------|------------|--------------|----------------------|
| **Status** | ✅ Stable | ✅ Stable | ✅ Stable | 🟡 In Progress |
| Type Safety | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Boilerplate | Low | Medium | High | **Minimal** |
| Schema Definition | Auto | Manual | Manual | **Auto** |
| Static Content | Methods | Objects | Objects | **Interfaces** |
| Refactoring Safety | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| IntelliSense | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Learning Curve | Low | Low | Medium | **Low** |
| Pure TypeScript | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Best For | Quick servers | Config files | Complex apps | **Enterprise** |
| Can Mix? | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

**Key Takeaway:** All APIs work together. Use decorator for quick prototypes, functional for config-driven tools, programmatic for full control, and interface-driven for large enterprise codebases. Mix and match as needed.

## Benefits Summary

✅ **Zero boilerplate** - Just define interfaces
✅ **Full type safety** - TypeScript validates everything
✅ **Auto schema generation** - Types → Zod schemas
✅ **No implementation for static content** - Prompts/resources are pure interfaces
✅ **IntelliSense everywhere** - Full IDE support
✅ **Refactoring safe** - Change interface, see all impacts
✅ **Self-documenting** - Interfaces are the documentation
✅ **Pure TypeScript** - Feels like native TS development
✅ **AST-powered** - Framework does the heavy lifting

## Migration Path

### From Decorator API

**Before:**
```typescript
@MCPServer({ name: 'weather' })
class WeatherServer {
  @tool('Get weather')
  getWeather(location: string) { /* ... */ }
}
```

**After:**
```typescript
interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get weather';
  params: { location: string };
  result: any;
}

interface WeatherServiceServer extends Server {
  name: 'weather';
  version: '1.0.0';
}

class WeatherServer implements WeatherServiceServer {
  getWeather: GetWeatherTool = (params) => { /* ... */ }
}
```

### From Functional API

**Before:**
```typescript
export default defineMCP({
  name: 'weather',
  tools: [{
    name: 'get_weather',
    description: 'Get weather',
    parameters: z.object({ location: z.string() }),
    execute: async (args) => { /* ... */ }
  }]
});
```

**After:**
```typescript
interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get weather';
  params: { location: string };
  result: any;
}

class WeatherServer implements WeatherServiceServer {
  getWeather: GetWeatherTool = async (params) => { /* ... */ }
}
```

## Open Questions

1. **JSDoc vs Type System**: Should validation use JSDoc tags or branded types?
2. **Template Syntax**: Template strings vs separate template functions?
3. **Resource URIs**: Auto-generate from interface name or require explicit?
4. **Error Handling**: How to surface AST parsing errors to users?
5. **TypeScript Version**: Minimum TypeScript version requirement?

## Related Documents

- [UX Improvements Roadmap](./UX_IMPROVEMENTS_ROADMAP.md)
- [Phase 1 Implementation Plan](./PHASE1_IMPLEMENTATION_PLAN.md)
- [Decorator API Documentation](./DECORATOR-API.md)

---

**Last Updated:** 2025-10-06
**Status:** Ready for community feedback and implementation
