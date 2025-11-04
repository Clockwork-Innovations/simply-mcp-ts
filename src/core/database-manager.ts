/**
 * Database Manager
 *
 * Manages database connections for resources that need database access.
 * Supports SQLite out of the box, extensible for PostgreSQL, MySQL, etc.
 *
 * Features:
 * - URI parsing with environment variable substitution
 * - Connection caching and reuse
 * - Proper lifecycle management (open/close)
 * - SQLite support via better-sqlite3
 */

import Database from 'better-sqlite3';
import type { IDatabase } from '../server/interface-types.js';

/**
 * Database connection instance
 * Can be SQLite Database, Postgres Pool, MySQL Connection, etc.
 */
export type DatabaseConnection = Database.Database | any;

/**
 * Database Manager
 *
 * Manages database connections for resources.
 * Handles URI parsing, environment variable substitution, and connection pooling.
 */
export class DatabaseManager {
  /**
   * Cache of active database connections
   * Key: resolved URI (after env var substitution)
   * Value: database connection instance
   */
  private connections: Map<string, DatabaseConnection> = new Map();

  /**
   * Connect to a database using the provided configuration
   *
   * @param config - Database configuration from IResource.database field
   * @returns Database connection instance
   * @throws Error if URI is invalid or connection fails
   */
  connect(config: IDatabase): DatabaseConnection {
    // Resolve environment variables in URI
    const resolvedUri = this.resolveUri(config.uri);

    // Check if we already have a connection for this URI
    const existing = this.connections.get(resolvedUri);
    if (existing) {
      return existing;
    }

    // Parse URI to determine database type
    const dbType = this.parseUriType(resolvedUri);

    // Create connection based on type
    let connection: DatabaseConnection;

    switch (dbType) {
      case 'sqlite':
        connection = this.connectSqlite(resolvedUri, config);
        break;

      case 'postgresql':
      case 'mysql':
      case 'cosmosdb':
        throw new Error(
          `Database type "${dbType}" is not yet supported. ` +
          `Currently only SQLite is supported. ` +
          `Support for ${dbType} is planned for future versions.`
        );

      default:
        throw new Error(
          `Unsupported database URI format: "${resolvedUri}". ` +
          `Supported formats: sqlite://, file:// ` +
          `Future: postgresql://, mysql://`
        );
    }

    // Cache the connection
    this.connections.set(resolvedUri, connection);

    return connection;
  }

  /**
   * Disconnect from a specific database
   *
   * @param uri - Database URI (will be resolved)
   */
  disconnect(uri: string): void {
    const resolvedUri = this.resolveUri(uri);
    const connection = this.connections.get(resolvedUri);

    if (!connection) {
      return; // Already disconnected
    }

    // Close connection based on type
    if (connection && typeof connection.close === 'function') {
      connection.close();
    }

    this.connections.delete(resolvedUri);
  }

  /**
   * Disconnect from all databases
   * Should be called on server shutdown
   */
  disconnectAll(): void {
    for (const [uri, connection] of this.connections.entries()) {
      try {
        if (connection && typeof connection.close === 'function') {
          connection.close();
        }
      } catch (error) {
        console.error(`[DatabaseManager] Error closing connection to ${uri}:`, error);
      }
    }

    this.connections.clear();
  }

  /**
   * Resolve environment variables in URI
   *
   * Supports ${VAR_NAME} syntax
   *
   * @param uri - URI potentially containing environment variables
   * @returns Resolved URI with env vars substituted
   * @throws Error if environment variable is not found
   *
   * @example
   * resolveUri('${DATABASE_URL}') → 'sqlite:///data/app.db' (if env var is set)
   * resolveUri('sqlite:///data/app.db') → 'sqlite:///data/app.db' (no change)
   */
  private resolveUri(uri: string): string {
    return uri.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(
          `Environment variable "${varName}" not found in database URI: "${uri}". ` +
          `Please set ${varName} in your environment or update the database configuration.`
        );
      }
      return value;
    });
  }

  /**
   * Parse URI to determine database type
   *
   * @param uri - Resolved database URI
   * @returns Database type (sqlite, postgresql, mysql, etc.)
   */
  private parseUriType(uri: string): string {
    // SQLite: sqlite:// or file://
    if (uri.startsWith('sqlite://') || uri.startsWith('file:')) {
      return 'sqlite';
    }

    // PostgreSQL: postgresql:// or postgres://
    if (uri.startsWith('postgresql://') || uri.startsWith('postgres://')) {
      return 'postgresql';
    }

    // MySQL: mysql://
    if (uri.startsWith('mysql://')) {
      return 'mysql';
    }

    // Cosmos DB: cosmosdb://
    if (uri.startsWith('cosmosdb://')) {
      return 'cosmosdb';
    }

    // Unknown - throw error
    return 'unknown';
  }

  /**
   * Connect to SQLite database
   *
   * @param uri - Resolved SQLite URI
   * @param config - Database configuration
   * @returns SQLite Database instance
   * @throws Error if connection fails
   */
  private connectSqlite(uri: string, config: IDatabase): Database.Database {
    // Extract path from URI
    let path: string;

    if (uri.startsWith('sqlite://')) {
      // sqlite:///absolute/path or sqlite://./relative/path
      path = uri.substring('sqlite://'.length);
    } else if (uri.startsWith('file:')) {
      // file:./path or file:/path
      path = uri.substring('file:'.length);
    } else {
      throw new Error(`Invalid SQLite URI format: "${uri}"`);
    }

    // Create database connection
    const db = new Database(path, {
      readonly: config.readonly ?? false,
      timeout: config.timeout ?? 5000,
    });

    // Enable foreign keys (best practice for SQLite)
    db.pragma('foreign_keys = ON');

    return db;
  }

  /**
   * Get number of active connections
   * Useful for testing and monitoring
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if a connection exists for a given URI
   *
   * @param uri - Database URI (will be resolved)
   * @returns true if connection exists
   */
  hasConnection(uri: string): boolean {
    const resolvedUri = this.resolveUri(uri);
    return this.connections.has(resolvedUri);
  }
}
