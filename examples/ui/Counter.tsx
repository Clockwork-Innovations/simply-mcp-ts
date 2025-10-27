/**
 * React Counter Component
 *
 * Example React component that integrates with MCP tools.
 * Demonstrates:
 * - Tool calling via window.callTool()
 * - Notification sending via window.notify()
 * - Async state management
 * - Error handling
 */

import React, { useState } from 'react';

// TypeScript declarations for MCP tool helpers
declare global {
  interface Window {
    callTool: (toolName: string, params: any) => Promise<any>;
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  }
}

export default function Counter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleIncrement = async () => {
    setLoading(true);
    try {
      // Call MCP tool via window.callTool (injected by adapter)
      const result = await window.callTool('increment', {
        current: count,
        amount: 1,
      });

      const data = JSON.parse(result.content[0].text);
      setCount(data.newValue);
      window.notify('info', data.message);
    } catch (error: any) {
      window.notify('error', 'Failed to increment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrement = async () => {
    setLoading(true);
    try {
      const result = await window.callTool('decrement', {
        current: count,
        amount: 1,
      });

      const data = JSON.parse(result.content[0].text);
      setCount(data.newValue);
      window.notify('info', data.message);
    } catch (error: any) {
      window.notify('error', 'Failed to decrement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const result = await window.callTool('reset', {});

      const data = JSON.parse(result.content[0].text);
      setCount(data.newValue);
      window.notify('success', data.message);
    } catch (error: any) {
      window.notify('error', 'Failed to reset: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <h1>Interactive Counter</h1>

      <div
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '20px 0',
        }}
      >
        {count}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={handleDecrement}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f5f5f5',
          }}
        >
          -1
        </button>

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f5f5f5',
          }}
        >
          Reset
        </button>

        <button
          onClick={handleIncrement}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f5f5f5',
          }}
        >
          +1
        </button>
      </div>

      {loading && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            color: '#666',
          }}
        >
          Loading...
        </div>
      )}

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#666',
        }}
      >
        <strong>How it works:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Buttons call MCP tools via <code>window.callTool()</code></li>
          <li>Tools update the counter on the server side</li>
          <li>UI updates with the new value from the tool response</li>
          <li>Notifications sent via <code>window.notify()</code></li>
        </ul>
      </div>
    </div>
  );
}
