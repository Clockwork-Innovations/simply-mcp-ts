#!/usr/bin/env tsx
/**
 * Unit Tests for Decorator Parameter Validation
 *
 * This test suite validates that decorators:
 * 1. Accept valid parameter forms (string or undefined)
 * 2. Reject invalid parameter forms (objects, numbers, etc.) with helpful error messages
 * 3. Provide clear guidance on correct usage
 *
 * Run with: npx tsx tests/unit/decorator-params.test.ts
 */

import { tool, prompt, resource, MCPServer } from '../../src/decorators.js';

// Simple test framework
let testsPassed = 0;
let testsFailed = 0;
const failedTests: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error: any) {
    testsFailed++;
    failedTests.push(name);
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toThrow(expectedError?: any) {
      let threw = false;
      let thrownError: any;
      try {
        if (typeof value === 'function') {
          value();
        }
      } catch (error) {
        threw = true;
        thrownError = error;
      }
      if (!threw) {
        throw new Error('Expected function to throw');
      }
      if (expectedError && !(thrownError instanceof expectedError)) {
        throw new Error(`Expected error to be instance of ${expectedError.name}, got ${thrownError.constructor.name}`);
      }
    },
    not: {
      toThrow() {
        try {
          if (typeof value === 'function') {
            value();
          }
        } catch (error: any) {
          throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
        }
      }
    },
    toContain(substring: string) {
      if (typeof value !== 'string' || !value.includes(substring)) {
        throw new Error(`Expected "${value}" to contain "${substring}"`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    }
  };
}

console.log('===========================================');
console.log('  Decorator Parameter Validation Tests');
console.log('===========================================\n');

// @tool decorator tests
console.log('Testing @tool decorator...');

test('should accept string description', () => {
  expect(() => {
    class TestClass {
      @tool('Test tool description')
      testMethod() {
        return 'test';
      }
    }
  }).not.toThrow();
});

test('should accept no description (undefined)', () => {
  expect(() => {
    class TestClass {
      @tool()
      testMethod() {
        return 'test';
      }
    }
  }).not.toThrow();
});

test('should throw TypeError for object description', () => {
  expect(() => {
    class TestClass {
      @tool({ description: 'Test' } as any)
      testMethod() {
        return 'test';
      }
    }
  }).toThrow(TypeError);
});

test('should provide helpful error message for object parameter', () => {
  try {
    class TestClass {
      @tool({ description: 'Test' } as any)
      testMethod() {
        return 'test';
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    expect(error.message).toContain('expects a string description');
    expect(error.message).toContain('got object');
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@tool('Description here')");
    expect(error.message).toContain('Object syntax not yet supported');
    expect(error.message).toContain('v3.0.0');
  }
});

test('should throw TypeError for number description', () => {
  expect(() => {
    class TestClass {
      @tool(123 as any)
      testMethod() {
        return 'test';
      }
    }
  }).toThrow(TypeError);
});

test('should throw TypeError for boolean description', () => {
  expect(() => {
    class TestClass {
      @tool(true as any)
      testMethod() {
        return 'test';
      }
    }
  }).toThrow(TypeError);
});

test('should throw TypeError for array description', () => {
  expect(() => {
    class TestClass {
      @tool(['test'] as any)
      testMethod() {
        return 'test';
      }
    }
  }).toThrow(TypeError);
});

test('should work with JSDoc comments when no description provided', () => {
  expect(() => {
    class TestClass {
      /**
       * This method has JSDoc
       */
      @tool()
      testMethod() {
        return 'test';
      }
    }
  }).not.toThrow();
});

// @prompt decorator tests
console.log('\nTesting @prompt decorator...');

test('should accept string description', () => {
  expect(() => {
    class TestClass {
      @prompt('Test prompt description')
      testMethod() {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: 'test' }
          }]
        };
      }
    }
  }).not.toThrow();
});

test('should accept no description (undefined)', () => {
  expect(() => {
    class TestClass {
      @prompt()
      testMethod() {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: 'test' }
          }]
        };
      }
    }
  }).not.toThrow();
});

test('should throw TypeError for object description', () => {
  expect(() => {
    class TestClass {
      @prompt({ description: 'Test' } as any)
      testMethod() {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: 'test' }
          }]
        };
      }
    }
  }).toThrow(TypeError);
});

test('should provide helpful error message for object parameter', () => {
  try {
    class TestClass {
      @prompt({ description: 'Test', name: 'test' } as any)
      testMethod() {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: 'test' }
          }]
        };
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    expect(error.message).toContain('expects a string description');
    expect(error.message).toContain('got object');
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@prompt('Description here')");
    expect(error.message).toContain('Object syntax not yet supported');
    expect(error.message).toContain('v3.0.0');
  }
});

test('should throw TypeError for number description', () => {
  expect(() => {
    class TestClass {
      @prompt(456 as any)
      testMethod() {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: 'test' }
          }]
        };
      }
    }
  }).toThrow(TypeError);
});

// @resource decorator tests
console.log('\nTesting @resource decorator...');

test('should accept uri string and options object', () => {
  expect(() => {
    class TestClass {
      @resource('test://uri', { mimeType: 'text/plain' })
      testMethod() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'text/plain',
            text: 'test'
          }]
        };
      }
    }
  }).not.toThrow();
});

test('should accept uri string without options', () => {
  expect(() => {
    class TestClass {
      @resource('test://uri')
      testMethod() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'text/plain',
            text: 'test'
          }]
        };
      }
    }
  }).not.toThrow();
});

test('should throw TypeError for non-string uri', () => {
  expect(() => {
    class TestClass {
      @resource({ uri: 'test://uri' } as any)
      testMethod() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'text/plain',
            text: 'test'
          }]
        };
      }
    }
  }).toThrow(TypeError);
});

test('should provide helpful error message for object as first parameter', () => {
  try {
    class TestClass {
      @resource({ uri: 'test://uri', name: 'Test' } as any)
      testMethod() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'text/plain',
            text: 'test'
          }]
        };
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    expect(error.message).toContain('expects a string URI');
    expect(error.message).toContain('got object');
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@resource('config://server')");
    expect(error.message).toContain('Missing required URI parameter');
  }
});

test('should throw TypeError for number as uri', () => {
  expect(() => {
    class TestClass {
      @resource(123 as any)
      testMethod() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'text/plain',
            text: 'test'
          }]
        };
      }
    }
  }).toThrow(TypeError);
});

test('should accept various mime types in options', () => {
  expect(() => {
    class TestClass {
      @resource('test://uri', { mimeType: 'application/json' })
      jsonResource() {
        return {
          contents: [{
            uri: 'test://uri',
            mimeType: 'application/json',
            text: '{}'
          }]
        };
      }

      @resource('test://uri2', { mimeType: 'text/markdown', name: 'README' })
      markdownResource() {
        return {
          contents: [{
            uri: 'test://uri2',
            mimeType: 'text/markdown',
            text: '# Title'
          }]
        };
      }
    }
  }).not.toThrow();
});

// Integration tests
console.log('\nTesting integration with @MCPServer...');

test('should work together with valid parameters', () => {
  expect(() => {
    @MCPServer({ name: 'test-server', version: '1.0.0' })
    class TestServer {
      @tool('Add two numbers')
      add(a: number, b: number) {
        return a + b;
      }

      @prompt('Generate greeting')
      greeting(name: string) {
        return {
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: `Hello ${name}` }
          }]
        };
      }

      @resource('config://server', { mimeType: 'application/json' })
      config() {
        return {
          contents: [{
            uri: 'config://server',
            mimeType: 'application/json',
            text: '{}'
          }]
        };
      }
    }
  }).not.toThrow();
});

test('should fail with invalid @tool parameter even when @MCPServer is valid', () => {
  expect(() => {
    @MCPServer({ name: 'test-server', version: '1.0.0' })
    class TestServer {
      @tool({ description: 'Add two numbers' } as any)
      add(a: number, b: number) {
        return a + b;
      }
    }
  }).toThrow(TypeError);
});

// Error message quality tests
console.log('\nTesting error message quality...');

test('should include actionable guidance in @tool error', () => {
  try {
    class TestClass {
      @tool({ description: 'Test' } as any)
      testMethod() {
        return 'test';
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    // Error should be multi-line and informative
    const lines = error.message.split('\n');
    expect(lines.length).toBeGreaterThan(5);

    // Should explain what's wrong
    expect(error.message).toContain('expects a string description');

    // Should show what was received
    expect(error.message).toContain('got object');

    // Should show correct usage
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@tool('Description here')");
    expect(error.message).toContain('@tool()');

    // Should explain future plans
    expect(error.message).toContain('v3.0.0');
  }
});

test('should include actionable guidance in @prompt error', () => {
  try {
    class TestClass {
      @prompt({ description: 'Test' } as any)
      testMethod() {
        return 'test';
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@prompt('Description here')");
    expect(error.message).toContain('v3.0.0');
  }
});

test('should include actionable guidance in @resource error', () => {
  try {
    class TestClass {
      @resource({ uri: 'test://uri' } as any)
      testMethod() {
        return 'test';
      }
    }
    throw new Error('Should have thrown');
  } catch (error: any) {
    expect(error.message).toContain('Correct usage');
    expect(error.message).toContain("@resource('config://server')");
    expect(error.message).toContain('Missing required URI parameter');
  }
});

// Print summary
console.log('\n===========================================');
console.log('  Test Summary');
console.log('===========================================');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  console.log('\nFailed tests:');
  failedTests.forEach(test => console.log(`  - ${test}`));
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
