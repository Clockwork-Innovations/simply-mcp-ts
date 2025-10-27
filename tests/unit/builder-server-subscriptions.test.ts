/**
 * Unit Tests for BuildMCPServer Subscription Helper Methods
 *
 * Tests the subscription-related helper methods added for UI hot reload:
 * - getResource(uri: string)
 * - isResourceSubscribable(uri: string)
 * - getSubscribableResources()
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BuildMCPServer } from '../../src/server/builder-server.js';

describe('BuildMCPServer Subscription Methods', () => {
  let server: BuildMCPServer;

  beforeEach(() => {
    // Create fresh server instance for each test
    server = new BuildMCPServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  describe('getResource', () => {
    it('should return resource when URI exists', () => {
      // Add a test resource
      server.addResource({
        uri: 'test://resource1',
        name: 'Test Resource 1',
        description: 'A test resource',
        mimeType: 'text/plain',
        content: 'Hello World',
      });

      const resource = server.getResource('test://resource1');

      expect(resource).toBeDefined();
      expect(resource?.uri).toBe('test://resource1');
      expect(resource?.name).toBe('Test Resource 1');
      expect(resource?.description).toBe('A test resource');
      expect(resource?.mimeType).toBe('text/plain');
      expect(resource?.content).toBe('Hello World');
    });

    it('should return undefined when URI does not exist', () => {
      const resource = server.getResource('test://nonexistent');

      expect(resource).toBeUndefined();
    });

    it('should return correct ResourceDefinition structure with subscribable field', () => {
      // Add resource with subscribable: true
      server.addResource({
        uri: 'test://subscribable-resource',
        name: 'Subscribable Resource',
        description: 'A subscribable resource',
        mimeType: 'text/html',
        content: '<div>Live Content</div>',
        subscribable: true,
      });

      const resource = server.getResource('test://subscribable-resource');

      expect(resource).toBeDefined();
      expect(resource?.subscribable).toBe(true);
    });

    it('should return resource with subscribable: false', () => {
      // Add resource with subscribable: false
      server.addResource({
        uri: 'test://non-subscribable',
        name: 'Non-Subscribable Resource',
        description: 'A non-subscribable resource',
        mimeType: 'text/plain',
        content: 'Static content',
        subscribable: false,
      });

      const resource = server.getResource('test://non-subscribable');

      expect(resource).toBeDefined();
      expect(resource?.subscribable).toBe(false);
    });

    it('should return resource with undefined subscribable field', () => {
      // Add resource without subscribable field
      server.addResource({
        uri: 'test://default-resource',
        name: 'Default Resource',
        description: 'Resource with default subscribable',
        mimeType: 'application/json',
        content: '{"data": "value"}',
      });

      const resource = server.getResource('test://default-resource');

      expect(resource).toBeDefined();
      expect(resource?.subscribable).toBeUndefined();
    });
  });

  describe('isResourceSubscribable', () => {
    it('should return true when resource.subscribable === true', () => {
      server.addResource({
        uri: 'ui://live-dashboard',
        name: 'Live Dashboard',
        description: 'A live dashboard UI',
        mimeType: 'text/html',
        content: '<div>Dashboard</div>',
        subscribable: true,
      });

      expect(server.isResourceSubscribable('ui://live-dashboard')).toBe(true);
    });

    it('should return false when resource.subscribable === false', () => {
      server.addResource({
        uri: 'ui://static-page',
        name: 'Static Page',
        description: 'A static page',
        mimeType: 'text/html',
        content: '<div>Static</div>',
        subscribable: false,
      });

      expect(server.isResourceSubscribable('ui://static-page')).toBe(false);
    });

    it('should return false when resource.subscribable is undefined', () => {
      server.addResource({
        uri: 'test://regular-resource',
        name: 'Regular Resource',
        description: 'Resource without subscribable field',
        mimeType: 'text/plain',
        content: 'Content',
      });

      expect(server.isResourceSubscribable('test://regular-resource')).toBe(false);
    });

    it('should return false when resource does not exist', () => {
      expect(server.isResourceSubscribable('test://nonexistent')).toBe(false);
    });

    it('should handle multiple resources with different subscribable values', () => {
      server.addResource({
        uri: 'test://sub1',
        name: 'Subscribable 1',
        description: 'First subscribable',
        mimeType: 'text/html',
        content: '<div>Content 1</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'test://sub2',
        name: 'Non-Subscribable',
        description: 'Not subscribable',
        mimeType: 'text/html',
        content: '<div>Content 2</div>',
        subscribable: false,
      });

      server.addResource({
        uri: 'test://sub3',
        name: 'Default',
        description: 'Default subscribable',
        mimeType: 'text/html',
        content: '<div>Content 3</div>',
      });

      expect(server.isResourceSubscribable('test://sub1')).toBe(true);
      expect(server.isResourceSubscribable('test://sub2')).toBe(false);
      expect(server.isResourceSubscribable('test://sub3')).toBe(false);
    });
  });

  describe('getSubscribableResources', () => {
    it('should return empty array when no resources are subscribable', () => {
      server.addResource({
        uri: 'test://resource1',
        name: 'Resource 1',
        description: 'Non-subscribable',
        mimeType: 'text/plain',
        content: 'Content 1',
        subscribable: false,
      });

      server.addResource({
        uri: 'test://resource2',
        name: 'Resource 2',
        description: 'Default subscribable',
        mimeType: 'text/plain',
        content: 'Content 2',
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toEqual([]);
    });

    it('should return empty array when no resources exist', () => {
      const subscribable = server.getSubscribableResources();
      expect(subscribable).toEqual([]);
    });

    it('should return array of URIs for subscribable resources', () => {
      server.addResource({
        uri: 'ui://dashboard',
        name: 'Dashboard',
        description: 'Live dashboard',
        mimeType: 'text/html',
        content: '<div>Dashboard</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://stats',
        name: 'Stats',
        description: 'Live stats',
        mimeType: 'text/html',
        content: '<div>Stats</div>',
        subscribable: true,
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toHaveLength(2);
      expect(subscribable).toContain('ui://dashboard');
      expect(subscribable).toContain('ui://stats');
    });

    it('should filter out resources with subscribable: false', () => {
      server.addResource({
        uri: 'ui://live',
        name: 'Live',
        description: 'Live content',
        mimeType: 'text/html',
        content: '<div>Live</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://static',
        name: 'Static',
        description: 'Static content',
        mimeType: 'text/html',
        content: '<div>Static</div>',
        subscribable: false,
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toEqual(['ui://live']);
    });

    it('should filter out resources without subscribable field (undefined)', () => {
      server.addResource({
        uri: 'ui://subscribable',
        name: 'Subscribable',
        description: 'Explicitly subscribable',
        mimeType: 'text/html',
        content: '<div>Subscribable</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://default1',
        name: 'Default 1',
        description: 'Default subscribable 1',
        mimeType: 'text/html',
        content: '<div>Default 1</div>',
      });

      server.addResource({
        uri: 'ui://default2',
        name: 'Default 2',
        description: 'Default subscribable 2',
        mimeType: 'text/html',
        content: '<div>Default 2</div>',
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toEqual(['ui://subscribable']);
    });

    it('should handle complex mix of subscribable states', () => {
      // Add multiple resources with different subscribable values
      server.addResource({
        uri: 'ui://sub1',
        name: 'Sub 1',
        description: 'Subscribable 1',
        mimeType: 'text/html',
        content: '<div>1</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://sub2',
        name: 'Sub 2',
        description: 'Subscribable 2',
        mimeType: 'text/html',
        content: '<div>2</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://not-sub',
        name: 'Not Sub',
        description: 'Not subscribable',
        mimeType: 'text/html',
        content: '<div>Not</div>',
        subscribable: false,
      });

      server.addResource({
        uri: 'test://data',
        name: 'Data',
        description: 'Data resource',
        mimeType: 'application/json',
        content: '{}',
      });

      server.addResource({
        uri: 'ui://sub3',
        name: 'Sub 3',
        description: 'Subscribable 3',
        mimeType: 'text/html',
        content: '<div>3</div>',
        subscribable: true,
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toHaveLength(3);
      expect(subscribable).toContain('ui://sub1');
      expect(subscribable).toContain('ui://sub2');
      expect(subscribable).toContain('ui://sub3');
      expect(subscribable).not.toContain('ui://not-sub');
      expect(subscribable).not.toContain('test://data');
    });

    it('should work with resources of different MIME types', () => {
      server.addResource({
        uri: 'ui://html-page',
        name: 'HTML Page',
        description: 'HTML resource',
        mimeType: 'text/html',
        content: '<div>HTML</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://external',
        name: 'External',
        description: 'External URL',
        mimeType: 'text/uri-list',
        content: 'https://example.com',
        subscribable: true,
      });

      server.addResource({
        uri: 'data://json',
        name: 'JSON Data',
        description: 'JSON resource',
        mimeType: 'application/json',
        content: '{"key": "value"}',
        subscribable: true,
      });

      const subscribable = server.getSubscribableResources();
      expect(subscribable).toHaveLength(3);
      expect(subscribable).toContain('ui://html-page');
      expect(subscribable).toContain('ui://external');
      expect(subscribable).toContain('data://json');
    });
  });

  describe('Integration: All methods working together', () => {
    it('should maintain consistency across all helper methods', () => {
      // Add multiple resources
      server.addResource({
        uri: 'ui://live1',
        name: 'Live 1',
        description: 'Live resource 1',
        mimeType: 'text/html',
        content: '<div>Live 1</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://live2',
        name: 'Live 2',
        description: 'Live resource 2',
        mimeType: 'text/html',
        content: '<div>Live 2</div>',
        subscribable: true,
      });

      server.addResource({
        uri: 'ui://static',
        name: 'Static',
        description: 'Static resource',
        mimeType: 'text/html',
        content: '<div>Static</div>',
        subscribable: false,
      });

      // Get all subscribable URIs
      const subscribableURIs = server.getSubscribableResources();
      expect(subscribableURIs).toHaveLength(2);

      // Verify each URI is subscribable
      for (const uri of subscribableURIs) {
        expect(server.isResourceSubscribable(uri)).toBe(true);

        const resource = server.getResource(uri);
        expect(resource).toBeDefined();
        expect(resource?.subscribable).toBe(true);
      }

      // Verify non-subscribable resource
      expect(server.isResourceSubscribable('ui://static')).toBe(false);
      const staticResource = server.getResource('ui://static');
      expect(staticResource?.subscribable).toBe(false);
    });

    it('should handle dynamic resource content functions', () => {
      let counter = 0;

      server.addResource({
        uri: 'ui://dynamic-live',
        name: 'Dynamic Live',
        description: 'Dynamically generated live content',
        mimeType: 'text/html',
        content: () => {
          counter++;
          return `<div>Count: ${counter}</div>`;
        },
        subscribable: true,
      });

      // Verify it's marked as subscribable
      expect(server.isResourceSubscribable('ui://dynamic-live')).toBe(true);
      expect(server.getSubscribableResources()).toContain('ui://dynamic-live');

      // Verify resource definition
      const resource = server.getResource('ui://dynamic-live');
      expect(resource).toBeDefined();
      expect(resource?.subscribable).toBe(true);
      expect(typeof resource?.content).toBe('function');
    });
  });
});
