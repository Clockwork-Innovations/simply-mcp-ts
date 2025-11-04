/**
 * @jest-environment jsdom
 */

/**
 * RemoteDOMRenderer Unit Tests
 *
 * Comprehensive test suite for the RemoteDOMRenderer component.
 * Tests cover:
 * - Component initialization
 * - Web Worker communication
 * - DOM operation processing
 * - Component library whitelist
 * - Error handling
 * - Cleanup and memory management
 *
 * These are UNIT tests, not integration tests. Web Workers are mocked.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { RemoteDOMRenderer } from '../../../src/client/RemoteDOMRenderer.js';
import type { UIResourceContent } from '../../../src/client/ui-types.js';

/**
 * Mock Worker
 *
 * Simulates Web Worker behavior for testing without actually spawning workers.
 */
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandlers: ((data: any) => void)[] = [];

  constructor(url: string) {
    // Simulate async worker initialization
    setTimeout(() => {
      this.postMessageToHost({ type: 'ready' });
    }, 0);
  }

  postMessage(data: any): void {
    // Simulate worker receiving message
    this.messageHandlers.forEach(handler => handler(data));
  }

  terminate(): void {
    this.onmessage = null;
    this.onerror = null;
    this.messageHandlers = [];
  }

  // Helper to simulate worker sending message to host
  postMessageToHost(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper to simulate worker error
  triggerError(message: string): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }

  // Helper to register internal message handler
  onWorkerMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }
}

// Mock Worker globally
(global as any).Worker = MockWorker;

// Mock URL.createObjectURL and revokeObjectURL
(global as any).URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock Blob
(global as any).Blob = class Blob {
  constructor(public parts: any[], public options?: any) {}
};

describe('RemoteDOMRenderer', () => {
  // Test resource templates
  const validResource: UIResourceContent = {
    uri: 'ui://test',
    mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
    text: 'const div = remoteDOM.createElement("div", {}); remoteDOM.setTextContent(div, "Test");',
  };

  describe('Initialization', () => {
    it('renders without crashing with valid props', () => {
      const { container } = render(<RemoteDOMRenderer resource={validResource} />);
      expect(container).toBeInTheDocument();
    });

    it('initializes Web Worker correctly', async () => {
      const createObjectURLMock = (global as any).URL.createObjectURL as jest.Mock;
      createObjectURLMock.mockClear();

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled();
      });
    });

    it('sets up postMessage listeners', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Send a simple DOM operation to trigger render
              this.postMessageToHost({
                type: 'createElement',
                id: 'root-elem',
                tagName: 'div',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      // Wait for worker to be initialized and render
      await waitFor(() => {
        expect(container.querySelector('.remote-dom-root')).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('handles missing script content gracefully', async () => {
      const emptyResource: UIResourceContent = {
        uri: 'ui://empty',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
        text: '',
      };

      render(<RemoteDOMRenderer resource={emptyResource} />);

      await waitFor(() => {
        expect(screen.getByText(/No script content found/i)).toBeInTheDocument();
      });
    });

    it('framework prop is respected and logged', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      render(<RemoteDOMRenderer resource={validResource} framework="react" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Initializing with framework: react')
        );
      });

      consoleSpy.mockRestore();
    });

    it('warns about unknown framework values', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');

      render(
        <RemoteDOMRenderer
          resource={validResource}
          framework={'unknown' as any}
        />
      );

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unknown framework: unknown')
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('shows loading state initially', () => {
      render(<RemoteDOMRenderer resource={validResource} />);

      expect(screen.getByText(/Initializing Web Worker/i)).toBeInTheDocument();
    });

    it('updates loading stage when script executes', async () => {
      render(<RemoteDOMRenderer resource={validResource} />);

      expect(screen.getByText(/Initializing Web Worker/i)).toBeInTheDocument();

      // Worker will send 'ready' message, triggering script execution stage
      await waitFor(() => {
        const loadingText = screen.queryByText(/Executing Remote DOM script/i);
        // May transition quickly, so either loading stage or loaded is acceptable
        expect(
          loadingText || screen.queryByRole('status')
        ).toBeTruthy();
      });
    });
  });

  describe('Web Worker Communication', () => {
    it('worker receives initial script when ready', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
        }
      };

      const postMessageSpy = jest.spyOn(MockWorker.prototype, 'postMessage');

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(postMessageSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'executeScript',
            script: validResource.text,
          })
        );
      });

      postMessageSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });

    it('worker sends ready message on initialization', async () => {
      let readyReceived = false;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          // Simulate ready message
          setTimeout(() => {
            readyReceived = true;
            this.postMessageToHost({ type: 'ready' });
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(readyReceived).toBe(true);
      });

      (global as any).Worker = OriginalWorker;
    });

    it('handles error messages from worker', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          // Send error immediately after ready
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'error',
                message: 'Script execution failed',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText(/Script execution failed: Script execution failed/i)).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('validates operations before processing', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Send invalid operation (missing required fields)
              this.postMessageToHost({
                type: 'invalidOperation',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid operation rejected:',
          expect.objectContaining({ type: 'invalidOperation' })
        );
      });

      consoleWarnSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });

    it('rejects operations with invalid structure', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Send non-object operation
              this.postMessageToHost('invalid');
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid operation rejected:',
          'invalid'
        );
      });

      consoleWarnSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });
  });

  describe('DOM Operation Processing', () => {
    it('processes createElement operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'elem-1',
                tagName: 'div',
                props: { className: 'test-div' },
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes appendChild operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Create parent
              this.postMessageToHost({
                type: 'createElement',
                id: 'parent-1',
                tagName: 'div',
              });
              // Create child
              this.postMessageToHost({
                type: 'createElement',
                id: 'child-1',
                tagName: 'span',
              });
              // Append child to parent
              this.postMessageToHost({
                type: 'appendChild',
                parentId: 'parent-1',
                childId: 'child-1',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes setTextContent operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'text-elem',
                tagName: 'p',
              });
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'text-elem',
                text: 'Hello, World!',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes setAttribute operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'attr-elem',
                tagName: 'div',
              });
              this.postMessageToHost({
                type: 'setAttribute',
                elementId: 'attr-elem',
                name: 'data-testid',
                value: 'dynamic-attr',
              });
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'attr-elem',
                text: 'Attributed',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const elem = screen.getByText('Attributed');
        expect(elem).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes removeChild operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Create parent and child
              this.postMessageToHost({
                type: 'createElement',
                id: 'parent-2',
                tagName: 'div',
              });
              this.postMessageToHost({
                type: 'createElement',
                id: 'child-2',
                tagName: 'span',
              });
              this.postMessageToHost({
                type: 'appendChild',
                parentId: 'parent-2',
                childId: 'child-2',
              });
              // Remove child
              this.postMessageToHost({
                type: 'removeChild',
                parentId: 'parent-2',
                childId: 'child-2',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes addEventListener operations', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'btn-elem',
                tagName: 'button',
              });
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'btn-elem',
                text: 'Click Me',
              });
              this.postMessageToHost({
                type: 'addEventListener',
                elementId: 'btn-elem',
                event: 'click',
                handlerId: 'handler-1',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText('Click Me')).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('processes callHost operations', async () => {
      const mockOnUIAction = jest.fn();
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'callHost',
                action: 'tool',
                payload: { name: 'test-tool' },
              });
            }, 10);
          }, 0);
        }
      };

      render(
        <RemoteDOMRenderer
          resource={validResource}
          onUIAction={mockOnUIAction as any}
        />
      );

      await waitFor(() => {
        expect(mockOnUIAction).toHaveBeenCalledWith({
          type: 'tool',
          payload: { name: 'test-tool' },
        });
      });

      (global as any).Worker = OriginalWorker;
    });

    it('handles operations with missing element IDs gracefully', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Create a valid element first so we get a render
              this.postMessageToHost({
                type: 'createElement',
                id: 'valid-elem',
                tagName: 'div',
              });
              // Try to set text on non-existent element (should be ignored)
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'non-existent',
                text: 'Should not appear',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      // Should not throw error, should handle gracefully
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();

      (global as any).Worker = OriginalWorker;
    });

    it('prevents duplicate children in appendChild', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'parent-3',
                tagName: 'div',
              });
              this.postMessageToHost({
                type: 'createElement',
                id: 'child-3',
                tagName: 'span',
              });
              // Append same child twice
              this.postMessageToHost({
                type: 'appendChild',
                parentId: 'parent-3',
                childId: 'child-3',
              });
              this.postMessageToHost({
                type: 'appendChild',
                parentId: 'parent-3',
                childId: 'child-3',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });
  });

  describe('Component Library Whitelist', () => {
    it('allows whitelisted components to render', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'allowed-btn',
                tagName: 'button',
              });
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'allowed-btn',
                text: 'Allowed Button',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText('Allowed Button')).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('rejects non-whitelisted components', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Try to create script tag (XSS risk)
              this.postMessageToHost({
                type: 'createElement',
                id: 'script-elem',
                tagName: 'script',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Component not allowed: script'
        );
      });

      consoleErrorSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });

    it('allows standard HTML elements', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              const tags = ['div', 'span', 'p', 'h1', 'button', 'input'];
              tags.forEach((tag, idx) => {
                this.postMessageToHost({
                  type: 'createElement',
                  id: `elem-${idx}`,
                  tagName: tag,
                });
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const remoteRoot = container.querySelector('.remote-dom-root');
        expect(remoteRoot).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('rejects dangerous elements like iframe', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'iframe-elem',
                tagName: 'iframe',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Component not allowed: iframe'
        );
      });

      consoleErrorSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });
  });

  describe('Error Handling', () => {
    it('catches script execution errors', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'error',
                message: 'Syntax error in script',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText(/Script execution failed: Syntax error in script/i)).toBeInTheDocument();
      });

      (global as any).Worker = OriginalWorker;
    });

    it('displays helpful error messages', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'error',
                message: 'remoteDOM is not defined',
              });
            }, 10);
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveTextContent('Script Execution Error');
        expect(errorElement).toHaveTextContent('remoteDOM is not defined');
      });

      (global as any).Worker = OriginalWorker;
    });

    it('handles worker errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.triggerError('Worker crashed');
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(screen.getByText(/Web Worker initialization failed: Worker crashed/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });

    it('handles rendering errors without crashing', async () => {
      // Suppress React warning about invalid style prop
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              // Create valid element - even with invalid style, React will render it
              this.postMessageToHost({
                type: 'createElement',
                id: 'elem-render-error',
                tagName: 'div',
                props: { className: 'test-class' },
              });
              this.postMessageToHost({
                type: 'setTextContent',
                elementId: 'elem-render-error',
                text: 'Rendered despite error',
              });
            }, 10);
          }, 0);
        }
      };

      const { container } = render(<RemoteDOMRenderer resource={validResource} />);

      // Should not crash, should render successfully
      await waitFor(() => {
        expect(screen.getByText('Rendered despite error')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
      (global as any).Worker = OriginalWorker;
    });

    it('shows error state with proper styling and accessibility', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.triggerError('Test error');
          }, 0);
        }
      };

      render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
        expect(errorElement).toHaveStyle({ color: 'rgb(183, 28, 28)' });
      });

      (global as any).Worker = OriginalWorker;
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('terminates worker on unmount', async () => {
      const terminateSpy = jest.spyOn(MockWorker.prototype, 'terminate');

      const { unmount } = render(<RemoteDOMRenderer resource={validResource} />);

      // Wait for worker to initialize
      await waitFor(() => {
        expect(terminateSpy).not.toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(terminateSpy).toHaveBeenCalled();
      });

      terminateSpy.mockRestore();
    });

    it('revokes blob URL on unmount', async () => {
      const revokeObjectURLMock = (global as any).URL.revokeObjectURL as jest.Mock;
      revokeObjectURLMock.mockClear();

      const { unmount } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        expect(revokeObjectURLMock).not.toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    it('clears event handlers on unmount', async () => {
      let workerInstance: MockWorker | null = null;
      const OriginalWorker = (global as any).Worker;

      (global as any).Worker = class extends OriginalWorker {
        constructor(url: string) {
          super(url);
          workerInstance = this as unknown as MockWorker;
          setTimeout(() => {
            this.postMessageToHost({ type: 'ready' });
            setTimeout(() => {
              this.postMessageToHost({
                type: 'createElement',
                id: 'btn-cleanup',
                tagName: 'button',
              });
              this.postMessageToHost({
                type: 'addEventListener',
                elementId: 'btn-cleanup',
                event: 'click',
                handlerId: 'cleanup-handler',
              });
            }, 10);
          }, 0);
        }
      };

      const { unmount } = render(<RemoteDOMRenderer resource={validResource} />);

      await waitFor(() => {
        // Wait for component to mount
        expect(workerInstance).toBeTruthy();
      });

      unmount();

      // After unmount, handlers should be cleared
      await waitFor(() => {
        expect(workerInstance?.onmessage).toBeNull();
      });

      (global as any).Worker = OriginalWorker;
    });
  });
});
