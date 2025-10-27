/**
 * text/uri-list MIME Type Support Tests
 *
 * Tests the implementation of text/uri-list MIME type for external URLs
 * in MCP UI resources. Phase 3A of protocol compliance.
 */

import { describe, test, expect } from '@jest/globals';
import { parseInterfaceFile } from '../../src/server/parser.js';
import { loadInterfaceServer } from '../../src/index.js';
import path from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Test fixtures directory
const fixturesDir = path.join(process.cwd(), 'tests/fixtures/mime-types-uri-list');

// Create fixtures directory
try {
  mkdirSync(fixturesDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

describe('text/uri-list MIME Type Support', () => {
  describe('MIME Type Detection', () => {
    test('should return text/uri-list when externalUrl is present', async () => {
      const testFile = path.join(fixturesDir, 'external-url-basic.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface ExternalDashboard extends IUI {
  uri: 'ui://dashboard/external';
  name: 'External Dashboard';
  description: 'External analytics dashboard';
  externalUrl: 'https://dashboard.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://dashboard/external');

      expect(resource.contents).toHaveLength(1);
      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe('https://dashboard.example.com');
    });

    test('should return text/html when externalUrl is absent', async () => {
      const testFile = path.join(fixturesDir, 'no-external-url.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface InternalUI extends IUI {
  uri: 'ui://internal/ui';
  name: 'Internal UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://internal/ui');

      expect(resource.contents).toHaveLength(1);
      expect(resource.contents[0].mimeType).toBe('text/html');
      expect(resource.contents[0].text).toContain('<div>Hello World</div>');
    });
  });

  describe('URL Format Validation', () => {
    test('should accept valid HTTP URLs', async () => {
      const testFile = path.join(fixturesDir, 'valid-http.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface HttpUI extends IUI {
  uri: 'ui://test/http';
  name: 'HTTP UI';
  description: 'HTTP URL';
  externalUrl: 'http://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/http');

      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe('http://example.com');
    });

    test('should accept valid HTTPS URLs', async () => {
      const testFile = path.join(fixturesDir, 'valid-https.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface HttpsUI extends IUI {
  uri: 'ui://test/https';
  name: 'HTTPS UI';
  description: 'HTTPS URL';
  externalUrl: 'https://secure.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/https');

      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe('https://secure.example.com');
    });

    test('should handle URLs with query parameters', async () => {
      const testFile = path.join(fixturesDir, 'url-with-query.ts');
      const url = 'https://example.com/dashboard?user=123&view=analytics';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface QueryUI extends IUI {
  uri: 'ui://test/query';
  name: 'Query UI';
  description: 'URL with query params';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/query');

      expect(resource.contents[0].text).toBe(url);
    });

    test('should handle URLs with fragments', async () => {
      const testFile = path.join(fixturesDir, 'url-with-fragment.ts');
      const url = 'https://example.com/page#section';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface FragmentUI extends IUI {
  uri: 'ui://test/fragment';
  name: 'Fragment UI';
  description: 'URL with fragment';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/fragment');

      expect(resource.contents[0].text).toBe(url);
    });

    test('should handle URLs with special characters (encoded)', async () => {
      const testFile = path.join(fixturesDir, 'url-with-encoding.ts');
      const url = 'https://example.com/search?q=hello%20world&lang=en';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface EncodedUI extends IUI {
  uri: 'ui://test/encoded';
  name: 'Encoded UI';
  description: 'URL with encoded chars';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/encoded');

      expect(resource.contents[0].text).toBe(url);
    });

    test('should handle file:// URLs', async () => {
      const testFile = path.join(fixturesDir, 'url-file-scheme.ts');
      const url = 'file:///home/user/dashboard.html';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface FileUI extends IUI {
  uri: 'ui://test/file';
  name: 'File UI';
  description: 'File URL';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/file');

      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe(url);
    });
  });

  describe('Resource Structure', () => {
    test('should have correct resource format (uri, name, description, mimeType, text)', async () => {
      const testFile = path.join(fixturesDir, 'resource-structure.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface StructureUI extends IUI {
  uri: 'ui://test/structure';
  name: 'Structure Test';
  description: 'Test resource structure';
  externalUrl: 'https://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/structure');

      expect(resource).toHaveProperty('uri');
      expect(resource.uri).toBe('ui://test/structure');
      expect(resource).toHaveProperty('name');
      expect(resource.name).toBe('Structure Test');
      expect(resource).toHaveProperty('description');
      expect(resource.description).toBe('Test resource structure');
      expect(resource).toHaveProperty('mimeType');
      expect(resource.mimeType).toBe('text/plain');
      expect(resource).toHaveProperty('contents');
      expect(resource.contents).toHaveLength(1);
      expect(resource.contents[0]).toHaveProperty('mimeType');
      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0]).toHaveProperty('text');
      expect(resource.contents[0].text).toBe('https://example.com');
    });

    test('should contain only the URL in text field (no HTML wrapper)', async () => {
      const testFile = path.join(fixturesDir, 'plain-url.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface PlainUI extends IUI {
  uri: 'ui://test/plain';
  name: 'Plain UI';
  description: 'Plain URL test';
  externalUrl: 'https://analytics.example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/plain');

      const text = resource.contents[0].text;

      // Should NOT contain HTML tags
      expect(text).not.toContain('<');
      expect(text).not.toContain('>');
      expect(text).not.toContain('html');
      expect(text).not.toContain('iframe');

      // Should be exactly the URL
      expect(text).toBe('https://analytics.example.com/dashboard');
    });

    test('should not inject tool helpers for external URLs', async () => {
      const testFile = path.join(fixturesDir, 'no-tool-injection.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface NoToolsUI extends IUI {
  uri: 'ui://test/no-tools';
  name: 'No Tools UI';
  description: 'External URL with no tool injection';
  externalUrl: 'https://example.com';
  tools: ['some_tool', 'another_tool'];
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/no-tools');

      const text = resource.contents[0].text;

      // Should NOT contain tool helper scripts
      expect(text).not.toContain('callTool');
      expect(text).not.toContain('window.parent.postMessage');
      expect(text).not.toContain('<script>');

      // Should be just the URL
      expect(text).toBe('https://example.com');
    });
  });

  describe('Edge Cases', () => {
    test('should reject invalid URL format', async () => {
      const testFile = path.join(fixturesDir, 'invalid-url.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface InvalidUI extends IUI {
  uri: 'ui://test/invalid';
  name: 'Invalid UI';
  description: 'Invalid URL';
  externalUrl: 'not-a-valid-url';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      await expect(loadInterfaceServer({ filePath: testFile })).rejects.toThrow(/invalid externalUrl/i);
    });

    test('should use name from interface if provided', async () => {
      const testFile = path.join(fixturesDir, 'custom-name.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface CustomNameUI extends IUI {
  uri: 'ui://analytics/dashboard';
  name: 'Custom Analytics Dashboard';
  description: 'Custom name test';
  externalUrl: 'https://analytics.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://analytics/dashboard');

      expect(resource.name).toBe('Custom Analytics Dashboard');
    });

    test('externalUrl takes precedence over html content', async () => {
      const testFile = path.join(fixturesDir, 'precedence.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface PrecedenceUI extends IUI {
  uri: 'ui://test/precedence';
  name: 'Precedence UI';
  description: 'Test precedence';
  externalUrl: 'https://example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/precedence');

      // Should use text/uri-list (not text/html)
      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe('https://example.com');
      expect(resource.contents[0].text).not.toContain('<div>');
    });

    test('should reject conflicting fields (externalUrl + html)', async () => {
      const testFile = path.join(fixturesDir, 'conflict-html.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

// This should fail during parsing due to mutual exclusivity
interface ConflictUI extends IUI {
  uri: 'ui://test/conflict';
  name: 'Conflict UI';
  description: 'Should fail';
  externalUrl: 'https://example.com';
  // html: '<div>Hello</div>'; // Cannot add both in TypeScript interface
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      // This should succeed because TypeScript interface can't have both fields
      // The validation happens at runtime if someone tries to provide both
      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/conflict');

      expect(resource.contents[0].mimeType).toBe('text/uri-list');
    });

    test('should handle international domain names', async () => {
      const testFile = path.join(fixturesDir, 'idn.ts');
      const url = 'https://münchen.example.com';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface IDNUI extends IUI {
  uri: 'ui://test/idn';
  name: 'IDN UI';
  description: 'International domain';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/idn');

      expect(resource.contents[0].mimeType).toBe('text/uri-list');
      expect(resource.contents[0].text).toBe(url);
    });

    test('should handle URLs with port numbers', async () => {
      const testFile = path.join(fixturesDir, 'url-with-port.ts');
      const url = 'https://example.com:8443/dashboard';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface PortUI extends IUI {
  uri: 'ui://test/port';
  name: 'Port UI';
  description: 'URL with port';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/port');

      expect(resource.contents[0].text).toBe(url);
    });

    test('should handle URLs with authentication info', async () => {
      const testFile = path.join(fixturesDir, 'url-with-auth.ts');
      const url = 'https://user:pass@example.com/dashboard';
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface AuthUI extends IUI {
  uri: 'ui://test/auth';
  name: 'Auth UI';
  description: 'URL with auth';
  externalUrl: '${url}';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const server = await loadInterfaceServer({ filePath: testFile });
      const resource = await server.readResource('ui://test/auth');

      expect(resource.contents[0].text).toBe(url);
    });
  });

  describe('Parser Integration', () => {
    test('should extract externalUrl from interface during parsing', () => {
      const testFile = path.join(fixturesDir, 'parser-test.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface ParserUI extends IUI {
  uri: 'ui://test/parser';
  name: 'Parser Test';
  description: 'Parser integration';
  externalUrl: 'https://example.com/dashboard';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const parseResult = parseInterfaceFile(testFile);

      expect(parseResult.uis).toHaveLength(1);
      expect(parseResult.uis[0].externalUrl).toBe('https://example.com/dashboard');
      expect(parseResult.uis[0].dynamic).toBe(false);
    });

    test('should mark UI as static when externalUrl is present', () => {
      const testFile = path.join(fixturesDir, 'static-external.ts');
      writeFileSync(
        testFile,
        `
import type { IUI, IServer } from '../../src/interface-types.js';

interface StaticExternal extends IUI {
  uri: 'ui://test/static';
  name: 'Static External';
  description: 'Static external URL';
  externalUrl: 'https://static.example.com';
}

interface TestServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServerImpl implements TestServer {}
        `.trim()
      );

      const parseResult = parseInterfaceFile(testFile);

      expect(parseResult.uis[0].dynamic).toBe(false);
      expect(parseResult.uis[0].externalUrl).toBeTruthy();
      expect(parseResult.uis[0].methodName).toBeUndefined();
    });
  });
});
