/**
 * Component Library Tests - Playwright E2E
 *
 * Comprehensive test suite for Phase 2 component library.
 * Tests factory pattern, component rendering, props handling, and event management.
 *
 * Tests migrated from Jest (tests/unit/client/component-library-v2.test.tsx)
 * which were being skipped due to lack of Worker API in jsdom.
 *
 * Coverage:
 * - Factory Pattern (4 tests)
 * - Layout Components (5 tests)
 * - Component Registry (3 tests)
 * - Integration Tests (3 tests)
 *
 * Total: 15 tests (migrated from 19 original - some combined)
 *
 * @module tests/e2e/component-library
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to setup test page and wait for all modules to be ready
 */
async function setupTestPage(page: any) {
  await page.goto('/test-page.html');
  await page.waitForFunction(() => (window as any).testReady === true);
}

test.describe('Remote DOM Component Library - Factory Pattern', () => {
  test('createRemoteDOMComponent creates valid React component', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { ComponentLibrary } = window as any;
      const { createRemoteDOMComponent } = ComponentLibrary;

      const TestComponent = createRemoteDOMComponent('TestComponent', {
        mapProps: (props: any) => ({ class: props.className }),
        tagName: 'div',
        renderChildren: true,
      });

      return {
        isDefined: TestComponent !== undefined,
        displayName: TestComponent.displayName,
        isFunction: typeof TestComponent === 'function',
      };
    });

    expect(result.isDefined).toBe(true);
    expect(result.displayName).toBe('TestComponent');
    expect(result.isFunction).toBe(true);
  });

  test('serializeStyle converts React styles to CSS string', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { serializeStyle } = ComponentLibrary;

      const style = {
        color: 'blue',
        fontSize: 16,
        backgroundColor: 'red',
        padding: '10px',
      };

      const cssString = serializeStyle(style);

      return {
        cssString,
        hasColor: cssString.includes('color: blue'),
        hasFontSize: cssString.includes('font-size: 16px'),
        hasBackgroundColor: cssString.includes('background-color: red'),
        hasPadding: cssString.includes('padding: 10px'),
      };
    });

    expect(result.hasColor).toBe(true);
    expect(result.hasFontSize).toBe(true);
    expect(result.hasBackgroundColor).toBe(true);
    expect(result.hasPadding).toBe(true);
  });

  test('serializeStyle handles empty style', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { serializeStyle } = ComponentLibrary;

      return {
        emptyUndefined: serializeStyle(),
        emptyObject: serializeStyle({}),
      };
    });

    expect(result.emptyUndefined).toBe('');
    expect(result.emptyObject).toBe('');
  });

  test('serializeEventListener returns unique identifier', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { serializeEventListener } = ComponentLibrary;

      const handler = () => console.log('click');
      const id1 = serializeEventListener(handler);
      const id2 = serializeEventListener(handler);

      return {
        id1Defined: id1 !== undefined,
        id2Defined: id2 !== undefined,
        areUnique: id1 !== id2,
      };
    });

    expect(result.id1Defined).toBe(true);
    expect(result.id2Defined).toBe(true);
    expect(result.areUnique).toBe(true);
  });
});

test.describe('Remote DOM Component Library - Layout Components', () => {
  test('Container renders and calls sendOperation', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Container } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      // Track sendOperation calls
      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      // Render component
      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Container, { maxWidth: '1200px', padding: '20px' }, 'Content')
          )
        );
        setTimeout(resolve, 100);
      });

      // Cleanup
      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });

  test('Button renders with onClick handler', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Button } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      const onClick = () => console.log('clicked');

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Button, { onClick, variant: 'primary' }, 'Click Me')
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });

  test('Input renders with props', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Input } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Input, { type: 'email', placeholder: 'Enter email', required: true })
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });

  test('Text renders with styling', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Text } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Text, { size: 'large', weight: 'bold', color: 'blue' }, 'Hello World')
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });

  test('Alert renders with severity', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Alert } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Alert, { severity: 'error', closable: true }, 'Error message')
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });
});

test.describe('Remote DOM Component Library - Component Registry', () => {
  test('ALL_COMPONENTS contains all expected components', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { ALL_COMPONENTS } = ComponentLibrary;

      return {
        isDefined: ALL_COMPONENTS !== undefined,
        isObject: typeof ALL_COMPONENTS === 'object',
        // Layout components
        hasContainer: ALL_COMPONENTS.Container !== undefined,
        hasRow: ALL_COMPONENTS.Row !== undefined,
        hasColumn: ALL_COMPONENTS.Column !== undefined,
        hasGrid: ALL_COMPONENTS.Grid !== undefined,
        hasStack: ALL_COMPONENTS.Stack !== undefined,
        // Form components
        hasInput: ALL_COMPONENTS.Input !== undefined,
        hasButton: ALL_COMPONENTS.Button !== undefined,
        hasSelect: ALL_COMPONENTS.Select !== undefined,
        // Display components
        hasText: ALL_COMPONENTS.Text !== undefined,
        hasImage: ALL_COMPONENTS.Image !== undefined,
        // Feedback components
        hasAlert: ALL_COMPONENTS.Alert !== undefined,
        hasModal: ALL_COMPONENTS.Modal !== undefined,
        // Navigation components
        hasTabs: ALL_COMPONENTS.Tabs !== undefined,
        hasMenu: ALL_COMPONENTS.Menu !== undefined,
      };
    });

    expect(result.isDefined).toBe(true);
    expect(result.isObject).toBe(true);
    // Layout
    expect(result.hasContainer).toBe(true);
    expect(result.hasRow).toBe(true);
    expect(result.hasColumn).toBe(true);
    expect(result.hasGrid).toBe(true);
    expect(result.hasStack).toBe(true);
    // Form
    expect(result.hasInput).toBe(true);
    expect(result.hasButton).toBe(true);
    expect(result.hasSelect).toBe(true);
    // Display
    expect(result.hasText).toBe(true);
    expect(result.hasImage).toBe(true);
    // Feedback
    expect(result.hasAlert).toBe(true);
    expect(result.hasModal).toBe(true);
    // Navigation
    expect(result.hasTabs).toBe(true);
    expect(result.hasMenu).toBe(true);
  });

  test('COMPONENT_COUNTS matches actual implementation', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { COMPONENT_COUNTS } = ComponentLibrary;

      return {
        Layout: COMPONENT_COUNTS.Layout,
        Form: COMPONENT_COUNTS.Form,
        Action: COMPONENT_COUNTS.Action,
        Display: COMPONENT_COUNTS.Display,
        Feedback: COMPONENT_COUNTS.Feedback,
        Navigation: COMPONENT_COUNTS.Navigation,
        Total: COMPONENT_COUNTS.Total,
      };
    });

    expect(result.Layout).toBe(10);
    expect(result.Form).toBe(15);
    expect(result.Action).toBe(8);
    expect(result.Display).toBe(10);
    expect(result.Feedback).toBe(8);
    expect(result.Navigation).toBe(5);
    expect(result.Total).toBe(56);
  });

  test('Component registry has correct count', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(() => {
      const { ComponentLibrary } = window as any;
      const { ALL_COMPONENTS, COMPONENT_COUNTS } = ComponentLibrary;

      const componentKeys = Object.keys(ALL_COMPONENTS);

      return {
        actualCount: componentKeys.length,
        expectedCount: COMPONENT_COUNTS.Total,
      };
    });

    expect(result.actualCount).toBe(result.expectedCount);
  });
});

test.describe('Remote DOM Component Library - Integration Tests', () => {
  test('Complex form with multiple components', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Card, Heading, Stack, Input, TextArea, Row, Button } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let callCount = 0;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        callCount++;
        return originalSendOperation(...args);
      };

      const onSubmit = () => console.log('submit');

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(
              Card,
              { padding: '24px' },
              React.createElement(Heading, { level: 2 }, 'User Form'),
              React.createElement(
                Stack,
                { direction: 'vertical', gap: '16px' },
                React.createElement(Input, { type: 'text', placeholder: 'Name', required: true }),
                React.createElement(Input, { type: 'email', placeholder: 'Email', required: true }),
                React.createElement(TextArea, { rows: 4, placeholder: 'Message' }),
                React.createElement(
                  Row,
                  { gap: '8px' },
                  React.createElement(Button, { onClick: onSubmit, variant: 'primary' }, 'Submit'),
                  React.createElement(Button, { variant: 'secondary' }, 'Cancel')
                )
              )
            )
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { callCount };
    });

    // Should create multiple elements
    expect(result.callCount).toBeGreaterThan(5);
  });

  test('Dashboard layout with multiple sections', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Container, Grid, Card, Text } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      let sendOperationCalled = false;
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(...args: any[]) {
        sendOperationCalled = true;
        return originalSendOperation(...args);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(
              Container,
              { maxWidth: '1200px' },
              React.createElement(
                Grid,
                { columns: 3, gap: '16px' },
                React.createElement(
                  Card,
                  null,
                  React.createElement(Text, { size: 'large', weight: 'bold' }, 'Metric 1'),
                  React.createElement(Text, null, 'Value: 100')
                ),
                React.createElement(
                  Card,
                  null,
                  React.createElement(Text, { size: 'large', weight: 'bold' }, 'Metric 2'),
                  React.createElement(Text, null, 'Value: 200')
                ),
                React.createElement(
                  Card,
                  null,
                  React.createElement(Text, { size: 'large', weight: 'bold' }, 'Metric 3'),
                  React.createElement(Text, null, 'Value: 300')
                )
              )
            )
          )
        );
        setTimeout(resolve, 100);
      });

      root.unmount();
      manager.terminate();

      return { sendOperationCalled };
    });

    expect(result.sendOperationCalled).toBe(true);
  });

  test('Component unmount triggers cleanup', async ({ page }) => {
    await setupTestPage(page);

    const result = await page.evaluate(async () => {
      const { React, ReactDOM, RemoteDOMWorkerManager, RemoteDOMProvider, ComponentLibrary } = window as any;
      const { Button } = ComponentLibrary;

      const manager = new RemoteDOMWorkerManager({ debug: false });
      await manager.init();

      const operations: any[] = [];
      const originalSendOperation = manager.sendOperation.bind(manager);
      manager.sendOperation = function(op: any) {
        operations.push(op);
        return originalSendOperation(op);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      await new Promise((resolve) => {
        root.render(
          React.createElement(
            RemoteDOMProvider,
            { manager },
            React.createElement(Button, null, 'Click Me')
          )
        );
        setTimeout(resolve, 100);
      });

      // Clear operations to track cleanup
      operations.length = 0;

      // Unmount component
      root.unmount();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if removeChild was called
      const hasRemoveChild = operations.some(op => op.type === 'removeChild');

      manager.terminate();

      return { hasRemoveChild };
    });

    expect(result.hasRemoveChild).toBe(true);
  });
});
