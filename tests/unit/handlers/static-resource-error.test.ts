/**
 * Red→Green Test: Static Resource Error Messages
 *
 * Tests that the static resource error message provides helpful guidance
 * when a static resource is missing literal data.
 *
 * This addresses beta tester feedback (Issue #1) about confusing error messages
 * when users try to reference variables in static resources.
 */

import { describe, expect, test, jest } from '@jest/globals';
import { registerStaticResource } from '../../../src/handlers/resource-handler.js';
import type { ParsedResource } from '../../../src/server/parser.js';

describe('Static Resource Error Messages', () => {
  // Mock BuildMCPServer
  const mockServer = {
    addResource: jest.fn(),
  } as any;

  test('RED: should throw error with helpful message when static resource has no literal data', () => {
    // Simulate a parsed resource that has no literal data (data === undefined)
    const resource: ParsedResource = {
      uri: 'config://app',
      name: 'App Config',
      description: 'Application configuration',
      mimeType: 'application/json',
      interfaceName: 'ConfigResource',
      methodName: 'config',
      dynamic: false,
      dataType: 'unknown',
      data: undefined, // ← This will trigger the error
    };

    // Should throw error with helpful message
    expect(() => {
      registerStaticResource(mockServer, resource);
    }).toThrow(/Static resource "config:\/\/app" is missing literal data/);

    // Capture the full error to verify helpful content
    try {
      registerStaticResource(mockServer, resource);
      fail('Expected error to be thrown');
    } catch (error) {
      const errorMessage = (error as Error).message;

      // RED→GREEN: Verify improved error message contains helpful guidance

      // 1. Explains compile-time vs runtime distinction
      expect(errorMessage).toContain('compile-time literal data');
      expect(errorMessage).toContain('cannot reference variables');

      // 2. Provides solutions
      expect(errorMessage).toContain('Solutions:');

      // 3. Shows inline literal data example
      expect(errorMessage).toContain('Use inline literal data');
      expect(errorMessage).toContain('value:');
      expect(errorMessage).toContain('Literal values only');

      // 4. Shows dynamic resource alternative (RECOMMENDED)
      expect(errorMessage).toContain('Use a dynamic resource instead');
      expect(errorMessage).toContain('RECOMMENDED');
      expect(errorMessage).toContain('returns:');
      expect(errorMessage).toContain('ResourceHelper');

      // 5. Includes specific resource details
      expect(errorMessage).toContain('config://app');
      expect(errorMessage).toContain('ConfigResource');
      expect(errorMessage).toContain('config');

      // 6. Provides actionable hint
      expect(errorMessage).toContain('Hint:');
      expect(errorMessage).toContain("use 'returns' instead of 'value'");
    }
  });

  test('GREEN: static resource with literal data works correctly', () => {
    // Resource with literal data should work
    const resource: ParsedResource = {
      uri: 'config://app',
      name: 'App Config',
      description: 'Application configuration',
      mimeType: 'application/json',
      interfaceName: 'ConfigResource',
      methodName: 'config',
      dynamic: false,
      dataType: '{ version: string; env: string }',
      data: { version: '1.0.0', env: 'production' }, // ← Has literal data
    };

    // Should not throw
    expect(() => {
      registerStaticResource(mockServer, resource);
    }).not.toThrow();

    // Should register with server
    expect(mockServer.addResource).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'config://app',
        name: 'App Config',
        description: 'Application configuration',
        mimeType: 'application/json',
        content: expect.stringContaining('"version": "1.0.0"'),
      })
    );
  });

  test('error message adapts to missing interface/method names', () => {
    // Resource with undefined interface and method names
    const resource: ParsedResource = {
      uri: 'test://resource',
      name: 'Test Resource',
      description: 'Test resource description',
      mimeType: 'application/json',
      dynamic: false,
      dataType: 'unknown',
      data: undefined,
      interfaceName: undefined,
      methodName: undefined,
    };

    try {
      registerStaticResource(mockServer, resource);
      fail('Expected error to be thrown');
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Should use fallback names
      expect(errorMessage).toContain('MyResource'); // Default interface name
      expect(errorMessage).toContain('myResource'); // Default method name
    }
  });
});
