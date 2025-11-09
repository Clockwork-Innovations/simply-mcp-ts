/**
 * Unit Tests: Const UI Discovery
 *
 * Tests the discoverConstUI() function and linkUIsToInterfaces() function
 * to validate that const-based UI definitions are properly discovered and linked.
 *
 * Pattern tested:
 * ```typescript
 * interface DashboardUI extends IUI {
 *   uri: 'ui://dashboard';
 *   name: 'dashboard';
 *   source: '<html>...</html>';
 * }
 *
 * const dashboard: DashboardUI = { source: '<html>...</html>' };
 * ```
 */

import { describe, it, expect } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_const_ui__');

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

describe('Const UI Discovery - Unit Tests', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('Single Const UI Discovery', () => {
    it('should discover single const UI definition with correct metadata', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'ui-test-server',
  version: '1.0.0',
  description: 'Testing const UI discovery'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Main dashboard';
  source: '<html><body><h1>Dashboard</h1></body></html>';
}

const dashboard: DashboardUI = {
  source: '<html><body><h1>Dashboard</h1></body></html>'
};
`;

      const filePath = createTestFile('single-ui.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect the UI interface
      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].interfaceName).toBe('DashboardUI');
      expect(result.uis[0].name).toBe('dashboard');
      expect(result.uis[0].uri).toBe('ui://dashboard');

      // Should discover const UI implementation
      expect(result.discoveredUIs).toHaveLength(1);
      expect(result.discoveredUIs![0]).toEqual({
        name: 'dashboard',
        interfaceName: 'DashboardUI',
        kind: 'const'
      });

      // Should link UI to implementation (constName field)
      expect(result.uis[0].constName).toBe('dashboard');
      expect(result.uis[0].propertyName).toBeUndefined();
    });
  });

  describe('Multiple Const UIs Discovery', () => {
    it('should discover multiple const UIs with unique names', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-ui-server',
  version: '1.0.0',
  description: 'Server with multiple UIs'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Main dashboard';
  source: '<html><h1>Dashboard</h1></html>';
}

interface SettingsUI extends IUI {
  uri: 'ui://settings';
  name: 'settings';
  description: 'Settings panel';
  source: '<html><h1>Settings</h1></html>';
}

interface HelpUI extends IUI {
  uri: 'ui://help';
  name: 'help';
  description: 'Help documentation';
  source: '<html><h1>Help</h1></html>';
}

const dashboard: DashboardUI = {
  source: '<html><h1>Dashboard</h1></html>'
};

const settings: SettingsUI = {
  source: '<html><h1>Settings</h1></html>'
};

const help: HelpUI = {
  source: '<html><h1>Help</h1></html>'
};
`;

      const filePath = createTestFile('multi-ui.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should detect all three UI interfaces
      expect(result.uis).toHaveLength(3);
      const uiNames = result.uis.map(ui => ui.name);
      expect(uiNames).toContain('dashboard');
      expect(uiNames).toContain('settings');
      expect(uiNames).toContain('help');

      // Should discover all three const implementations
      expect(result.discoveredUIs).toHaveLength(3);
      const discoveredNames = result.discoveredUIs!.map(ui => ui.name);
      expect(discoveredNames).toContain('dashboard');
      expect(discoveredNames).toContain('settings');
      expect(discoveredNames).toContain('help');

      // All should be kind 'const'
      expect(result.discoveredUIs!.every(ui => ui.kind === 'const')).toBe(true);

      // All should be linked with constName
      expect(result.uis[0].constName).toBeDefined();
      expect(result.uis[1].constName).toBeDefined();
      expect(result.uis[2].constName).toBeDefined();
    });
  });

  describe('UI Naming Pattern Matching', () => {
    it('should match various UI naming patterns ending with "UI"', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'naming-test-server',
  version: '1.0.0',
  description: 'Testing UI naming patterns'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard';
  source: '<html>Dashboard</html>';
}

interface AdminPanelUI extends IUI {
  uri: 'ui://admin';
  name: 'admin';
  description: 'Admin Panel';
  source: '<html>Admin</html>';
}

interface UserProfileUI extends IUI {
  uri: 'ui://profile';
  name: 'profile';
  description: 'User Profile';
  source: '<html>Profile</html>';
}

interface DebugConsoleUI extends IUI {
  uri: 'ui://debug';
  name: 'debug';
  description: 'Debug Console';
  source: '<html>Debug</html>';
}

const dashboard: DashboardUI = { source: '<html>Dashboard</html>' };
const adminPanel: AdminPanelUI = { source: '<html>Admin</html>' };
const userProfile: UserProfileUI = { source: '<html>Profile</html>' };
const debugConsole: DebugConsoleUI = { source: '<html>Debug</html>' };
`;

      const filePath = createTestFile('naming-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);

      // Should discover all four UIs
      expect(result.discoveredUIs).toHaveLength(4);

      // All should be matched correctly by /^(\w+)UI$/ regex
      const expectedInterfaces = ['DashboardUI', 'AdminPanelUI', 'UserProfileUI', 'DebugConsoleUI'];
      const discoveredInterfaces = result.discoveredUIs!.map(ui => ui.interfaceName);

      for (const expected of expectedInterfaces) {
        expect(discoveredInterfaces).toContain(expected);
      }

      // Verify const names match variable names
      const constNames = result.discoveredUIs!.map(ui => ui.name);
      expect(constNames).toContain('dashboard');
      expect(constNames).toContain('adminPanel');
      expect(constNames).toContain('userProfile');
      expect(constNames).toContain('debugConsole');
    });
  });

  describe('Negative Cases - Non-UI Consts', () => {
    it('should NOT discover non-UI const definitions (tools, prompts, resources)', () => {
      const content = `
import type { IServer, ITool, IPrompt, IResource, IUI, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-types-server',
  version: '1.0.0',
  description: 'Server with various const types'
};

interface NameParam extends IParam {
  type: 'string';
  description: 'Name parameter';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

interface WelcomePrompt extends IPrompt {
  name: 'welcome';
  description: 'Welcome prompt';
  args: {};
  result: { messages: Array<{ role: string; content: string }> };
}

interface ConfigResource extends IResource {
  uri: 'config://settings';
  name: 'settings';
  description: 'Configuration';
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

// These should NOT be discovered as UIs
const greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
const welcome: WelcomePrompt = async () => ({ messages: [] });
const config: ConfigResource = async () => ({ contents: [] });

// This SHOULD be discovered as a UI
const dashboard: DashboardUI = { source: '<html>Dashboard</html>' };
`;

      const filePath = createTestFile('non-ui-consts.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should discover only the UI const, not the tool/prompt/resource consts
      expect(result.discoveredUIs).toHaveLength(1);
      expect(result.discoveredUIs![0].name).toBe('dashboard');
      expect(result.discoveredUIs![0].interfaceName).toBe('DashboardUI');

      // Tool/Prompt/Resource should be in implementations, not discoveredUIs
      expect(result.implementations).toHaveLength(3);
      const implNames = result.implementations!.map(impl => impl.name);
      expect(implNames).toContain('greet');
      expect(implNames).toContain('welcome');
      expect(implNames).toContain('config');
    });
  });

  describe('Missing Type Annotation', () => {
    it('should NOT discover const UI without type annotation', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

const server: IServer = {
  name: 'no-type-server',
  version: '1.0.0',
  description: 'Testing missing type annotation'
};

// No type annotation - should NOT be discovered
const dashboard = {
  source: '<html><h1>Dashboard</h1></html>'
};
`;

      const filePath = createTestFile('no-type-annotation.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should NOT discover the const without type annotation
      expect(result.discoveredUIs).toHaveLength(0);
      expect(result.uis).toHaveLength(0);
    });

    it('should NOT discover const with non-UI type annotation', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

const server: IServer = {
  name: 'wrong-type-server',
  version: '1.0.0',
  description: 'Testing wrong type annotation'
};

interface Config {
  setting1: string;
  setting2: number;
}

// Type annotation exists but doesn't end with 'UI' - should NOT be discovered
const dashboard: Config = {
  setting1: 'value',
  setting2: 42
};
`;

      const filePath = createTestFile('wrong-type.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should NOT discover const with non-UI type
      expect(result.discoveredUIs).toHaveLength(0);
    });
  });

  describe('Mixed Class and Const UIs', () => {
    it('should discover both const and class-based UIs with correct kind', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'mixed-ui-server',
  version: '1.0.0',
  description: 'Server with both const and class UIs'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard (const)';
  source: '<html>Dashboard</html>';
}

interface SettingsUI extends IUI {
  uri: 'ui://settings';
  name: 'settings';
  description: 'Settings (class property)';
  source: '<html>Settings</html>';
}

// Const-based UI
const dashboard: DashboardUI = {
  source: '<html>Dashboard</html>'
};

// Class-based UI
class ServerClass {
  settings: SettingsUI = {
    source: '<html>Settings</html>'
  };
}

const instance = new ServerClass();
`;

      const filePath = createTestFile('mixed-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should discover both UIs
      expect(result.discoveredUIs).toHaveLength(2);

      // Find each UI by interface name
      const dashboardDiscovery = result.discoveredUIs!.find(ui => ui.interfaceName === 'DashboardUI');
      const settingsDiscovery = result.discoveredUIs!.find(ui => ui.interfaceName === 'SettingsUI');

      // Verify dashboard is const-based
      expect(dashboardDiscovery).toBeDefined();
      expect(dashboardDiscovery!.kind).toBe('const');
      expect(dashboardDiscovery!.name).toBe('dashboard');
      expect(dashboardDiscovery!.className).toBeUndefined();

      // Verify settings is class-based
      expect(settingsDiscovery).toBeDefined();
      expect(settingsDiscovery!.kind).toBe('class-property');
      expect(settingsDiscovery!.name).toBe('settings');
      expect(settingsDiscovery!.className).toBe('ServerClass');

      // Verify linking - dashboard should have constName, settings should have propertyName
      const dashboardUI = result.uis.find(ui => ui.interfaceName === 'DashboardUI');
      const settingsUI = result.uis.find(ui => ui.interfaceName === 'SettingsUI');

      expect(dashboardUI).toBeDefined();
      expect(dashboardUI!.constName).toBe('dashboard');
      expect(dashboardUI!.propertyName).toBeUndefined();

      expect(settingsUI).toBeDefined();
      expect(settingsUI!.propertyName).toBe('settings');
      expect(settingsUI!.constName).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle server with no UIs', () => {
      const content = `
import type { IServer } from '../../../src/index.js';

const server: IServer = {
  name: 'no-ui-server',
  version: '1.0.0',
  description: 'Server without any UIs'
};
`;

      const filePath = createTestFile('no-uis.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should have no UIs
      expect(result.discoveredUIs).toHaveLength(0);
      expect(result.uis).toHaveLength(0);

      // Should have no validation errors
      expect(result.validationErrors).toEqual([]);
    });

    it('should handle UI interface without const implementation', () => {
      const content = `
import type { IServer, IUI } from '../../../src/index.js';

const server: IServer = {
  name: 'unimplemented-ui-server',
  version: '1.0.0',
  description: 'Server with UI interface but no implementation'
};

interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'dashboard';
  description: 'Dashboard UI';
  source: '<html>Dashboard</html>';
}

// No const implementation provided
`;

      const filePath = createTestFile('unimplemented-ui.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should detect UI interface
      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].interfaceName).toBe('DashboardUI');

      // Should NOT discover any const implementation
      expect(result.discoveredUIs).toHaveLength(0);

      // UI should not have constName or propertyName
      expect(result.uis[0].constName).toBeUndefined();
      expect(result.uis[0].propertyName).toBeUndefined();
    });
  });
});
