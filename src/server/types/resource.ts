/**
 * Resource definition types
 */

/**
 * Database Configuration Interface
 *
 * Defines database connection settings for resources that need to access
 * databases like SQLite, PostgreSQL, MySQL, etc.
 *
 * The `uri` field supports environment variable substitution using ${VAR_NAME} syntax.
 *
 * @example SQLite with Absolute Path
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: 'sqlite:///data/users.db';
 *     readonly: true;
 *   };
 * }
 * ```
 *
 * @example SQLite with Environment Variable
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: '${DATABASE_URL}';  // Reads from process.env.DATABASE_URL
 *     timeout: 5000;
 *   };
 * }
 * ```
 *
 * @example Relative Path
 * ```typescript
 * interface AnalyticsResource extends IResource {
 *   database: {
 *     uri: 'file:./analytics.sqlite';
 *     poolSize: 10;
 *   };
 * }
 * ```
 *
 * @example Future: PostgreSQL
 * ```typescript
 * interface UsersResource extends IResource {
 *   database: {
 *     uri: 'postgresql://user:pass@localhost:5432/mydb';
 *     ssl: true;
 *     poolSize: 20;
 *   };
 * }
 * ```
 */
export interface IDatabase {
  /**
   * Database connection URI
   *
   * Supported formats:
   * - SQLite: `sqlite:///absolute/path/to/db.sqlite`
   * - SQLite: `sqlite://./relative/path/to/db.sqlite`
   * - SQLite: `file:./data/app.db`
   * - PostgreSQL: `postgresql://user:pass@host:port/database` (future)
   * - MySQL: `mysql://user:pass@host:port/database` (future)
   * - Environment variable: `${DATABASE_URL}` (substituted at runtime)
   *
   * Security: Never hardcode credentials in URIs. Use environment variables instead.
   */
  uri: string;

  /**
   * Optional human-readable name for this database connection
   * Used for logging and debugging purposes
   *
   * @example 'users-db', 'analytics', 'primary'
   */
  name?: string;

  /**
   * Connection timeout in milliseconds
   * Default: 5000 (5 seconds)
   */
  timeout?: number;

  /**
   * Connection pool size (maximum number of concurrent connections)
   * Default: 5
   *
   * Note: Only applicable for databases that support connection pooling
   */
  poolSize?: number;

  /**
   * Enable SSL/TLS for the database connection
   * Default: false
   *
   * Note: Only applicable for network-based databases (Postgres, MySQL, etc.)
   */
  ssl?: boolean;

  /**
   * Open database in read-only mode
   * Default: false
   *
   * Resources are read-only by MCP protocol definition, but this provides
   * an additional layer of safety at the database level.
   */
  readonly?: boolean;
}

/**
 * Resource Context
 *
 * Context object passed to dynamic resource implementations.
 * Provides access to database connections and other runtime information.
 *
 * **Type Inference**: TypeScript automatically infers the context type from your
 * resource interface - you don't need to annotate it manually!
 *
 * @example Basic Usage (Type Inferred Automatically)
 * ```typescript
 * interface UsersResource extends IResource {
 *   uri: 'db://users';
 *   name: 'User Database';
 *   description: 'All users';
 *   mimeType: 'application/json';
 *   database: { uri: 'file:./users.db' };
 *   returns: { users: User[] };
 * }
 *
 * // Implementation using ResourceHelper (type inferred automatically)
 * const dbUsers: ResourceHelper<UsersResource> = async (context) => {
 *   const db = context?.db;
 *   if (!db) throw new Error('Database not configured');
 *
 *   const users = db.prepare('SELECT * FROM users').all();
 *   return { users };
 * };
 * ```
 *
 * @example With Explicit Database Type
 * ```typescript
 * import Database from 'better-sqlite3';
 *
 * const dbUsers: ResourceHelper<UsersResource> = async (context) => {
 *   // Cast db to specific driver type for better autocomplete
 *   const db = context?.db as Database.Database;
 *   const users = db.prepare('SELECT * FROM users').all() as User[];
 *   return { users };
 * };
 * ```
 */
export interface ResourceContext {
  /**
   * Database connection instance (if resource has database field configured)
   *
   * The type depends on the database driver:
   * - SQLite: better-sqlite3 Database instance
   * - PostgreSQL: pg Pool instance (future)
   * - MySQL: mysql2 Pool instance (future)
   *
   * Will be undefined if:
   * - Resource doesn't have database field
   * - Database connection failed to establish
   */
  db?: any;

  /**
   * Logger instance for handler output
   */
  logger?: any;

  /**
   * MCP-specific context (server, session, request info)
   */
  mcp?: any;

  /**
   * Batch context if current request is part of a batch
   */
  batch?: any;

  /**
   * Request an LLM completion from the client (if client supports sampling capability)
   */
  sample?: any;

  /**
   * Read another resource by URI
   */
  readResource?: any;

  /**
   * Request user input from the client (if client supports elicitation capability)
   */
  elicitInput?: any;

  /**
   * List available roots (if client supports roots capability)
   */
  listRoots?: any;

  /**
   * Future: Security context for authentication/authorization
   * Planned for v4.2
   */
  // security?: SecurityContext;

  /**
   * Future: Session information
   * Planned for v4.2
   */
  // session?: string;
}

/**
 * Resource interface for v4.0 - pure metadata definition
 *
 * Resources are implemented using ResourceHelper type with const-based pattern.
 * Resources can be either static (with `value` field) or dynamic (with `returns` field).
 *
 * **IMPORTANT:** A resource must have EXACTLY ONE of `value` or `returns`:
 * - Use `value` for static resources (literal data, no implementation)
 * - Use `returns` for dynamic resources (type definition, requires implementation)
 * - Having both or neither will cause validation errors
 *
 * **⚠️ Troubleshooting TypeScript Errors:**
 * If you get "Type 'X' is not assignable" errors, use `ResourceHelper<YourResource>` for automatic type inference.
 *
 * **Type Guards:** Use `isStaticResource()` or `isDynamicResource()` to check resource type
 * **Validation:** Use `validateResource()` to ensure only one field is present
 *
 * @see {@link ResourceHelper} - Type-safe implementation helper that provides full type inference
 * @see {@link https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/CONST_PATTERNS.md#troubleshooting-typescript-errors|Troubleshooting Guide}
 *
 * **Static Resources** - Use `value` field with literal data (no implementation needed):
 * @example
 * ```typescript
 * interface ConfigResource extends IResource {
 *   uri: 'config://app';
 *   name: 'Config';
 *   description: 'Application configuration';
 *   mimeType: 'application/json';
 *   value: { version: '1.0.0', env: 'production' }; // ← Literal data (no implementation needed)
 * }
 * ```
 *
 * **Dynamic Function Resources** - Use `returns` field with type definition:
 * @example
 * ```typescript
 * interface StatsResource extends IResource {
 *   uri: 'stats://users';
 *   name: 'User Stats';
 *   description: 'Real-time user statistics';
 *   mimeType: 'application/json';
 *   returns: { count: number; active: number };
 * }
 *
 * // Implementation using ResourceHelper
 * const statsUsers: ResourceHelper<StatsResource> = async () => ({
 *   count: await getUserCount(),
 *   active: await getActiveUserCount()
 * });
 * ```
 *
 * **Dynamic Text Resources** - Use `returns` field with string type:
 * @example
 * ```typescript
 * interface DocResource extends IResource {
 *   uri: 'doc://readme';
 *   name: 'README';
 *   description: 'Documentation';
 *   mimeType: 'text/markdown';
 *   returns: string;
 * }
 *
 * // Implementation
 * const docReadme: ResourceHelper<DocResource> = async () => {
 *   return await fs.readFile('./README.md', 'utf-8');
 * };
 * ```
 *
 * **Database Resources** - Use `database` field to access databases (v4.1):
 * @example
 * ```typescript
 * interface UsersResource extends IResource {
 *   uri: 'db://users';
 *   name: 'User Database';
 *   description: 'All users from database';
 *   mimeType: 'application/json';
 *   database: {
 *     uri: '${DATABASE_URL}';
 *     readonly: true;
 *   };
 *   returns: { users: Array<{ id: number; username: string }> };
 * }
 *
 * // Implementation with database context
 * const dbUsers: ResourceHelper<UsersResource> = async (context) => {
 *   const db = context?.db;
 *   if (!db) throw new Error('Database not configured');
 *   const users = db.prepare('SELECT * FROM users').all();
 *   return { users };
 * };
 * ```
 *
 * @template T - The type of data returned by the resource
 */
export interface IResource<T = any> {
  /**
   * Resource URI (e.g., 'config://server', 'doc://readme')
   */
  uri: string;

  /**
   * Human-readable resource name
   */
  name: string;

  /**
   * Resource description
   */
  description: string;

  /**
   * MIME type (e.g., 'application/json', 'text/plain', 'text/markdown')
   */
  mimeType: string;

  /**
   * Static literal data for static resources.
   * Use this for resources that contain fixed data that doesn't change.
   *
   * **IMPORTANT:** Cannot be used together with `returns`.
   * A resource must have EXACTLY ONE of `value` or `returns`.
   *
   * @example
   * ```typescript
   * interface ConfigResource extends IResource {
   *   value: { version: '1.0.0' };  // Static data
   * }
   * ```
   */
  value?: T;

  /**
   * Type definition for dynamic resources.
   * Use this for resources that require runtime implementation.
   *
   * **IMPORTANT:** Cannot be used together with `value`.
   * A resource must have EXACTLY ONE of `value` or `returns`.
   *
   * @example
   * ```typescript
   * interface StatsResource extends IResource {
   *   returns: { count: number };  // Requires implementation
   * }
   *
   * const stats: ResourceHelper<StatsResource> = async () => ({
   *   count: await getCount()
   * });
   * ```
   */
  returns?: T;

  /**
   * Optional URI template parameters for dynamic resources.
   * Define parameters that can be extracted from URI templates (e.g., `/users/{userId}`).
   * Parameters are passed to the handler function as the first argument for type-safe access.
   *
   * When params is specified, your resource handler will receive:
   * 1. First argument: Typed params object with extracted values
   * 2. Second argument: Optional context object
   *
   * @example Recommended: Reusable Param Interfaces
   * ```typescript
   * import type { IParam } from 'simply-mcp';
   *
   * // Define reusable param interfaces
   * interface UserIdParam extends IParam {
   *   type: 'string';
   *   description: 'User ID';
   *   required: true;
   * }
   *
   * interface UserResource extends IResource {
   *   uri: 'api://users/{userId}';
   *   params: {
   *     userId: UserIdParam;  // Clean, typed, reusable!
   *   };
   *   returns: { id: string; name: string };
   * }
   *
   * // Handler receives params as first argument
   * 'api://users/{userId}': UserResource = async (params) => {
   *   return { id: params.userId, name: 'John Doe' };
   * };
   * ```
   *
   * @example Multiple Parameters
   * ```typescript
   * interface ApiVersionParam extends IParam {
   *   type: 'string';
   *   description: 'API version';
   *   required: true;
   * }
   *
   * interface ApiResource extends IResource {
   *   uri: 'api://v{version}/users/{userId}';
   *   params: {
   *     version: ApiVersionParam;
   *     userId: UserIdParam;  // Reuse from above
   *   };
   *   returns: User;
   * }
   *
   * 'api://v{version}/users/{userId}': ApiResource = async (params) => {
   *   return fetchUser(params.version, params.userId);
   * };
   * ```
   *
   * @example Quick Inline (Less Verbose, but Loses Documentation)
   * ```typescript
   * interface UserResource extends IResource {
   *   params: {
   *     userId: { type: 'string' };  // Works but no description
   *   };
   * }
   * ```
   */
  params?: Record<string, any>;

  /**
   * Optional database configuration for resources that need database access.
   * When specified, the framework will establish a connection and provide it
   * to the resource implementation via the context parameter.
   *
   * @example
   * ```typescript
   * interface UsersResource extends IResource {
   *   uri: 'db://users';
   *   database: {
   *     uri: '${DATABASE_URL}';
   *     readonly: true;
   *   };
   *   returns: { users: User[] };
   * }
   * ```
   */
  database?: IDatabase;
}

/**
 * Type utility to extract data type from a resource interface
 *
 * @example
 * ```typescript
 * interface MyResource extends IResource {
 *   returns: { data: string };
 * }
 *
 * type Data = ResourceData<MyResource>;  // { data: string }
 * ```
 */
export type ResourceData<T extends IResource> = T extends IResource<infer D> ? D : never;

/**
 * Type guard to check if a resource is static (has value field)
 *
 * @param resource - Resource interface to check
 * @returns True if resource has value field (static), false otherwise
 *
 * @example
 * ```typescript
 * interface ConfigResource extends IResource {
 *   uri: 'config://app';
 *   name: 'Config';
 *   value: { version: '1.0.0' };
 * }
 *
 * const resource: any = { uri: 'config://app', value: { version: '1.0.0' } };
 *
 * if (isStaticResource(resource)) {
 *   console.log('Static resource:', resource.value);
 * }
 * ```
 */
export function isStaticResource<T = any>(resource: IResource<T>): resource is IResource<T> & { value: T } {
  return 'value' in resource && resource.value !== undefined;
}

/**
 * Type guard to check if a resource is dynamic (has returns field)
 *
 * @param resource - Resource interface to check
 * @returns True if resource has returns field (dynamic), false otherwise
 *
 * @example
 * ```typescript
 * interface StatsResource extends IResource {
 *   uri: 'stats://server';
 *   name: 'Stats';
 *   returns: { uptime: number };
 * }
 *
 * const resource: any = { uri: 'stats://server', returns: {} };
 *
 * if (isDynamicResource(resource)) {
 *   console.log('Dynamic resource - requires implementation');
 * }
 * ```
 */
export function isDynamicResource<T = any>(resource: IResource<T>): resource is IResource<T> & { returns: T } {
  return 'returns' in resource && resource.returns !== undefined;
}

/**
 * Validates that a resource has exactly one of value or returns
 *
 * @param resource - Resource interface to validate
 * @throws Error if both value and returns are present, or if neither is present
 *
 * @example
 * ```typescript
 * const validStatic = { uri: 'x', name: 'X', value: {} };
 * validateResource(validStatic);  // ✅ OK
 *
 * const validDynamic = { uri: 'y', name: 'Y', returns: {} };
 * validateResource(validDynamic);  // ✅ OK
 *
 * const invalid = { uri: 'z', name: 'Z', value: {}, returns: {} };
 * validateResource(invalid);  // ❌ Throws Error
 * ```
 */
export function validateResource(resource: IResource): void {
  const hasValue = 'value' in resource && resource.value !== undefined;
  const hasReturns = 'returns' in resource && resource.returns !== undefined;

  if (hasValue && hasReturns) {
    throw new Error(
      `Resource '${resource.uri}' has both 'value' and 'returns' fields. ` +
      `Only one should be specified: use 'value' for static resources or 'returns' for dynamic resources.`
    );
  }

  if (!hasValue && !hasReturns) {
    throw new Error(
      `Resource '${resource.uri}' has neither 'value' nor 'returns' field. ` +
      `One must be specified: use 'value' for static resources or 'returns' for dynamic resources.`
    );
  }
}
