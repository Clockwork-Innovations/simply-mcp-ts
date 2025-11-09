/**
 * Minimal Const-Based Server Example
 *
 * This example demonstrates a fully const-based MCP server using NO classes.
 * All primitives are defined as const objects with explicit type annotations.
 *
 * Features demonstrated:
 * - Server configuration (const server: IServer)
 * - Tools (const helpers with ToolHelper<T>)
 * - Routers (const weatherRouter: IToolRouter)
 * - UIs (const dashboard: IUI)
 * - Completions (const cityComplete: ICompletion)
 * - Roots (const projectRoots: IRoots)
 * - Subscriptions (const configSub: ISubscription)
 * - Inline authentication
 *
 * Benefits of const patterns:
 * - Less boilerplate (no class declaration)
 * - Simpler syntax (direct const assignments)
 * - No need to extend interfaces (use types directly)
 * - Better TypeScript inference
 * - More functional programming style
 */

import type {
  IServer,
  ITool,
  IParam,
  IToolRouter,
  IUI,
  ICompletion,
  IRoots,
  ISubscription,
  ToolHelper,
  CompletionHelper
} from '../../src/index.js';

// ============================================================================
// SERVER CONFIGURATION WITH INLINE AUTH
// ============================================================================

/**
 * Const server configuration with inline API key authentication
 *
 * This demonstrates:
 * - Direct const assignment (no class needed)
 * - Inline auth configuration
 * - All server metadata in one place
 */
const server: IServer = {
  name: 'minimal-const-server',
  version: '1.0.0',
  description: 'Minimal server demonstrating const-based patterns',

  // Inline authentication - no separate interface needed!
  auth: {
    type: 'apiKey',
    headerName: 'X-API-Key',
    keys: [
      {
        name: 'admin',
        key: 'admin-key-123',
        permissions: ['read', 'write', 'admin']
      },
      {
        name: 'readonly',
        key: 'readonly-key-456',
        permissions: ['read']
      }
    ]
  }
};

// ============================================================================
// TOOLS - Helper Pattern
// ============================================================================

/**
 * Tool parameter interfaces (same as always)
 */
interface LocationParam extends IParam {
  type: 'string';
  description: 'City name or location';
  minLength: 1;
}

interface UnitsParam extends IParam {
  type: 'string';
  description: 'Temperature units';
  enum: ['celsius', 'fahrenheit'];
}

/**
 * Tool interface definition
 */
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get weather information for a location';
  params: {
    location: LocationParam;
    units: UnitsParam;
  };
  result: {
    temperature: number;
    conditions: string;
    units: string;
  };
}

/**
 * Const tool implementation using ToolHelper pattern
 *
 * Pattern: const toolName: ToolHelper<ToolInterface> = async (params) => { ... }
 *
 * Benefits:
 * - No class needed
 * - Direct const assignment
 * - Full type inference for params and return type
 */
const getWeather: ToolHelper<GetWeatherTool> = async (params) => {
  // Simulated weather data
  const temperature = params.units === 'celsius' ? 22 : 72;

  return {
    temperature,
    conditions: 'Sunny',
    units: params.units
  };
};

// ============================================================================
// ROUTERS - Const Pattern
// ============================================================================

/**
 * Router tools - just regular tool interfaces
 */
interface GetForecastTool extends ITool {
  name: 'get_forecast';
  description: 'Get weather forecast';
  params: {
    location: LocationParam;
    days: IParam & { type: 'number'; min: 1; max: 7 };
  };
  result: {
    forecasts: Array<{ day: string; high: number; low: number }>;
  };
}

interface WeatherRouter extends IToolRouter {
  name: 'weather';
  description: 'Weather-related tools';
  tools: ['get_forecast'];
}

/**
 * Const router implementation
 *
 * Pattern: const routerName: RouterInterface = { name, description, tools }
 *
 * Benefits:
 * - Simple object literal
 * - No class property needed
 * - Clear router structure
 */
const weatherRouter: WeatherRouter = {
  name: 'weather',
  description: 'Weather-related tools',
  tools: ['get_forecast']
};

/**
 * Router tool implementation (also const!)
 */
const getForecast: ToolHelper<GetForecastTool> = async (params) => {
  const forecasts = Array.from({ length: params.days }, (_, i) => ({
    day: `Day ${i + 1}`,
    high: 75 + Math.floor(Math.random() * 10),
    low: 60 + Math.floor(Math.random() * 10)
  }));

  return { forecasts };
};

// ============================================================================
// UIS - Const Pattern
// ============================================================================

/**
 * UI interface definition
 */
interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'Weather Dashboard';
  description: 'Interactive weather dashboard';
  source: string;
}

/**
 * Const UI implementation
 *
 * Pattern: const uiName: UIInterface = { source }
 *
 * Benefits:
 * - Simple object literal
 * - No class needed
 * - Direct source assignment
 */
const dashboard: DashboardUI = {
  source: `
    <div style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0066cc;">Weather Dashboard</h1>
      <p style="color: #666; margin-bottom: 2rem;">
        Check weather conditions for any location
      </p>

      <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
        <h2 style="margin-top: 0; font-size: 1.2rem;">Current Weather</h2>
        <p style="font-size: 2rem; margin: 0.5rem 0;">22°C</p>
        <p style="color: #666; margin: 0;">Sunny conditions</p>
      </div>

      <button
        onclick="alert('Refresh functionality would call get_weather tool')"
        style="background: #0066cc; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 1rem;">
        Refresh Weather
      </button>
    </div>
  `
};

// ============================================================================
// COMPLETIONS - Const Pattern
// ============================================================================

/**
 * Completion argument interface
 */
interface CityCompletionArg extends IParam {
  type: 'string';
  description: 'Partial city name to complete';
}

/**
 * Completion interface definition
 */
interface CityCompletion extends ICompletion {
  name: 'city_completion';
  description: 'Autocomplete city names';
  args: {
    partial: CityCompletionArg;
  };
}

/**
 * Const completion implementation
 *
 * Pattern: const completionName: CompletionHelper<CompletionInterface> = async (args) => { ... }
 *
 * Benefits:
 * - Direct const assignment
 * - Type inference for args
 * - Simple function implementation
 */
const cityComplete: CompletionHelper<CityCompletion> = async (args) => {
  const cities = [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Jose'
  ];

  const partial = args.partial.toLowerCase();
  const matches = cities.filter(city =>
    city.toLowerCase().startsWith(partial)
  );

  return {
    values: matches,
    total: matches.length,
    hasMore: false
  };
};

// ============================================================================
// ROOTS - Const Pattern
// ============================================================================

/**
 * Roots interface definition
 */
interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Project directory roots';
}

/**
 * Const roots implementation
 *
 * Pattern: const rootsName: RootsInterface = async () => { ... }
 *
 * Benefits:
 * - Simple const assignment
 * - Direct function implementation
 */
const projectRoots: ProjectRoots = async () => {
  return {
    roots: [
      {
        uri: 'file:///home/user/projects',
        name: 'Projects Directory'
      },
      {
        uri: 'file:///home/user/documents',
        name: 'Documents Directory'
      }
    ]
  };
};

// ============================================================================
// SUBSCRIPTIONS - Const Pattern
// ============================================================================

/**
 * Subscription interface definition
 */
interface ConfigSubscription extends ISubscription {
  uri: 'config://server';
  description: 'Server configuration changes';
}

/**
 * Const subscription implementation
 *
 * Pattern: const subName: SubscriptionInterface = async () => { ... }
 *
 * Benefits:
 * - Simple const assignment
 * - Direct function implementation
 */
const configSub: ConfigSubscription = async () => {
  return {
    uri: 'config://server',
    mimeType: 'application/json',
    text: JSON.stringify({
      name: server.name,
      version: server.version,
      timestamp: new Date().toISOString()
    })
  };
};

// ============================================================================
// EXPORT - No class needed!
// ============================================================================

/**
 * Export all const implementations
 *
 * The compiler automatically discovers:
 * - server (const server: IServer)
 * - getWeather (const getWeather: ToolHelper<GetWeatherTool>)
 * - weatherRouter (const weatherRouter: WeatherRouter)
 * - getForecast (const getForecast: ToolHelper<GetForecastTool>)
 * - dashboard (const dashboard: DashboardUI)
 * - cityComplete (const cityComplete: CompletionHelper<CityCompletion>)
 * - projectRoots (const projectRoots: ProjectRoots)
 * - configSub (const configSub: ConfigSubscription)
 *
 * No manual registration needed - just export the file!
 */

export {
  server,
  getWeather,
  weatherRouter,
  getForecast,
  dashboard,
  cityComplete,
  projectRoots,
  configSub
};

/**
 * OPTIONAL: Export default pattern (for convenience)
 *
 * Note: Export default with object literal is NOT currently supported by the compiler.
 * The compiler looks for:
 * 1. export default class (auto-instantiated)
 * 2. const server: IServer (discovered)
 * 3. const implementations (discovered via ToolHelper, etc.)
 *
 * Stick with named exports or export default class for now.
 */
