/**
 * Const Subscription Discovery Tests (Phase 2)
 *
 * Tests the subscription discovery system for const-based subscription patterns:
 * - Pattern 1: const x: ISubscription = { ... } (base interface)
 * - Pattern 2: const x: ConfigSubscription = { ... } (extended interface)
 *
 * This validates the implementation in discovery.ts and main-compiler.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_const_subscription_discovery__');

function setupTempDir() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createTestFile(filename: string, content: string): string {
  const filePath = join(TEMP_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('Const Subscription Discovery (Phase 2)', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Base ISubscription Pattern', () => {
    it('should discover single const subscription with ISubscription base interface', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'subscription-test-server',
  version: '1.0.0',
  description: 'Test server with const subscription'
};

interface ConfigSubscription extends ISubscription {
  name: 'config_updates';
  uri: 'config://server';
  description: 'Server configuration updates';
  handler: () => void;
}

const configSub: ISubscription = {
  name: 'config_updates',
  uri: 'config://server',
  description: 'Server configuration updates',
  handler: () => {
    console.log('Config updated');
  }
};
`;

      const filePath = createTestFile('base-isubscription.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the subscription interface
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].interfaceName).toBe('ConfigSubscription');
      expect(result.subscriptions[0].name).toBe('config_updates');
      expect(result.subscriptions[0].uri).toBe('config://server');
      expect(result.subscriptions[0].description).toBe('Server configuration updates');

      // Should discover the const subscription implementation
      expect(result.discoveredSubscriptions).toHaveLength(1);
      expect(result.discoveredSubscriptions![0].name).toBe('configSub');
      expect(result.discoveredSubscriptions![0].interfaceName).toBe('ISubscription');
      expect(result.discoveredSubscriptions![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.subscriptions[0].constName).toBe('configSub');
    });

    it('should discover const subscription with extended subscription interface', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'extended-subscription-server',
  version: '1.0.0',
  description: 'Server with extended subscription interface'
};

interface DataSubscription extends ISubscription {
  name: 'data_changes';
  uri: 'data://events';
  description: 'Data change notifications';
  handler: () => void;
}

const dataSub: DataSubscription = {
  name: 'data_changes',
  uri: 'data://events',
  description: 'Data change notifications',
  handler: () => {
    console.log('Data changed');
  }
};
`;

      const filePath = createTestFile('extended-subscription.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse the subscription interface
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].interfaceName).toBe('DataSubscription');
      expect(result.subscriptions[0].name).toBe('data_changes');

      // Should discover the const subscription with extended interface name
      expect(result.discoveredSubscriptions).toHaveLength(1);
      expect(result.discoveredSubscriptions![0].name).toBe('dataSub');
      expect(result.discoveredSubscriptions![0].interfaceName).toBe('DataSubscription');
      expect(result.discoveredSubscriptions![0].kind).toBe('const');

      // After linking, constName should be set
      expect(result.subscriptions[0].constName).toBe('dataSub');
    });

    it('should discover multiple const subscriptions in same file', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-subscription-server',
  version: '1.0.0',
  description: 'Server with multiple const subscriptions'
};

interface ConfigSubscription extends ISubscription {
  name: 'config_updates';
  uri: 'config://server';
  description: 'Config updates';
  handler: () => void;
}

interface LogSubscription extends ISubscription {
  name: 'log_stream';
  uri: 'logs://server';
  description: 'Log stream';
  handler: () => void;
}

const configSub: ConfigSubscription = {
  name: 'config_updates',
  uri: 'config://server',
  description: 'Config updates',
  handler: () => {}
};

const logSub: LogSubscription = {
  name: 'log_stream',
  uri: 'logs://server',
  description: 'Log stream',
  handler: () => {}
};
`;

      const filePath = createTestFile('multi-subscriptions.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should parse both subscription interfaces
      expect(result.subscriptions).toHaveLength(2);
      const configSub = result.subscriptions.find(s => s.name === 'config_updates');
      const logSub = result.subscriptions.find(s => s.name === 'log_stream');

      expect(configSub).toBeDefined();
      expect(configSub!.interfaceName).toBe('ConfigSubscription');

      expect(logSub).toBeDefined();
      expect(logSub!.interfaceName).toBe('LogSubscription');

      // Should discover both const subscriptions
      expect(result.discoveredSubscriptions).toHaveLength(2);

      const discoveredConfig = result.discoveredSubscriptions!.find(s => s.name === 'configSub');
      expect(discoveredConfig).toBeDefined();
      expect(discoveredConfig!.interfaceName).toBe('ConfigSubscription');
      expect(discoveredConfig!.kind).toBe('const');

      const discoveredLog = result.discoveredSubscriptions!.find(s => s.name === 'logSub');
      expect(discoveredLog).toBeDefined();
      expect(discoveredLog!.interfaceName).toBe('LogSubscription');
      expect(discoveredLog!.kind).toBe('const');

      // After linking, both should have constName
      expect(configSub!.constName).toBe('configSub');
      expect(logSub!.constName).toBe('logSub');
    });
  });

  describe('Subscription Linking', () => {
    it('should link discovered subscriptions to parsed subscription interfaces', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'linking-test-server',
  version: '1.0.0',
  description: 'Test subscription linking'
};

interface EventSubscription extends ISubscription {
  name: 'event_stream';
  uri: 'events://server';
  description: 'Event stream notifications';
  handler: () => void;
}

const eventSub: EventSubscription = {
  name: 'event_stream',
  uri: 'events://server',
  description: 'Event stream notifications',
  handler: () => {
    console.log('Event received');
  }
};
`;

      const filePath = createTestFile('subscription-linking.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Verify linkSubscriptionsToInterfaces() worked correctly
      expect(result.subscriptions).toHaveLength(1);
      expect(result.discoveredSubscriptions).toHaveLength(1);

      // The parsed subscription should be linked to its const
      const parsedSubscription = result.subscriptions[0];
      expect(parsedSubscription.constName).toBe('eventSub');

      // The discovered subscription should match
      const discoveredSubscription = result.discoveredSubscriptions![0];
      expect(discoveredSubscription.name).toBe('eventSub');
      expect(discoveredSubscription.interfaceName).toBe('EventSubscription');
    });

    it('should properly set constName on ParsedSubscription via linking', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'constname-test-server',
  version: '1.0.0',
  description: 'Test constName field'
};

interface MetricsSubscription extends ISubscription {
  name: 'metrics_stream';
  uri: 'metrics://server';
  description: 'Server metrics stream';
  handler: () => void;
}

const metricsSub: MetricsSubscription = {
  name: 'metrics_stream',
  uri: 'metrics://server',
  description: 'Server metrics stream',
  handler: () => {}
};
`;

      const filePath = createTestFile('constname-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify linking set constName
      expect(result.subscriptions).toHaveLength(1);
      const subscription = result.subscriptions[0];

      // constName should match the discovered const variable name
      expect(subscription.constName).toBe('metricsSub');

      // Interface name should be from the interface declaration
      expect(subscription.interfaceName).toBe('MetricsSubscription');

      // Subscription name should be from the interface metadata
      expect(subscription.name).toBe('metrics_stream');
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription with mismatched const name and interface name', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'mismatch-server',
  version: '1.0.0',
  description: 'Test mismatched names'
};

interface AlertSubscription extends ISubscription {
  name: 'alert_notifications';
  uri: 'alerts://server';
  description: 'Alert notifications';
  handler: () => void;
}

// Const name differs from interface name
const mainAlertHandler: AlertSubscription = {
  name: 'alert_notifications',
  uri: 'alerts://server',
  description: 'Alert notifications',
  handler: () => {
    console.log('Alert received');
  }
};
`;

      const filePath = createTestFile('mismatch-names.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should still link correctly
      expect(result.subscriptions).toHaveLength(1);
      expect(result.discoveredSubscriptions).toHaveLength(1);

      // Const name should be the actual variable name
      expect(result.subscriptions[0].constName).toBe('mainAlertHandler');
      expect(result.discoveredSubscriptions![0].name).toBe('mainAlertHandler');

      // Interface name should be from interface declaration
      expect(result.subscriptions[0].interfaceName).toBe('AlertSubscription');
      expect(result.discoveredSubscriptions![0].interfaceName).toBe('AlertSubscription');
    });

    it('should not discover const with non-subscription interface type', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'non-subscription-server',
  version: '1.0.0',
  description: 'Non-subscription const test'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo message';
  params: { message: MessageParam };
  result: string;
}

// This is a tool, not a subscription - should not be discovered as subscription
const echo: EchoTool = async ({ message }) => message;
`;

      const filePath = createTestFile('non-subscription.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should NOT discover any subscriptions
      expect(result.subscriptions).toHaveLength(0);
      expect(result.discoveredSubscriptions).toHaveLength(0);

      // Should discover tool implementation instead
      expect(result.implementations).toHaveLength(1);
      expect(result.implementations![0].name).toBe('echo');
    });
  });

  describe('Subscription Metadata', () => {
    it('should preserve subscription URI and handler metadata', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'metadata-server',
  version: '1.0.0',
  description: 'Test subscription metadata'
};

interface StatusSubscription extends ISubscription {
  name: 'status_updates';
  uri: 'status://server/health';
  description: 'Server health status notifications';
  handler: () => void;
}

const statusSub: StatusSubscription = {
  name: 'status_updates',
  uri: 'status://server/health',
  description: 'Server health status notifications',
  handler: () => {
    console.log('Status update received');
  }
};
`;

      const filePath = createTestFile('subscription-metadata.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should parse without errors
      expect(result.validationErrors).toEqual([]);

      // Should parse subscription with metadata
      expect(result.subscriptions).toHaveLength(1);
      const subscription = result.subscriptions[0];

      expect(subscription.name).toBe('status_updates');
      expect(subscription.uri).toBe('status://server/health');
      expect(subscription.description).toBe('Server health status notifications');
      expect(subscription.hasHandler).toBe(true);

      // Should still link correctly
      expect(subscription.constName).toBe('statusSub');
    });
  });
});
