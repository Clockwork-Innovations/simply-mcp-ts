/**
 * Error Boundary Component
 *
 * React Error Boundary for catching and displaying errors gracefully.
 * Prevents entire app crashes from component errors.
 *
 * Features:
 * - Catches React component errors
 * - Displays user-friendly error messages
 * - Shows error details in development
 * - Reset functionality
 * - Error logging
 *
 * @module app/components/ErrorBoundary
 */

'use client';

import React, { Component, ReactNode } from 'react';

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components */
  children: ReactNode;

  /** Custom fallback component */
  fallback?: (error: Error, reset: () => void) => ReactNode;

  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /** Custom class name */
  className?: string;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches errors in child components and displays fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h2>Something went wrong</h2>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 *   onError={(error) => console.error(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   */
  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      return (
        <div className={`card border-red-200 bg-red-50 ${this.props.className || ''}`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-3xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-900 mb-3">
                Something Went Wrong
              </h2>
              <p className="text-red-700 mb-4">
                An error occurred while rendering this component. Please try
                refreshing the page or contact support if the problem persists.
              </p>

              {/* Error Message */}
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
                <div className="text-sm font-semibold text-red-900 mb-1">
                  Error Message:
                </div>
                <div className="text-sm text-red-800 font-mono">
                  {this.state.error.message}
                </div>
              </div>

              {/* Error Stack (Development Only) */}
              {process.env.NODE_ENV === 'development' &&
                this.state.error.stack && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-semibold text-red-900 hover:text-red-700 mb-2">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="text-xs text-red-800 bg-red-100 p-3 rounded border border-red-200 overflow-auto max-h-64">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}

              {/* Component Stack (Development Only) */}
              {process.env.NODE_ENV === 'development' &&
                this.state.errorInfo?.componentStack && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-semibold text-red-900 hover:text-red-700 mb-2">
                      Component Stack (Development Only)
                    </summary>
                    <pre className="text-xs text-red-800 bg-red-100 p-3 rounded border border-red-200 overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.reset}
                  className="btn-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple Error Fallback Component
 *
 * A simple fallback UI for errors.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={(error, reset) => (
 *   <SimpleErrorFallback error={error} onReset={reset} />
 * )}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export interface SimpleErrorFallbackProps {
  error: Error;
  onReset?: () => void;
  className?: string;
}

export function SimpleErrorFallback({
  error,
  onReset,
  className = '',
}: SimpleErrorFallbackProps) {
  return (
    <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error
          </h3>
          <p className="text-red-700 text-sm mb-4">{error.message}</p>
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
