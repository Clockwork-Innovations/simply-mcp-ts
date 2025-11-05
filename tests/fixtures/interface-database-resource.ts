/**
 * Test Fixture: Database Resources with SQLite Integration
 *
 * This fixture demonstrates:
 * 1. Dynamic resources with 'returns' field (not 'value')
 * 2. SQLite database integration (in-memory for testing)
 * 3. Realistic database schema (Users and Products tables)
 * 4. Both simple queries and filtered queries
 *
 * TODO - Authentication Integration (Feature Layer):
 * Once the resource handler supports passing context to dynamic resources,
 * add authentication checks using SecurityContext from the auth system:
 * - Check context?.security?.authenticated
 * - Verify permissions (e.g., 'read:users', 'read:products')
 * - Support JWT tokens, OAuth2 bearer tokens
 * - Add role-based access control (RBAC)
 * - Add multi-tenancy support
 */

// @ts-ignore - Import works at runtime, TypeScript config issue
import Database from 'better-sqlite3';
import type { IServer, IResource } from '../../src/index.js';
import { tmpdir } from 'os';
import { join } from 'path';

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

// Create a temporary database file that all resources will share
// This ensures all resources access the same seeded data
const TEST_DB_PATH = './tmp/test-database-shared.db';

// Ensure tmp directory exists
import { mkdirSync, unlinkSync, existsSync } from 'fs';
try {
  mkdirSync('./tmp', { recursive: true });
} catch (err) {
  // Directory already exists
}

// Delete existing database file to ensure clean state for tests
if (existsSync(TEST_DB_PATH)) {
  try {
    unlinkSync(TEST_DB_PATH);
  } catch (err) {
    // File might be locked, ignore
  }
}

// Initialize SQLite database with test data
const db = new Database(TEST_DB_PATH);

// Create tables with realistic schema
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    in_stock INTEGER NOT NULL DEFAULT 1
  );
`);

// Seed test data
db.exec(`
  INSERT INTO users (id, username, email, created_at) VALUES
    (1, 'alice', 'alice@example.com', '2024-01-01T00:00:00Z'),
    (2, 'bob', 'bob@example.com', '2024-01-02T00:00:00Z'),
    (3, 'charlie', 'charlie@example.com', '2024-01-03T00:00:00Z');

  INSERT INTO products (id, name, price, category, in_stock) VALUES
    (1, 'Laptop', 999.99, 'Electronics', 1),
    (2, 'Mouse', 29.99, 'Electronics', 1),
    (3, 'Desk Chair', 199.99, 'Furniture', 1),
    (4, 'Monitor', 349.99, 'Electronics', 1),
    (5, 'Desk Lamp', 49.99, 'Furniture', 0);
`);

// Close the seeding database - resources will get their own connections via DatabaseManager
db.close();

// =============================================================================
// SERVER INTERFACE
// =============================================================================

const server: IServer = {
  name: 'database-test-server',
  version: '1.0.0',
  description: 'Test server with database resources'
  // version: '1.0.0';  // Optional (defaults to '1.0.0')
}

// =============================================================================
// RESOURCE INTERFACES - Dynamic Database Resources
// =============================================================================

/**
 * Users Database Resource
 *
 * Demonstrates:
 * - Dynamic resource with 'returns' field
 * - Database query execution
 * - Structured return type with metadata
 *
 * Pattern: Dynamic resource using 'returns' for type definition
 */
interface UsersResource extends IResource {
  uri: 'db://users';
  name: 'User Database';
  description: 'Access user records from database';
  mimeType: 'application/json';
  database: {
    uri: 'file:./tmp/test-database-shared.db';
  };
  returns: {
    users: Array<{
      id: number;
      username: string;
      email: string;
      created_at: string;
    }>;
    total: number;
    timestamp: string;
  };
}

/**
 * Products Database Resource (All Products)
 *
 * Demonstrates:
 * - Dynamic resource with 'returns' field
 * - Database query with all records
 * - Additional metadata (total count, in stock count)
 */
interface ProductsResource extends IResource {
  uri: 'db://products';
  name: 'Product Database';
  description: 'Access product catalog from database';
  mimeType: 'application/json';
  database: {
    uri: 'file:./tmp/test-database-shared.db';
  };
  returns: {
    products: Array<{
      id: number;
      name: string;
      price: number;
      category: string;
      in_stock: number;
    }>;
    total: number;
    inStockCount: number;
  };
}

/**
 * Products by Category Resource
 *
 * Demonstrates:
 * - Dynamic resource with category filtering
 * - Parameterized database queries
 * - Category-specific metadata
 *
 * NOTE: This is a simplified version without query parameters.
 * In the feature layer, this would accept category via context.params
 */
interface ProductsByCategoryResource extends IResource {
  uri: 'db://products/electronics';
  name: 'Electronics Products';
  description: 'Electronics products from catalog';
  mimeType: 'application/json';
  database: {
    uri: 'file:./tmp/test-database-shared.db';
  };
  returns: {
    products: Array<{
      id: number;
      name: string;
      price: number;
      category: string;
      in_stock: number;
    }>;
    category: string;
    total: number;
  };
}

/**
 * User by ID Resource
 *
 * Demonstrates:
 * - Dynamic resource with single record lookup
 * - Null handling for missing records
 */
interface UserByIdResource extends IResource {
  uri: 'db://users/1';
  name: 'User by ID';
  description: 'Fetch a specific user by ID';
  mimeType: 'application/json';
  database: {
    uri: 'file:./tmp/test-database-shared.db';
  };
  returns: {
    user: {
      id: number;
      username: string;
      email: string;
      created_at: string;
    } | null;
    found: boolean;
  };
}

/**
 * Database Stats Resource
 *
 * Demonstrates:
 * - Aggregation queries
 * - Multi-table statistics
 * - Computed metadata
 */
interface DatabaseStatsResource extends IResource {
  uri: 'db://stats';
  name: 'Database Statistics';
  description: 'Database table statistics and counts';
  mimeType: 'application/json';
  database: {
    uri: 'file:./tmp/test-database-shared.db';
  };
  returns: {
    userCount: number;
    productCount: number;
    categoryCounts: Record<string, number>;
    lastUpdated: string;
  };
}

// =============================================================================
// SERVER IMPLEMENTATION
// =============================================================================

/**
 * Users resource implementation
 *
 * Returns all users from the database with metadata
 *
 * TODO - Add authentication:
 * async (context?: { security?: SecurityContext }) => {
 *   if (!context?.security?.authenticated) {
 *     throw new Error('Authentication required: No valid API key provided');
 *   }
 *   if (!context.security.permissions.includes('read:users')) {
 *     throw new Error('Authorization failed: Missing read:users permission');
 *   }
 *   // ... query database
 * }
 */
const usersResource = async (context?: any) => {
    // TypeScript infers context type from UsersResource interface automatically!
    if (!context?.db) throw new Error('Database connection not available');

    const users = context.db.prepare('SELECT * FROM users ORDER BY id').all() as Array<{
      id: number;
      username: string;
      email: string;
      created_at: string;
    }>;

    return {
      users,
      total: users.length,
      timestamp: new Date().toISOString(),
    };
  };

/**
 * Products resource implementation
 *
 * Returns all products with inventory statistics
 */
const productsResource = async (context?: any) => {
    if (!context?.db) throw new Error('Database connection not available');

    const products = context.db.prepare('SELECT * FROM products ORDER BY id').all() as Array<{
      id: number;
      name: string;
      price: number;
      category: string;
      in_stock: number;
    }>;

    const inStockCount = products.filter((p) => p.in_stock === 1).length;

    return {
      products,
      total: products.length,
      inStockCount,
    };
  };

/**
 * Electronics products resource implementation
 *
 * Returns products filtered by Electronics category
 *
 * NOTE: In the feature layer with context support, this would be:
 * async (context?: { params?: { category?: string } }) => {
 *   const category = context?.params?.category || 'Electronics';
 *   const products = db.prepare('SELECT * FROM products WHERE category = ? ORDER BY id')
 *     .all(category);
 *   ...
 * }
 */
const electronicsProductsResource = async (context?: any) => {
    if (!context?.db) throw new Error('Database connection not available');

    const category = 'Electronics';
    const products = context.db
      .prepare('SELECT * FROM products WHERE category = ? ORDER BY id')
      .all(category) as Array<{
      id: number;
      name: string;
      price: number;
      category: string;
      in_stock: number;
    }>;

    return {
      products,
      category,
      total: products.length,
    };
  };

/**
 * User by ID resource implementation
 *
 * Returns a specific user or null if not found
 */
const userByIdResource = async (context?: any) => {
    if (!context?.db) throw new Error('Database connection not available');

    const userId = 1; // In feature layer, this would come from URI params
    const user = context.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as {
      id: number;
      username: string;
      email: string;
      created_at: string;
    } | undefined;

    return {
      user: user || null,
      found: !!user,
    };
  };

/**
 * Database statistics resource implementation
 *
 * Returns aggregated statistics across tables
 */
const statsResource = async (context?: any) => {
    if (!context?.db) throw new Error('Database connection not available');

    const userCount = context.db.prepare('SELECT COUNT(*) as count FROM users').get() as {
      count: number;
    };
    const productCount = context.db.prepare('SELECT COUNT(*) as count FROM products').get() as {
      count: number;
    };

    // Get category counts
    const categoryRows = context.db
      .prepare('SELECT category, COUNT(*) as count FROM products GROUP BY category')
      .all() as Array<{ category: string; count: number }>;

    const categoryCounts: Record<string, number> = {};
    for (const row of categoryRows) {
      categoryCounts[row.category] = row.count;
    }

    return {
      userCount: userCount.count,
      productCount: productCount.count,
      categoryCounts,
      lastUpdated: new Date().toISOString(),
    };
  };

// Server implementation using v4 const-based pattern
const server: DatabaseTestServer = {
  name: 'database-test-server',
  description: 'Test server with database resources',
  'db://users': usersResource,
  'db://products': productsResource,
  'db://products/electronics': electronicsProductsResource,
  'db://users/1': userByIdResource,
  'db://stats': statsResource
};

export default server;

// =============================================================================
// FUTURE AUTH INTEGRATION CHECKLIST
// =============================================================================

/*
TODO: Authentication Methods to Add (Feature Layer)

1. [ ] API Key Authentication
   - Check context.security.authenticated
   - Verify permissions array
   - Support custom permission schemes

2. [ ] JWT Token Authentication
   - Parse and validate JWT tokens
   - Extract claims and permissions
   - Handle token expiration

3. [ ] OAuth2 Bearer Token
   - Validate OAuth2 tokens
   - Support refresh tokens
   - Integrate with OAuth2 providers

4. [ ] Database Connection String Auth
   - Support username:password@host format
   - Connection pooling with auth
   - Per-user database credentials

5. [ ] Role-Based Access Control (RBAC)
   - Define roles (admin, user, readonly)
   - Map roles to permissions
   - Hierarchical role inheritance

6. [ ] Multi-Tenancy Support
   - Tenant isolation at database level
   - Tenant-scoped queries
   - Tenant authentication

7. [ ] Row-Level Security
   - Filter queries based on user permissions
   - User-specific data access
   - Dynamic WHERE clauses

8. [ ] Audit Logging
   - Log all authenticated access
   - Track failed authentication attempts
   - Record permission violations
*/
