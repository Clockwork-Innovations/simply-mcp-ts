/**
 * Remote DOM Renderer Component
 *
 * React component that executes Remote DOM scripts in a Web Worker sandbox
 * and renders the resulting virtual DOM as React components.
 *
 * Architecture:
 * 1. Creates Web Worker from inline code (sandbox-worker.ts logic)
 * 2. Initializes HostReceiver to process DOM operations
 * 3. Sends script to worker for execution
 * 4. Receives DOM operations via postMessage
 * 5. Updates virtual DOM state and re-renders React components
 *
 * Security:
 * - Worker runs in isolated thread with no DOM access
 * - All operations validated before processing
 * - Component whitelist enforced
 * - Event handlers bridge through postMessage
 *
 * @module client/RemoteDOMRenderer
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { HostReceiver } from './remote-dom/host-receiver.js';
import { validateOperation } from './remote-dom/protocol.js';
import { createRemoteComponent, isAllowedComponent } from './remote-dom/component-library.js';
import { ResourceLimits, ResourceLimitError } from './remote-dom/resource-limits.js';
import { CSPValidator, CSPValidationError } from './remote-dom/csp-validator.js';
import type { UIResourceContent, UIActionResult } from './ui-types.js';
import type { RemoteDOMFramework } from '../core/remote-dom-types.js';

/**
 * Props for RemoteDOMRenderer component
 */
export interface RemoteDOMRendererProps {
  /**
   * UI resource containing Remote DOM script
   */
  resource: UIResourceContent;

  /**
   * Callback for UI actions (tool calls, navigation, etc.)
   */
  onUIAction?: (action: UIActionResult) => void | Promise<void>;

  /**
   * Remote DOM framework (react | webcomponents)
   * Parsed from MIME type parameter: application/vnd.mcp-ui.remote-dom+javascript; framework=react
   * Defaults to 'react' if not specified for backward compatibility.
   */
  framework?: RemoteDOMFramework;

  /**
   * Remote DOM configuration (Layer 3+)
   * Component library and element definitions for custom rendering.
   * Currently not fully implemented - reserved for future enhancement.
   */
  remoteDomProps?: {
    library?: any;
    elementDefinitions?: Record<string, any>;
  };
}

/**
 * Virtual DOM Element
 *
 * Represents an element in the virtual DOM tree.
 * Maps to React components during rendering.
 */
interface VirtualElement {
  id: string;
  tagName: string;
  props?: Record<string, any>;
  children: string[];
  text?: string;
  eventHandlers?: Map<string, string>; // event name -> handler ID
}

/**
 * Remote DOM Renderer Component (Internal)
 *
 * Main component for rendering Remote DOM resources.
 * Handles worker lifecycle, DOM operations, and React rendering.
 *
 * OPTIMIZATION (Polish Layer): Wrapped with React.memo to prevent
 * unnecessary re-renders when props haven't changed.
 *
 * @example
 * ```typescript
 * const resource = {
 *   uri: 'ui://counter',
 *   mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
 *   text: '// Remote DOM script...'
 * };
 *
 * <RemoteDOMRenderer
 *   resource={resource}
 *   onUIAction={(action) => console.log('Action:', action)}
 * />
 * ```
 */
const RemoteDOMRendererComponent: React.FC<RemoteDOMRendererProps> = ({
  resource,
  onUIAction,
  framework = 'react', // Default to 'react' for backward compatibility
  remoteDomProps,
}) => {
  // Note: remoteDomProps is accepted but not yet fully utilized
  // Future enhancement: Use library and elementDefinitions for custom rendering
  const workerRef = useRef<Worker | null>(null);
  const [root, setRoot] = useState<React.ReactElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'script' | 'worker' | 'validation' | 'render' | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing Web Worker...');
  const elementsRef = useRef<Map<string, VirtualElement>>(new Map());
  const hostReceiverRef = useRef<HostReceiver | null>(null);

  // SECURITY (Polish Layer): Resource limits to prevent DoS attacks
  const resourceLimitsRef = useRef<ResourceLimits>(new ResourceLimits());

  // SECURITY (Polish Layer): CSP validator to prevent XSS attacks
  const cspValidatorRef = useRef<CSPValidator>(new CSPValidator());

  /**
   * OPTIMIZATION (Polish Layer): Memoized callbacks for HostReceiver
   * These callbacks are stable and don't change across renders,
   * preventing unnecessary HostReceiver recreations.
   */
  const handleCreateElement = useCallback((id: string, tagName: string, props?: Record<string, any>) => {
    // SECURITY: Validate component is allowed
    if (!isAllowedComponent(tagName)) {
      console.error(`Component not allowed: ${tagName}`);
      return;
    }

    // SECURITY (Polish Layer): Register DOM node with resource limits
    try {
      resourceLimitsRef.current.registerDOMNode();
    } catch (error) {
      if (error instanceof ResourceLimitError) {
        console.error(`Resource limit exceeded: ${error.message}`);
        // Terminate worker to stop further operations
        if (workerRef.current) {
          workerRef.current.terminate();
        }
        return;
      }
      throw error;
    }

    elementsRef.current.set(id, {
      id,
      tagName,
      props,
      children: [],
      eventHandlers: new Map(),
    });
  }, []);

  const handleSetAttribute = useCallback((elementId: string, name: string, value: any) => {
    const elem = elementsRef.current.get(elementId);
    if (elem) {
      elem.props = { ...elem.props, [name]: value };
    }
  }, []);

  const handleAppendChild = useCallback((parentId: string, childId: string) => {
    const parent = elementsRef.current.get(parentId);
    if (parent && !parent.children.includes(childId)) {
      parent.children.push(childId);
    }
  }, []);

  const handleRemoveChild = useCallback((parentId: string, childId: string) => {
    const parent = elementsRef.current.get(parentId);
    if (parent) {
      parent.children = parent.children.filter((id) => id !== childId);
    }
  }, []);

  const handleSetTextContent = useCallback((elementId: string, text: string) => {
    const elem = elementsRef.current.get(elementId);
    if (elem) {
      elem.text = text;
    }
  }, []);

  const handleCallHost = useCallback((action: string, payload: any) => {
    // Call parent's onUIAction callback
    onUIAction?.({
      type: action as any,
      payload,
    });
  }, [onUIAction]);

  /**
   * Render virtual DOM to React elements
   *
   * Recursively converts virtual DOM tree to React components.
   *
   * OPTIMIZATION (Polish Layer): Memoized with useCallback to prevent
   * unnecessary function recreations.
   */
  const renderDOM = useCallback(() => {
    try {
      const elements = elementsRef.current;
      if (elements.size === 0) {
        setRoot(null);
        return;
      }

      // Find root element (first created element)
      const rootId = Array.from(elements.keys())[0];
      if (!rootId) {
        setRoot(null);
        return;
      }

      const rootElement = renderElement(rootId, elements);
      setRoot(rootElement);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Failed to render UI: ${message}`);
      setErrorType('render');
      setErrorDetails(e instanceof Error ? e.stack || null : null);
    }
  }, []);

  /**
   * Render a single element and its children
   *
   * OPTIMIZATION (Polish Layer): Memoized to reduce re-render overhead.
   * Only recreates when elements map changes (tracked by reference).
   */
  const renderElement = useCallback((
    id: string,
    elements: Map<string, VirtualElement>
  ): React.ReactElement => {
    const elem = elements.get(id);
    if (!elem) {
      return React.createElement('div', {}, 'Element not found');
    }

    // Render children recursively
    const childElements = elem.children.map((childId) =>
      React.createElement(
        React.Fragment,
        { key: childId },
        renderElement(childId, elements)
      )
    );

    // Add text content as child if present
    const children: React.ReactNode[] = [...childElements];
    if (elem.text !== undefined) {
      children.push(elem.text);
    }

    // Attach event handlers
    // OPTIMIZATION: Memoize event handlers to prevent recreation
    const props = { ...elem.props };
    if (elem.eventHandlers && elem.eventHandlers.size > 0) {
      for (const [event, handlerId] of elem.eventHandlers.entries()) {
        const reactEvent = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
        // Create stable event handler reference
        props[reactEvent] = (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          hostReceiverRef.current?.triggerEventHandler(handlerId);
        };
      }
    }

    return createRemoteComponent(
      elem.tagName,
      props,
      children.length > 0 ? children : undefined,
      React
    );
  }, []); // Empty deps - renderElement doesn't depend on external state

  // Initialize worker on mount
  useEffect(() => {
    try {
      // Layer 5: Enhanced loading states
      setIsLoading(true);
      setLoadingStage('Initializing Web Worker...');

      // Log framework for debugging (Foundation Layer - just parse and log)
      console.log(`[RemoteDOMRenderer] Initializing with framework: ${framework}`);
      if (framework !== 'react' && framework !== 'webcomponents') {
        console.warn(`[RemoteDOMRenderer] Unknown framework: ${framework}, defaulting to 'react'`);
      }

      // Create Web Worker from inline code
      const workerCode = getWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      workerRef.current = worker;

      // Create host receiver with memoized callbacks
      // OPTIMIZATION: Using memoized callbacks prevents unnecessary recreations
      const hostReceiver = new HostReceiver({
        onCreateElement: handleCreateElement,
        onSetAttribute: handleSetAttribute,
        onAppendChild: handleAppendChild,
        onRemoveChild: handleRemoveChild,
        onSetTextContent: handleSetTextContent,

        onAddEventListener: (elementId, event, handlerId) => {
          // SECURITY (Polish Layer): Register event listener with resource limits
          try {
            resourceLimitsRef.current.registerEventListener();
          } catch (error) {
            if (error instanceof ResourceLimitError) {
              console.error(`Resource limit exceeded: ${error.message}`);
              // Terminate worker to stop further operations
              worker.terminate();
              return;
            }
            throw error;
          }

          const elem = elementsRef.current.get(elementId);
          if (elem) {
            if (!elem.eventHandlers) {
              elem.eventHandlers = new Map();
            }
            elem.eventHandlers.set(event, handlerId);
          }

          // Register handler to send message back to worker
          hostReceiverRef.current?.registerEventHandler(handlerId, () => {
            worker.postMessage({
              type: 'eventCall',
              handlerId,
            });
          });
        },

        onCallHost: handleCallHost,
      });

      hostReceiverRef.current = hostReceiver;

      // Handle worker messages
      worker.onmessage = (event) => {
        const data = event.data;

        if (data.type === 'ready') {
          // Layer 5: Update loading stage
          setLoadingStage('Executing Remote DOM script...');

          // Worker is ready, execute script
          const script = resource.text || (resource.blob ? atob(resource.blob) : '');
          if (!script) {
            setError('No script content found in resource');
            setErrorType('validation');
            setErrorDetails('The resource must contain either a text or blob field with Remote DOM script content.');
            setIsLoading(false);
            return;
          }

          // SECURITY (Polish Layer): Validate script with CSP
          try {
            cspValidatorRef.current.validateScript(script);
          } catch (error) {
            if (error instanceof CSPValidationError) {
              const violations = error.violations.map(v => `- ${v.blockedValue}: ${v.reason}`).join('\n');
              setError(`CSP violation: Script contains unsafe code`);
              setErrorType('validation');
              setErrorDetails(`The script violates Content Security Policy:\n\n${violations}\n\nThese restrictions prevent XSS attacks and code injection.`);
              setIsLoading(false);
              worker.terminate();
              return;
            }
            throw error;
          }

          // SECURITY (Polish Layer): Validate script size
          try {
            resourceLimitsRef.current.validateScriptSize(script);
          } catch (error) {
            if (error instanceof ResourceLimitError) {
              setError(`Resource limit exceeded: ${error.message}`);
              setErrorType('validation');
              setErrorDetails('The script exceeds the maximum allowed size. This limit prevents DoS attacks from oversized scripts.');
              setIsLoading(false);
              worker.terminate();
              return;
            }
            throw error;
          }

          // SECURITY (Polish Layer): Start execution timer
          resourceLimitsRef.current.startExecutionTimer(() => {
            setError('Script execution timeout: exceeded maximum execution time');
            setErrorType('script');
            setErrorDetails('The script took too long to execute. This limit prevents long-running scripts from blocking the UI.');
            setIsLoading(false);
            worker.terminate();
          });

          worker.postMessage({
            type: 'executeScript',
            script,
          });
        } else if (data.type === 'error') {
          // Script execution error
          resourceLimitsRef.current.stopExecutionTimer();
          setError(`Script execution failed: ${data.message}`);
          setErrorType('script');
          setErrorDetails(data.stack || 'No stack trace available. Check your Remote DOM script syntax and logic.');
          setIsLoading(false);
        } else {
          // SECURITY: Validate operation before processing
          if (!validateOperation(data)) {
            console.warn('Invalid operation rejected:', data);
            return;
          }

          // Process DOM operation
          hostReceiver.processOperation(data);

          // Layer 5: Mark as loaded after first render
          if (isLoading) {
            setIsLoading(false);
          }

          // Re-render React tree
          renderDOM();
        }
      };

      worker.onerror = (error) => {
        resourceLimitsRef.current.stopExecutionTimer();
        setError(`Web Worker initialization failed: ${error.message}`);
        setErrorType('worker');
        setErrorDetails('The Remote DOM sandbox worker could not be initialized. This might be due to browser security restrictions or CSP policies.');
        setIsLoading(false);
        console.error('Worker error:', error);
      };

      // Cleanup on unmount
      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        hostReceiverRef.current?.clearHandlers();
        // SECURITY (Polish Layer): Reset resource limits for next execution
        resourceLimitsRef.current.reset();
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Remote DOM initialization failed: ${message}`);
      setErrorType('worker');
      setErrorDetails(e instanceof Error ? e.stack || null : 'An unexpected error occurred during initialization.');
      setIsLoading(false);
    }
  }, [resource, onUIAction, renderDOM]);

  // Enhanced error state with troubleshooting tips
  if (error) {
    const errorTypeLabel = {
      script: 'Script Execution Error',
      worker: 'Worker Initialization Error',
      validation: 'Validation Error',
      render: 'Rendering Error',
    }[errorType || 'render'];

    const troubleshootingTips = {
      script: [
        'Check your Remote DOM script syntax for JavaScript errors',
        'Ensure all required Remote DOM operations are valid',
        'Verify that event handlers and state management are implemented correctly',
        'Check the browser console for additional error details',
      ],
      worker: [
        'Verify that Web Workers are supported in your browser',
        'Check if Content Security Policy (CSP) allows worker-src',
        'Ensure your browser security settings allow Web Workers',
        'Try refreshing the page to reinitialize the worker',
      ],
      validation: [
        'Ensure the resource has valid Remote DOM content (text or blob field)',
        'Check that the MIME type is set correctly (application/vnd.mcp-ui.remote-dom+javascript)',
        'Verify the framework parameter is either "react" or "webcomponents"',
        'Check that the resource URI follows the ui:// scheme',
      ],
      render: [
        'Check if all components used in the script are whitelisted',
        'Verify that props are properly sanitized and valid',
        'Ensure no circular references exist in the component tree',
        'Check the browser console for React rendering warnings',
      ],
    }[errorType || 'render'];

    return (
      <div
        style={{
          color: '#b71c1c',
          padding: '20px',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          border: '2px solid #ef5350',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '800px',
          margin: '20px auto',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Error Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '24px',
              marginRight: '12px',
              lineHeight: '1',
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#b71c1c',
              }}
            >
              {errorTypeLabel}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#c62828',
              }}
            >
              {error}
            </p>
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: errorDetails ? '12px' : 0,
            border: '1px solid #ffcdd2',
          }}
        >
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#c62828',
            }}
          >
            💡 Troubleshooting Tips:
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#666',
            }}
          >
            {troubleshootingTips.map((tip, index) => (
              <li key={index} style={{ marginBottom: '6px' }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Error Details (Expandable) */}
        {errorDetails && (
          <div>
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #ef5350',
                color: '#c62828',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                justifyContent: 'space-between',
              }}
              aria-expanded={showErrorDetails}
            >
              <span>Technical Details</span>
              <span style={{ fontSize: '10px' }}>{showErrorDetails ? '▲' : '▼'}</span>
            </button>
            {showErrorDetails && (
              <pre
                style={{
                  backgroundColor: '#fff3e0',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  overflow: 'auto',
                  maxHeight: '200px',
                  margin: '8px 0 0 0',
                  color: '#e65100',
                  border: '1px solid #ffcc80',
                  fontFamily: 'monospace',
                }}
              >
                {errorDetails}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  // Layer 5: Enhanced loading state with stage indicator
  if (isLoading || !root) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#666',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          {loadingStage}
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Render virtual DOM as React
  return <div className="remote-dom-root">{root}</div>;
};

/**
 * Remote DOM Renderer (Memoized Export)
 *
 * OPTIMIZATION (Polish Layer): Component wrapped with React.memo to prevent
 * unnecessary re-renders when props haven't changed.
 *
 * Props comparison:
 * - resource: Deep comparison (URI and content)
 * - onUIAction: Reference comparison
 * - framework: Primitive comparison
 * - remoteDomProps: Shallow comparison
 */
export const RemoteDOMRenderer = React.memo(
  RemoteDOMRendererComponent,
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    // Returns true if props are equal (skip re-render)

    // Resource comparison (most common change)
    if (prevProps.resource.uri !== nextProps.resource.uri) return false;
    if (prevProps.resource.text !== nextProps.resource.text) return false;
    if (prevProps.resource.mimeType !== nextProps.resource.mimeType) return false;

    // Callback comparison
    if (prevProps.onUIAction !== nextProps.onUIAction) return false;

    // Framework comparison (rarely changes)
    if (prevProps.framework !== nextProps.framework) return false;

    // RemoteDomProps comparison (deep check if present)
    if (prevProps.remoteDomProps !== nextProps.remoteDomProps) {
      // If one is undefined and other isn't, they're different
      if (!prevProps.remoteDomProps || !nextProps.remoteDomProps) return false;

      // Shallow comparison of remoteDomProps
      if (prevProps.remoteDomProps.library !== nextProps.remoteDomProps.library) return false;
      if (prevProps.remoteDomProps.elementDefinitions !== nextProps.remoteDomProps.elementDefinitions) return false;
    }

    // All props are equal - skip re-render
    return true;
  }
);

// Add display name for debugging
RemoteDOMRenderer.displayName = 'RemoteDOMRenderer';

/**
 * Get Web Worker source code
 *
 * Returns the sandbox-worker.ts code as a string for inline worker creation.
 * This approach avoids separate worker file and bundling issues.
 *
 * @returns Worker source code as string
 */
function getWorkerCode(): string {
  // Inline worker code (simplified version of sandbox-worker.ts)
  return `
    // Element registry for tracking created elements
    const elementRegistry = new Map();

    // Event handlers registry
    const eventHandlers = new Map();

    // Remote DOM API
    const remoteDOM = {
      createElement(tagName, props) {
        const id = 'elem-' + Math.random().toString(36).slice(2);
        elementRegistry.set(id, { tagName, props });
        self.postMessage({
          type: 'createElement',
          id,
          tagName,
          props: sanitizeProps(props)
        });
        return id;
      },

      setAttribute(elementId, name, value) {
        self.postMessage({
          type: 'setAttribute',
          elementId,
          name,
          value: sanitizeValue(value)
        });
      },

      appendChild(parentId, childId) {
        self.postMessage({
          type: 'appendChild',
          parentId,
          childId
        });
      },

      removeChild(parentId, childId) {
        self.postMessage({
          type: 'removeChild',
          parentId,
          childId
        });
      },

      setTextContent(elementId, text) {
        self.postMessage({
          type: 'setTextContent',
          elementId,
          text: String(text)
        });
      },

      addEventListener(elementId, event, handler) {
        const handlerId = 'handler-' + Math.random().toString(36).slice(2);
        eventHandlers.set(handlerId, handler);
        self.postMessage({
          type: 'addEventListener',
          elementId,
          event,
          handlerId
        });
      },

      callHost(action, payload) {
        self.postMessage({
          type: 'callHost',
          action,
          payload
        });
      }
    };

    // Sanitize props
    function sanitizeProps(props) {
      if (!props) return undefined;
      const sanitized = {};
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'function') continue;
        if (value === undefined) continue;
        sanitized[key] = sanitizeValue(value);
      }
      return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }

    // Sanitize value
    function sanitizeValue(value) {
      if (value === null || value === undefined) return value;
      if (typeof value === 'function') return undefined;
      if (Array.isArray(value)) {
        return value.map(sanitizeValue).filter((v) => v !== undefined);
      }
      if (typeof value === 'object') {
        const obj = {};
        for (const [k, v] of Object.entries(value)) {
          const sanitized = sanitizeValue(v);
          if (sanitized !== undefined) obj[k] = sanitized;
        }
        return obj;
      }
      return value;
    }

    // Execute script
    function executeScript(script) {
      try {
        const func = new Function('remoteDOM', 'console', '"use strict"; ' + script);
        func(remoteDOM, console);
      } catch (e) {
        self.postMessage({
          type: 'error',
          message: e.message || String(e)
        });
      }
    }

    // Message handler
    self.onmessage = function(event) {
      const { type, script, handlerId, payload } = event.data;

      if (type === 'executeScript') {
        executeScript(script);
      } else if (type === 'eventCall' && handlerId) {
        const handler = eventHandlers.get(handlerId);
        if (handler) {
          try {
            handler(payload);
          } catch (e) {
            console.error('Handler error:', e);
          }
        }
      }
    };

    // Signal ready
    self.postMessage({ type: 'ready' });
  `;
}

export default RemoteDOMRenderer;
