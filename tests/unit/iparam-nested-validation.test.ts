/**
 * IParam Nested Structures Validation Test Suite
 *
 * Comprehensive tests for nested object and array handling with IParam.
 * Tests recursive schema generation, validation, and error handling.
 *
 * Coverage:
 * - Nested objects (multiple levels deep)
 * - Arrays of objects
 * - Objects containing arrays
 * - Arrays of arrays
 * - Mixed nesting scenarios
 * - Validation at each nesting level
 * - Error messages for incorrectly nested structures
 */

import { describe, it, expect } from '@jest/globals';
import { loadInterfaceServer, InterfaceServer } from '../../src/api/interface/index.js';
import path from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('IParam - Nested Object Validation', () => {
  let server: InterfaceServer;
  let tempFile: string;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {}
    }
  });

  describe('Nested Objects - 2 Levels Deep', () => {
    it('should validate nested object with all required fields', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-nested-object-2-levels.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Level 2: Street address component
interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
  maxLength: 200;
}

// Level 2: City component
interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
  minLength: 1;
  maxLength: 100;
}

// Level 1: Address object
interface AddressParam extends IParam {
  type: 'object';
  description: 'Mailing address';
  properties: {
    street: StreetParam;
    city: CityParam;
  };
  requiredProperties: ['street', 'city'];
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user with address';
  params: {
    name: string;
    address: AddressParam;
  };
  result: { userId: string };
}

interface TestServer extends IServer {
  name: 'nested-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  createUser: CreateUserTool = async (params) => {
    return { userId: 'user-123' };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });
      const tools = server.listTools();
      const tool = tools.find((t) => t.name === 'create_user');

      // Check schema structure
      expect(tool?.inputSchema.properties.address.type).toBe('object');
      expect(tool?.inputSchema.properties.address.properties).toHaveProperty('street');
      expect(tool?.inputSchema.properties.address.properties).toHaveProperty('city');

      // Check nested field constraints
      expect(tool?.inputSchema.properties.address.properties.street.type).toBe('string');
      expect(tool?.inputSchema.properties.address.properties.street.minLength).toBe(1);
      expect(tool?.inputSchema.properties.address.properties.street.maxLength).toBe(200);

      // Test valid execution
      const result = await server.executeTool('create_user', {
        name: 'Alice',
        address: {
          street: '123 Main St',
          city: 'New York',
        },
      });
      expect(result.content[0].text).toContain('user-123');

      // Test validation - missing nested required field
      await expect(
        server.executeTool('create_user', {
          name: 'Bob',
          address: {
            street: '456 Elm St',
            // city missing
          },
        })
      ).rejects.toThrow();

      // Test validation - nested field too short
      await expect(
        server.executeTool('create_user', {
          name: 'Charlie',
          address: {
            street: '', // violates minLength: 1
            city: 'Boston',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Nested Objects - 3 Levels Deep', () => {
    it('should validate deeply nested objects', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-nested-object-3-levels.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Level 3: Coordinates
interface LatParam extends IParam {
  type: 'number';
  description: 'Latitude';
  min: -90;
  max: 90;
}

interface LonParam extends IParam {
  type: 'number';
  description: 'Longitude';
  min: -180;
  max: 180;
}

interface CoordinatesParam extends IParam {
  type: 'object';
  description: 'GPS coordinates';
  properties: {
    lat: LatParam;
    lon: LonParam;
  };
  requiredProperties: ['lat', 'lon'];
}

// Level 2: Address with coordinates
interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
}

interface AddressParam extends IParam {
  type: 'object';
  description: 'Full address with GPS';
  properties: {
    street: StreetParam;
    coordinates: CoordinatesParam;
  };
  requiredProperties: ['street', 'coordinates'];
}

// Level 1: User with address
interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user with GPS-enabled address';
  params: {
    name: string;
    address: AddressParam;
  };
  result: { userId: string };
}

interface TestServer extends IServer {
  name: 'nested-3-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  createUser: CreateUserTool = async (params) => {
    return { userId: 'user-456' };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

      // Test valid 3-level nesting
      const result = await server.executeTool('create_user', {
        name: 'Alice',
        address: {
          street: '123 Main St',
          coordinates: {
            lat: 40.7128,
            lon: -74.006,
          },
        },
      });
      expect(result.content[0].text).toContain('user-456');

      // Test validation at level 3 - lat out of range
      await expect(
        server.executeTool('create_user', {
          name: 'Bob',
          address: {
            street: '456 Elm St',
            coordinates: {
              lat: 100, // exceeds max: 90
              lon: -74.006,
            },
          },
        })
      ).rejects.toThrow();

      // Test validation at level 3 - lon out of range
      await expect(
        server.executeTool('create_user', {
          name: 'Charlie',
          address: {
            street: '789 Oak Ave',
            coordinates: {
              lat: 40.7128,
              lon: -200, // below min: -180
            },
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Arrays of Objects', () => {
    it('should validate array items with object type', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-array-of-objects.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Object item definition
interface TagNameParam extends IParam {
  type: 'string';
  description: 'Tag name';
  minLength: 1;
  maxLength: 50;
}

interface TagColorParam extends IParam {
  type: 'string';
  description: 'Tag color (hex)';
  pattern: '^#[0-9A-Fa-f]{6}$';
}

interface TagItemParam extends IParam {
  type: 'object';
  description: 'A single tag with metadata';
  properties: {
    name: TagNameParam;
    color: TagColorParam;
  };
  requiredProperties: ['name', 'color'];
}

// Array of objects
interface TagsParam extends IParam {
  type: 'array';
  description: 'List of tags';
  items: TagItemParam;
  minItems: 1;
  maxItems: 10;
}

interface TagUserTool extends ITool {
  name: 'tag_user';
  description: 'Add tags to user';
  params: {
    userId: string;
    tags: TagsParam;
  };
  result: { success: boolean };
}

interface TestServer extends IServer {
  name: 'array-of-objects-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  tagUser: TagUserTool = async (params) => {
    return { success: true };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

      // Test valid array of objects
      const result = await server.executeTool('tag_user', {
        userId: 'user-123',
        tags: [
          { name: 'developer', color: '#FF5733' },
          { name: 'designer', color: '#33FF57' },
        ],
      });
      expect(JSON.parse(result.content[0].text).success).toBe(true);

      // Test validation - invalid hex color in array item
      await expect(
        server.executeTool('tag_user', {
          userId: 'user-456',
          tags: [
            { name: 'admin', color: 'red' }, // invalid pattern
          ],
        })
      ).rejects.toThrow();

      // Test validation - tag name too long
      await expect(
        server.executeTool('tag_user', {
          userId: 'user-789',
          tags: [
            { name: 'a'.repeat(51), color: '#ABCDEF' }, // exceeds maxLength: 50
          ],
        })
      ).rejects.toThrow();

      // Test validation - array too large
      await expect(
        server.executeTool('tag_user', {
          userId: 'user-999',
          tags: Array(11)
            .fill(null)
            .map((_, i) => ({ name: `tag${i}`, color: '#123456' })), // exceeds maxItems: 10
        })
      ).rejects.toThrow();
    });
  });

  describe('Objects Containing Arrays', () => {
    it('should validate object properties that are arrays', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-object-with-arrays.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Array of strings
interface PhoneItemParam extends IParam {
  type: 'string';
  description: 'Phone number';
  pattern: '^\\\\\\\\+?[0-9]{10,15}$';
}

interface PhonesParam extends IParam {
  type: 'array';
  description: 'Phone numbers';
  items: PhoneItemParam;
  minItems: 1;
  maxItems: 5;
}

// Array of emails
interface EmailItemParam extends IParam {
  type: 'string';
  description: 'Email address';
  format: 'email';
}

interface EmailsParam extends IParam {
  type: 'array';
  description: 'Email addresses';
  items: EmailItemParam;
  minItems: 1;
}

// Object containing multiple arrays
interface ContactInfoParam extends IParam {
  type: 'object';
  description: 'Contact information';
  properties: {
    phones: PhonesParam;
    emails: EmailsParam;
  };
  requiredProperties: ['phones', 'emails'];
}

interface UpdateContactTool extends ITool {
  name: 'update_contact';
  description: 'Update user contact info';
  params: {
    userId: string;
    contact: ContactInfoParam;
  };
  result: { updated: boolean };
}

interface TestServer extends IServer {
  name: 'object-with-arrays-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  updateContact: UpdateContactTool = async (params) => {
    return { updated: true };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

      // Test valid object with arrays
      const result = await server.executeTool('update_contact', {
        userId: 'user-123',
        contact: {
          phones: ['+15551234567', '+15559876543'],
          emails: ['alice@example.com', 'alice.work@example.com'],
        },
      });
      expect(JSON.parse(result.content[0].text).updated).toBe(true);

      // Test validation - invalid phone pattern
      await expect(
        server.executeTool('update_contact', {
          userId: 'user-456',
          contact: {
            phones: ['invalid-phone'], // violates pattern
            emails: ['bob@example.com'],
          },
        })
      ).rejects.toThrow();

      // Test validation - invalid email format
      await expect(
        server.executeTool('update_contact', {
          userId: 'user-789',
          contact: {
            phones: ['+15551234567'],
            emails: ['not-an-email'], // violates format: 'email'
          },
        })
      ).rejects.toThrow();

      // Test validation - phones array too large
      await expect(
        server.executeTool('update_contact', {
          userId: 'user-999',
          contact: {
            phones: Array(6)
              .fill(null)
              .map((_, i) => `+1555000${i.toString().padStart(4, '0')}`), // exceeds maxItems: 5
            emails: ['charlie@example.com'],
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Arrays of Arrays', () => {
    it('should validate nested arrays', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-array-of-arrays.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Inner array: numbers
interface NumberItemParam extends IParam {
  type: 'integer';
  description: 'A number';
  min: 0;
  max: 100;
}

interface NumberArrayParam extends IParam {
  type: 'array';
  description: 'Array of numbers';
  items: NumberItemParam;
  minItems: 1;
  maxItems: 5;
}

// Outer array: array of number arrays
interface MatrixParam extends IParam {
  type: 'array';
  description: 'Matrix (array of arrays)';
  items: NumberArrayParam;
  minItems: 1;
  maxItems: 3;
}

interface ProcessMatrixTool extends ITool {
  name: 'process_matrix';
  description: 'Process a numeric matrix';
  params: {
    matrix: MatrixParam;
  };
  result: { sum: number };
}

interface TestServer extends IServer {
  name: 'array-of-arrays-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  processMatrix: ProcessMatrixTool = async (params) => {
    const sum = params.matrix.flat().reduce((a, b) => a + b, 0);
    return { sum };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

      // Test valid nested arrays
      const result = await server.executeTool('process_matrix', {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      });
      expect(JSON.parse(result.content[0].text).sum).toBe(21);

      // Test validation - inner array value out of range
      await expect(
        server.executeTool('process_matrix', {
          matrix: [
            [1, 2, 101], // exceeds max: 100
          ],
        })
      ).rejects.toThrow();

      // Test validation - inner array too long
      await expect(
        server.executeTool('process_matrix', {
          matrix: [
            [1, 2, 3, 4, 5, 6], // exceeds maxItems: 5
          ],
        })
      ).rejects.toThrow();

      // Test validation - outer array too long
      await expect(
        server.executeTool('process_matrix', {
          matrix: [
            [1],
            [2],
            [3],
            [4], // exceeds maxItems: 3
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe('Mixed Nested Scenarios', () => {
    it('should handle complex mixed nesting: object -> array -> object', async () => {
      tempFile = path.join(__dirname, '../fixtures/temp-mixed-nesting.ts');
      writeFileSync(
        tempFile,
        `
import type { ITool, IParam, IServer } from '../../src/index.js';

// Level 3: Product details
interface ProductNameParam extends IParam {
  type: 'string';
  description: 'Product name';
  minLength: 1;
  maxLength: 100;
}

interface ProductPriceParam extends IParam {
  type: 'number';
  description: 'Product price';
  min: 0;
  exclusiveMin: 0;
}

interface ProductParam extends IParam {
  type: 'object';
  description: 'Product in order';
  properties: {
    name: ProductNameParam;
    price: ProductPriceParam;
  };
  requiredProperties: ['name', 'price'];
}

// Level 2: Array of products
interface ProductsParam extends IParam {
  type: 'array';
  description: 'Products in order';
  items: ProductParam;
  minItems: 1;
  maxItems: 50;
}

// Level 1: Order object containing array of objects
interface OrderParam extends IParam {
  type: 'object';
  description: 'Customer order';
  properties: {
    products: ProductsParam;
  };
  requiredProperties: ['products'];
}

interface CreateOrderTool extends ITool {
  name: 'create_order';
  description: 'Create new order';
  params: {
    customerId: string;
    order: OrderParam;
  };
  result: { orderId: string; total: number };
}

interface TestServer extends IServer {
  name: 'mixed-nesting-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  createOrder: CreateOrderTool = async (params) => {
    const total = params.order.products.reduce((sum, p) => sum + p.price, 0);
    return { orderId: 'order-123', total };
  };
}
`
      );

      server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

      // Test valid complex nesting
      const result = await server.executeTool('create_order', {
        customerId: 'cust-456',
        order: {
          products: [
            { name: 'Widget A', price: 19.99 },
            { name: 'Widget B', price: 29.99 },
          ],
        },
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.orderId).toBe('order-123');
      expect(data.total).toBeCloseTo(49.98);

      // Test validation - product price must be > 0 (exclusiveMin)
      await expect(
        server.executeTool('create_order', {
          customerId: 'cust-789',
          order: {
            products: [{ name: 'Free Item', price: 0 }], // violates exclusiveMin: 0
          },
        })
      ).rejects.toThrow();

      // Test validation - product name too long
      await expect(
        server.executeTool('create_order', {
          customerId: 'cust-999',
          order: {
            products: [{ name: 'x'.repeat(101), price: 9.99 }], // exceeds maxLength: 100
          },
        })
      ).rejects.toThrow();
    });
  });
});

describe('IParam - Error Detection for Inline Literals', () => {
  let tempFile: string;

  afterEach(() => {
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {}
    }
  });

  it('should reject inline object literal in array items', async () => {
    tempFile = path.join(__dirname, '../fixtures/temp-inline-array-error.ts');
    writeFileSync(
      tempFile,
      `
import type { ITool, IParam, IServer } from '../../src/index.js';

// ❌ BAD: Inline object literal in items
interface BadTagsParam extends IParam {
  type: 'array';
  description: 'Tags';
  items: { type: 'string'; description: 'A tag' };  // Inline literal
}

interface TestTool extends ITool {
  name: 'test';
  description: 'Test';
  params: {
    tags: BadTagsParam;
  };
  result: string;
}

interface TestServer extends IServer {
  name: 'inline-error-test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  test: TestTool = async (params) => 'ok';
}
`
    );

    await expect(
      loadInterfaceServer({ filePath: tempFile, verbose: false })
    ).rejects.toThrow(/inline object literal/i);
  });

  it('should reject inline object literal in object properties', async () => {
    tempFile = path.join(__dirname, '../fixtures/temp-inline-object-error.ts');
    writeFileSync(
      tempFile,
      `
import type { ITool, IParam, IServer } from '../../src/index.js';

// ❌ BAD: Inline object literal in properties
interface BadUserParam extends IParam {
  type: 'object';
  description: 'User';
  properties: {
    name: { type: 'string'; description: 'Name' };  // Inline literal
  };
}

interface TestTool extends ITool {
  name: 'test';
  description: 'Test';
  params: {
    user: BadUserParam;
  };
  result: string;
}

interface TestServer extends IServer {
  name: 'inline-error-test-2';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  test: TestTool = async (params) => 'ok';
}
`
    );

    await expect(
      loadInterfaceServer({ filePath: tempFile, verbose: false })
    ).rejects.toThrow(/inline object literal/i);
  });
});
