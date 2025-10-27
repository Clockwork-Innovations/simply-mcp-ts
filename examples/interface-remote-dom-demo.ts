/**
 * Remote DOM MIME Type Example - application/vnd.mcp-ui.remote-dom
 *
 * Demonstrates v4.0.0 `remoteDom` field for Remote DOM serialization.
 * Remote DOM allows declarative UI definition that clients can render natively.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-remote-dom-demo.ts
 */

import type { IServer, IUI, ITool } from '../src/index.js';

// State
let counter = 0;

/**
 * Increment counter tool
 */
interface IncrementTool extends ITool {
  name: 'increment';
  description: 'Increment the counter';
  params: {};
  result: { count: number };
}

/**
 * Reset counter tool
 */
interface ResetTool extends ITool {
  name: 'reset';
  description: 'Reset counter to zero';
  params: {};
  result: { count: number };
}

/**
 * Static Remote DOM UI
 * Uses pre-serialized JSON Remote DOM structure
 */
interface StaticRemoteDomUI extends IUI {
  uri: 'ui://counter/remote-dom-static';
  name: 'Counter (Static Remote DOM)';
  description: 'Static counter UI using Remote DOM';
  remoteDom: '{"type":"div","props":{"className":"container"},"children":[{"type":"h1","children":["Remote DOM Counter"]},{"type":"p","children":["This UI is rendered using Remote DOM serialization."]}]}';
}

/**
 * Dynamic Remote DOM UI
 * Server generates Remote DOM structure with current state
 */
interface DynamicRemoteDomUI extends IUI {
  uri: 'ui://counter/remote-dom-dynamic';
  name: 'Counter (Dynamic Remote DOM)';
  description: 'Dynamic counter UI using Remote DOM';
  dynamic: true;
  tools: ['increment', 'reset'];
}

export const RemoteDomDemoServer: IServer = {
  name: 'remote-dom-demo',
  version: '1.0.0',

  tools: {
    async increment() {
      counter++;
      return { count: counter };
    },

    async reset() {
      counter = 0;
      return { count: counter };
    },
  },

  uis: {
    /**
     * Static Remote DOM Example
     * Pre-serialized Remote DOM structure
     *
     * Equivalent to this React/JSX:
     * <div className="container">
     *   <h1>Remote DOM Counter</h1>
     *   <p>This UI is rendered using Remote DOM serialization.</p>
     * </div>
     */
    'ui://counter/remote-dom-static': {
      remoteDom: JSON.stringify({
        type: 'div',
        props: { className: 'container' },
        children: [
          {
            type: 'h1',
            children: ['Remote DOM Counter'],
          },
          {
            type: 'p',
            children: ['This UI is rendered using Remote DOM serialization.'],
          },
          {
            type: 'p',
            props: { style: { color: '#666', fontSize: '14px' } },
            children: [
              'Remote DOM enables declarative UI definition that MCP clients can render natively.',
            ],
          },
        ],
      }),
    },

    /**
     * Dynamic Remote DOM Example
     * Server generates structure with current counter value
     *
     * This demonstrates how to create dynamic UIs with Remote DOM
     */
    'ui://counter/remote-dom-dynamic': {
      dynamic: true,
      remoteDom: JSON.stringify({
        type: 'div',
        props: { className: 'counter-app' },
        children: [
          {
            type: 'h1',
            children: ['Dynamic Remote DOM Counter'],
          },
          {
            type: 'div',
            props: { className: 'counter-display' },
            children: [
              {
                type: 'span',
                props: { className: 'label' },
                children: ['Current Count:'],
              },
              {
                type: 'span',
                props: {
                  className: 'count',
                  style: { fontSize: '48px', fontWeight: 'bold', color: '#2563eb' },
                },
                children: [counter.toString()],
              },
            ],
          },
          {
            type: 'div',
            props: { className: 'controls' },
            children: [
              {
                type: 'button',
                props: {
                  onClick: { action: 'callTool', toolName: 'increment', args: {} },
                  style: {
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px',
                  },
                },
                children: ['Increment'],
              },
              {
                type: 'button',
                props: {
                  onClick: { action: 'callTool', toolName: 'reset', args: {} },
                  style: {
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  },
                },
                children: ['Reset'],
              },
            ],
          },
          {
            type: 'div',
            props: {
              className: 'info',
              style: { marginTop: '30px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '4px' },
            },
            children: [
              {
                type: 'h3',
                children: ['How Remote DOM Works:'],
              },
              {
                type: 'ul',
                children: [
                  {
                    type: 'li',
                    children: ['Server defines UI as JSON structure'],
                  },
                  {
                    type: 'li',
                    children: ['Client renders natively (not embedded HTML)'],
                  },
                  {
                    type: 'li',
                    children: ['Supports dynamic content generation'],
                  },
                  {
                    type: 'li',
                    children: ['Can include event handlers (callTool)'],
                  },
                  {
                    type: 'li',
                    children: ['Enables cross-platform UI consistency'],
                  },
                ],
              },
            ],
          },
        ],
      }),
      tools: ['increment', 'reset'],
    },

    /**
     * Complex Remote DOM Example
     * Shows more advanced features
     */
    'ui://dashboard/remote-dom-advanced': {
      dynamic: true,
      remoteDom: JSON.stringify({
        type: 'div',
        props: { className: 'dashboard' },
        children: [
          // Header
          {
            type: 'header',
            props: { style: { borderBottom: '2px solid #e5e7eb', paddingBottom: '20px' } },
            children: [
              {
                type: 'h1',
                children: ['MCP Remote DOM Dashboard'],
              },
              {
                type: 'p',
                props: { style: { color: '#6b7280' } },
                children: ['Demonstrates advanced Remote DOM features'],
              },
            ],
          },
          // Grid layout
          {
            type: 'div',
            props: {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginTop: '30px',
              },
            },
            children: [
              // Card 1
              {
                type: 'div',
                props: {
                  className: 'card',
                  style: {
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  },
                },
                children: [
                  { type: 'h3', children: ['Total Requests'] },
                  {
                    type: 'p',
                    props: { style: { fontSize: '36px', fontWeight: 'bold', color: '#2563eb' } },
                    children: [counter.toString()],
                  },
                ],
              },
              // Card 2
              {
                type: 'div',
                props: {
                  className: 'card',
                  style: {
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  },
                },
                children: [
                  { type: 'h3', children: ['Status'] },
                  {
                    type: 'p',
                    props: { style: { fontSize: '24px', color: '#10b981' } },
                    children: ['✓ Operational'],
                  },
                ],
              },
              // Card 3
              {
                type: 'div',
                props: {
                  className: 'card',
                  style: {
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  },
                },
                children: [
                  { type: 'h3', children: ['Last Updated'] },
                  {
                    type: 'p',
                    props: { style: { fontSize: '18px', color: '#6b7280' } },
                    children: [new Date().toLocaleTimeString()],
                  },
                ],
              },
            ],
          },
        ],
      }),
    },
  },
};

/**
 * MIME Type: application/vnd.mcp-ui.remote-dom
 *
 * Remote DOM Structure Format:
 * {
 *   "type": "elementType",        // div, span, button, etc.
 *   "props": {                     // Element properties
 *     "className": "...",
 *     "style": { ... },
 *     "onClick": { action: "callTool", toolName: "...", args: {} }
 *   },
 *   "children": [                  // Child elements or text
 *     "text content",
 *     { type: "...", ... }
 *   ]
 * }
 *
 * Event Handlers:
 * {
 *   "onClick": { action: "callTool", toolName: "increment", args: {} },
 *   "onSubmit": { action: "callTool", toolName: "submit", args: { ... } }
 * }
 *
 * Advantages:
 * - Native rendering (not HTML iframe)
 * - Cross-platform consistency
 * - Client controls rendering style
 * - Type-safe event handlers
 * - Can include dynamic data
 * - Supports styling props
 * - More structured than HTML
 *
 * Use Cases:
 * - Cross-platform UIs (desktop, web, mobile)
 * - Dashboards with consistent styling
 * - Forms with validation
 * - Interactive components
 * - Data visualization
 * - Admin interfaces
 *
 * Best For:
 * - When you want client to control styling
 * - Cross-platform applications
 * - Structured declarative UIs
 * - Type-safe interactions
 * - Native rendering performance
 */
