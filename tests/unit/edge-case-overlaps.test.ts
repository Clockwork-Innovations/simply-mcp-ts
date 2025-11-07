/**
 * Edge Case Tests: Name Overlaps and Collisions
 *
 * Tests various edge cases where names, methods, or URIs might overlap
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { matchResourceUri } from '../../src/server/uri-template-matcher.js';
import type { ResourceDefinition } from '../../src/server/builder-types.js';
import { registerPrompt } from '../../src/handlers/prompt-handler.js';
import type { ParsedPrompt } from '../../src/server/parser.js';

// Helper
function createResource(uri: string, content: string = 'test'): ResourceDefinition {
  return {
    uri,
    name: `Resource ${uri}`,
    description: `Test resource`,
    mimeType: 'text/plain',
    content,
  };
}

// Mock BuildMCPServer
const mockServer = {
  addPrompt: jest.fn(),
} as any;

describe('Edge Case: Overlapping URI Templates', () => {
  test('ISSUE: ambiguous templates - first registered wins (non-deterministic)', () => {
    // These two templates could both match "api://v1"
    // api://{resource} - would extract { resource: "v1" }
    // api://{version}/{endpoint} - would NOT match (different segment count)

    // But what about these:
    const resources = new Map<string, ResourceDefinition>([
      ['data://{type}', createResource('data://{type}', 'single param')],
      ['data://{category}', createResource('data://{category}', 'different param name')],
    ]);

    // Both templates have the same structure - which one matches?
    const result = matchResourceUri('data://test', resources);

    // Result depends on Map iteration order!
    expect(result).not.toBeNull();
    // This is non-deterministic - could be either "single param" or "different param name"
    console.log('WARNING: Overlapping templates - result is non-deterministic:', result?.resource.content);
  });

  test('specific template vs generic template - both match, first wins', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://{version}/users', createResource('api://{version}/users', 'users endpoint')],
      ['api://{version}/{endpoint}', createResource('api://{version}/{endpoint}', 'generic endpoint')],
    ]);

    // Both templates match "api://v1/users"
    // First template matches: api://{version}/users
    // - {version} = "v1"
    // - "users" is literal (not extracted as param)
    const result = matchResourceUri('api://v1/users', resources);

    expect(result).not.toBeNull();
    expect(result?.resource.content).toBe('users endpoint');
    expect(result?.params).toEqual({ version: 'v1' });
    // First template in Map wins - this is deterministic but depends on registration order
  });
});

describe('Edge Case: Method Name Collisions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('both camelCase and snake_case methods exist - should ERROR (ambiguous)', () => {
    const camelCaseMethod = jest.fn(() => ({ from: 'camelCase' }));
    const snakeCaseMethod = jest.fn(() => ({ from: 'snake_case' }));

    const serverInstance = {
      analyzeData: camelCaseMethod,
      analyze_data: snakeCaseMethod,
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Test',
      argsMetadata: {},
      argsType: 'any',
    };

    // Should throw error - ambiguous naming
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/ambiguous method names/);
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/analyzeData/);
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/analyze_data/);
  });

  test('SAFE: only snake_case exists - uses variation (no warning)', () => {
    const snakeCaseMethod = jest.fn(() => ({ result: 'ok' }));

    const serverInstance = {
      analyze_data: snakeCaseMethod,
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Test',
      argsMetadata: {},
      argsType: 'any',
    };

    // Should find snake_case variation - both conventions are valid
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    // Should work without warnings
    const registeredTemplate = mockServer.addPrompt.mock.calls[0][0].template;
    registeredTemplate({}, {});
    expect(snakeCaseMethod).toHaveBeenCalled();
  });
});

describe('Edge Case: Resource Registration Order', () => {
  test('exact + template: exact always wins regardless of registration order', () => {
    // Register template FIRST, then exact
    const resources1 = new Map<string, ResourceDefinition>([
      ['pokemon://{name}', createResource('pokemon://{name}', 'template')],
      ['pokemon://pikachu', createResource('pokemon://pikachu', 'exact')],
    ]);

    const result1 = matchResourceUri('pokemon://pikachu', resources1);
    expect(result1?.resource.content).toBe('exact');

    // Register exact FIRST, then template
    const resources2 = new Map<string, ResourceDefinition>([
      ['pokemon://pikachu', createResource('pokemon://pikachu', 'exact')],
      ['pokemon://{name}', createResource('pokemon://{name}', 'template')],
    ]);

    const result2 = matchResourceUri('pokemon://pikachu', resources2);
    expect(result2?.resource.content).toBe('exact');
  });
});

describe('Edge Case: Parameter Name Conflicts', () => {
  test('same template structure, different param names - first wins', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['user://{id}', createResource('user://{id}', 'id version')],
      ['user://{userId}', createResource('user://{userId}', 'userId version')],
    ]);

    const result = matchResourceUri('user://123', resources);

    // Both templates match - Map iteration order determines which one
    // This is a developer mistake but not an error
    expect(result).not.toBeNull();
    expect(result?.params.id || result?.params.userId).toBe('123');
  });
});
