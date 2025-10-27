/**
 * Remote DOM Example - Phase 3B: application/vnd.mcp-ui.remote-dom MIME type
 *
 * Demonstrates Remote DOM support for MCP UI resources.
 *
 * Remote DOM (@remote-dom/core) allows UI components to render in a parent window
 * while executing in a sandboxed iframe. Unlike HTML which transfers markup,
 * Remote DOM transfers component trees that can be dynamically updated.
 *
 * Run with:
 * npm run build && node dist/examples/interface-remote-dom.js
 */

import type { IUI, IServer } from '../src/interface-types.js';

// ============================================================================
// Example 1: Pre-serialized Remote DOM (Recommended)
// ============================================================================

/**
 * Simple Remote DOM UI with pre-serialized JSON
 *
 * This is the recommended approach for production use.
 * Pre-serialize your Remote DOM tree using @remote-dom/core APIs.
 */
interface SimpleRemoteDOMUI extends IUI {
  uri: 'ui://remote/simple';
  name: 'Simple Remote DOM';
  description: 'A simple Remote DOM component with basic structure';

  // Remote DOM JSON structure
  // {type, properties?, children?}
  remoteDom: `{
    "type": "div",
    "properties": {
      "className": "remote-container",
      "id": "simple-ui"
    },
    "children": [
      {
        "type": "h1",
        "properties": {
          "className": "title"
        },
        "children": ["Remote DOM Example"]
      },
      {
        "type": "p",
        "properties": {
          "className": "description"
        },
        "children": ["This UI is rendered using Remote DOM format"]
      },
      {
        "type": "button",
        "properties": {
          "className": "btn btn-primary",
          "id": "action-button"
        },
        "children": ["Click Me"]
      }
    ]
  }`;
}

// ============================================================================
// Example 2: Simple React Component (Basic Conversion)
// ============================================================================

/**
 * React component with basic conversion to Remote DOM
 *
 * NOTE: This is a basic converter for simple JSX.
 * Complex components with state, hooks, or event handlers should be
 * pre-converted using @remote-dom/core APIs.
 */
interface ReactRemoteDOMUI extends IUI {
  uri: 'ui://remote/react';
  name: 'React Remote DOM';
  description: 'Simple React component converted to Remote DOM';

  // Simple JSX that can be converted
  remoteDom: `
    <div className="react-container">
      <h2>Hello from React</h2>
      <p>This simple JSX is converted to Remote DOM</p>
      <button id="react-button">React Button</button>
    </div>
  `;
}

// ============================================================================
// Example 3: Nested Remote DOM Structure
// ============================================================================

/**
 * Nested Remote DOM component showing complex structure
 */
interface NestedRemoteDOMUI extends IUI {
  uri: 'ui://remote/nested';
  name: 'Nested Remote DOM';
  description: 'Remote DOM with nested component structure';

  remoteDom: `{
    "type": "div",
    "properties": {
      "className": "dashboard"
    },
    "children": [
      {
        "type": "header",
        "properties": {
          "className": "dashboard-header"
        },
        "children": [
          {
            "type": "h1",
            "children": ["Dashboard"]
          },
          {
            "type": "nav",
            "properties": {
              "className": "nav-menu"
            },
            "children": [
              {
                "type": "a",
                "properties": {
                  "href": "#home",
                  "className": "nav-link"
                },
                "children": ["Home"]
              },
              {
                "type": "a",
                "properties": {
                  "href": "#settings",
                  "className": "nav-link"
                },
                "children": ["Settings"]
              }
            ]
          }
        ]
      },
      {
        "type": "main",
        "properties": {
          "className": "dashboard-content"
        },
        "children": [
          {
            "type": "section",
            "properties": {
              "className": "stats"
            },
            "children": [
              {
                "type": "div",
                "properties": {
                  "className": "stat-card"
                },
                "children": [
                  {
                    "type": "h3",
                    "children": ["Users"]
                  },
                  {
                    "type": "p",
                    "properties": {
                      "className": "stat-value"
                    },
                    "children": ["1,234"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }`;
}

// ============================================================================
// Example 4: Form with Input Elements
// ============================================================================

/**
 * Remote DOM form with input elements
 */
interface FormRemoteDOMUI extends IUI {
  uri: 'ui://remote/form';
  name: 'Remote DOM Form';
  description: 'Form built with Remote DOM';

  remoteDom: `{
    "type": "div",
    "properties": {
      "className": "form-container"
    },
    "children": [
      {
        "type": "h2",
        "children": ["Contact Form"]
      },
      {
        "type": "form",
        "properties": {
          "id": "contact-form"
        },
        "children": [
          {
            "type": "label",
            "properties": {
              "htmlFor": "name"
            },
            "children": ["Name:"]
          },
          {
            "type": "input",
            "properties": {
              "type": "text",
              "id": "name",
              "name": "name",
              "placeholder": "Enter your name"
            }
          },
          {
            "type": "label",
            "properties": {
              "htmlFor": "email"
            },
            "children": ["Email:"]
          },
          {
            "type": "input",
            "properties": {
              "type": "email",
              "id": "email",
              "name": "email",
              "placeholder": "Enter your email"
            }
          },
          {
            "type": "button",
            "properties": {
              "type": "submit",
              "className": "btn-submit"
            },
            "children": ["Submit"]
          }
        ]
      }
    ]
  }`;
}

// ============================================================================
// Example 5: List with Dynamic Data
// ============================================================================

/**
 * Remote DOM list structure
 */
interface ListRemoteDOMUI extends IUI {
  uri: 'ui://remote/list';
  name: 'Remote DOM List';
  description: 'List component using Remote DOM';

  remoteDom: `{
    "type": "div",
    "properties": {
      "className": "list-container"
    },
    "children": [
      {
        "type": "h2",
        "children": ["Todo List"]
      },
      {
        "type": "ul",
        "properties": {
          "className": "todo-list"
        },
        "children": [
          {
            "type": "li",
            "properties": {
              "className": "todo-item"
            },
            "children": [
              {
                "type": "input",
                "properties": {
                  "type": "checkbox",
                  "id": "task-1"
                }
              },
              {
                "type": "label",
                "properties": {
                  "htmlFor": "task-1"
                },
                "children": ["Complete Remote DOM implementation"]
              }
            ]
          },
          {
            "type": "li",
            "properties": {
              "className": "todo-item"
            },
            "children": [
              {
                "type": "input",
                "properties": {
                  "type": "checkbox",
                  "id": "task-2"
                }
              },
              {
                "type": "label",
                "properties": {
                  "htmlFor": "task-2"
                },
                "children": ["Write tests"]
              }
            ]
          },
          {
            "type": "li",
            "properties": {
              "className": "todo-item"
            },
            "children": [
              {
                "type": "input",
                "properties": {
                  "type": "checkbox",
                  "id": "task-3"
                }
              },
              {
                "type": "label",
                "properties": {
                  "htmlFor": "task-3"
                },
                "children": ["Create examples"]
              }
            ]
          }
        ]
      }
    ]
  }`;
}

// ============================================================================
// Server Configuration
// ============================================================================

interface RemoteDOMServer extends IServer {
  name: 'remote-dom-example';
  version: '1.0.0';
  description: 'Example server demonstrating Remote DOM MIME type support';
}

export default class RemoteDOMExampleServer implements RemoteDOMServer {
  // All UIs are static (no dynamic methods needed)
  // Remote DOM content is served directly with application/vnd.mcp-ui.remote-dom MIME type
}

// ============================================================================
// USAGE NOTES
// ============================================================================

/**
 * REMOTE DOM STRUCTURE:
 *
 * A Remote DOM node has this structure:
 * {
 *   type: string,          // HTML element type (div, button, etc.)
 *   properties?: object,   // HTML attributes (className, id, etc.)
 *   children?: array       // Array of child nodes (strings or objects)
 * }
 *
 * LIMITATIONS OF BASIC REACT CONVERSION:
 *
 * The basic React converter supports:
 * ✓ Simple JSX elements: <div>Hello</div>
 * ✓ Attributes: <div className="foo">Hello</div>
 * ✓ Nested elements: <div><span>Hello</span></div>
 * ✓ Self-closing tags: <input type="text" />
 *
 * It does NOT support:
 * ✗ Event handlers: onClick={() => ...}
 * ✗ State/hooks: useState, useEffect
 * ✗ Fragments: <></>
 * ✗ Conditional rendering: {condition && <div>...</div>}
 * ✗ Array mapping: {items.map(...)}
 * ✗ Component composition: <MyComponent />
 *
 * For complex React components, use @remote-dom/core to pre-convert:
 *
 * import { RemoteElement } from '@remote-dom/core';
 *
 * const remoteDom = new RemoteElement('div', {
 *   className: 'container'
 * }, [
 *   new RemoteElement('h1', {}, ['Hello']),
 *   new RemoteElement('p', {}, ['World'])
 * ]);
 *
 * const serialized = JSON.stringify(remoteDom.serialize());
 *
 * MIME TYPE:
 *
 * Remote DOM UIs are served with MIME type:
 * application/vnd.mcp-ui.remote-dom
 *
 * This allows clients to differentiate between:
 * - text/html: Standard HTML markup
 * - text/uri-list: External URL reference
 * - application/vnd.mcp-ui.remote-dom: Remote DOM component tree
 *
 * TESTING:
 *
 * Run the test suite:
 * npm run build && node dist/tests/test-remote-dom.js
 *
 * Verify MIME type compliance:
 * The test will check that resources are served with the correct MIME type
 * and that content is valid Remote DOM JSON.
 */
