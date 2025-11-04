/**
 * Test Suite: Database Resources with SQLite Integration
 *
 * This test suite validates:
 * 1. Dynamic resources with 'returns' field work correctly
 * 2. SQLite database integration functions properly
 * 3. Database queries return correct data structures
 * 4. Filtering and aggregation work as expected
 * 5. Resource listing shows all database resources
 *
 * TODO - Authentication Tests (Feature Layer):
 * Once the resource handler supports passing context:
 * - Test authentication requirements
 * - Test permission checks (read:users, read:products)
 * - Test rejection of unauthenticated requests
 * - Test rejection of insufficient permissions
 */

import { describe, expect, test, beforeAll } from '@jest/globals';
import { loadInterfaceServer } from '../../../src/server/adapter.js';
import type { InterfaceServer } from '../../../src/server/interface-server.js';

describe('Interface API database resources', () => {
  let server: InterfaceServer;

  beforeAll(async () => {
    const fixturePath = 'tests/fixtures/interface-database-resource.ts';
    server = await loadInterfaceServer({ filePath: fixturePath });
  });

  // ===========================================================================
  // USERS DATABASE RESOURCE TESTS
  // ===========================================================================

  describe('Users Database Resource (db://users)', () => {
    test('returns all users from database', async () => {
      const result = await server.readResource('db://users');
      const data = JSON.parse(result.contents[0].text);

      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users).toHaveLength(3);
    });

    test('returns correct user data structure', async () => {
      const result = await server.readResource('db://users');
      const data = JSON.parse(result.contents[0].text);

      const firstUser = data.users[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('username');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('created_at');

      expect(typeof firstUser.id).toBe('number');
      expect(typeof firstUser.username).toBe('string');
      expect(typeof firstUser.email).toBe('string');
      expect(typeof firstUser.created_at).toBe('string');
    });

    test('returns users in correct order (sorted by id)', async () => {
      const result = await server.readResource('db://users');
      const data = JSON.parse(result.contents[0].text);

      expect(data.users[0].username).toBe('alice');
      expect(data.users[1].username).toBe('bob');
      expect(data.users[2].username).toBe('charlie');

      expect(data.users[0].id).toBe(1);
      expect(data.users[1].id).toBe(2);
      expect(data.users[2].id).toBe(3);
    });

    test('includes metadata (total count and timestamp)', async () => {
      const result = await server.readResource('db://users');
      const data = JSON.parse(result.contents[0].text);

      expect(data.total).toBe(3);
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');

      // Verify timestamp is valid ISO 8601 format
      const timestamp = new Date(data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    test('returns valid email addresses', async () => {
      const result = await server.readResource('db://users');
      const data = JSON.parse(result.contents[0].text);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const user of data.users) {
        expect(emailRegex.test(user.email)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // PRODUCTS DATABASE RESOURCE TESTS
  // ===========================================================================

  describe('Products Database Resource (db://products)', () => {
    test('returns all products from database', async () => {
      const result = await server.readResource('db://products');
      const data = JSON.parse(result.contents[0].text);

      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products).toHaveLength(5);
    });

    test('returns correct product data structure', async () => {
      const result = await server.readResource('db://products');
      const data = JSON.parse(result.contents[0].text);

      const firstProduct = data.products[0];
      expect(firstProduct).toHaveProperty('id');
      expect(firstProduct).toHaveProperty('name');
      expect(firstProduct).toHaveProperty('price');
      expect(firstProduct).toHaveProperty('category');
      expect(firstProduct).toHaveProperty('in_stock');

      expect(typeof firstProduct.id).toBe('number');
      expect(typeof firstProduct.name).toBe('string');
      expect(typeof firstProduct.price).toBe('number');
      expect(typeof firstProduct.category).toBe('string');
      expect(typeof firstProduct.in_stock).toBe('number');
    });

    test('includes inventory statistics', async () => {
      const result = await server.readResource('db://products');
      const data = JSON.parse(result.contents[0].text);

      expect(data.total).toBe(5);
      expect(data.inStockCount).toBe(4); // 4 products in stock, 1 out of stock

      // Verify the count matches actual data
      const actualInStock = data.products.filter((p: any) => p.in_stock === 1).length;
      expect(data.inStockCount).toBe(actualInStock);
    });

    test('price values are valid numbers', async () => {
      const result = await server.readResource('db://products');
      const data = JSON.parse(result.contents[0].text);

      for (const product of data.products) {
        expect(typeof product.price).toBe('number');
        expect(product.price).toBeGreaterThan(0);
        expect(Number.isFinite(product.price)).toBe(true);
      }
    });

    test('in_stock is 0 or 1', async () => {
      const result = await server.readResource('db://products');
      const data = JSON.parse(result.contents[0].text);

      for (const product of data.products) {
        expect([0, 1]).toContain(product.in_stock);
      }
    });
  });

  // ===========================================================================
  // FILTERED PRODUCTS RESOURCE TESTS
  // ===========================================================================

  describe('Products by Category Resource (db://products/electronics)', () => {
    test('returns only electronics products', async () => {
      const result = await server.readResource('db://products/electronics');
      const data = JSON.parse(result.contents[0].text);

      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products).toHaveLength(3); // 3 electronics products

      // Verify all are electronics
      for (const product of data.products) {
        expect(product.category).toBe('Electronics');
      }
    });

    test('includes category in metadata', async () => {
      const result = await server.readResource('db://products/electronics');
      const data = JSON.parse(result.contents[0].text);

      expect(data.category).toBe('Electronics');
      expect(data.total).toBe(3);
    });

    test('electronics products have correct names', async () => {
      const result = await server.readResource('db://products/electronics');
      const data = JSON.parse(result.contents[0].text);

      const names = data.products.map((p: any) => p.name);
      expect(names).toContain('Laptop');
      expect(names).toContain('Mouse');
      expect(names).toContain('Monitor');
    });
  });

  // ===========================================================================
  // SINGLE USER RESOURCE TESTS
  // ===========================================================================

  describe('User by ID Resource (db://users/1)', () => {
    test('returns a specific user', async () => {
      const result = await server.readResource('db://users/1');
      const data = JSON.parse(result.contents[0].text);

      expect(data.user).toBeDefined();
      expect(data.user).not.toBeNull();
      expect(data.found).toBe(true);
    });

    test('returns correct user data', async () => {
      const result = await server.readResource('db://users/1');
      const data = JSON.parse(result.contents[0].text);

      expect(data.user.id).toBe(1);
      expect(data.user.username).toBe('alice');
      expect(data.user.email).toBe('alice@example.com');
    });

    test('includes found status', async () => {
      const result = await server.readResource('db://users/1');
      const data = JSON.parse(result.contents[0].text);

      expect(data.found).toBe(true);
      expect(typeof data.found).toBe('boolean');
    });
  });

  // ===========================================================================
  // DATABASE STATISTICS RESOURCE TESTS
  // ===========================================================================

  describe('Database Statistics Resource (db://stats)', () => {
    test('returns correct table counts', async () => {
      const result = await server.readResource('db://stats');
      const data = JSON.parse(result.contents[0].text);

      expect(data.userCount).toBe(3);
      expect(data.productCount).toBe(5);
    });

    test('returns category breakdown', async () => {
      const result = await server.readResource('db://stats');
      const data = JSON.parse(result.contents[0].text);

      expect(data.categoryCounts).toBeDefined();
      expect(typeof data.categoryCounts).toBe('object');

      expect(data.categoryCounts['Electronics']).toBe(3);
      expect(data.categoryCounts['Furniture']).toBe(2);
    });

    test('includes last updated timestamp', async () => {
      const result = await server.readResource('db://stats');
      const data = JSON.parse(result.contents[0].text);

      expect(data.lastUpdated).toBeDefined();
      expect(typeof data.lastUpdated).toBe('string');

      // Verify it's a valid ISO 8601 timestamp
      const timestamp = new Date(data.lastUpdated);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    test('category counts sum to total products', async () => {
      const result = await server.readResource('db://stats');
      const data = JSON.parse(result.contents[0].text);

      const totalFromCategories = Object.values(data.categoryCounts).reduce(
        (sum: number, count) => sum + (count as number),
        0
      );

      expect(totalFromCategories).toBe(data.productCount);
    });
  });

  // ===========================================================================
  // RESOURCE LISTING TESTS
  // ===========================================================================

  describe('Resource Listing', () => {
    test('lists all database resources', () => {
      const resources = server.listResources();

      const dbResources = resources.filter((r) => r.uri.startsWith('db://'));
      expect(dbResources.length).toBeGreaterThanOrEqual(5);

      const resourceUris = dbResources.map((r) => r.uri);
      expect(resourceUris).toContain('db://users');
      expect(resourceUris).toContain('db://products');
      expect(resourceUris).toContain('db://products/electronics');
      expect(resourceUris).toContain('db://users/1');
      expect(resourceUris).toContain('db://stats');
    });

    test('database resources have correct metadata', () => {
      const resources = server.listResources();

      const usersResource = resources.find((r) => r.uri === 'db://users');
      expect(usersResource).toBeDefined();
      expect(usersResource?.name).toBe('User Database');
      expect(usersResource?.description).toBe('Access user records from database');
      expect(usersResource?.mimeType).toBe('application/json');

      const productsResource = resources.find((r) => r.uri === 'db://products');
      expect(productsResource).toBeDefined();
      expect(productsResource?.name).toBe('Product Database');
      expect(productsResource?.description).toBe('Access product catalog from database');
      expect(productsResource?.mimeType).toBe('application/json');
    });
  });

  // ===========================================================================
  // DATA CONSISTENCY TESTS
  // ===========================================================================

  describe('Data Consistency', () => {
    test('multiple reads return consistent data', async () => {
      const result1 = await server.readResource('db://users');
      const result2 = await server.readResource('db://users');

      const data1 = JSON.parse(result1.contents[0].text);
      const data2 = JSON.parse(result2.contents[0].text);

      // User data should be identical (excluding timestamp)
      expect(data1.users).toEqual(data2.users);
      expect(data1.total).toBe(data2.total);
    });

    test('filtered and full queries are consistent', async () => {
      const allProducts = await server.readResource('db://products');
      const electronicsProducts = await server.readResource('db://products/electronics');

      const allData = JSON.parse(allProducts.contents[0].text);
      const electronicsData = JSON.parse(electronicsProducts.contents[0].text);

      // All electronics in filtered query should exist in full query
      const allElectronics = allData.products.filter(
        (p: any) => p.category === 'Electronics'
      );

      expect(electronicsData.products.length).toBe(allElectronics.length);

      // Product IDs should match
      const electronicsIds = electronicsData.products.map((p: any) => p.id).sort();
      const allElectronicsIds = allElectronics.map((p: any) => p.id).sort();
      expect(electronicsIds).toEqual(allElectronicsIds);
    });

    test('stats match actual data counts', async () => {
      const stats = await server.readResource('db://stats');
      const users = await server.readResource('db://users');
      const products = await server.readResource('db://products');

      const statsData = JSON.parse(stats.contents[0].text);
      const usersData = JSON.parse(users.contents[0].text);
      const productsData = JSON.parse(products.contents[0].text);

      expect(statsData.userCount).toBe(usersData.total);
      expect(statsData.productCount).toBe(productsData.total);
    });
  });

  // ===========================================================================
  // MIME TYPE TESTS
  // ===========================================================================

  describe('MIME Types', () => {
    test('all database resources use application/json', async () => {
      const resources = server.listResources();
      const dbResources = resources.filter((r) => r.uri.startsWith('db://'));

      for (const resource of dbResources) {
        expect(resource.mimeType).toBe('application/json');
      }
    });

    test('resource content is valid JSON', async () => {
      const result = await server.readResource('db://users');

      // Should not throw
      expect(() => {
        JSON.parse(result.contents[0].text);
      }).not.toThrow();
    });
  });
});

// ===========================================================================
// FUTURE AUTHENTICATION TESTS (Feature Layer)
// ===========================================================================

/*
TODO: Add these tests when context support is added to resources

describe('Authentication Tests', () => {
  test('rejects request without authentication', async () => {
    await expect(async () => {
      await server.readResource('db://users');
    }).rejects.toThrow(/Authentication required/i);
  });

  test('rejects request with missing permissions', async () => {
    const context: SecurityContext = {
      authenticated: true,
      permissions: [], // No permissions
      createdAt: Date.now()
    };

    await expect(async () => {
      await server.readResource('db://users', { security: context });
    }).rejects.toThrow(/Authorization failed.*read:users/i);
  });

  test('accepts request with valid authentication and permissions', async () => {
    const context: SecurityContext = {
      authenticated: true,
      permissions: ['read:users'],
      createdAt: Date.now()
    };

    const result = await server.readResource('db://users', { security: context });
    expect(result).toBeDefined();
    expect(result.contents[0].text).toContain('alice');
  });

  test('different permissions for different resources', async () => {
    const userContext: SecurityContext = {
      authenticated: true,
      permissions: ['read:users'],
      createdAt: Date.now()
    };

    const productContext: SecurityContext = {
      authenticated: true,
      permissions: ['read:products'],
      createdAt: Date.now()
    };

    // User context can read users but not products
    await expect(server.readResource('db://users', { security: userContext }))
      .resolves.toBeDefined();
    await expect(server.readResource('db://products', { security: userContext }))
      .rejects.toThrow(/Authorization failed.*read:products/i);

    // Product context can read products but not users
    await expect(server.readResource('db://products', { security: productContext }))
      .resolves.toBeDefined();
    await expect(server.readResource('db://users', { security: productContext }))
      .rejects.toThrow(/Authorization failed.*read:users/i);
  });

  test('wildcard permissions grant access to all resources', async () => {
    const adminContext: SecurityContext = {
      authenticated: true,
      permissions: ['*'],
      createdAt: Date.now()
    };

    await expect(server.readResource('db://users', { security: adminContext }))
      .resolves.toBeDefined();
    await expect(server.readResource('db://products', { security: adminContext }))
      .resolves.toBeDefined();
    await expect(server.readResource('db://stats', { security: adminContext }))
      .resolves.toBeDefined();
  });
});
*/
