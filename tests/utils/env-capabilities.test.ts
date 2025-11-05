/**
 * Tests for environment capability detection utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  canSpawnServers,
  canBindHttpServer,
  hasWorkerAPI,
  hasImportMetaUrl,
  isCloudIDE,
  hasBrowserAutomation,
  canRunIntegrationTests,
  canRunE2ETests,
  getCapabilitiesSummary,
  clearCapabilityCache,
} from './env-capabilities.js';

describe('Environment Capability Detection', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCapabilityCache();
  });

  describe('Synchronous capability checks', () => {
    it('should detect Worker API availability', () => {
      const result = hasWorkerAPI();
      expect(typeof result).toBe('boolean');
      console.log('Worker API available:', result);
    });

    it('should detect import.meta.url support', () => {
      const result = hasImportMetaUrl();
      expect(typeof result).toBe('boolean');
      console.log('import.meta.url available:', result);
    });

    it('should detect cloud IDE environment', () => {
      const result = isCloudIDE();
      expect(typeof result).toBe('boolean');
      console.log('Running in cloud IDE:', result);
      console.log('Environment vars:', {
        CODESPACES: process.env.CODESPACES,
        ANTHROPIC_AGENT_SDK: process.env.ANTHROPIC_AGENT_SDK,
      });
    });

    it('should detect browser automation availability', () => {
      const result = hasBrowserAutomation();
      expect(typeof result).toBe('boolean');
      console.log('Browser automation available:', result);
    });
  });

  describe('Asynchronous capability checks', () => {
    it('should detect server spawning capability', async () => {
      const result = await canSpawnServers();
      expect(typeof result).toBe('boolean');
      console.log('Can spawn servers:', result);
    }, 10000);

    it('should detect HTTP server binding capability', async () => {
      const result = await canBindHttpServer();
      expect(typeof result).toBe('boolean');
      console.log('Can bind HTTP server:', result);
    }, 10000);

    it('should detect integration test capability', async () => {
      const result = await canRunIntegrationTests();
      expect(typeof result).toBe('boolean');
      console.log('Can run integration tests:', result);
    }, 15000);

    it('should detect E2E test capability', async () => {
      const result = await canRunE2ETests(false);
      expect(typeof result).toBe('boolean');
      console.log('Can run E2E tests:', result);
    }, 10000);

    it('should detect E2E test capability with browser requirement', async () => {
      const result = await canRunE2ETests(true);
      expect(typeof result).toBe('boolean');
      console.log('Can run E2E tests (with browser):', result);
    }, 10000);
  });

  describe('Capability caching', () => {
    it('should cache capability results', async () => {
      const result1 = await canSpawnServers();
      const result2 = await canSpawnServers();
      expect(result1).toBe(result2);
    }, 10000);

    it('should clear cache when requested', async () => {
      await canSpawnServers();
      clearCapabilityCache();
      // After clearing, next call should work without error
      const result = await canSpawnServers();
      expect(typeof result).toBe('boolean');
    }, 10000);
  });

  describe('Capability summary', () => {
    it('should provide complete capabilities summary', async () => {
      const summary = await getCapabilitiesSummary();

      console.log('\n=== Environment Capabilities Summary ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('=======================================\n');

      expect(summary).toBeDefined();
      expect(typeof summary.canSpawnServers).toBe('boolean');
      expect(typeof summary.canBindHttpServer).toBe('boolean');
      expect(typeof summary.hasWorkerAPI).toBe('boolean');
      expect(typeof summary.hasImportMetaUrl).toBe('boolean');
      expect(typeof summary.isCloudIDE).toBe('boolean');
      expect(typeof summary.hasBrowserAutomation).toBe('boolean');
      expect(typeof summary.canRunIntegrationTests).toBe('boolean');
      expect(typeof summary.canRunE2ETests).toBe('boolean');
    }, 20000);
  });
});
