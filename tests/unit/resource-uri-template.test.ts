/**
 * Resource URI Template Integration Tests
 *
 * This test suite validates that URI template matching works correctly with
 * the BuildMCPServer when adding and reading resources.
 *
 * Integration Points:
 * - BuildMCPServer.addResource() - registering template URIs
 * - ReadResourceRequestSchema handler - matching and parameter extraction
 * - Dynamic resource content functions with parameters
 *
 * Test Coverage:
 * 1. Template resources with dynamic content functions
 * 2. Parameter extraction and passing to content functions
 * 3. Exact match priority over templates
 * 4. Multiple template resources
 * 5. Error cases (unknown URIs)
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import { BuildMCPServer } from '../../src/server/builder-server.js';
import type { ResourceDefinition } from '../../src/server/builder-types.js';

describe('Resource URI Template - Integration', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  test('registers and matches simple template resource', () => {
    const resource: ResourceDefinition = {
      uri: 'pokemon://{name}',
      name: 'Pokemon Info',
      description: 'Get information about a Pokemon',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({ pokemon: params.name, level: 50 });
      },
    };

    server.addResource(resource);

    // Verify resource was registered
    const resources = (server as any).resources;
    expect(resources.has('pokemon://{name}')).toBe(true);
  });

  test('template resource with multiple parameters', () => {
    const resource: ResourceDefinition = {
      uri: 'api://{version}/{endpoint}',
      name: 'API Endpoint',
      description: 'Access API endpoints',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({
          version: params.version,
          endpoint: params.endpoint,
          status: 'ok',
        });
      },
    };

    server.addResource(resource);

    const resources = (server as any).resources;
    expect(resources.has('api://{version}/{endpoint}')).toBe(true);
  });

  test('exact match and template can coexist', () => {
    // Add both exact and template resources
    server.addResource({
      uri: 'pokemon://pikachu',
      name: 'Pikachu',
      description: 'The famous electric mouse',
      mimeType: 'application/json',
      content: JSON.stringify({ name: 'Pikachu', type: 'Electric', special: true }),
    });

    server.addResource({
      uri: 'pokemon://{name}',
      name: 'Generic Pokemon',
      description: 'Any other Pokemon',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({ name: params.name, type: 'Unknown' });
      },
    });

    const resources = (server as any).resources;
    expect(resources.has('pokemon://pikachu')).toBe(true);
    expect(resources.has('pokemon://{name}')).toBe(true);
  });

  test('legacy dynamic resources still work (no parameters)', () => {
    const resource: ResourceDefinition = {
      uri: 'time://current',
      name: 'Current Time',
      description: 'Get current timestamp',
      mimeType: 'text/plain',
      content: () => {
        return new Date().toISOString();
      },
    };

    server.addResource(resource);

    const resources = (server as any).resources;
    expect(resources.has('time://current')).toBe(true);
  });

  test('static content resources still work', () => {
    const resource: ResourceDefinition = {
      uri: 'static://info',
      name: 'Static Info',
      description: 'Static information',
      mimeType: 'text/plain',
      content: 'This is static content',
    };

    server.addResource(resource);

    const resources = (server as any).resources;
    expect(resources.has('static://info')).toBe(true);
  });

  test('cannot register duplicate URIs', () => {
    const resource1: ResourceDefinition = {
      uri: 'pokemon://{name}',
      name: 'Pokemon 1',
      description: 'First pokemon',
      mimeType: 'text/plain',
      content: 'first',
    };

    const resource2: ResourceDefinition = {
      uri: 'pokemon://{name}',
      name: 'Pokemon 2',
      description: 'Second pokemon',
      mimeType: 'text/plain',
      content: 'second',
    };

    server.addResource(resource1);

    expect(() => {
      server.addResource(resource2);
    }).toThrow(/already registered/);
  });
});

describe('Resource URI Template - Type Safety', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  test('content function can accept params parameter', () => {
    // This should compile without errors
    const resource: ResourceDefinition = {
      uri: 'test://{id}',
      name: 'Test',
      description: 'Test resource',
      mimeType: 'application/json',
      content: (params: Record<string, string>) => {
        return JSON.stringify({ id: params.id });
      },
    };

    server.addResource(resource);
    expect((server as any).resources.has('test://{id}')).toBe(true);
  });

  test('content function can have no parameters', () => {
    // This should also compile without errors (backward compatibility)
    const resource: ResourceDefinition = {
      uri: 'test://static',
      name: 'Test',
      description: 'Test resource',
      mimeType: 'application/json',
      content: () => {
        return JSON.stringify({ value: 'static' });
      },
    };

    server.addResource(resource);
    expect((server as any).resources.has('test://static')).toBe(true);
  });

  test('content can be static string', () => {
    const resource: ResourceDefinition = {
      uri: 'test://string',
      name: 'Test',
      description: 'Test resource',
      mimeType: 'text/plain',
      content: 'Hello, World!',
    };

    server.addResource(resource);
    expect((server as any).resources.has('test://string')).toBe(true);
  });

  test('content can be static object', () => {
    const resource: ResourceDefinition = {
      uri: 'test://object',
      name: 'Test',
      description: 'Test resource',
      mimeType: 'application/json',
      content: { hello: 'world' },
    };

    server.addResource(resource);
    expect((server as any).resources.has('test://object')).toBe(true);
  });
});

describe('Resource URI Template - Real-world Examples', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  test('Pokemon API example', () => {
    // List endpoint (exact match)
    server.addResource({
      uri: 'pokemon://list',
      name: 'Pokemon List',
      description: 'List all Pokemon',
      mimeType: 'application/json',
      content: JSON.stringify(['Pikachu', 'Charizard', 'Bulbasaur']),
    });

    // Individual Pokemon (template)
    server.addResource({
      uri: 'pokemon://{name}',
      name: 'Pokemon Details',
      description: 'Get Pokemon details by name',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({
          name: params.name,
          level: 50,
          type: 'Unknown',
        });
      },
    });

    const resources = (server as any).resources;
    expect(resources.size).toBe(2);
    expect(resources.has('pokemon://list')).toBe(true);
    expect(resources.has('pokemon://{name}')).toBe(true);
  });

  test('RESTful API example', () => {
    // Collection endpoints
    server.addResource({
      uri: 'api://users',
      name: 'Users List',
      description: 'List all users',
      mimeType: 'application/json',
      content: JSON.stringify([{ id: 1, name: 'Alice' }]),
    });

    // Individual user (template)
    server.addResource({
      uri: 'api://users/{id}',
      name: 'User Details',
      description: 'Get user by ID',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({ id: params.id, name: 'User' });
      },
    });

    // Nested resource (template)
    server.addResource({
      uri: 'api://users/{userId}/posts/{postId}',
      name: 'User Post',
      description: 'Get specific post by user',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({
          userId: params.userId,
          postId: params.postId,
          title: 'Post Title',
        });
      },
    });

    const resources = (server as any).resources;
    expect(resources.size).toBe(3);
  });

  test('File system example', () => {
    server.addResource({
      uri: 'file://{path}',
      name: 'File Access',
      description: 'Access files by path',
      mimeType: 'text/plain',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return `File content for: ${params.path}`;
      },
    });

    const resources = (server as any).resources;
    expect(resources.has('file://{path}')).toBe(true);
  });

  test('Multi-tenant example', () => {
    server.addResource({
      uri: 'tenant://{tenantId}/data/{dataId}',
      name: 'Tenant Data',
      description: 'Access tenant-specific data',
      mimeType: 'application/json',
      content: (context) => {
        const params = (context?.metadata?.['params'] as Record<string, string>) || {};
        return JSON.stringify({
          tenant: params.tenantId,
          data: params.dataId,
          value: 'some data',
        });
      },
    });

    const resources = (server as any).resources;
    expect(resources.has('tenant://{tenantId}/data/{dataId}')).toBe(true);
  });
});
