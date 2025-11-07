/**
 * URI Template Matcher Tests
 *
 * This test suite validates the URI template matching functionality that enables
 * resources to be registered with parameterized URIs (e.g., "pokemon://{name}")
 * and matched against actual request URIs (e.g., "pokemon://pikachu").
 *
 * Matcher Logic (src/server/uri-template-matcher.ts):
 * - Tries exact match first (highest priority)
 * - Falls back to template matching with parameter extraction
 * - Supports multiple parameters (e.g., "api://{version}/{endpoint}")
 * - Returns null if no match found
 *
 * Test Coverage:
 * 1. Exact match priority (exact match wins over template)
 * 2. Simple template matching (single parameter)
 * 3. Multiple parameter templates
 * 4. Complex URI patterns
 * 5. No match cases
 * 6. Edge cases (empty params, special characters)
 */

import { describe, expect, test } from '@jest/globals';
import { matchResourceUri } from '../../src/server/uri-template-matcher.js';
import type { ResourceDefinition } from '../../src/server/builder-types.js';

// Helper function to create a basic resource definition
function createResource(uri: string, content: string = 'test'): ResourceDefinition {
  return {
    uri,
    name: `Resource ${uri}`,
    description: `Test resource for ${uri}`,
    mimeType: 'text/plain',
    content,
  };
}

// =============================================================================
// TEST SUITE 1: Exact Match Priority
// =============================================================================

describe('URI Template Matcher - Exact match priority', () => {
  test('exact match takes precedence over template match', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://pikachu', createResource('pokemon://pikachu', 'exact match')],
      ['pokemon://{name}', createResource('pokemon://{name}', 'template match')],
    ]);

    const result = matchResourceUri('pokemon://pikachu', resources);

    expect(result).not.toBeNull();
    expect(result?.resource.content).toBe('exact match');
    expect(result?.params).toEqual({});
  });

  test('exact match with no templates', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://pikachu', createResource('pokemon://pikachu')],
      ['pokemon://charizard', createResource('pokemon://charizard')],
    ]);

    const result = matchResourceUri('pokemon://pikachu', resources);

    expect(result).not.toBeNull();
    expect(result?.resource.uri).toBe('pokemon://pikachu');
    expect(result?.params).toEqual({});
  });
});

// =============================================================================
// TEST SUITE 2: Simple Template Matching
// =============================================================================

describe('URI Template Matcher - Simple templates', () => {
  test('matches single parameter template', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://{name}', createResource('pokemon://{name}')],
    ]);

    const result = matchResourceUri('pokemon://charizard', resources);

    expect(result).not.toBeNull();
    expect(result?.resource.uri).toBe('pokemon://{name}');
    expect(result?.params).toEqual({ name: 'charizard' });
  });

  test('extracts parameter with different values', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['user://{id}', createResource('user://{id}')],
    ]);

    const result1 = matchResourceUri('user://123', resources);
    expect(result1?.params).toEqual({ id: '123' });

    const result2 = matchResourceUri('user://abc-def', resources);
    expect(result2?.params).toEqual({ id: 'abc-def' });

    const result3 = matchResourceUri('user://user@example.com', resources);
    expect(result3?.params).toEqual({ id: 'user@example.com' });
  });

  test('template with alphanumeric parameter names', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['data://{param1}', createResource('data://{param1}')],
      ['info://{item_id}', createResource('info://{item_id}')],
      ['api://{version2}', createResource('api://{version2}')],
    ]);

    expect(matchResourceUri('data://value', resources)?.params).toEqual({ param1: 'value' });
    expect(matchResourceUri('info://42', resources)?.params).toEqual({ item_id: '42' });
    expect(matchResourceUri('api://v2', resources)?.params).toEqual({ version2: 'v2' });
  });
});

// =============================================================================
// TEST SUITE 3: Multiple Parameter Templates
// =============================================================================

describe('URI Template Matcher - Multiple parameters', () => {
  test('matches template with two parameters', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://{version}/{endpoint}', createResource('api://{version}/{endpoint}')],
    ]);

    const result = matchResourceUri('api://v1/users', resources);

    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ version: 'v1', endpoint: 'users' });
  });

  test('matches template with three parameters', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['data://{tenant}/{category}/{item}', createResource('data://{tenant}/{category}/{item}')],
    ]);

    const result = matchResourceUri('data://acme/products/widget-123', resources);

    expect(result).not.toBeNull();
    expect(result?.params).toEqual({
      tenant: 'acme',
      category: 'products',
      item: 'widget-123',
    });
  });

  test('template with mixed literal and parameter segments', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://v1/{resource}/{id}', createResource('api://v1/{resource}/{id}')],
    ]);

    const result = matchResourceUri('api://v1/users/42', resources);

    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ resource: 'users', id: '42' });
  });

  test('does not match if literal segment differs', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://v1/{resource}/{id}', createResource('api://v1/{resource}/{id}')],
    ]);

    // v2 does not match v1
    const result = matchResourceUri('api://v2/users/42', resources);
    expect(result).toBeNull();
  });
});

// =============================================================================
// TEST SUITE 4: Complex URI Patterns
// =============================================================================

describe('URI Template Matcher - Complex patterns', () => {
  test('multiple templates with different structures', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://{name}', createResource('pokemon://{name}', 'pokemon')],
      ['api://{version}/{endpoint}', createResource('api://{version}/{endpoint}', 'api')],
      ['data://static/info', createResource('data://static/info', 'static')],
    ]);

    const result1 = matchResourceUri('pokemon://pikachu', resources);
    expect(result1?.resource.content).toBe('pokemon');
    expect(result1?.params).toEqual({ name: 'pikachu' });

    const result2 = matchResourceUri('api://v1/users', resources);
    expect(result2?.resource.content).toBe('api');
    expect(result2?.params).toEqual({ version: 'v1', endpoint: 'users' });

    const result3 = matchResourceUri('data://static/info', resources);
    expect(result3?.resource.content).toBe('static');
    expect(result3?.params).toEqual({});
  });

  test('URIs without :// delimiter', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['file/{path}', createResource('file/{path}')],
    ]);

    const result = matchResourceUri('file/readme.txt', resources);

    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ path: 'readme.txt' });
  });
});

// =============================================================================
// TEST SUITE 5: No Match Cases
// =============================================================================

describe('URI Template Matcher - No match cases', () => {
  test('returns null when no resources registered', () => {
    const resources = new Map<string, ResourceDefinition>();
    const result = matchResourceUri('pokemon://pikachu', resources);
    expect(result).toBeNull();
  });

  test('returns null when URI does not match any template', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://{name}', createResource('pokemon://{name}')],
    ]);

    const result = matchResourceUri('user://123', resources);
    expect(result).toBeNull();
  });

  test('returns null when segment count differs', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://{version}/{endpoint}', createResource('api://{version}/{endpoint}')],
    ]);

    // Too few segments
    const result1 = matchResourceUri('api://v1', resources);
    expect(result1).toBeNull();

    // Too many segments
    const result2 = matchResourceUri('api://v1/users/extra', resources);
    expect(result2).toBeNull();
  });
});

// =============================================================================
// TEST SUITE 6: Edge Cases
// =============================================================================

describe('URI Template Matcher - Edge cases', () => {
  test('handles consecutive slashes (empty segments are filtered)', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['data://{value}/info', createResource('data://{value}/info')],
    ]);

    // Empty segments between slashes are filtered out, so this won't match
    // a three-segment template (the implementation filters empty strings)
    const result = matchResourceUri('data:///info', resources);
    // This should not match because after filtering empty segments,
    // we have fewer segments than the template expects
    expect(result).toBeNull();
  });

  test('handles special characters in parameter values', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['item://{id}', createResource('item://{id}')],
    ]);

    const result = matchResourceUri('item://abc-123_xyz', resources);
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ id: 'abc-123_xyz' });
  });

  test('parameter names are case-sensitive', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['data://{Name}', createResource('data://{Name}')],
    ]);

    const result = matchResourceUri('data://value', resources);
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ Name: 'value' });
  });

  test('handles URL-encoded characters in values', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['search://{query}', createResource('search://{query}')],
    ]);

    const result = matchResourceUri('search://hello%20world', resources);
    expect(result).not.toBeNull();
    expect(result?.params).toEqual({ query: 'hello%20world' });
  });
});

// =============================================================================
// TEST SUITE 7: Integration Scenarios
// =============================================================================

describe('URI Template Matcher - Integration scenarios', () => {
  test('real-world Pokemon example', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['pokemon://list', createResource('pokemon://list', 'all pokemon')],
      ['pokemon://{name}', createResource('pokemon://{name}', 'specific pokemon')],
    ]);

    // Exact match for list
    const listResult = matchResourceUri('pokemon://list', resources);
    expect(listResult?.resource.content).toBe('all pokemon');
    expect(listResult?.params).toEqual({});

    // Template match for specific pokemon
    const pikachuResult = matchResourceUri('pokemon://pikachu', resources);
    expect(pikachuResult?.resource.content).toBe('specific pokemon');
    expect(pikachuResult?.params).toEqual({ name: 'pikachu' });
  });

  test('RESTful API pattern', () => {
    const resources = new Map<string, ResourceDefinition>([
      ['api://users', createResource('api://users', 'user list')],
      ['api://users/{id}', createResource('api://users/{id}', 'user detail')],
      ['api://users/{userId}/posts/{postId}', createResource('api://users/{userId}/posts/{postId}', 'user post')],
    ]);

    const usersResult = matchResourceUri('api://users', resources);
    expect(usersResult?.resource.content).toBe('user list');

    const userResult = matchResourceUri('api://users/123', resources);
    expect(userResult?.resource.content).toBe('user detail');
    expect(userResult?.params).toEqual({ id: '123' });

    const postResult = matchResourceUri('api://users/123/posts/456', resources);
    expect(postResult?.resource.content).toBe('user post');
    expect(postResult?.params).toEqual({ userId: '123', postId: '456' });
  });
});
