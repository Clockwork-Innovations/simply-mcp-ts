/**
 * Complete MCP UI Protocol Example
 *
 * Demonstrates all 5 MCP UI protocol actions:
 * 1. Tool Calls (window.callTool / useMCPTool)
 * 2. Prompt Submission (window.submitPrompt / usePromptSubmit)
 * 3. Intent Triggers (window.triggerIntent / useIntent)
 * 4. Notifications (window.notify / useNotify)
 * 5. Link Opening (window.openLink / useOpenLink)
 *
 * This example shows the complete feature set of Simply-MCP v4.0+
 */

import React, { useState } from 'react';
import {
  useMCPTool,
  usePromptSubmit,
  useIntent,
  useNotify,
  useOpenLink,
} from '../../src/client/hooks/index.js';

// ============================================================================
// Mock UI Components (Any library works: shadcn, Radix, MUI, Chakra, etc.)
// ============================================================================

const Button = ({ children, onClick, disabled, variant = 'default' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      background: variant === 'outline' ? 'transparent' : '#0066cc',
      color: variant === 'outline' ? '#0066cc' : 'white',
      border: variant === 'outline' ? '1px solid #0066cc' : 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontWeight: 500,
      marginRight: '0.5rem',
      marginBottom: '0.5rem',
    }}
  >
    {children}
  </button>
);

const Card = ({ title, children }: any) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '1rem',
    }}
  >
    {title && (
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        {title}
      </h3>
    )}
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: any) => (
  <span
    style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: 500,
      background: variant === 'success' ? '#dcfce7' : '#f3f4f6',
      color: variant === 'success' ? '#166534' : '#374151',
      marginRight: '0.5rem',
      marginBottom: '0.5rem',
    }}
  >
    {children}
  </span>
);

// ============================================================================
// Types
// ============================================================================

interface Product {
  id: string;
  name: string;
  price: number;
}

// ============================================================================
// Complete MCP UI Protocol Example
// ============================================================================

export default function CompleteMCPUIExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const [promptText, setPromptText] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://example.com');

  // ============================================================================
  // 1. TOOL CALLS - Complex async operations with state management
  // ============================================================================

  const search = useMCPTool<Product[]>('search_products', {
    onSuccess: (products) => {
      notifications.success(`Found ${products.length} products!`);
    },
    onError: (error) => {
      notifications.error(`Search failed: ${error.message}`);
    },
  });

  const analyze = useMCPTool('analyze_data', {
    onSuccess: () => {
      notifications.success('Analysis complete!');
    },
  });

  // ============================================================================
  // 2. PROMPT SUBMISSION - Send prompts to LLM
  // ============================================================================

  const promptSubmit = usePromptSubmit({
    onSubmit: (prompt) => {
      notifications.info(`Submitted prompt: "${prompt.substring(0, 50)}..."`);
    },
    onError: (error) => {
      notifications.error(`Prompt submission failed: ${error.message}`);
    },
    preventDuplicates: true,
    trackHistory: true,
  });

  // ============================================================================
  // 3. INTENT TRIGGERS - Application navigation/actions
  // ============================================================================

  const navigateIntent = useIntent('navigate', {
    onTrigger: (params) => {
      notifications.info(`Navigating to: ${params.page}`);
    },
    debounce: 300,
  });

  const refreshIntent = useIntent('refresh', {
    onTrigger: () => {
      notifications.info('Refreshing data...');
    },
  });

  // ============================================================================
  // 4. NOTIFICATIONS - User feedback
  // ============================================================================

  const notifications = useNotify({
    onNotify: (level, message) => {
      console.log(`[${level.toUpperCase()}] ${message}`);
    },
    rateLimit: {
      maxPerMinute: 10,
      burst: 3,
    },
  });

  // ============================================================================
  // 5. LINK OPENING - External navigation
  // ============================================================================

  const linkOpener = useOpenLink({
    validateUrl: true,
    httpsOnly: false,
    trackHistory: true,
    onOpen: (url) => {
      notifications.success(`Opening: ${url}`);
    },
    onError: (error, url) => {
      notifications.error(`Failed to open link: ${error.message}`);
    },
  });

  // ============================================================================
  // UI Render
  // ============================================================================

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Complete MCP UI Protocol
        </h1>
        <p style={{ color: '#666', fontSize: '1.125rem' }}>
          All 5 protocol actions in one example
        </p>
      </div>

      {/* ===================================================================== */}
      {/* 1. TOOL CALLS */}
      {/* ===================================================================== */}
      <Card title="1️⃣ Tool Calls - Async Operations with State Management">
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Complex operations that return data and require loading/error states.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && search.execute({ query: searchQuery })}
            placeholder="Search for products..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
            }}
          />
          <Button
            onClick={() => search.execute({ query: searchQuery })}
            disabled={search.loading || !searchQuery.trim()}
          >
            {search.loading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            onClick={() => analyze.execute({ type: 'full' })}
            disabled={analyze.loading}
            variant="outline"
          >
            {analyze.loading ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        {search.data && (
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
            <strong>Results:</strong> {search.data.length} products found
          </div>
        )}

        {search.error && (
          <div style={{ padding: '1rem', background: '#fee', borderRadius: '6px', color: '#c00' }}>
            Error: {search.error.message}
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <strong>Hook Used:</strong> <code>useMCPTool()</code> - Full state management
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 2. PROMPT SUBMISSION */}
      {/* ===================================================================== */}
      <Card title="2️⃣ Prompt Submission - Send to LLM">
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Submit prompts to the LLM for processing. Fire-and-forget action.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && promptText.trim()) {
                promptSubmit.submit(promptText);
                setPromptText('');
              }
            }}
            placeholder="Enter a prompt for the LLM..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
            }}
          />
          <Button
            onClick={() => {
              promptSubmit.submit(promptText);
              setPromptText('');
            }}
            disabled={promptSubmit.submitting || !promptText.trim()}
          >
            {promptSubmit.submitting ? 'Submitting...' : 'Submit to LLM'}
          </Button>
        </div>

        {promptSubmit.history.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ fontSize: '0.875rem' }}>Recent Prompts:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {promptSubmit.history.slice(0, 3).map((prompt, i) => (
                <Badge key={i}>{prompt.substring(0, 40)}...</Badge>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <strong>Hook Used:</strong> <code>usePromptSubmit()</code> - With history tracking
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 3. INTENT TRIGGERS */}
      {/* ===================================================================== */}
      <Card title="3️⃣ Intent Triggers - Application Actions">
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Trigger application-level actions like navigation, refresh, etc.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <Button onClick={() => navigateIntent.trigger({ page: 'dashboard' })}>
            Navigate to Dashboard
          </Button>
          <Button onClick={() => navigateIntent.trigger({ page: 'settings' })} variant="outline">
            Navigate to Settings
          </Button>
          <Button onClick={() => refreshIntent.trigger()} variant="outline">
            Refresh Data
          </Button>
        </div>

        {navigateIntent.history.length > 0 && (
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Navigation History:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {navigateIntent.history.slice(0, 5).map((entry, i) => (
                <Badge key={i} variant="success">
                  {entry.params?.page || 'unknown'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <strong>Hook Used:</strong> <code>useIntent()</code> - With debouncing
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 4. NOTIFICATIONS */}
      {/* ===================================================================== */}
      <Card title="4️⃣ Notifications - User Feedback">
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Show user feedback for actions. Supports info, success, warning, error levels.
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <Button onClick={() => notifications.info('This is an info message')}>
            Info
          </Button>
          <Button onClick={() => notifications.success('Operation successful!')}>
            Success
          </Button>
          <Button onClick={() => notifications.warning('This is a warning')}>
            Warning
          </Button>
          <Button onClick={() => notifications.error('Something went wrong')}>
            Error
          </Button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <strong>Hook Used:</strong> <code>useNotify()</code> - With rate limiting
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* 5. LINK OPENING */}
      {/* ===================================================================== */}
      <Card title="5️⃣ Link Opening - External Navigation">
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Open external URLs with validation and security checks.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL to open..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
            }}
          />
          <Button onClick={() => linkOpener.open(linkUrl)} disabled={linkOpener.opening}>
            {linkOpener.opening ? 'Opening...' : 'Open Link'}
          </Button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <Button onClick={() => linkOpener.open('https://github.com/Clockwork-Innovations/simply-mcp-ts')}>
            Open GitHub
          </Button>
          <Button
            onClick={() => linkOpener.open('https://docs.claude.com')}
            variant="outline"
          >
            Open Docs
          </Button>
        </div>

        {linkOpener.history.length > 0 && (
          <div>
            <strong style={{ fontSize: '0.875rem' }}>Recently Opened:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {linkOpener.history.slice(0, 3).map((entry, i) => (
                <Badge key={i}>{new URL(entry.url).hostname}</Badge>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <strong>Hook Used:</strong> <code>useOpenLink()</code> - With URL validation
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* Protocol Overview */}
      {/* ===================================================================== */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f0f9ff',
          border: '2px solid #0066cc',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          ✅ MCP UI Protocol - 100% Complete
        </h3>

        <div style={{ fontSize: '0.875rem', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Tool Calls:</strong> Complex async operations → <code>useMCPTool()</code>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Prompt Submission:</strong> LLM prompts → <code>usePromptSubmit()</code> or{' '}
            <code>window.submitPrompt()</code>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Intent Triggers:</strong> App actions → <code>useIntent()</code> or{' '}
            <code>window.triggerIntent()</code>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Notifications:</strong> User feedback → <code>useNotify()</code> or{' '}
            <code>window.notify()</code>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>✅ Link Opening:</strong> External URLs → <code>useOpenLink()</code> or{' '}
            <code>window.openLink()</code>
          </div>
        </div>

        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          <strong>Development Experience:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>Works with ANY React component library (shadcn, Radix, MUI, Chakra, etc.)</li>
            <li>Zero boilerplate - hooks handle all state management</li>
            <li>TypeScript support with full type inference</li>
            <li>Memory leak prevention built-in</li>
            <li>Optimistic updates with automatic rollback</li>
            <li>Request deduplication and retry logic</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
