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

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HostReceiver } from './remote-dom/host-receiver.js';
import { validateOperation } from './remote-dom/protocol.js';
import { createRemoteComponent, isAllowedComponent } from './remote-dom/component-library.js';
import type { UIResourceContent, UIActionResult } from './ui-types.js';

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
 * Remote DOM Renderer Component
 *
 * Main component for rendering Remote DOM resources.
 * Handles worker lifecycle, DOM operations, and React rendering.
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
export const RemoteDOMRenderer: React.FC<RemoteDOMRendererProps> = ({
  resource,
  onUIAction,
}) => {
  const workerRef = useRef<Worker | null>(null);
  const [root, setRoot] = useState<React.ReactElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing Web Worker...');
  const elementsRef = useRef<Map<string, VirtualElement>>(new Map());
  const hostReceiverRef = useRef<HostReceiver | null>(null);

  /**
   * Render virtual DOM to React elements
   *
   * Recursively converts virtual DOM tree to React components.
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
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  /**
   * Render a single element and its children
   */
  const renderElement = (
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
    const props = { ...elem.props };
    if (elem.eventHandlers && elem.eventHandlers.size > 0) {
      for (const [event, handlerId] of elem.eventHandlers.entries()) {
        const reactEvent = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
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
  };

  // Initialize worker on mount
  useEffect(() => {
    try {
      // Layer 5: Enhanced loading states
      setIsLoading(true);
      setLoadingStage('Initializing Web Worker...');

      // Create Web Worker from inline code
      const workerCode = getWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      workerRef.current = worker;

      // Create host receiver with callbacks
      const hostReceiver = new HostReceiver({
        onCreateElement: (id, tagName, props) => {
          // SECURITY: Validate component is allowed
          if (!isAllowedComponent(tagName)) {
            console.error(`Component not allowed: ${tagName}`);
            return;
          }
          elementsRef.current.set(id, {
            id,
            tagName,
            props,
            children: [],
            eventHandlers: new Map(),
          });
        },

        onSetAttribute: (elementId, name, value) => {
          const elem = elementsRef.current.get(elementId);
          if (elem) {
            elem.props = { ...elem.props, [name]: value };
          }
        },

        onAppendChild: (parentId, childId) => {
          const parent = elementsRef.current.get(parentId);
          if (parent && !parent.children.includes(childId)) {
            parent.children.push(childId);
          }
        },

        onRemoveChild: (parentId, childId) => {
          const parent = elementsRef.current.get(parentId);
          if (parent) {
            parent.children = parent.children.filter((id) => id !== childId);
          }
        },

        onSetTextContent: (elementId, text) => {
          const elem = elementsRef.current.get(elementId);
          if (elem) {
            elem.text = text;
          }
        },

        onAddEventListener: (elementId, event, handlerId) => {
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

        onCallHost: (action, payload) => {
          // Call parent's onUIAction callback
          onUIAction?.({
            type: action as any,
            payload,
          });
        },
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
            setIsLoading(false);
            return;
          }
          worker.postMessage({
            type: 'executeScript',
            script,
          });
        } else if (data.type === 'error') {
          // Script execution error
          setError(`Script error: ${data.message}`);
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
        setError(`Worker error: ${error.message}`);
        setIsLoading(false);
        console.error('Worker error:', error);
      };

      // Cleanup on unmount
      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        hostReceiverRef.current?.clearHandlers();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIsLoading(false);
    }
  }, [resource, onUIAction, renderDOM]);

  // Error state
  if (error) {
    return (
      <div
        style={{
          color: '#d32f2f',
          padding: '16px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          border: '1px solid #ef5350',
        }}
        role="alert"
        aria-live="assertive"
      >
        <strong>Remote DOM Error:</strong> {error}
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
