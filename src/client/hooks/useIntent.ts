/**
 * useIntent Hook - Trigger Application Intents
 *
 * Hook for triggering application intents (navigation, file operations, etc.)
 * from MCP UI components. Provides state tracking and callback support.
 *
 * @example
 * ```tsx
 * import { useIntent } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button';
 *
 * function Navigation() {
 *   const navigate = useIntent('navigate', {
 *     onTrigger: (params) => console.log('Navigating:', params)
 *   });
 *
 *   return (
 *     <Button
 *       onClick={() => navigate.trigger({ page: 'settings' })}
 *       disabled={navigate.triggering}
 *     >
 *       Go to Settings
 *     </Button>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Options for useIntent hook
 */
export interface UseIntentOptions {
  /**
   * Called when intent is triggered
   */
  onTrigger?: (params: any) => void;

  /**
   * Called when trigger fails
   */
  onError?: (error: Error, intent: string, params: any) => void;

  /**
   * Track intent history
   * @default true
   */
  trackHistory?: boolean;

  /**
   * Maximum history size
   * @default 50
   */
  maxHistorySize?: number;

  /**
   * Debounce rapid triggers (ms)
   * @default 0
   */
  debounce?: number;
}

/**
 * Intent history entry
 */
export interface IntentHistoryEntry {
  intent: string;
  params: any;
  timestamp: number;
}

/**
 * Return value from useIntent hook
 */
export interface UseIntentResult {
  /**
   * Trigger the intent with parameters
   */
  trigger: (params?: any) => void;

  /**
   * Whether intent is being triggered
   */
  triggering: boolean;

  /**
   * Last triggered params
   */
  lastParams: any | null;

  /**
   * History of triggered intents
   */
  history: IntentHistoryEntry[];

  /**
   * Clear trigger history
   */
  clearHistory: () => void;

  /**
   * Error from last trigger
   */
  error: Error | null;
}

/**
 * Hook for triggering application intents
 *
 * @param intentName - Name of the intent (e.g., 'navigate', 'open_file')
 * @param options - Hook configuration options
 * @returns Intent trigger state and methods
 *
 * @example
 * ```tsx
 * // Basic usage
 * const navigate = useIntent('navigate');
 * navigate.trigger({ page: 'home' });
 *
 * // With callbacks
 * const openFile = useIntent('open_file', {
 *   onTrigger: (params) => console.log('Opening:', params.path),
 *   onError: (err) => console.error('Failed:', err)
 * });
 *
 * // With debouncing
 * const search = useIntent('search', {
 *   debounce: 300 // Debounce rapid searches
 * });
 *
 * // With history tracking
 * const actions = useIntent('user_action', {
 *   trackHistory: true
 * });
 * console.log('Recent actions:', actions.history);
 * ```
 */
export function useIntent(
  intentName: string,
  options: UseIntentOptions = {}
): UseIntentResult {
  const {
    onTrigger,
    onError,
    trackHistory = true,
    maxHistorySize = 50,
    debounce = 0,
  } = options;

  const [triggering, setTriggering] = useState(false);
  const [lastParams, setLastParams] = useState<any | null>(null);
  const [history, setHistory] = useState<IntentHistoryEntry[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Ref for debounce timeout
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Internal trigger function
   */
  const internalTrigger = useCallback(
    (params: any = {}) => {
      try {
        // Validate intent name
        if (typeof intentName !== 'string' || !intentName.trim()) {
          throw new Error('Intent name must be a non-empty string');
        }

        // Check if window.triggerIntent exists
        if (typeof window === 'undefined' || !window.triggerIntent) {
          throw new Error(
            'window.triggerIntent is not available. Are you running in an MCP UI context?'
          );
        }

        // Mark as triggering
        setTriggering(true);
        setError(null);

        // Trigger intent
        window.triggerIntent(intentName, params);

        // Update state only if still mounted
        if (isMountedRef.current) {
          setLastParams(params);
          setTriggering(false);

          // Track in history
          if (trackHistory) {
            setHistory((prev) => {
              const entry: IntentHistoryEntry = {
                intent: intentName,
                params,
                timestamp: Date.now(),
              };
              const newHistory = [entry, ...prev];
              // Limit history size
              return newHistory.slice(0, maxHistorySize);
            });
          }

          // Call success callback
          if (onTrigger) {
            onTrigger(params);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Update state only if still mounted
        if (isMountedRef.current) {
          setError(error);
          setTriggering(false);

          // Call error callback
          if (onError) {
            onError(error, intentName, params);
          }
        }
      }
    },
    [intentName, trackHistory, maxHistorySize, onTrigger, onError]
  );

  /**
   * Trigger with optional debouncing
   */
  const trigger = useCallback(
    (params: any = {}) => {
      if (debounce > 0) {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Set new timeout
        debounceTimeoutRef.current = setTimeout(() => {
          internalTrigger(params);
        }, debounce);
      } else {
        // No debounce - trigger immediately
        internalTrigger(params);
      }
    },
    [debounce, internalTrigger]
  );

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    trigger,
    triggering,
    lastParams,
    history,
    clearHistory,
    error,
  };
}
