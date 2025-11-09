/**
 * Integration Tests: Const Subscription Servers (Phase 2)
 *
 * End-to-end tests for servers using const-based subscription definitions.
 * Tests the full compilation pipeline and runtime behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_const_subscription_integration__');

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

describe('Const Subscription Server - Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Complete Const Subscription Server', () => {
    it('should compile and load server with const subscription', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'const-subscription-server',
  version: '1.0.0',
  description: 'Complete server with const subscription'
};

interface ConfigSubscription extends ISubscription {
  name: 'config_updates';
  uri: 'config://server';
  description: 'Server configuration updates';
  handler: () => void;
}

interface LogSubscription extends ISubscription {
  name: 'log_stream';
  uri: 'logs://server';
  description: 'Server log stream';
  handler: () => void;
}

const configSub: ConfigSubscription = {
  name: 'config_updates',
  uri: 'config://server',
  description: 'Server configuration updates',
  handler: () => {
    console.log('Configuration updated');
  }
};

const logSub: LogSubscription = {
  name: 'log_stream',
  uri: 'logs://server',
  description: 'Server log stream',
  handler: () => {
    console.log('Log entry received');
  }
};
`;

      const filePath = createTestFile('complete-const-subscription.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify compilation
      expect(result.validationErrors).toEqual([]);
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('const-subscription-server');

      // Verify subscriptions parsed correctly
      expect(result.subscriptions).toHaveLength(2);

      const configSub = result.subscriptions.find(s => s.name === 'config_updates');
      expect(configSub).toBeDefined();
      expect(configSub!.interfaceName).toBe('ConfigSubscription');
      expect(configSub!.uri).toBe('config://server');
      expect(configSub!.description).toBe('Server configuration updates');
      expect(configSub!.constName).toBe('configSub');

      const logSub = result.subscriptions.find(s => s.name === 'log_stream');
      expect(logSub).toBeDefined();
      expect(logSub!.interfaceName).toBe('LogSubscription');
      expect(logSub!.uri).toBe('logs://server');
      expect(logSub!.description).toBe('Server log stream');
      expect(logSub!.constName).toBe('logSub');

      // Verify const subscriptions discovered
      expect(result.discoveredSubscriptions).toHaveLength(2);
      expect(result.discoveredSubscriptions!.some(s => s.name === 'configSub')).toBe(true);
      expect(result.discoveredSubscriptions!.some(s => s.name === 'logSub')).toBe(true);
    });

    it('should export const subscription correctly from compiled server', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'export-test-server',
  version: '1.0.0',
  description: 'Test subscription exports'
};

interface EventSubscription extends ISubscription {
  name: 'event_stream';
  uri: 'events://server';
  description: 'Server event stream';
  handler: () => void;
}

const eventSub: EventSubscription = {
  name: 'event_stream',
  uri: 'events://server',
  description: 'Server event stream',
  handler: () => {
    console.log('Event received');
  }
};
`;

      const filePath = createTestFile('export-subscription.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify the subscription has constName set
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].constName).toBe('eventSub');

      // The subscription metadata should be accessible
      expect(result.subscriptions[0].name).toBe('event_stream');
      expect(result.subscriptions[0].uri).toBe('events://server');
      expect(result.subscriptions[0].description).toBe('Server event stream');
    });
  });

  describe('Multiple Const Subscriptions', () => {
    it('should handle server with multiple const subscriptions', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-subscription-server',
  version: '1.0.0',
  description: 'Server with multiple const subscriptions'
};

interface MetricsSubscription extends ISubscription {
  name: 'metrics_stream';
  uri: 'metrics://server';
  description: 'Server metrics';
  handler: () => void;
}

interface AlertSubscription extends ISubscription {
  name: 'alert_notifications';
  uri: 'alerts://server';
  description: 'Alert notifications';
  handler: () => void;
}

interface StatusSubscription extends ISubscription {
  name: 'status_updates';
  uri: 'status://server';
  description: 'Status updates';
  handler: () => void;
}

const metricsSub: MetricsSubscription = {
  name: 'metrics_stream',
  uri: 'metrics://server',
  description: 'Server metrics',
  handler: () => {}
};

const alertSub: AlertSubscription = {
  name: 'alert_notifications',
  uri: 'alerts://server',
  description: 'Alert notifications',
  handler: () => {}
};

const statusSub: StatusSubscription = {
  name: 'status_updates',
  uri: 'status://server',
  description: 'Status updates',
  handler: () => {}
};
`;

      const filePath = createTestFile('multi-const-subscriptions.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify all subscriptions compiled
      expect(result.validationErrors).toEqual([]);
      expect(result.subscriptions).toHaveLength(3);
      expect(result.discoveredSubscriptions).toHaveLength(3);

      const metricsSub = result.subscriptions.find(s => s.name === 'metrics_stream');
      const alertSub = result.subscriptions.find(s => s.name === 'alert_notifications');
      const statusSub = result.subscriptions.find(s => s.name === 'status_updates');

      expect(metricsSub).toBeDefined();
      expect(metricsSub!.constName).toBe('metricsSub');

      expect(alertSub).toBeDefined();
      expect(alertSub!.constName).toBe('alertSub');

      expect(statusSub).toBeDefined();
      expect(statusSub!.constName).toBe('statusSub');
    });
  });

  describe('Complex Subscription Scenarios', () => {
    it('should handle subscriptions with different URI patterns', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'uri-patterns-server',
  version: '1.0.0',
  description: 'Server with different subscription URI patterns'
};

interface FileSubscription extends ISubscription {
  name: 'file_changes';
  uri: 'file:///workspace/src';
  description: 'File system changes';
  handler: () => void;
}

interface DatabaseSubscription extends ISubscription {
  name: 'db_updates';
  uri: 'db://events/users';
  description: 'Database update events';
  handler: () => void;
}

const fileSub: FileSubscription = {
  name: 'file_changes',
  uri: 'file:///workspace/src',
  description: 'File system changes',
  handler: () => {}
};

const dbSub: DatabaseSubscription = {
  name: 'db_updates',
  uri: 'db://events/users',
  description: 'Database update events',
  handler: () => {}
};
`;

      const filePath = createTestFile('uri-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);
      expect(result.subscriptions).toHaveLength(2);
      expect(result.discoveredSubscriptions).toHaveLength(2);

      // Both subscriptions should have constName
      expect(result.subscriptions.every(s => s.constName !== undefined)).toBe(true);
    });

    it('should handle server with subscriptions and other features', () => {
      const content = `
import type { IServer, IResource, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'full-featured-server',
  version: '1.0.0',
  description: 'Server with subscriptions and resources'
};

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'app_config';
  description: 'Application configuration';
  mimeType: 'application/json';
  dynamic: true;
  result: { contents: Array<{ uri: string; text: string }> };
}

interface ConfigSubscription extends ISubscription {
  name: 'config_changes';
  uri: 'config://app';
  description: 'Configuration change notifications';
  handler: () => void;
}

const configSub: ConfigSubscription = {
  name: 'config_changes',
  uri: 'config://app',
  description: 'Configuration change notifications',
  handler: () => {
    console.log('Config changed');
  }
};

const config: ConfigResource = async () => ({
  contents: [{ uri: 'config://app', text: JSON.stringify({ version: '1.0.0' }) }]
});
`;

      const filePath = createTestFile('full-featured.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Should have both resources and subscriptions
      expect(result.resources).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);

      // Both should be const-based
      expect(result.implementations).toHaveLength(1); // config
      expect(result.discoveredSubscriptions).toHaveLength(1); // configSub
      expect(result.subscriptions[0].constName).toBe('configSub');

      // No class-based patterns
      expect(result.className).toBeUndefined();
    });
  });

  describe('Subscription Handler Metadata', () => {
    it('should detect subscriptions with handlers', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'handler-test-server',
  version: '1.0.0',
  description: 'Test subscription handler detection'
};

interface NotificationSubscription extends ISubscription {
  name: 'notifications';
  uri: 'notifications://server';
  description: 'User notifications';
  handler: () => void;
}

const notificationSub: NotificationSubscription = {
  name: 'notifications',
  uri: 'notifications://server',
  description: 'User notifications',
  handler: () => {
    console.log('Notification received');
  }
};
`;

      const filePath = createTestFile('handler-test.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify handler metadata
      expect(result.subscriptions).toHaveLength(1);
      const subscription = result.subscriptions[0];

      expect(subscription.name).toBe('notifications');
      expect(subscription.uri).toBe('notifications://server');
      expect(subscription.hasHandler).toBe(true);

      // Const name should still be set
      expect(subscription.constName).toBe('notificationSub');
    });
  });

  describe('Subscription with Base Interface', () => {
    it('should handle subscription with base ISubscription interface', () => {
      const content = `
import type { IServer, ISubscription } from '../../../src/index.js';

const server: IServer = {
  name: 'base-interface-server',
  version: '1.0.0',
  description: 'Server with base ISubscription interface'
};

interface TaskSubscription extends ISubscription {
  name: 'task_updates';
  uri: 'tasks://server';
  description: 'Task update notifications';
  handler: () => void;
}

interface JobSubscription extends ISubscription {
  name: 'job_status';
  uri: 'jobs://server';
  description: 'Job status updates';
  handler: () => void;
}

// Using base ISubscription interface directly
const taskSub: ISubscription = {
  name: 'task_updates',
  uri: 'tasks://server',
  description: 'Task update notifications',
  handler: () => {}
};

// Using extended interface
const jobSub: JobSubscription = {
  name: 'job_status',
  uri: 'jobs://server',
  description: 'Job status updates',
  handler: () => {}
};
`;

      const filePath = createTestFile('base-interface.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully
      expect(result.validationErrors).toEqual([]);
      expect(result.subscriptions).toHaveLength(2);
      expect(result.discoveredSubscriptions).toHaveLength(2);

      // Both should have constName set
      const taskSub = result.subscriptions.find(s => s.name === 'task_updates');
      const jobSub = result.subscriptions.find(s => s.name === 'job_status');

      expect(taskSub).toBeDefined();
      expect(taskSub!.constName).toBe('taskSub');

      expect(jobSub).toBeDefined();
      expect(jobSub!.constName).toBe('jobSub');
    });
  });
});
