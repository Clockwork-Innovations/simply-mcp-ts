/**
 * React Component UI Example
 *
 * Demonstrates how to use React components with the Interface API.
 * This example shows:
 * - React component UI definition
 * - Tool integration via window.callTool()
 * - Notification integration via window.notify()
 * - External dependencies from CDN
 */

import type { IServer, IUI, ITool } from '../src/index.js';

/**
 * React Counter UI
 *
 * This UI loads a React component from an external file.
 * The component can call tools and send notifications.
 *
 * File structure:
 * - server.ts (this file)
 * - ui/Counter.tsx (React component)
 */
interface CounterUI extends IUI {
  uri: 'ui://counter';
  name: 'Interactive Counter';
  description: 'React-based counter with tool integration';

  // Path to React component (relative to server file)
  component: './ui/Counter.tsx';

  // Tools this UI can call (security allowlist)
  tools: ['increment', 'decrement', 'reset'];

  // External dependencies from CDN (optional)
  // Format: 'package@version' or just 'package' for latest
  dependencies: [];

  // Bundle configuration (NEW in v4.0)
  // Enable bundling to include dependencies in output
  // This eliminates CDN requests and improves offline support
  bundle: {
    minify: true;           // Minify output for smaller file size
    sourcemap: true;        // Generate source maps for debugging
    external: ['react', 'react-dom']; // Still load React from CDN
    format: 'iife';         // Browser-friendly format
  };

  // Preferred size (rendering hint for MCP clients)
  size: {
    width: 400;
    height: 300;
  };
}

/**
 * Increment Tool
 */
interface IncrementTool extends ITool {
  name: 'increment';
  description: 'Increment counter by specified amount';
  params: {
    current: number;
    amount?: number; // Optional, defaults to 1
  };
  returns: {
    newValue: number;
    message: string;
  };
}

/**
 * Decrement Tool
 */
interface DecrementTool extends ITool {
  name: 'decrement';
  description: 'Decrement counter by specified amount';
  params: {
    current: number;
    amount?: number; // Optional, defaults to 1
  };
  returns: {
    newValue: number;
    message: string;
  };
}

/**
 * Reset Tool
 */
interface ResetTool extends ITool {
  name: 'reset';
  description: 'Reset counter to zero';
  params: {};
  returns: {
    newValue: number;
    message: string;
  };
}

/**
 * Server Definition
 */
interface ReactCounterServer extends IServer {
  name: 'react-counter-server';
  version: '1.0.0';
  description: 'MCP server with React component UI';
}

/**
 * Server Implementation
 */
export default class implements ReactCounterServer {
  /**
   * Increment tool implementation
   */
  increment: IncrementTool = async (params) => {
    const amount = params.amount || 1;
    const newValue = params.current + amount;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            newValue,
            message: `Incremented by ${amount}`,
          }),
        },
      ],
    };
  };

  /**
   * Decrement tool implementation
   */
  decrement: DecrementTool = async (params) => {
    const amount = params.amount || 1;
    const newValue = params.current - amount;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            newValue,
            message: `Decremented by ${amount}`,
          }),
        },
      ],
    };
  };

  /**
   * Reset tool implementation
   */
  reset: ResetTool = async (params) => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            newValue: 0,
            message: 'Counter reset',
          }),
        },
      ],
    };
  };
}

/**
 * Example React Component (ui/Counter.tsx)
 *
 * Save this in a separate file: ui/Counter.tsx
 *
 * ```tsx
 * import React, { useState } from 'react';
 *
 * export default function Counter() {
 *   const [count, setCount] = useState(0);
 *   const [loading, setLoading] = useState(false);
 *
 *   const handleIncrement = async () => {
 *     setLoading(true);
 *     try {
 *       // Call MCP tool via window.callTool (injected by adapter)
 *       const result = await window.callTool('increment', {
 *         current: count,
 *         amount: 1,
 *       });
 *
 *       const data = JSON.parse(result.content[0].text);
 *       setCount(data.newValue);
 *       window.notify('info', data.message);
 *     } catch (error) {
 *       window.notify('error', 'Failed to increment: ' + error.message);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   const handleDecrement = async () => {
 *     setLoading(true);
 *     try {
 *       const result = await window.callTool('decrement', {
 *         current: count,
 *         amount: 1,
 *       });
 *
 *       const data = JSON.parse(result.content[0].text);
 *       setCount(data.newValue);
 *       window.notify('info', data.message);
 *     } catch (error) {
 *       window.notify('error', 'Failed to decrement: ' + error.message);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   const handleReset = async () => {
 *     setLoading(true);
 *     try {
 *       const result = await window.callTool('reset', {});
 *
 *       const data = JSON.parse(result.content[0].text);
 *       setCount(data.newValue);
 *       window.notify('success', data.message);
 *     } catch (error) {
 *       window.notify('error', 'Failed to reset: ' + error.message);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <div style={{
 *       padding: '20px',
 *       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
 *       maxWidth: '400px',
 *       margin: '0 auto',
 *     }}>
 *       <h1>Interactive Counter</h1>
 *
 *       <div style={{
 *         fontSize: '48px',
 *         fontWeight: 'bold',
 *         textAlign: 'center',
 *         margin: '20px 0',
 *       }}>
 *         {count}
 *       </div>
 *
 *       <div style={{
 *         display: 'flex',
 *         gap: '10px',
 *         justifyContent: 'center',
 *       }}>
 *         <button
 *           onClick={handleDecrement}
 *           disabled={loading}
 *           style={{
 *             padding: '10px 20px',
 *             fontSize: '16px',
 *             cursor: loading ? 'wait' : 'pointer',
 *             opacity: loading ? 0.6 : 1,
 *           }}
 *         >
 *           -1
 *         </button>
 *
 *         <button
 *           onClick={handleReset}
 *           disabled={loading}
 *           style={{
 *             padding: '10px 20px',
 *             fontSize: '16px',
 *             cursor: loading ? 'wait' : 'pointer',
 *             opacity: loading ? 0.6 : 1,
 *           }}
 *         >
 *           Reset
 *         </button>
 *
 *         <button
 *           onClick={handleIncrement}
 *           disabled={loading}
 *           style={{
 *             padding: '10px 20px',
 *             fontSize: '16px',
 *             cursor: loading ? 'wait' : 'pointer',
 *             opacity: loading ? 0.6 : 1,
 *           }}
 *         >
 *           +1
 *         </button>
 *       </div>
 *
 *       {loading && (
 *         <div style={{
 *           textAlign: 'center',
 *           marginTop: '20px',
 *           color: '#666',
 *         }}>
 *           Loading...
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * Usage:
 * ```bash
 * # 1. Create the React component file
 * mkdir -p ui
 * # Copy the Counter.tsx code above to ui/Counter.tsx
 *
 * # 2. Run the server
 * npx simply-mcp run examples/interface-react-component.ts
 *
 * # 3. Access the UI
 * # The UI will be available as resource: ui://counter
 * # MCP clients can render it in an iframe or webview
 * ```
 *
 * Tool Integration:
 * - window.callTool(toolName, params) - Call MCP tools from React
 * - window.notify(level, message) - Send notifications
 * - Tool allowlist enforced (only listed tools can be called)
 * - Async/await support with Promise-based API
 *
 * Security:
 * - Only tools listed in `tools` array can be called
 * - postMessage API for parent communication
 * - 30 second timeout per tool call
 * - Automatic cleanup on component unmount
 */
