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
 *   database: { uri: 'file:./users.db' };
 *   returns: { users: User[] };
 * }
 *
 * // ✅ TypeScript infers context type from UsersResource automatically
 * 'db://users': UsersResource = async (context) => {
 *   const db = context?.db;  // TypeScript knows this is ResourceContext
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
 * 'db://users': UsersResource = async (context) => {
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
 * Resource interface for v4.0
 *
 * Resources can be either static or dynamic:
 *
 * **Static Resources** - Use `value` field with literal data (no implementation needed):
 * @example
 * interface ConfigResource extends IResource {
 *   uri: 'config://app';
 *   name: 'Config';
 *   description: 'Application configuration';
 *   mimeType: 'application/json';
 *   value: { version: '1.0.0', env: 'production' }; // ← Literal data
 * }
 *
 * **Dynamic Function Resources** - Use `returns` field with type definition (implementation required):
 * @example
 * interface StatsResource extends IResource {
 *   uri: 'stats://users';
 *   name: 'User Stats';
 *   description: 'Real-time user statistics';
 *   mimeType: 'application/json';
 *   returns: { count: number; active: number }; // ← Type definition
 * }
 * // Implementation: 'stats://users' = async () => ({ count: 42, active: 10 })
 *
 * **Dynamic Object Resources** - Use `returns` field with type definition (object with data property):
 * @example
 * interface DocResource extends IResource {
 *   uri: 'doc://readme';
 *   name: 'README';
 *   description: 'Documentation';
 *   mimeType: 'text/markdown';
 *   returns: string; // ← Type definition
 * }
 * // Implementation: 'doc://readme' = { data: '# README...' }
 *
 * **Database Resources** - Use `database` field to access databases (v4.1):
 * @example
 * interface UsersResource extends IResource {
 *   uri: 'db://users';
 *   name: 'User Database';
 *   mimeType: 'application/json';
 *   database: {
 *     uri: '${DATABASE_URL}';
 *     readonly: true;
 *   };
 *   returns: { users: Array<{ id: number; username: string }> };
 * }
 * // Implementation: 'db://users' = async (context) => {
 * //   const db = context.db;
 * //   const users = db.prepare('SELECT * FROM users').all();
 * //   return { users };
 * // }
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
   * Cannot be used together with `returns`.
   */
  value?: T;

  /**
   * Type definition for dynamic resources.
   * Use this for resources that require runtime implementation.
   * Cannot be used together with `value`.
   */
  returns?: T;

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

  /**
   * Callable signature - the actual implementation for dynamic resources
   *
   * @param context - Optional context containing database connection (if database field is set)
   * @returns The resource data (can be async)
   */
  (context?: ResourceContext): T | Promise<T>;
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
