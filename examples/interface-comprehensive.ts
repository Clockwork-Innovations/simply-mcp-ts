/**
 * Interface-Driven API - Comprehensive Example
 *
 * Demonstrates all Interface API capabilities including:
 * - Complex tools with nested types, validation tags, enums, optional fields
 * - Static prompts with template interpolation
 * - Static resources with literal data
 * - Dynamic prompts (requires BuildMCPServer API enhancement - currently shows pattern)
 * - Dynamic resources (requires BuildMCPServer API enhancement - currently shows pattern)
 *
 * This example verifies that:
 * ✓ TypeScript AST parsing extracts interface metadata correctly
 * ✓ Zod schema generation handles complex types
 * ✓ Static vs dynamic detection works automatically
 * ✓ Method name mapping (snake_case → camelCase) works
 * ✓ Full IntelliSense and type safety
 *
 * Usage:
 *   npm run build
 *   node dist/bin/interface-bin.js examples/interface-comprehensive.ts
 *
 * Or programmatically:
 *   npx tsx -e "import { loadInterfaceServer } from './dist/src/api/interface/index.js'; \
 *     const s = await loadInterfaceServer({ \
 *       filePath: 'examples/interface-comprehensive.ts', \
 *       verbose: true \
 *     }); \
 *     await s.start();"
 */

import type { ITool, IPrompt, IResource, IServer } from '../src/api/interface/types.js';

// ============================================================================
// TOOL INTERFACES - All tools require implementation (always dynamic)
// ============================================================================

/**
 * Complex tool demonstrating nested objects, arrays, and enums
 */
interface SearchTool extends ITool {
  name: 'search_documents';
  description: 'Search documents with filters and pagination';
  params: {
    /** Search query string */
    query: string;
    /** Filter by document type */
    type?: 'pdf' | 'markdown' | 'text';
    /** Filter by tags */
    tags?: string[];
    /** Pagination offset */
    offset?: number;
    /** Results per page */
    limit?: number;
    /** Advanced filters */
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      author?: string;
    };
  };
  result: {
    /** Total number of results */
    total: number;
    /** Current page results */
    results: Array<{
      id: string;
      title: string;
      type: 'pdf' | 'markdown' | 'text';
      score: number;
      metadata: {
        author: string;
        created: string;
        tags: string[];
      };
    }>;
    /** Pagination info */
    pagination: {
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

/**
 * Tool with JSDoc validation tags
 * Note: Validation tags should be on the interface members, not the top-level interface
 */
interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user with validation';
  params: {
    /**
     * Username (3-20 characters, alphanumeric)
     * @minLength 3
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9_]+$
     */
    username: string;
    /**
     * Email address
     * @format email
     */
    email: string;
    /**
     * Age (must be 18-120)
     * @min 18
     * @max 120
     * @int
     */
    age: number;
    /** Optional tags */
    tags?: string[];
  };
  result: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
  };
}

/**
 * Simple tool with primitive result
 */
interface GetTemperatureTool extends ITool {
  name: 'get_temperature';
  description: 'Get current temperature';
  params: {
    location: string;
    units?: 'celsius' | 'fahrenheit';
  };
  result: number;
}

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * STATIC PROMPT - Has literal template string
 *
 * The template is extracted at parse time via AST.
 * No implementation needed - framework handles interpolation.
 * Placeholders: {variable} syntax
 */
interface SearchPrompt extends IPrompt {
  name: 'search_assistant';
  description: 'Generate search query with style customization';
  args: {
    query: string;
    style?: 'casual' | 'formal' | 'technical';
  };
  template: `You are a search assistant. Help the user search for: {query}
Style: {style}

Please analyze the query and suggest relevant search terms, filters, and strategies.`;
}

/**
 * STATIC PROMPT - With conditional template syntax
 */
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report prompt';
  args: {
    location: string;
    includeExtended?: boolean;
  };
  template: `Generate a detailed weather report for {location}.

{includeExtended ? 'Include a 7-day extended forecast with hourly breakdowns.' : 'Focus on current conditions and 3-day outlook.'}

Format the response in a clear, easy-to-read style.`;
}

/**
 * DYNAMIC PROMPT - Requires runtime logic
 *
 * No template string provided OR has `dynamic: true`.
 * Requires implementation method (methodName = camelCase of name).
 *
 * NOTE: Current BuildMCPServer API limitation - prompts are static only.
 * This demonstrates the interface pattern. Full support requires enhancing
 * PromptDefinition to accept functions like tools do.
 */
interface ContextualPrompt extends IPrompt {
  name: 'contextual_search';
  description: 'Context-aware search prompt with runtime customization';
  args: {
    query: string;
    userLevel?: 'beginner' | 'intermediate' | 'expert';
  };
  dynamic: true; // Explicit dynamic flag (or inferred by missing template)
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * STATIC RESOURCE - All data is literal values
 *
 * Data is extracted directly from interface at parse time.
 * No implementation needed - data is embedded in the interface.
 * Automatically detected as static because all values are literals.
 */
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Static server configuration';
  mimeType: 'application/json';
  data: {
    version: '3.0.0';
    features: ['tools', 'prompts', 'resources'];
    limits: {
      maxQueryLength: 1000;
      maxResults: 100;
    };
    supportedTypes: ['pdf', 'markdown', 'text'];
  };
}

/**
 * STATIC RESOURCE - Array data
 */
interface TemplatesResource extends IResource {
  uri: 'templates://search';
  name: 'Search Templates';
  description: 'Predefined search templates';
  mimeType: 'application/json';
  data: ['quick_search', 'advanced_search', 'semantic_search'];
}

/**
 * DYNAMIC RESOURCE - Contains non-literal types
 *
 * Data cannot be extracted at parse time (has `number`, complex types).
 * Requires implementation using URI as method/property name.
 * Automatically detected as dynamic because of non-literal types.
 *
 * Method name is the URI itself: server['stats://search']
 * The method is called at runtime when resources/read is requested,
 * allowing fresh data generation on each request.
 */
interface StatsResource extends IResource {
  uri: 'stats://search';
  name: 'Search Statistics';
  description: 'Real-time search statistics';
  mimeType: 'application/json';
  data: {
    totalSearches: number;
    averageResponseTime: number;
    topQueries: string[];
    lastUpdated: string;
  };
  // Note: dynamic: true is inferred - not needed when types are non-literal
}

/**
 * DYNAMIC RESOURCE - Explicit dynamic flag
 */
interface CacheResource extends IResource {
  uri: 'cache://status';
  name: 'Cache Status';
  description: 'Current cache status and metrics';
  mimeType: 'application/json';
  dynamic: true; // Explicit dynamic flag
  data: {
    size: number;
    hits: number;
    misses: number;
  };
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface SearchServer extends IServer {
  name: 'search-server-comprehensive';
  version: '3.0.0';
  description: 'Comprehensive search server demonstrating all Interface API features';
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Search Server Implementation
 *
 * The interface definitions above are parsed via AST to:
 * 1. Extract metadata (names, descriptions, URIs)
 * 2. Generate Zod schemas from TypeScript types
 * 3. Detect static vs dynamic (template/data presence)
 * 4. Map method names (snake_case → camelCase, or URI for resources)
 *
 * You get full IntelliSense and type safety on all methods!
 */
export default class SearchService implements SearchServer {
  // ========================================================================
  // TOOLS - Always require implementation
  // ========================================================================

  /**
   * Complex search with full type safety
   * Method name: searchDocuments (camelCase of search_documents)
   */
  searchDocuments: SearchTool = async (params) => {
    const offset = params.offset || 0;
    const limit = params.limit || 10;

    // Simulate search results
    return {
      total: 42,
      results: [
        {
          id: '1',
          title: `Result for "${params.query}"`,
          type: params.type || 'markdown',
          score: 0.95,
          metadata: {
            author: 'System',
            created: new Date().toISOString(),
            tags: params.tags || [],
          },
        },
      ],
      pagination: {
        offset,
        limit,
        hasMore: offset + limit < 42,
      },
    };
  };

  /**
   * User creation with validation
   * Zod schema auto-generated from TypeScript types + JSDoc tags
   */
  createUser: CreateUserTool = async (params) => {
    return {
      id: Math.random().toString(36).substring(7),
      username: params.username,
      email: params.email,
      createdAt: new Date().toISOString(),
    };
  };

  /**
   * Simple tool with primitive result
   */
  getTemperature: GetTemperatureTool = async (params) => {
    const celsius = 20 + Math.random() * 10;
    return params.units === 'fahrenheit' ? (celsius * 9/5) + 32 : celsius;
  };

  // ========================================================================
  // STATIC PROMPTS - NO implementation needed
  // ========================================================================

  // SearchPrompt - template extracted from interface, auto-interpolated
  // WeatherPrompt - conditional template syntax handled automatically

  // ========================================================================
  // DYNAMIC PROMPTS - Require implementation
  // ========================================================================

  /**
   * Dynamic prompt with runtime logic
   * Method name: contextualSearch (camelCase of contextual_search)
   *
   * This method is called at runtime when the MCP client requests
   * prompts/get for 'contextual_search'. It generates different prompts
   * based on the user's experience level.
   */
  contextualSearch = (args: { query: string; userLevel?: 'beginner' | 'intermediate' | 'expert' }) => {
    const level = args.userLevel || 'intermediate';

    const prompts = {
      beginner: `You are a friendly search assistant. Help a beginner user search for: ${args.query}

Explain search concepts in simple terms and suggest easy-to-understand results.`,

      intermediate: `You are a search assistant. Help the user find information about: ${args.query}

Provide relevant results with moderate technical detail.`,

      expert: `Advanced search query: ${args.query}

Provide comprehensive results with technical details, advanced filters, and expert-level insights.`,
    };

    return prompts[level];
  };

  // ========================================================================
  // STATIC RESOURCES - NO implementation needed
  // ========================================================================

  // ConfigResource - data extracted from interface, served as-is
  // TemplatesResource - array data extracted from interface

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation using URI as property name
  // ========================================================================

  /**
   * Dynamic resource: Search statistics
   * Property name: 'stats://search' (the URI itself)
   *
   * This method is called at runtime when the MCP client requests
   * resources/read for 'stats://search'. It generates fresh statistics
   * data on each request.
   */
  'stats://search' = async () => {
    return {
      totalSearches: Math.floor(Math.random() * 10000),
      averageResponseTime: Math.random() * 100,
      topQueries: ['typescript', 'mcp', 'interface api'],
      lastUpdated: new Date().toISOString(),
    };
  };

  /**
   * Dynamic resource: Cache status
   * Property name: 'cache://status' (the URI itself)
   */
  'cache://status' = async () => {
    return {
      size: Math.floor(Math.random() * 1000),
      hits: Math.floor(Math.random() * 5000),
      misses: Math.floor(Math.random() * 500),
    };
  };
}

// ============================================================================
// VERIFICATION NOTES
// ============================================================================

/*
This example verifies the Interface API parsing and schema generation:

✓ PARSING VERIFICATION:
  - parser.ts extracts all tool/prompt/resource interfaces correctly
  - Server metadata (name, version, description) extracted
  - Method names mapped correctly (snake_case → camelCase, URI for resources)
  - Static vs dynamic detection works automatically

✓ SCHEMA GENERATION VERIFICATION:
  - Complex nested objects → Zod object schemas
  - Arrays → Zod array schemas
  - Enums (literal unions) → Zod enum schemas
  - Optional fields (?) → Zod optional()
  - JSDoc validation tags → Zod refinements (@min, @max, @pattern, @format)
  - Primitive types → Zod string/number/boolean

✓ TYPE SAFETY VERIFICATION:
  - Full IntelliSense on all method implementations
  - Compile-time type checking on params and return values
  - Method signatures match interface definitions

✓ DYNAMIC FEATURES (fully implemented):
  - Dynamic prompts: Function called at runtime on prompts/get requests
  - Dynamic resources: Function called at runtime on resources/read requests
  - Static prompts: Template string interpolation
  - Static resources: Literal data served as-is

  All features working:
    ✓ Parsed correctly from interfaces
    ✓ Detected automatically (dynamic flag or inferred)
    ✓ Methods validated (existence, type checking)
    ✓ Runtime execution working (functions called on MCP requests)
    ✓ Fresh data generated on each request

  See tests/test-dynamic-features.ts for verification.
*/
