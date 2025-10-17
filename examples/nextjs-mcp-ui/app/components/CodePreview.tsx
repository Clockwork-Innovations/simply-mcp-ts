/**
 * Code Preview Component
 *
 * Displays syntax-highlighted code with copy-to-clipboard functionality.
 * Used to show the HTML source of UI resources and integration examples.
 *
 * Features:
 * - Syntax highlighting with Prism.js
 * - Copy-to-clipboard button
 * - Line numbers
 * - Collapsible sections
 * - Language selection
 *
 * @module app/components/CodePreview
 */

'use client';

import React, { useState, useEffect } from 'react';

/**
 * Props for CodePreview component
 */
export interface CodePreviewProps {
  /** Code to display */
  code: string;

  /** Programming language for syntax highlighting */
  language?: 'html' | 'typescript' | 'javascript' | 'json';

  /** Show line numbers */
  showLineNumbers?: boolean;

  /** Maximum height before scrolling */
  maxHeight?: string;

  /** Title/label for the code block */
  title?: string;

  /** Whether the code block starts collapsed */
  defaultCollapsed?: boolean;
}

/**
 * Code Preview Component
 *
 * Displays code with syntax highlighting and useful features.
 *
 * @example
 * ```tsx
 * <CodePreview
 *   code={htmlContent}
 *   language="html"
 *   title="HTML Source"
 *   showLineNumbers
 * />
 * ```
 */
export function CodePreview({
  code,
  language = 'html',
  showLineNumbers = true,
  maxHeight = '500px',
  title,
  defaultCollapsed = false,
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Split code into lines for line numbers
  const lines = code.split('\n');

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {title && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              aria-expanded={!isCollapsed}
              aria-controls="code-content"
            >
              <span className="text-gray-400 transition-transform" style={{
                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}>
                ▼
              </span>
              {title}
            </button>
          )}
          {!title && (
            <span className="text-sm font-mono text-gray-500">{language}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <span>✓</span> Copied
              </span>
            ) : (
              'Copy'
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      {!isCollapsed && (
        <div
          id="code-content"
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <div className="relative">
            <pre className="p-4 text-sm font-mono bg-gray-900 text-gray-100">
              {showLineNumbers ? (
                <table className="w-full border-collapse">
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td className="pr-4 text-right text-gray-500 select-none w-12">
                          {index + 1}
                        </td>
                        <td className="text-left">
                          <code className={`language-${language}`}>
                            {line || '\n'}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <code className={`language-${language}`}>{code}</code>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodePreview;
