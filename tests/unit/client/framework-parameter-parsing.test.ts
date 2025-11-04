/**
 * Framework Parameter Parsing Tests
 *
 * Tests the extraction and validation of framework parameters from Remote DOM MIME types.
 * Per MCP UI specification, Remote DOM MIME types must include a framework parameter:
 * application/vnd.mcp-ui.remote-dom+javascript; framework={react | webcomponents}
 */

import { getRemoteDOMFramework } from '../../../src/client/ui-utils.js';

describe('Framework Parameter Parsing', () => {
  describe('getRemoteDOMFramework', () => {
    test('extracts react framework from MIME type', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=react';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('react');
    });

    test('extracts webcomponents framework from MIME type', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('webcomponents');
    });

    test('defaults to react when framework parameter is missing', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('react');
    });

    test('handles whitespace around parameters', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript;  framework = react  ';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('react');
    });

    test('returns null for invalid framework value', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=invalid';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBeNull();
    });

    test('returns null for non-Remote-DOM MIME types', () => {
      const mimeType = 'text/html';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBeNull();
    });

    test('handles multiple parameters (framework first)', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript; framework=react; charset=utf-8';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('react');
    });

    test('handles multiple parameters (framework last)', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom+javascript; charset=utf-8; framework=webcomponents';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('webcomponents');
    });

    test('old format without +javascript suffix still works', () => {
      const mimeType = 'application/vnd.mcp-ui.remote-dom; framework=react';
      const framework = getRemoteDOMFramework(mimeType);
      expect(framework).toBe('react');
    });

    test('case-sensitive framework values', () => {
      const mimeType1 = 'application/vnd.mcp-ui.remote-dom+javascript; framework=React';
      const framework1 = getRemoteDOMFramework(mimeType1);
      expect(framework1).toBeNull(); // React !== react

      const mimeType2 = 'application/vnd.mcp-ui.remote-dom+javascript; framework=WebComponents';
      const framework2 = getRemoteDOMFramework(mimeType2);
      expect(framework2).toBeNull(); // WebComponents !== webcomponents
    });
  });
});
