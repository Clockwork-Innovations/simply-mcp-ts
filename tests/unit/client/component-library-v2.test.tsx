/**
 * Remote DOM Component Library Tests
 *
 * Comprehensive test suite for Phase 2 component library.
 * Tests factory pattern, component rendering, props handling, and event management.
 *
 * @module tests/unit/client/component-library-v2.test
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RemoteDOMWorkerManager } from '../../../src/client/remote-dom/RemoteDOMWorkerManager.js';
import { RemoteDOMProvider } from '../../../src/client/remote-dom/RemoteDOMContext.js';
import {
  // Factory and helpers
  createRemoteDOMComponent,
  serializeStyle,
  serializeEventListener,

  // Layout components
  Container,
  Row,
  Column,
  Grid,
  Stack,
  Card,

  // Form components
  Input,
  TextArea,
  Select,
  Button,
  Checkbox,
  Slider,

  // Display components
  Text,
  Heading,
  Badge,
  Image,
  Avatar,

  // Feedback components
  Alert,
  Modal,
  Spinner,
  ProgressBar,

  // Navigation components
  Tabs,
  Menu,

  // Registry
  ALL_COMPONENTS,
  COMPONENT_COUNTS,
} from '../../../src/client/remote-dom/component-library-v2.js';

describe('Remote DOM Component Library', () => {
  let manager: RemoteDOMWorkerManager;

  beforeEach(async () => {
    manager = new RemoteDOMWorkerManager({ debug: false });
    await manager.init();
  });

  afterEach(() => {
    if (manager) {
      manager.terminate();
    }
  });

  // =============================================================================
  // FACTORY PATTERN TESTS
  // =============================================================================

  describe('Factory Pattern', () => {
    test('createRemoteDOMComponent creates valid React component', () => {
      const TestComponent = createRemoteDOMComponent('TestComponent', {
        mapProps: (props) => ({ class: props.className }),
        tagName: 'div',
        renderChildren: true,
      });

      expect(TestComponent).toBeDefined();
      expect(TestComponent.displayName).toBe('TestComponent');
      expect(typeof TestComponent).toBe('function');
    });

    test('serializeStyle converts React styles to CSS string', () => {
      const style = {
        color: 'blue',
        fontSize: 16,
        backgroundColor: 'red',
        padding: '10px',
      };

      const cssString = serializeStyle(style);

      expect(cssString).toContain('color: blue');
      expect(cssString).toContain('font-size: 16px');
      expect(cssString).toContain('background-color: red');
      expect(cssString).toContain('padding: 10px');
    });

    test('serializeStyle handles empty style', () => {
      expect(serializeStyle()).toBe('');
      expect(serializeStyle({})).toBe('');
    });

    test('serializeEventListener returns unique identifier', () => {
      const handler = () => console.log('click');
      const id1 = serializeEventListener(handler);
      const id2 = serializeEventListener(handler);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2); // Should be unique
    });
  });

  // =============================================================================
  // LAYOUT COMPONENT TESTS
  // =============================================================================

  describe('Layout Components', () => {
    test('Container renders and calls sendOperation', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Container maxWidth="1200px" padding="20px">
            Content
          </Container>
        </RemoteDOMProvider>
      );

      // Wait for React effects
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });

    test('Button renders with onClick handler', async () => {
      const onClick = jest.fn();
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Button onClick={onClick} variant="primary">
            Click Me
          </Button>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });

    test('Input renders with props', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Input type="email" placeholder="Enter email" required />
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });

    test('Text renders with styling', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Text size="large" weight="bold" color="blue">
            Hello World
          </Text>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });

    test('Alert renders with severity', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Alert severity="error" closable>
            Error message
          </Alert>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // COMPONENT REGISTRY TESTS
  // =============================================================================

  describe('Component Registry', () => {
    test('ALL_COMPONENTS contains all expected components', () => {
      expect(ALL_COMPONENTS).toBeDefined();
      expect(typeof ALL_COMPONENTS).toBe('object');

      // Check layout components
      expect(ALL_COMPONENTS.Container).toBeDefined();
      expect(ALL_COMPONENTS.Row).toBeDefined();
      expect(ALL_COMPONENTS.Column).toBeDefined();
      expect(ALL_COMPONENTS.Grid).toBeDefined();
      expect(ALL_COMPONENTS.Stack).toBeDefined();

      // Check form components
      expect(ALL_COMPONENTS.Input).toBeDefined();
      expect(ALL_COMPONENTS.Button).toBeDefined();
      expect(ALL_COMPONENTS.Select).toBeDefined();

      // Check display components
      expect(ALL_COMPONENTS.Text).toBeDefined();
      expect(ALL_COMPONENTS.Image).toBeDefined();

      // Check feedback components
      expect(ALL_COMPONENTS.Alert).toBeDefined();
      expect(ALL_COMPONENTS.Modal).toBeDefined();

      // Check navigation components
      expect(ALL_COMPONENTS.Tabs).toBeDefined();
      expect(ALL_COMPONENTS.Menu).toBeDefined();
    });

    test('COMPONENT_COUNTS matches actual implementation', () => {
      expect(COMPONENT_COUNTS.Layout).toBe(10);
      expect(COMPONENT_COUNTS.Form).toBe(15);
      expect(COMPONENT_COUNTS.Action).toBe(8);
      expect(COMPONENT_COUNTS.Display).toBe(10);
      expect(COMPONENT_COUNTS.Feedback).toBe(8);
      expect(COMPONENT_COUNTS.Navigation).toBe(5);
      expect(COMPONENT_COUNTS.Total).toBe(56);
    });

    test('Component registry has correct count', () => {
      const componentKeys = Object.keys(ALL_COMPONENTS);
      expect(componentKeys.length).toBe(COMPONENT_COUNTS.Total);
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration Tests', () => {
    test('Complex form with multiple components', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');
      const onSubmit = jest.fn();

      render(
        <RemoteDOMProvider manager={manager}>
          <Card padding="24px">
            <Heading level={2}>User Form</Heading>
            <Stack direction="vertical" gap="16px">
              <Input type="text" placeholder="Name" required />
              <Input type="email" placeholder="Email" required />
              <TextArea rows={4} placeholder="Message" />
              <Row gap="8px">
                <Button onClick={onSubmit} variant="primary">
                  Submit
                </Button>
                <Button variant="secondary">Cancel</Button>
              </Row>
            </Stack>
          </Card>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should create multiple elements
      expect(sendOperation).toHaveBeenCalled();
      expect(sendOperation.mock.calls.length).toBeGreaterThan(5);
    });

    test('Dashboard layout with multiple sections', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      render(
        <RemoteDOMProvider manager={manager}>
          <Container maxWidth="1200px">
            <Grid columns={3} gap="16px">
              <Card>
                <Text size="large" weight="bold">
                  Metric 1
                </Text>
                <Text>Value: 100</Text>
              </Card>
              <Card>
                <Text size="large" weight="bold">
                  Metric 2
                </Text>
                <Text>Value: 200</Text>
              </Card>
              <Card>
                <Text size="large" weight="bold">
                  Metric 3
                </Text>
                <Text>Value: 300</Text>
              </Card>
            </Grid>
          </Container>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();
    });

    test('Component unmount triggers cleanup', async () => {
      const sendOperation = jest.spyOn(manager, 'sendOperation');

      const { unmount } = render(
        <RemoteDOMProvider manager={manager}>
          <Button>Click Me</Button>
        </RemoteDOMProvider>
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(sendOperation).toHaveBeenCalled();

      // Clear mock to track cleanup calls
      sendOperation.mockClear();

      // Unmount component
      unmount();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should call removeChild for cleanup
      expect(sendOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'removeChild',
        })
      );
    });
  });
});
