/**
 * Chat Assistant Component
 *
 * Comprehensive chat interface demonstrating:
 * - Message history management with state
 * - User input handling
 * - Tool integration via window.callTool()
 * - Loading states during AI responses
 * - Error handling and display
 * - Auto-scroll to latest messages
 * - Message formatting and styling
 * - Clear history functionality
 *
 * This component demonstrates the UI pattern for MCP sampling integration.
 * The actual sampling happens server-side in the tool handler.
 */

import React, { useState, useEffect, useRef } from 'react';

// TypeScript declarations for MCP tool helpers
declare global {
  interface Window {
    callTool: (toolName: string, params: any) => Promise<any>;
    notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  }
}

// Type definitions for chat messages
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Main Chat Assistant Component
 */
export default function ChatAssistant() {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle send message
   */
  const handleSend = async () => {
    // Validate input
    if (!input.trim() || loading) {
      return;
    }

    const userMessageText = input.trim();
    setInput('');
    setError(null);

    // Add user message to UI immediately
    const userMessage: Message = {
      role: 'user',
      content: userMessageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show loading state
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call MCP tool to send message and get AI response
      const result = await window.callTool('send_message', {
        message: userMessageText,
        history,
      });

      // Parse response
      const responseData = JSON.parse(result.content[0].text);

      // Add AI message to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseData.message,
        timestamp: new Date(responseData.timestamp),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Show success notification
      window.notify('success', 'Response received');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      window.notify('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle clear history
   */
  const handleClearHistory = async () => {
    if (messages.length === 0) {
      return;
    }

    if (!confirm('Are you sure you want to clear the conversation history?')) {
      return;
    }

    try {
      const result = await window.callTool('clear_history', {});
      const data = JSON.parse(result.content[0].text);

      if (data.success) {
        setMessages([]);
        setError(null);
        window.notify('success', data.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      window.notify('error', errorMessage);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Chat Assistant</h1>
          <p style={styles.subtitle}>
            Powered by MCP Sampling
            {messages.length > 0 && ` • ${messages.length} messages`}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            style={styles.clearButton}
            onClick={handleClearHistory}
            disabled={loading}
          >
            🗑️ Clear History
          </button>
        )}
      </header>

      {/* Messages Container */}
      <div style={styles.messagesContainer}>
        {/* Empty State */}
        {messages.length === 0 && !loading && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <h2 style={styles.emptyTitle}>Start a Conversation</h2>
            <p style={styles.emptyText}>
              Type a message below to chat with the AI assistant
            </p>
            <div style={styles.suggestionChips}>
              <button
                style={styles.chip}
                onClick={() => setInput('Hello! Can you help me?')}
              >
                👋 Say hello
              </button>
              <button
                style={styles.chip}
                onClick={() => setInput('What can you help me with?')}
              >
                ❓ Ask what I can do
              </button>
              <button
                style={styles.chip}
                onClick={() => setInput('Tell me something interesting')}
              >
                ✨ Get inspired
              </button>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((message, idx) => (
          <div
            key={idx}
            style={{
              ...styles.messageWrapper,
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                ...styles.message,
                ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageRole}>
                {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
              </div>
              <div style={styles.messageContent}>{message.content}</div>
              <div style={styles.messageTime}>{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.message, ...styles.assistantMessage }}>
              <div style={styles.messageRole}>🤖 Assistant</div>
              <div style={styles.typingIndicator}>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
                <span style={styles.typingDot}></span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={styles.errorMessage}>
            ❌ Error: {error}
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={styles.input}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendButton,
            ...(loading || !input.trim() ? styles.sendButtonDisabled : {}),
          }}
        >
          {loading ? '⏳' : '📤'} Send
        </button>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          <strong>Features:</strong> Message history • Tool integration • Loading states •
          Error handling • Auto-scroll • MCP sampling pattern
        </p>
      </footer>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '2px solid #e1e8ed',
  },

  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2c3e50',
    marginBottom: '4px',
  },

  subtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
  },

  clearButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    border: '2px solid #e74c3c',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#e74c3c',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    margin: 'auto',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },

  emptyTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '8px',
  },

  emptyText: {
    fontSize: '16px',
    color: '#7f8c8d',
    marginBottom: '24px',
  },

  suggestionChips: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  chip: {
    padding: '10px 16px',
    fontSize: '14px',
    border: '2px solid #e1e8ed',
    borderRadius: '20px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  messageWrapper: {
    display: 'flex',
    marginBottom: '4px',
  },

  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  userMessage: {
    backgroundColor: '#3498db',
    color: 'white',
  },

  assistantMessage: {
    backgroundColor: 'white',
    color: '#2c3e50',
  },

  messageRole: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '6px',
    opacity: 0.8,
  },

  messageContent: {
    fontSize: '15px',
    lineHeight: 1.5,
    marginBottom: '6px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  messageTime: {
    fontSize: '11px',
    opacity: 0.6,
    textAlign: 'right',
  },

  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },

  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#7f8c8d',
    animation: 'typing 1.4s infinite',
  },

  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '8px',
    border: '1px solid #f5c6cb',
    textAlign: 'center',
  },

  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '2px solid #e1e8ed',
  },

  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e1e8ed',
    borderRadius: '8px',
    transition: 'border-color 0.2s',
  },

  sendButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3498db',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  footer: {
    padding: '12px 20px',
    backgroundColor: 'white',
    borderTop: '1px solid #e1e8ed',
  },

  footerText: {
    fontSize: '12px',
    color: '#7f8c8d',
    textAlign: 'center',
  },
};
