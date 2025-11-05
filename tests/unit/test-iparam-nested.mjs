/**
 * Executable Test for Nested IParam Validation
 *
 * Run with: node test-iparam-nested.mjs
 *
 * Tests comprehensive nested object and array validation with IParam.
 */

import { writeFileSync, unlinkSync } from 'fs';
import { loadInterfaceServer } from './dist/src/api/interface/index.js';

// Test counters
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function expectToThrow(fn) {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (error.message === 'Expected function to throw, but it did not') {
      throw error;
    }
    // Expected error, test passes
  }
}

console.log('\\n' + '='.repeat(80));
console.log('IPARAM NESTED VALIDATION TEST SUITE');
console.log('='.repeat(80) + '\\n');

// Test 1: Nested Objects - 2 Levels Deep
await test('Nested objects (2 levels) - valid data', async () => {
  const tempFile = '/tmp/test-nested-2-levels.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
  maxLength: 200;
}

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
  minLength: 1;
  maxLength: 100;
}

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

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });
  const result = await server.executeTool('create_user', {
    name: 'Alice',
    address: {
      street: '123 Main St',
      city: 'New York',
    },
  });

  const data = JSON.parse(result.content[0].text);
  if (data.userId !== 'user-123') {
    throw new Error('Unexpected result');
  }

  await server.stop();
  unlinkSync(tempFile);
});

await test('Nested objects (2 levels) - validation error on nested field', async () => {
  const tempFile = '/tmp/test-nested-validation.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

interface StreetParam extends IParam {
  type: 'string';
  description: 'Street address';
  minLength: 1;
}

interface CityParam extends IParam {
  type: 'string';
  description: 'City name';
  minLength: 1;
}

interface AddressParam extends IParam {
  type: 'object';
  description: 'Address';
  properties: {
    street: StreetParam;
    city: CityParam;
  };
  requiredProperties: ['street', 'city'];
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user';
  params: {
    name: string;
    address: AddressParam;
  };
  result: { userId: string };
}

interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  createUser: CreateUserTool = async (params) => {
    return { userId: 'user-123' };
  };
}
`
  );

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  await expectToThrow(async () => {
    await server.executeTool('create_user', {
      name: 'Bob',
      address: {
        street: '', // violates minLength: 1
        city: 'Boston',
      },
    });
  });

  await server.stop();
  unlinkSync(tempFile);
});

// Test 2: Nested Objects - 3 Levels Deep
await test('Nested objects (3 levels) - deeply nested validation', async () => {
  const tempFile = '/tmp/test-nested-3-levels.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

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

interface StreetParam extends IParam {
  type: 'string';
  description: 'Street';
  minLength: 1;
}

interface AddressParam extends IParam {
  type: 'object';
  description: 'Address with GPS';
  properties: {
    street: StreetParam;
    coordinates: CoordinatesParam;
  };
  requiredProperties: ['street', 'coordinates'];
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user';
  params: {
    name: string;
    address: AddressParam;
  };
  result: { userId: string };
}

interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  createUser: CreateUserTool = async (params) => {
    return { userId: 'user-456' };
  };
}
`
  );

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  // Valid 3-level nesting
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

  const data = JSON.parse(result.content[0].text);
  if (data.userId !== 'user-456') {
    throw new Error('Unexpected result');
  }

  // Invalid: lat out of range
  await expectToThrow(async () => {
    await server.executeTool('create_user', {
      name: 'Bob',
      address: {
        street: '456 Elm St',
        coordinates: {
          lat: 100, // exceeds max: 90
          lon: -74.006,
        },
      },
    });
  });

  await server.stop();
  unlinkSync(tempFile);
});

// Test 3: Arrays of Objects
await test('Arrays of objects - validation on array items', async () => {
  const tempFile = '/tmp/test-array-of-objects.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

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
  description: 'Tag with metadata';
  properties: {
    name: TagNameParam;
    color: TagColorParam;
  };
  requiredProperties: ['name', 'color'];
}

interface TagsParam extends IParam {
  type: 'array';
  description: 'List of tags';
  items: TagItemParam;
  minItems: 1;
  maxItems: 10;
}

interface TagUserTool extends ITool {
  name: 'tag_user';
  description: 'Add tags';
  params: {
    userId: string;
    tags: TagsParam;
  };
  result: { success: boolean };
}

interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  tagUser: TagUserTool = async (params) => {
    return { success: true };
  };
}
`
  );

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  // Valid array of objects
  const result = await server.executeTool('tag_user', {
    userId: 'user-123',
    tags: [
      { name: 'developer', color: '#FF5733' },
      { name: 'designer', color: '#33FF57' },
    ],
  });

  const data = JSON.parse(result.content[0].text);
  if (data.success !== true) {
    throw new Error('Expected success: true');
  }

  // Invalid: hex color pattern violation
  await expectToThrow(async () => {
    await server.executeTool('tag_user', {
      userId: 'user-456',
      tags: [{ name: 'admin', color: 'red' }], // invalid pattern
    });
  });

  // Invalid: tag name too long
  await expectToThrow(async () => {
    await server.executeTool('tag_user', {
      userId: 'user-789',
      tags: [{ name: 'a'.repeat(51), color: '#ABCDEF' }], // exceeds maxLength: 50
    });
  });

  await server.stop();
  unlinkSync(tempFile);
});

// Test 4: Objects Containing Arrays
await test('Objects containing arrays - nested array validation', async () => {
  const tempFile = '/tmp/test-object-with-arrays.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

interface PhoneItemParam extends IParam {
  type: 'string';
  description: 'Phone number';
  pattern: '^\\\\+?[0-9]{10,15}$';
}

interface PhonesParam extends IParam {
  type: 'array';
  description: 'Phone numbers';
  items: PhoneItemParam;
  minItems: 1;
  maxItems: 5;
}

interface EmailItemParam extends IParam {
  type: 'string';
  description: 'Email';
  format: 'email';
}

interface EmailsParam extends IParam {
  type: 'array';
  description: 'Emails';
  items: EmailItemParam;
  minItems: 1;
}

interface ContactInfoParam extends IParam {
  type: 'object';
  description: 'Contact info';
  properties: {
    phones: PhonesParam;
    emails: EmailsParam;
  };
  requiredProperties: ['phones', 'emails'];
}

interface UpdateContactTool extends ITool {
  name: 'update_contact';
  description: 'Update contact';
  params: {
    userId: string;
    contact: ContactInfoParam;
  };
  result: { updated: boolean };
}

interface TestServer extends IServer {
  name: 'test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  updateContact: UpdateContactTool = async (params) => {
    return { updated: true };
  };
}
`
  );

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  // Valid object with arrays
  const result = await server.executeTool('update_contact', {
    userId: 'user-123',
    contact: {
      phones: ['+15551234567', '+15559876543'],
      emails: ['alice@example.com', 'alice.work@example.com'],
    },
  });

  const data = JSON.parse(result.content[0].text);
  if (data.updated !== true) {
    throw new Error('Expected updated: true');
  }

  // Invalid: phone pattern
  await expectToThrow(async () => {
    await server.executeTool('update_contact', {
      userId: 'user-456',
      contact: {
        phones: ['invalid-phone'],
        emails: ['bob@example.com'],
      },
    });
  });

  // Invalid: email format
  await expectToThrow(async () => {
    await server.executeTool('update_contact', {
      userId: 'user-789',
      contact: {
        phones: ['+15551234567'],
        emails: ['not-an-email'],
      },
    });
  });

  await server.stop();
  unlinkSync(tempFile);
});

// Test 5: Arrays of Arrays
await test('Arrays of arrays - nested array validation', async () => {
  const tempFile = '/tmp/test-array-of-arrays.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

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

interface MatrixParam extends IParam {
  type: 'array';
  description: 'Matrix';
  items: NumberArrayParam;
  minItems: 1;
  maxItems: 3;
}

interface ProcessMatrixTool extends ITool {
  name: 'process_matrix';
  description: 'Process matrix';
  params: {
    matrix: MatrixParam;
  };
  result: { sum: number };
}

interface TestServer extends IServer {
  name: 'test';
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

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  // Valid nested arrays
  const result = await server.executeTool('process_matrix', {
    matrix: [
      [1, 2, 3],
      [4, 5, 6],
    ],
  });

  const data = JSON.parse(result.content[0].text);
  if (data.sum !== 21) {
    throw new Error(`Expected sum: 21, got: ${data.sum}`);
  }

  // Invalid: inner value out of range
  await expectToThrow(async () => {
    await server.executeTool('process_matrix', {
      matrix: [[1, 2, 101]], // exceeds max: 100
    });
  });

  // Invalid: inner array too long
  await expectToThrow(async () => {
    await server.executeTool('process_matrix', {
      matrix: [[1, 2, 3, 4, 5, 6]], // exceeds maxItems: 5
    });
  });

  await server.stop();
  unlinkSync(tempFile);
});

// Test 6: Error Detection for Inline Literals
await test('Error detection - inline array items logs warning', async () => {
  const tempFile = '/tmp/test-inline-error.ts';
  writeFileSync(
    tempFile,
    `
import type { ITool, IParam, IServer } from './dist/src/index.js';

interface BadTagsParam extends IParam {
  type: 'array';
  description: 'Tags';
  items: { type: 'string'; description: 'A tag' };
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
  name: 'test';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {
  test: TestTool = async (params) => 'ok';
}
`
  );

  // Capture console.warn output
  const originalWarn = console.warn;
  let warnMessage = '';
  console.warn = (msg) => { warnMessage += msg; };

  const server = await loadInterfaceServer({ filePath: tempFile, verbose: false });

  console.warn = originalWarn;

  // Check that warning was logged
  if (!warnMessage.includes('inline object literal')) {
    throw new Error('Expected warning about inline object literal');
  }

  await server.stop();
  unlinkSync(tempFile);
});

console.log('\\n' + '='.repeat(80));
console.log('TEST RESULTS');
console.log('='.repeat(80));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\\n' + '='.repeat(80));
  console.log('FAILURES');
  console.log('='.repeat(80));
  failures.forEach(({ name, error }) => {
    console.log(`\\n❌ ${name}`);
    console.log(`   ${error}`);
  });
  process.exit(1);
} else {
  console.log('\\n🎉 ALL TESTS PASSED!\\n');
  process.exit(0);
}
