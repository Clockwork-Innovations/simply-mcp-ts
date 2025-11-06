/**
 * usePromptSubmit Hook - Submit Prompts to LLM
 *
 * Hook for submitting prompts to the LLM during MCP UI interactions.
 * Provides state tracking, history management, and callback support.
 *
 * @example
 * ```tsx
 * import { usePromptSubmit } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button';
 *
 * function AIAssistant() {
 *   const prompt = usePromptSubmit({
 *     onSubmit: (text) => console.log('Submitted:', text)
 *   });
 *
 *   return (
 *     <div>
 *       <Button
 *         onClick={() => prompt.submit('Analyze this data')}
 *         disabled={prompt.submitting}
 *       >
 *         Ask AI
 *       </Button>
 *       {prompt.lastPrompt && <div>Last: {prompt.lastPrompt}</div>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Options for usePromptSubmit hook
 */
export interface UsePromptSubmitOptions {
  /**
   * Called when prompt is submitted
   */
  onSubmit?: (prompt: string) => void;

  /**
   * Called when submission fails
   */
  onError?: (error: Error, prompt: string) => void;

  /**
   * Track prompt history
   * @default true
   */
  trackHistory?: boolean;

  /**
   * Maximum history size
   * @default 50
   */
  maxHistorySize?: number;

  /**
   * Prevent duplicate consecutive submissions
   * @default true
   */
  preventDuplicates?: boolean;
}

/**
 * Return value from usePromptSubmit hook
 */
export interface UsePromptSubmitResult {
  /**
   * Submit a prompt to the LLM
   */
  submit: (prompt: string) => void;

  /**
   * Whether a submission is in progress
   */
  submitting: boolean;

  /**
   * Last submitted prompt
   */
  lastPrompt: string | null;

  /**
   * History of submitted prompts
   */
  history: string[];

  /**
   * Clear submission history
   */
  clearHistory: () => void;

  /**
   * Error from last submission
   */
  error: Error | null;
}

/**
 * Hook for submitting prompts to the LLM
 *
 * @param options - Hook configuration options
 * @returns Prompt submission state and methods
 *
 * @example
 * ```tsx
 * // Basic usage
 * const prompt = usePromptSubmit();
 * prompt.submit('Analyze this data');
 *
 * // With callbacks
 * const prompt = usePromptSubmit({
 *   onSubmit: (text) => console.log('Sent:', text),
 *   onError: (err) => console.error('Failed:', err)
 * });
 *
 * // With history tracking
 * const prompt = usePromptSubmit({
 *   trackHistory: true,
 *   maxHistorySize: 100
 * });
 * console.log('Recent prompts:', prompt.history);
 * ```
 */
export function usePromptSubmit(
  options: UsePromptSubmitOptions = {}
): UsePromptSubmitResult {
  const {
    onSubmit,
    onError,
    trackHistory = true,
    maxHistorySize = 50,
    preventDuplicates = true,
  } = options;

  const [submitting, setSubmitting] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Submit a prompt
   */
  const submit = useCallback(
    (prompt: string) => {
      try {
        // Validate input
        if (typeof prompt !== 'string' || !prompt.trim()) {
          throw new Error('Prompt must be a non-empty string');
        }

        const trimmedPrompt = prompt.trim();

        // Check for duplicates
        if (preventDuplicates && trimmedPrompt === lastPrompt) {
          console.warn('Duplicate prompt submission prevented:', trimmedPrompt);
          return;
        }

        // Check if window.submitPrompt exists
        if (typeof window === 'undefined' || !window.submitPrompt) {
          throw new Error(
            'window.submitPrompt is not available. Are you running in an MCP UI context?'
          );
        }

        // Mark as submitting
        setSubmitting(true);
        setError(null);

        // Submit prompt
        window.submitPrompt(trimmedPrompt);

        // Update state only if still mounted
        if (isMountedRef.current) {
          setLastPrompt(trimmedPrompt);
          setSubmitting(false);

          // Track in history
          if (trackHistory) {
            setHistory((prev) => {
              const newHistory = [trimmedPrompt, ...prev];
              // Limit history size
              return newHistory.slice(0, maxHistorySize);
            });
          }

          // Call success callback
          if (onSubmit) {
            onSubmit(trimmedPrompt);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Update state only if still mounted
        if (isMountedRef.current) {
          setError(error);
          setSubmitting(false);

          // Call error callback
          if (onError) {
            onError(error, prompt);
          }
        }
      }
    },
    [lastPrompt, trackHistory, maxHistorySize, preventDuplicates, onSubmit, onError]
  );

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    submit,
    submitting,
    lastPrompt,
    history,
    clearHistory,
    error,
  };
}
