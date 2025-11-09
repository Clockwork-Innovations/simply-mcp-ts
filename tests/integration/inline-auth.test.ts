/**
 * Integration Tests: Inline Auth Patterns (Phase 1)
 *
 * End-to-end tests for inline authentication in server definitions.
 * Tests both interface-based and const-based server patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { compileInterfaceFile } from '../../src/server/compiler/main-compiler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', '__temp_inline_auth_integration__');

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

describe('Inline Auth Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Interface-based Server Inline Auth', () => {
    it('should parse inline apiKey auth in interface-based server', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

interface MyServer extends IServer {
  name: 'inline-auth-server';
  version: '1.0.0';
  description: 'Server with inline auth';
  auth: {
    type: 'apiKey';
    headerName: 'X-API-Key';
    keys: [
      { name: 'admin'; key: 'admin-key-123'; permissions: ['read', 'write', 'admin'] },
      { name: 'user'; key: 'user-key-456'; permissions: ['read', 'write'] },
      { name: 'guest'; key: 'guest-key-789'; permissions: ['read'] }
    ];
    allowAnonymous: false;
  };
}

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

export default class InlineAuthServer implements MyServer {
  greet: GreetTool = async ({ name }) => {
    return \`Hello, \${name}!\`;
  };
}
`;

      const filePath = createTestFile('interface-inline-apikey.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify server metadata
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('inline-auth-server');

      // Verify inline auth parsed correctly
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('apiKey');
      expect(result.server!.auth!.interfaceName).toBe('InlineAuth');
      expect(result.server!.auth!.headerName).toBe('X-API-Key');
      expect(result.server!.auth!.allowAnonymous).toBe(false);

      // Verify keys array
      expect(result.server!.auth!.keys).toBeDefined();
      expect(result.server!.auth!.keys).toHaveLength(3);

      const adminKey = result.server!.auth!.keys![0];
      expect(adminKey.name).toBe('admin');
      expect(adminKey.key).toBe('admin-key-123');
      expect(adminKey.permissions).toEqual(['read', 'write', 'admin']);

      const userKey = result.server!.auth!.keys![1];
      expect(userKey.name).toBe('user');
      expect(userKey.key).toBe('user-key-456');
      expect(userKey.permissions).toEqual(['read', 'write']);

      const guestKey = result.server!.auth!.keys![2];
      expect(guestKey.name).toBe('guest');
      expect(guestKey.key).toBe('guest-key-789');
      expect(guestKey.permissions).toEqual(['read']);
    });

    it('should parse inline oauth2 auth in interface-based server', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

interface MyServer extends IServer {
  name: 'oauth-server';
  version: '1.0.0';
  description: 'Server with OAuth2';
  auth: {
    type: 'oauth2';
    issuerUrl: 'https://auth.example.com';
    clients: [
      {
        clientId: 'web-app';
        clientSecret: 'secret-123';
        redirectUris: ['https://app.example.com/callback'];
        scopes: ['read', 'write'];
        name: 'Web Application';
      },
      {
        clientId: 'mobile-app';
        clientSecret: 'secret-456';
        redirectUris: ['myapp://callback'];
        scopes: ['read'];
        name: 'Mobile App';
      }
    ];
    tokenExpiration: 3600;
    refreshTokenExpiration: 86400;
    codeExpiration: 600;
  };
}

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

export default class OAuth2Server implements MyServer {
  echo: EchoTool = async ({ message }) => message;
}
`;

      const filePath = createTestFile('interface-inline-oauth2.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify OAuth2 auth
      expect(result.server).toBeDefined();
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('oauth2');
      expect(result.server!.auth!.interfaceName).toBe('InlineAuth');
      expect(result.server!.auth!.issuerUrl).toBe('https://auth.example.com');
      expect(result.server!.auth!.tokenExpiration).toBe(3600);
      expect(result.server!.auth!.refreshTokenExpiration).toBe(86400);
      expect(result.server!.auth!.codeExpiration).toBe(600);

      // Verify clients
      expect(result.server!.auth!.clients).toBeDefined();
      expect(result.server!.auth!.clients).toHaveLength(2);

      const webClient = result.server!.auth!.clients![0];
      expect(webClient.clientId).toBe('web-app');
      expect(webClient.clientSecret).toBe('secret-123');
      expect(webClient.redirectUris).toEqual(['https://app.example.com/callback']);
      expect(webClient.scopes).toEqual(['read', 'write']);
      expect(webClient.name).toBe('Web Application');

      const mobileClient = result.server!.auth!.clients![1];
      expect(mobileClient.clientId).toBe('mobile-app');
      expect(mobileClient.clientSecret).toBe('secret-456');
      expect(mobileClient.redirectUris).toEqual(['myapp://callback']);
      expect(mobileClient.scopes).toEqual(['read']);
      expect(mobileClient.name).toBe('Mobile App');
    });
  });

  describe('Const-based Server Inline Auth', () => {
    it('should parse inline apiKey auth in const-based server', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-auth-server',
  version: '1.0.0',
  description: 'Const server with inline auth',
  auth: {
    type: 'apiKey',
    headerName: 'Authorization',
    keys: [
      { name: 'admin', key: 'sk-admin-abc123', permissions: ['read', 'write', 'delete'] },
      { name: 'developer', key: 'sk-dev-def456', permissions: ['read', 'write'] }
    ],
    allowAnonymous: false
  }
};

interface ValueParam extends IParam {
  type: 'string';
  description: 'Value';
}

interface ProcessTool extends ITool {
  name: 'process';
  description: 'Process value';
  params: { value: ValueParam };
  result: string;
}

const process: ProcessTool = async ({ value }) => \`Processed: \${value}\`;
`;

      const filePath = createTestFile('const-inline-apikey.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify server with inline auth
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('const-auth-server');

      // Verify inline auth
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('apiKey');
      expect(result.server!.auth!.interfaceName).toBe('InlineAuth');
      expect(result.server!.auth!.headerName).toBe('Authorization');
      expect(result.server!.auth!.allowAnonymous).toBe(false);

      // Verify keys
      expect(result.server!.auth!.keys).toBeDefined();
      expect(result.server!.auth!.keys).toHaveLength(2);

      const adminKey = result.server!.auth!.keys![0];
      expect(adminKey.name).toBe('admin');
      expect(adminKey.key).toBe('sk-admin-abc123');
      expect(adminKey.permissions).toEqual(['read', 'write', 'delete']);

      const devKey = result.server!.auth!.keys![1];
      expect(devKey.name).toBe('developer');
      expect(devKey.key).toBe('sk-dev-def456');
      expect(devKey.permissions).toEqual(['read', 'write']);
    });

    it('should parse inline oauth2 auth in const-based server', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-oauth-server',
  version: '1.0.0',
  description: 'Const server with OAuth2',
  auth: {
    type: 'oauth2',
    issuerUrl: 'https://oauth.example.com',
    clients: [
      {
        clientId: 'app-client',
        clientSecret: 'client-secret-xyz',
        redirectUris: ['https://app.example.com/auth/callback', 'https://app.example.com/oauth'],
        scopes: ['profile', 'email', 'api'],
        name: 'Main Application'
      }
    ],
    tokenExpiration: 7200,
    refreshTokenExpiration: 604800,
    codeExpiration: 300
  }
};

interface DataParam extends IParam {
  type: 'string';
  description: 'Data';
}

interface SaveTool extends ITool {
  name: 'save';
  description: 'Save data';
  params: { data: DataParam };
  result: string;
}

const save: SaveTool = async ({ data }) => \`Saved: \${data}\`;
`;

      const filePath = createTestFile('const-inline-oauth2.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify OAuth2 auth in const server
      expect(result.server).toBeDefined();
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('oauth2');
      expect(result.server!.auth!.interfaceName).toBe('InlineAuth');
      expect(result.server!.auth!.issuerUrl).toBe('https://oauth.example.com');
      expect(result.server!.auth!.tokenExpiration).toBe(7200);
      expect(result.server!.auth!.refreshTokenExpiration).toBe(604800);
      expect(result.server!.auth!.codeExpiration).toBe(300);

      // Verify client
      expect(result.server!.auth!.clients).toBeDefined();
      expect(result.server!.auth!.clients).toHaveLength(1);

      const client = result.server!.auth!.clients![0];
      expect(client.clientId).toBe('app-client');
      expect(client.clientSecret).toBe('client-secret-xyz');
      expect(client.redirectUris).toEqual([
        'https://app.example.com/auth/callback',
        'https://app.example.com/oauth'
      ]);
      expect(client.scopes).toEqual(['profile', 'email', 'api']);
      expect(client.name).toBe('Main Application');
    });
  });

  describe('Complex Auth Configurations', () => {
    it('should handle apiKey auth with many keys and permissions', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'complex-auth-server',
  version: '1.0.0',
  description: 'Server with complex auth',
  auth: {
    type: 'apiKey',
    headerName: 'X-API-Token',
    keys: [
      { name: 'superadmin', key: 'key-1', permissions: ['*'] },
      { name: 'admin', key: 'key-2', permissions: ['users:read', 'users:write', 'users:delete', 'settings:read', 'settings:write'] },
      { name: 'moderator', key: 'key-3', permissions: ['users:read', 'users:write', 'content:moderate'] },
      { name: 'editor', key: 'key-4', permissions: ['content:read', 'content:write', 'content:publish'] },
      { name: 'viewer', key: 'key-5', permissions: ['content:read', 'users:read'] }
    ],
    allowAnonymous: true
  }
};

interface IdParam extends IParam {
  type: 'string';
  description: 'ID';
}

interface GetUserTool extends ITool {
  name: 'get_user';
  description: 'Get user';
  params: { id: IdParam };
  result: string;
}

const getUser: GetUserTool = async ({ id }) => \`User: \${id}\`;
`;

      const filePath = createTestFile('complex-auth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify complex auth
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('apiKey');
      expect(result.server!.auth!.headerName).toBe('X-API-Token');
      expect(result.server!.auth!.allowAnonymous).toBe(true);
      expect(result.server!.auth!.keys).toHaveLength(5);

      // Verify specific keys
      const superadmin = result.server!.auth!.keys![0];
      expect(superadmin.name).toBe('superadmin');
      expect(superadmin.permissions).toEqual(['*']);

      const admin = result.server!.auth!.keys![1];
      expect(admin.name).toBe('admin');
      expect(admin.permissions).toHaveLength(5);
      expect(admin.permissions).toContain('users:write');

      const viewer = result.server!.auth!.keys![4];
      expect(viewer.name).toBe('viewer');
      expect(viewer.permissions).toEqual(['content:read', 'users:read']);
    });

    it('should handle oauth2 auth with multiple clients and scopes', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'multi-client-server',
  version: '1.0.0',
  description: 'Server with multiple OAuth clients',
  auth: {
    type: 'oauth2',
    issuerUrl: 'https://id.example.com',
    clients: [
      {
        clientId: 'web',
        clientSecret: 'web-secret',
        redirectUris: ['https://web.example.com/callback'],
        scopes: ['openid', 'profile', 'email', 'api:read', 'api:write'],
        name: 'Web App'
      },
      {
        clientId: 'mobile-ios',
        clientSecret: 'ios-secret',
        redirectUris: ['myapp://auth/callback'],
        scopes: ['openid', 'profile', 'api:read'],
        name: 'iOS App'
      },
      {
        clientId: 'mobile-android',
        clientSecret: 'android-secret',
        redirectUris: ['com.example.app://callback'],
        scopes: ['openid', 'profile', 'api:read'],
        name: 'Android App'
      },
      {
        clientId: 'desktop',
        clientSecret: 'desktop-secret',
        redirectUris: ['http://localhost:8080/callback'],
        scopes: ['openid', 'profile', 'email', 'api:read', 'api:write', 'offline_access'],
        name: 'Desktop App'
      }
    ],
    tokenExpiration: 1800,
    refreshTokenExpiration: 2592000,
    codeExpiration: 180
  }
};

interface ActionParam extends IParam {
  type: 'string';
  description: 'Action';
}

interface PerformTool extends ITool {
  name: 'perform';
  description: 'Perform action';
  params: { action: ActionParam };
  result: string;
}

const perform: PerformTool = async ({ action }) => \`Performed: \${action}\`;
`;

      const filePath = createTestFile('multi-client-oauth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify OAuth2 auth with multiple clients
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('oauth2');
      expect(result.server!.auth!.clients).toHaveLength(4);

      // Verify each client
      const webClient = result.server!.auth!.clients![0];
      expect(webClient.clientId).toBe('web');
      expect(webClient.scopes).toHaveLength(5);
      expect(webClient.scopes).toContain('api:write');

      const iosClient = result.server!.auth!.clients![1];
      expect(iosClient.clientId).toBe('mobile-ios');
      expect(iosClient.redirectUris).toEqual(['myapp://auth/callback']);

      const desktopClient = result.server!.auth!.clients![3];
      expect(desktopClient.clientId).toBe('desktop');
      expect(desktopClient.scopes).toContain('offline_access');
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support interface reference pattern for auth', () => {
      const content = `
import type { IServer, IAuth, ITool, IParam } from '../../../src/index.js';

interface AdminAuth extends IAuth {
  type: 'apiKey';
  headerName: 'X-Admin-Key';
  keys: [
    { name: 'admin'; key: 'admin-123'; permissions: ['admin'] }
  ];
}

interface MyServer extends IServer {
  name: 'reference-auth-server';
  version: '1.0.0';
  description: 'Server with referenced auth';
  auth: AdminAuth;
}

interface NameParam extends IParam {
  type: 'string';
  description: 'Name';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: NameParam };
  result: string;
}

export default class ReferenceAuthServer implements MyServer {
  greet: GreetTool = async ({ name }) => \`Hello, \${name}!\`;
}
`;

      const filePath = createTestFile('reference-auth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify auth via reference still works
      expect(result.server).toBeDefined();
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('apiKey');
      expect(result.server!.auth!.interfaceName).toBe('AdminAuth');
      expect(result.server!.auth!.headerName).toBe('X-Admin-Key');
    });

    it('should support mixing inline and reference auth in same codebase', () => {
      const content = `
import type { IServer, IAuth, ITool, IParam } from '../../../src/index.js';

// Referenced auth
interface SharedAuth extends IAuth {
  type: 'apiKey';
  headerName: 'X-Shared-Key';
  keys: [
    { name: 'shared'; key: 'shared-key'; permissions: ['read'] }
  ];
}

// Interface-based server with reference auth
interface Server1 extends IServer {
  name: 'server-1';
  version: '1.0.0';
  description: 'Server 1 with reference auth';
  auth: SharedAuth;
}

// Const-based server with inline auth
const server2: IServer = {
  name: 'server-2',
  version: '1.0.0',
  description: 'Server 2 with inline auth',
  auth: {
    type: 'apiKey',
    headerName: 'X-Custom-Key',
    keys: [
      { name: 'custom', key: 'custom-key', permissions: ['write'] }
    ],
    allowAnonymous: false
  }
};

interface ValueParam extends IParam {
  type: 'string';
  description: 'Value';
}

interface ProcessTool extends ITool {
  name: 'process';
  description: 'Process value';
  params: { value: ValueParam };
  result: string;
}

export default class MixedAuthServer implements Server1 {
  process: ProcessTool = async ({ value }) => \`Processed: \${value}\`;
}
`;

      const filePath = createTestFile('mixed-auth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Note: This test creates two server definitions but only one will be used
      // The class-based server (Server1 with reference auth) will be the active one
      // The const server2 is just to show both patterns can coexist in the file

      // Should compile without errors
      expect(result.validationErrors).toEqual([]);

      // Verify the class-based server with reference auth
      expect(result.server).toBeDefined();
      expect(result.server!.name).toBe('server-1');
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.interfaceName).toBe('SharedAuth');
    });
  });

  describe('Edge Cases', () => {
    it('should handle auth with minimal keys array', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'minimal-auth-server',
  version: '1.0.0',
  description: 'Server with minimal auth',
  auth: {
    type: 'apiKey',
    headerName: 'X-Key',
    keys: [
      { name: 'single', key: 'key-1', permissions: ['all'] }
    ],
    allowAnonymous: false
  }
};

interface ValueParam extends IParam {
  type: 'string';
  description: 'Value';
}

interface TestTool extends ITool {
  name: 'test';
  description: 'Test tool';
  params: { value: ValueParam };
  result: string;
}

const test: TestTool = async ({ value }) => value;
`;

      const filePath = createTestFile('minimal-auth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile successfully with single key
      expect(result.validationErrors).toEqual([]);
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.keys).toHaveLength(1);
      expect(result.server!.auth!.keys![0].name).toBe('single');
    });

    it('should handle auth with allowAnonymous enabled', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'anonymous-auth-server',
  version: '1.0.0',
  description: 'Server with anonymous access',
  auth: {
    type: 'apiKey',
    headerName: 'X-API-Key',
    keys: [
      { name: 'premium', key: 'premium-key', permissions: ['premium', 'basic'] }
    ],
    allowAnonymous: true
  }
};

interface QueryParam extends IParam {
  type: 'string';
  description: 'Query';
}

interface SearchTool extends ITool {
  name: 'search';
  description: 'Search';
  params: { query: QueryParam };
  result: string;
}

const search: SearchTool = async ({ query }) => \`Results for: \${query}\`;
`;

      const filePath = createTestFile('anonymous-auth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile with allowAnonymous enabled
      expect(result.validationErrors).toEqual([]);
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.allowAnonymous).toBe(true);
    });

    it('should handle oauth2 with minimal client configuration', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'minimal-oauth-server',
  version: '1.0.0',
  description: 'Server with minimal OAuth2',
  auth: {
    type: 'oauth2',
    issuerUrl: 'https://auth.minimal.com',
    clients: [
      {
        clientId: 'client-1',
        clientSecret: 'secret-1',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['openid']
      }
    ],
    tokenExpiration: 3600
  }
};

interface DataParam extends IParam {
  type: 'string';
  description: 'Data';
}

interface GetTool extends ITool {
  name: 'get';
  description: 'Get data';
  params: { data: DataParam };
  result: string;
}

const get: GetTool = async ({ data }) => data;
`;

      const filePath = createTestFile('minimal-oauth.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile with minimal OAuth2 config
      expect(result.validationErrors).toEqual([]);
      expect(result.server!.auth).toBeDefined();
      expect(result.server!.auth!.type).toBe('oauth2');
      expect(result.server!.auth!.clients).toHaveLength(1);
      expect(result.server!.auth!.tokenExpiration).toBe(3600);
      // Optional fields may be undefined
      expect(result.server!.auth!.refreshTokenExpiration).toBeUndefined();
      expect(result.server!.auth!.codeExpiration).toBeUndefined();
    });
  });

  describe('Auth Validation', () => {
    it('should handle auth with different permission patterns', () => {
      const content = `
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'permission-test-server',
  version: '1.0.0',
  description: 'Server with various permission patterns',
  auth: {
    type: 'apiKey',
    headerName: 'Authorization',
    keys: [
      { name: 'wildcard', key: 'key-1', permissions: ['*'] },
      { name: 'scoped', key: 'key-2', permissions: ['resource:read', 'resource:write'] },
      { name: 'single', key: 'key-3', permissions: ['read'] },
      { name: 'multiple', key: 'key-4', permissions: ['read', 'write', 'delete', 'admin'] }
    ],
    allowAnonymous: false
  }
};

interface IdParam extends IParam {
  type: 'string';
  description: 'ID';
}

interface DeleteTool extends ITool {
  name: 'delete';
  description: 'Delete';
  params: { id: IdParam };
  result: string;
}

const deleteItem: DeleteTool = async ({ id }) => \`Deleted: \${id}\`;
`;

      const filePath = createTestFile('permission-patterns.ts', content);
      const result = compileInterfaceFile(filePath);

      // Should compile with various permission patterns
      expect(result.validationErrors).toEqual([]);
      expect(result.server!.auth!.keys).toHaveLength(4);

      // Check permission arrays
      expect(result.server!.auth!.keys![0].permissions).toEqual(['*']);
      expect(result.server!.auth!.keys![1].permissions).toEqual(['resource:read', 'resource:write']);
      expect(result.server!.auth!.keys![2].permissions).toEqual(['read']);
      expect(result.server!.auth!.keys![3].permissions).toHaveLength(4);
    });
  });
});
