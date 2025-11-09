/**
 * Integration Tests: Const-based UI Servers
 *
 * End-to-end tests for servers using const-based UI definitions.
 * Tests the full compilation pipeline from source code to parsed results.
 */

import { describe, it, expect } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_const_ui_integration__');

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

describe('Const UI Server - Integration Tests', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Full Const-based UI Server', () => {
    it('should compile complete server with const UI definitions', () => {
      const content = `
import type { IServer, IUI, ITool, IParam } from '../../../src/index.js';

interface IServer {
  name: string;
  version: string;
  description: string;
}

const server: IServer = {
  name: 'dashboard-server',
  version: '1.0.0',
  description: 'Complete server with const-based UIs'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Main dashboard interface';
  source: '<html><body><h1>Dashboard</h1><p>Welcome to the dashboard!</p></body></html>';
}

const dashboard: DashboardUI = {
  source: '<html><body><h1>Dashboard</h1><p>Welcome to the dashboard!</p></body></html>'
};

interface SettingsUI extends IUI {
  uri: 'ui://settings';
  name: 'settings';
  description: 'Settings panel';
  source: '<html><body><h1>Settings</h1><p>Configure your preferences</p></body></html>';
}

const settings: SettingsUI = {
  source: '<html><body><h1>Settings</h1><p>Configure your preferences</p></body></html>'
};
`;

      const filePath = createTestFile('full-const-server.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify no validation errors
      expect(result.validationErrors).toEqual([]);

      // Verify server metadata
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('dashboard-server');
      expect(result.server!.version).toBe('1.0.0');
      expect(result.server!.description).toBe('Complete server with const-based UIs');

      // Verify both UIs are parsed
      expect(result.uis).toHaveLength(2);

      // Verify dashboard UI
      const dashboardUI = result.uis.find(ui => ui.name === 'dashboard');
      expect(dashboardUI).toBeDefined();
      expect(dashboardUI!.interfaceName).toBe('DashboardUI');
      expect(dashboardUI!.uri).toBe('ui://dashboard');
      expect(dashboardUI!.description).toBe('Main dashboard interface');
      expect(dashboardUI!.constName).toBe('dashboard');
      expect(dashboardUI!.propertyName).toBeUndefined();

      // Verify settings UI
      const settingsUI = result.uis.find(ui => ui.name === 'settings');
      expect(settingsUI).toBeDefined();
      expect(settingsUI!.interfaceName).toBe('SettingsUI');
      expect(settingsUI!.uri).toBe('ui://settings');
      expect(settingsUI!.description).toBe('Settings panel');
      expect(settingsUI!.constName).toBe('settings');
      expect(settingsUI!.propertyName).toBeUndefined();

      // Verify discovered implementations
      expect(result.discoveredUIs).toHaveLength(2);
      expect(result.discoveredUIs!.every(ui => ui.kind === 'const')).toBe(true);
    });
  });

  describe('Mixed Const and Class UI Patterns', () => {
    it('should support both const and class-based UIs in same server', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-ui-server',
  version: '1.0.0',
  description: 'Server with mixed UI patterns'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard (const pattern)';
  source: '<html>Dashboard</html>';
}

interface SettingsUI extends IUI {
  uri: 'ui://settings';
  name: 'settings';
  description: 'Settings (class pattern)';
  source: '<html>Settings</html>';
}

interface HelpUI extends IUI {
  uri: 'ui://help';
  name: 'help';
  description: 'Help (const pattern)';
  source: '<html>Help</html>';
}

// Const-based UIs
const dashboard: DashboardUI = {
  source: '<html>Dashboard</html>'
};

const help: HelpUI = {
  source: '<html>Help</html>'
};

// Class-based UI
class UIServer {
  settings: SettingsUI = {
    source: '<html>Settings</html>'
  };
}

const uiServer = new UIServer();
`;

      const filePath = createTestFile('mixed-ui-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect all three UIs
      expect(result.uis).toHaveLength(3);

      // Verify const-based UIs
      const dashboardUI = result.uis.find(ui => ui.interfaceName === 'DashboardUI');
      expect(dashboardUI).toBeDefined();
      expect(dashboardUI!.constName).toBe('dashboard');
      expect(dashboardUI!.propertyName).toBeUndefined();

      const helpUI = result.uis.find(ui => ui.interfaceName === 'HelpUI');
      expect(helpUI).toBeDefined();
      expect(helpUI!.constName).toBe('help');
      expect(helpUI!.propertyName).toBeUndefined();

      // Verify class-based UI
      const settingsUI = result.uis.find(ui => ui.interfaceName === 'SettingsUI');
      expect(settingsUI).toBeDefined();
      expect(settingsUI!.propertyName).toBe('settings');
      expect(settingsUI!.constName).toBeUndefined();

      // Verify discovered implementations
      expect(result.discoveredUIs).toHaveLength(3);
      const constUIs = result.discoveredUIs!.filter(ui => ui.kind === 'const');
      const classUIs = result.discoveredUIs!.filter(ui => ui.kind === 'class-property');

      expect(constUIs).toHaveLength(2);
      expect(classUIs).toHaveLength(1);
    });
  });

  describe('UI Linking and Matching', () => {
    it('should correctly link const UIs to their interfaces', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'linking-test-server',
  version: '1.0.0',
  description: 'Testing UI linking'
};

interface AdminUI extends IUI {
  uri: 'ui://admin';
  name: 'admin';
  description: 'Admin interface';
  source: '<html>Admin</html>';
}

interface UserUI extends IUI {
  uri: 'ui://user';
  name: 'user';
  description: 'User interface';
  source: '<html>User</html>';
}

interface GuestUI extends IUI {
  uri: 'ui://guest';
  name: 'guest';
  description: 'Guest interface';
  source: '<html>Guest</html>';
}

const admin: AdminUI = { source: '<html>Admin</html>' };
const user: UserUI = { source: '<html>User</html>' };
const guest: GuestUI = { source: '<html>Guest</html>' };
`;

      const filePath = createTestFile('ui-linking.ts', content);
      const result = compileInterfaceFile(filePath);

      // Verify linkUIsToInterfaces() worked correctly
      expect(result.uis).toHaveLength(3);
      expect(result.discoveredUIs).toHaveLength(3);

      // Each parsed UI should be linked to its const
      for (const parsedUI of result.uis) {
        expect(parsedUI.constName).toBeDefined();

        // Find matching discovered UI
        const discovered = result.discoveredUIs!.find(
          ui => ui.interfaceName === parsedUI.interfaceName
        );

        expect(discovered).toBeDefined();
        expect(discovered!.name).toBe(parsedUI.constName);
        expect(discovered!.kind).toBe('const');
      }
    });

    it('should handle UIs with mismatched interface/const names', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'mismatch-test-server',
  version: '1.0.0',
  description: 'Testing mismatched names'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard';
  source: '<html>Dashboard</html>';
}

// Const name differs from interface name prefix
const mainDashboard: DashboardUI = {
  source: '<html>Dashboard</html>'
};
`;

      const filePath = createTestFile('mismatched-names.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should still link correctly
      expect(result.uis).toHaveLength(1);
      expect(result.discoveredUIs).toHaveLength(1);

      // Const name should be 'mainDashboard', not 'dashboard'
      expect(result.uis[0].constName).toBe('mainDashboard');
      expect(result.discoveredUIs![0].name).toBe('mainDashboard');
    });
  });

  describe('No Regressions - Class-based UIs', () => {
    it('should still support traditional class-based UI pattern', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'class-ui-server',
  version: '1.0.0',
  description: 'Traditional class-based UI server'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard';
  source: '<html>Dashboard</html>';
}

interface SettingsUI extends IUI {
  uri: 'ui://settings';
  name: 'settings';
  description: 'Settings';
  source: '<html>Settings</html>';
}

class UIServer {
  dashboard: DashboardUI = {
    source: '<html>Dashboard</html>'
  };

  settings: SettingsUI = {
    source: '<html>Settings</html>'
  };
}

const uiServer = new UIServer();
`;

      const filePath = createTestFile('class-based-ui.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect both UIs
      expect(result.uis).toHaveLength(2);

      // Both should have propertyName, not constName
      const dashboardUI = result.uis.find(ui => ui.name === 'dashboard');
      expect(dashboardUI).toBeDefined();
      expect(dashboardUI!.propertyName).toBe('dashboard');
      expect(dashboardUI!.constName).toBeUndefined();

      const settingsUI = result.uis.find(ui => ui.name === 'settings');
      expect(settingsUI).toBeDefined();
      expect(settingsUI!.propertyName).toBe('settings');
      expect(settingsUI!.constName).toBeUndefined();

      // Should discover class-based implementations
      expect(result.discoveredUIs).toHaveLength(2);
      expect(result.discoveredUIs!.every(ui => ui.kind === 'class-property')).toBe(true);
      expect(result.discoveredUIs!.every(ui => ui.className === 'UIServer')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle server with UIs, tools, and resources', () => {
      const content = `
import type { IServer, IUI, ITool, IResource, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'complex-server',
  version: '1.0.0',
  description: 'Complex server with multiple capability types'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message text';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo a message';
  params: { message: MessageParam };
  result: string;
}

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'app-config';
  description: 'Application configuration';
  mimeType: 'application/json';
  dynamic: true;
  result: { contents: Array<{ uri: string; text: string }> };
}

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard UI';
  source: '<html>Dashboard</html>';
}

const echo: EchoTool = async ({ message }) => message;
const config: ConfigResource = async () => ({ contents: [] });
const dashboard: DashboardUI = { source: '<html>Dashboard</html>' };
`;

      const filePath = createTestFile('complex-server.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect all capabilities
      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(1);
      expect(result.uis).toHaveLength(1);

      // UI should be const-based
      expect(result.uis[0].constName).toBe('dashboard');
      expect(result.discoveredUIs).toHaveLength(1);
      expect(result.discoveredUIs![0].kind).toBe('const');

      // Tool and resource should be in implementations
      expect(result.implementations).toHaveLength(2);
    });

    it('should handle multiple UI sources (inline HTML, file paths, URLs)', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-source-ui-server',
  version: '1.0.0',
  description: 'Server with various UI source types'
};

interface InlineUI extends IUI {
  uri: 'ui://inline';
  name: 'inline';
  description: 'Inline HTML UI';
  source: '<html><body><h1>Inline HTML</h1></body></html>';
}

interface FileUI extends IUI {
  uri: 'ui://file';
  name: 'file';
  description: 'File-based UI';
  source: './dashboard.html';
}

interface UrlUI extends IUI {
  uri: 'ui://url';
  name: 'url';
  description: 'URL-based UI';
  source: 'https://example.com/dashboard';
}

const inline: InlineUI = {
  source: '<html><body><h1>Inline HTML</h1></body></html>'
};

const file: FileUI = {
  source: './dashboard.html'
};

const url: UrlUI = {
  source: 'https://example.com/dashboard'
};
`;

      const filePath = createTestFile('multi-source-ui.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect all three UIs
      expect(result.uis).toHaveLength(3);
      expect(result.discoveredUIs).toHaveLength(3);

      // All should be const-based
      expect(result.uis.every(ui => ui.constName !== undefined)).toBe(true);
      expect(result.discoveredUIs!.every(ui => ui.kind === 'const')).toBe(true);

      // Verify source fields are preserved
      const inlineUI = result.uis.find(ui => ui.name === 'inline');
      expect(inlineUI!.source).toContain('<html>');

      const fileUI = result.uis.find(ui => ui.name === 'file');
      expect(fileUI!.source).toBe('./dashboard.html');

      const urlUI = result.uis.find(ui => ui.name === 'url');
      expect(urlUI!.source).toBe('https://example.com/dashboard');
    });
  });
});
