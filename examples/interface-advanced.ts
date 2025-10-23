/**
 * Interface-Driven API - Advanced Example
 *
 * Demonstrates advanced Interface API capabilities:
 * - Complex tools with nested types and enum parameters
 * - IParam for validation (format, pattern, min/max, length constraints)
 * - Static prompts (no implementation needed!)
 * - Static resources (no implementation needed!)
 * - Dynamic resources (runtime data generation)
 * - Optional fields and validation
 *
 * Key Features Demonstrated:
 * 1. Tools with complex parameter types
 * 2. IParam validation (email format, patterns, ranges, lengths)
 * 3. Static prompts with {variable} template syntax
 * 4. Static resources with literal data
 * 5. Dynamic resources that generate fresh data
 * 6. Automatic static/dynamic detection
 *
 * Usage:
 *   # Auto-detection (recommended)
 *   npx simply-mcp run examples/interface-advanced.ts
 *
 *   # Explicit interface command
 *   npx simplymcp-interface examples/interface-advanced.ts
 *
 *   # With HTTP transport
 *   npx simply-mcp run examples/interface-advanced.ts --http --port 3000
 *
 *   # Watch mode (auto-restart on changes)
 *   npx simply-mcp run examples/interface-advanced.ts --watch
 *
 * Learn More:
 *   See docs/guides/INTERFACE_API_REFERENCE.md for complete documentation
 */

import type { ITool, IParam, IPrompt, IResource, IServer } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
//
// All tools require implementation as they contain dynamic logic.
// The framework:
// 1. Parses these interfaces at build/run time
// 2. Generates Zod schemas from TypeScript types
// 3. Validates MCP requests against those schemas
// 4. Calls your type-safe implementation methods
//
// IParam Usage:
// You can use plain TypeScript types OR IParam for richer validation.
// IParam provides: descriptions, constraints, format validation, and more.
// ============================================================================

/**
 * Get weather tool - demonstrates complex result types and optional parameters
 *
 * Features:
 * - Enum type for units (celsius | fahrenheit)
 * - Optional parameters (units, includeHourly)
 * - Nested object in result (hourly array)
 * - Conditional result (hourly data only if requested)
 */
interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: {
    /** Location name (city, country, etc.) */
    location: string;
    /** Temperature units (optional, defaults to celsius) */
    units?: 'celsius' | 'fahrenheit';
    /** Include hourly forecast (optional) */
    includeHourly?: boolean;
  };
  result: {
    /** Location name */
    location: string;
    /** Current temperature in requested units */
    temperature: number;
    /** Weather conditions description */
    conditions: string;
    /** Humidity percentage */
    humidity: number;
    /** Hourly forecast (only if includeHourly=true) */
    hourly?: Array<{ hour: number; temp: number }>;
  };
}

/**
 * Create user tool - demonstrates IParam validation
 *
 * Features:
 * - IParam with validation constraints (minLength, maxLength, format, min, max)
 * - Email format validation
 * - Age range validation
 * - Username pattern validation
 * - Optional array parameter (tags)
 * - Structured result with generated data (id, createdAt)
 */

// IParam definitions for create_user tool
interface UsernameParam extends IParam {
  type: 'string';
  description: 'Username (alphanumeric, 3-20 characters)';
  pattern: '^[a-zA-Z0-9_]+$';
  minLength: 3;
  maxLength: 20;
}

interface EmailParam extends IParam {
  type: 'string';
  description: 'Email address';
  format: 'email';
}

interface AgeParam extends IParam {
  type: 'integer';
  description: 'User age in years';
  min: 13;
  max: 150;
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user account with validation';
  params: {
    username: UsernameParam;    // IParam with pattern + length validation
    email: EmailParam;          // IParam with email format validation
    age: AgeParam;              // IParam with range validation
    /** Optional tags to associate with user */
    tags?: string[];
  };
  result: {
    /** Generated user ID */
    id: string;
    /** Username (as provided) */
    username: string;
    /** ISO timestamp of creation */
    createdAt: string;
  };
}

// ============================================================================
// PROMPT INTERFACES
//
// Prompts can be STATIC or DYNAMIC:
// - STATIC: Has a template string → No implementation needed!
// - DYNAMIC: Has dynamic: true OR no template → Requires implementation
//
// Static prompts use {variable} syntax for interpolation.
// ============================================================================

/**
 * Weather report prompt - STATIC (no implementation needed!)
 *
 * Features:
 * - Template string with {variable} placeholders
 * - Optional style parameter (defaults to empty if not provided)
 * - Automatic interpolation at runtime
 *
 * How it works:
 * 1. Framework extracts template from interface
 * 2. On prompts/get request, replaces {location} and {style} with args
 * 3. Returns interpolated string to MCP client
 *
 * No implementation method needed!
 */
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate a weather report in various styles';
  args: {
    /** Location for weather report */
    location: string;
    /** Report style (casual or formal) */
    style?: 'casual' | 'formal';
  };
  template: `Generate a weather report for {location} in {style} style.`;
}

// ============================================================================
// RESOURCE INTERFACES
//
// Resources can be STATIC or DYNAMIC:
// - STATIC: All data values are literals → No implementation needed!
// - DYNAMIC: Contains non-literal types (number, arrays) → Requires implementation
//
// Framework automatically detects which is which.
// ============================================================================

/**
 * Server configuration - STATIC RESOURCE (no implementation needed!)
 *
 * Features:
 * - All data values are literals (strings, numbers, booleans)
 * - Automatically detected as static
 * - Data extracted from interface at parse time
 * - No implementation method required
 *
 * How it works:
 * 1. Framework parses interface and extracts literal data
 * 2. On resources/read request, returns this static data
 * 3. No runtime computation needed
 *
 * Perfect for: Configuration, constants, metadata
 */
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Server metadata and settings';
  mimeType: 'application/json';
  data: {
    apiVersion: '3.0.0';
    supportedAPIs: 4;
    maxForecastDays: 14;
    debug: false;
  };
}

/**
 * User stats - DYNAMIC RESOURCE (requires implementation)
 *
 * Features:
 * - Contains non-literal types (number)
 * - Automatically detected as dynamic
 * - Requires implementation using URI as property name
 * - Generates fresh data on each request
 *
 * How it works:
 * 1. Framework detects non-literal types in data
 * 2. Marks resource as dynamic
 * 3. On resources/read request, calls implementation method
 * 4. Returns fresh data from method
 *
 * Implementation:
 * - Property name must match URI exactly: 'stats://users'
 * - Can be async function for database/API calls
 * - Data type must match interface definition
 *
 * Perfect for: Real-time data, database queries, API calls
 */
interface UserStatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Statistics';
  description: 'Current user statistics';
  mimeType: 'application/json';
  // Note: dynamic detection is automatic - no flag needed!
  data: {
    totalUsers: number;
    activeUsers: number;
  };
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface WeatherServer extends IServer {
  name: 'weather-advanced';
  version: '3.0.0';
  description: 'Advanced weather service with full type safety';
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Weather service implementation
 *
 * This class implements the WeatherServer interface and provides:
 * - Tool implementations (always required)
 * - Dynamic resource implementations (only for dynamic resources)
 * - No prompt implementations (static prompts)
 * - No static resource implementations (static resources)
 *
 * What you need to implement:
 * ✅ Tools: getWeather, createUser (all tools require implementation)
 * ✅ Dynamic resources: 'stats://users' (generates runtime data)
 * ❌ Static prompts: WeatherPrompt (template auto-interpolated)
 * ❌ Static resources: ConfigResource (data extracted from interface)
 *
 * Benefits:
 * - Full IntelliSense on all parameters (try typing "params.")
 * - Compile-time type checking on return values
 * - Runtime validation via auto-generated Zod schemas
 * - Zero schema boilerplate
 */
export default class WeatherService implements WeatherServer {
  /**
   * Get weather tool implementation
   *
   * Demonstrates:
   * - Enum parameter handling (celsius | fahrenheit)
   * - Unit conversion logic
   * - Conditional result (hourly data)
   * - Complex nested return type
   *
   * @param params - Validated MCP request parameters
   * @returns Weather data with optional hourly forecast
   */
  getWeather: GetWeatherTool = async (params) => {
    const temp = Math.round(Math.random() * 30);
    const convertedTemp = params.units === 'fahrenheit' ? (temp * 9/5) + 32 : temp;

    return {
      location: params.location,
      temperature: convertedTemp,
      conditions: 'Partly cloudy',
      humidity: 65,
      // Only include hourly if requested
      hourly: params.includeHourly ? [
        { hour: 1, temp: convertedTemp + 1 },
        { hour: 2, temp: convertedTemp + 2 },
      ] : undefined,
    };
  };

  /**
   * Create user tool implementation
   *
   * Demonstrates:
   * - Generating IDs
   * - Timestamp creation
   * - Returning subset of input data
   *
   * @param params - User data (validated by Zod schema)
   * @returns Created user with ID and timestamp
   */
  createUser: CreateUserTool = async (params) => {
    return {
      id: Math.random().toString(36).substring(7),
      username: params.username,
      createdAt: new Date().toISOString(),
    };
  };

  // ========================================================================
  // PROMPTS - NO IMPLEMENTATION NEEDED
  // ========================================================================
  // WeatherPrompt is STATIC - template auto-interpolated by framework

  // ========================================================================
  // STATIC RESOURCES - NO IMPLEMENTATION NEEDED
  // ========================================================================
  // ConfigResource is STATIC - data extracted from interface

  // ========================================================================
  // DYNAMIC RESOURCES - IMPLEMENTATION REQUIRED
  // ========================================================================

  /**
   * User statistics resource - DYNAMIC
   *
   * Property name must match URI exactly: 'stats://users'
   *
   * This method is called each time an MCP client requests
   * resources/read for 'stats://users', allowing fresh data
   * generation on every request.
   *
   * In a real app, this would query a database or call an API.
   *
   * @returns Current user statistics
   */
  'stats://users' = async () => ({
    totalUsers: 42,
    activeUsers: 15,
  });
}
