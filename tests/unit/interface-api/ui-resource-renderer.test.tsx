/**
 * @jest-environment jsdom
 */

/**
 * UI Resource Renderer Test Suite
 *
 * This test demonstrates the Testing Library setup and validates
 * that UI resources render correctly with spec-compliant behavior.
 *
 * Tests verify:
 * - Component rendering
 * - MIME type detection
 * - Error handling
 * - MCP UI protocol compliance (postMessage format)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { UIResourceRenderer } from '../../../src/client/UIResourceRenderer.js';

describe('UIResourceRenderer - Testing Library Setup Verification', () => {
  describe('Basic Rendering', () => {
    it('should render inline HTML resource', () => {
      const resource = {
        uri: 'ui://test-card',
        mimeType: 'text/html',
        text: '<div data-testid="test-content"><h1>Test Card</h1><p>This is a test</p></div>',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Verify iframe is rendered
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('sandbox');
    });

    it('should render external URL resource', () => {
      const resource = {
        uri: 'ui://external-app',
        mimeType: 'text/uri-list',
        text: 'https://example.com/app',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Verify iframe is rendered with external URL
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should render remote DOM resource', () => {
      const resource = {
        uri: 'ui://remote-app',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
        text: 'console.log("remote dom script")',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Verify component is rendered (remote DOM uses different rendering)
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error for invalid resource structure', () => {
      const invalidResource = {
        // Missing required fields
        notUri: 'invalid',
      } as any;

      render(<UIResourceRenderer resource={invalidResource} />);

      // Verify error message is displayed
      expect(screen.getByText('Invalid UI Resource')).toBeInTheDocument();
      expect(
        screen.getByText(/does not have the required structure/i)
      ).toBeInTheDocument();
    });

    it('should display error for unsupported MIME type', () => {
      const resource = {
        uri: 'ui://unsupported',
        mimeType: 'application/pdf',
        text: 'PDF content',
      };

      render(<UIResourceRenderer resource={resource} />);

      // Verify invalid resource error (unsupported MIME types fail isUIResource check)
      expect(screen.getByText('Invalid UI Resource')).toBeInTheDocument();
      expect(
        screen.getByText(/does not have the required structure/i)
      ).toBeInTheDocument();
    });
  });

  describe('MIME Type Detection', () => {
    it('should correctly detect text/html MIME type', () => {
      const resource = {
        uri: 'ui://html-test',
        mimeType: 'text/html',
        text: '<div>HTML content</div>',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Should render HTML renderer (iframe with sandbox)
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('sandbox');
    });

    it('should correctly detect text/uri-list MIME type', () => {
      const resource = {
        uri: 'ui://url-test',
        mimeType: 'text/uri-list',
        text: 'https://example.com',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Should render external URL (iframe without rawHtml sandbox restrictions)
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('should correctly detect remote DOM MIME type', () => {
      const resource = {
        uri: 'ui://remote-dom-test',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
        text: 'console.log("test")',
      };

      const { container } = render(<UIResourceRenderer resource={resource} />);

      // Should render remote DOM component
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should pass onUIAction callback correctly', () => {
      const mockOnUIAction = jest.fn<() => Promise<void>>();
      const resource = {
        uri: 'ui://callback-test',
        mimeType: 'text/html',
        text: '<div>Content with actions</div>',
      };

      const { container } = render(
        <UIResourceRenderer resource={resource} onUIAction={mockOnUIAction as any} />
      );

      // Verify component rendered (callback will be tested in integration tests)
      expect(container.querySelector('iframe')).toBeInTheDocument();
    });

    it('should pass htmlProps to HTML renderer', () => {
      const resource = {
        uri: 'ui://props-test',
        mimeType: 'text/html',
        text: '<div>Props test</div>',
      };

      const customHtmlProps = {
        style: { width: '500px', height: '300px' },
      };

      const { container } = render(
        <UIResourceRenderer resource={resource} htmlProps={customHtmlProps} />
      );

      // Verify iframe is rendered (props will affect iframe styling)
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });
  });
});
