/**
 * useNotify Hook - Send Notifications
 *
 * Hook for sending notifications from MCP UI components to the parent application.
 * Provides state tracking, notification queue, and callback support.
 *
 * @example
 * ```tsx
 * import { useNotify } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button';
 *
 * function SaveButton() {
 *   const notify = useNotify();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       notify.success('Data saved successfully!');
 *     } catch (error) {
 *       notify.error('Failed to save data');
 *     }
 *   };
 *
 *   return <Button onClick={handleSave}>Save</Button>;
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Notification level
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * Options for useNotify hook
 */
export interface UseNotifyOptions {
  /**
   * Called when notification is sent
   */
  onNotify?: (level: NotificationLevel, message: string) => void;

  /**
   * Called when notification fails
   */
  onError?: (error: Error, level: NotificationLevel, message: string) => void;

  /**
   * Track notification history
   * @default true
   */
  trackHistory?: boolean;

  /**
   * Maximum history size
   * @default 100
   */
  maxHistorySize?: number;

  /**
   * Rate limit (max notifications per second)
   * @default 0 (no limit)
   */
  rateLimit?: number;
}

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  level: NotificationLevel;
  message: string;
  timestamp: number;
}

/**
 * Return value from useNotify hook
 */
export interface UseNotifyResult {
  /**
   * Send a notification
   */
  notify: (level: NotificationLevel, message: string) => void;

  /**
   * Send an info notification
   */
  info: (message: string) => void;

  /**
   * Send a success notification
   */
  success: (message: string) => void;

  /**
   * Send a warning notification
   */
  warning: (message: string) => void;

  /**
   * Send an error notification
   */
  error: (message: string) => void;

  /**
   * History of sent notifications
   */
  history: NotificationHistoryEntry[];

  /**
   * Clear notification history
   */
  clearHistory: () => void;

  /**
   * Last notification sent
   */
  lastNotification: NotificationHistoryEntry | null;

  /**
   * Error from last notification
   */
  notifyError: Error | null;
}

/**
 * Hook for sending notifications
 *
 * @param options - Hook configuration options
 * @returns Notification methods and state
 *
 * @example
 * ```tsx
 * // Basic usage
 * const notify = useNotify();
 * notify.success('Operation completed!');
 * notify.error('Something went wrong');
 *
 * // With callbacks
 * const notify = useNotify({
 *   onNotify: (level, msg) => console.log(`[${level}] ${msg}`),
 *   onError: (err) => console.error('Notification failed:', err)
 * });
 *
 * // With history tracking
 * const notify = useNotify({
 *   trackHistory: true,
 *   maxHistorySize: 50
 * });
 * console.log('Recent notifications:', notify.history);
 *
 * // With rate limiting
 * const notify = useNotify({
 *   rateLimit: 5 // Max 5 notifications per second
 * });
 * ```
 */
export function useNotify(options: UseNotifyOptions = {}): UseNotifyResult {
  const {
    onNotify,
    onError,
    trackHistory = true,
    maxHistorySize = 100,
    rateLimit = 0,
  } = options;

  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [lastNotification, setLastNotification] = useState<NotificationHistoryEntry | null>(null);
  const [notifyError, setNotifyError] = useState<Error | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Ref for rate limiting
  const notificationTimesRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Check rate limit
   */
  const checkRateLimit = useCallback((): boolean => {
    if (rateLimit === 0) return true;

    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove old timestamps
    notificationTimesRef.current = notificationTimesRef.current.filter(
      (time) => time > oneSecondAgo
    );

    // Check if we're at the limit
    if (notificationTimesRef.current.length >= rateLimit) {
      return false;
    }

    // Add current timestamp
    notificationTimesRef.current.push(now);
    return true;
  }, [rateLimit]);

  /**
   * Send a notification
   */
  const notify = useCallback(
    (level: NotificationLevel, message: string) => {
      try {
        // Validate inputs
        if (typeof message !== 'string' || !message.trim()) {
          throw new Error('Message must be a non-empty string');
        }

        const validLevels: NotificationLevel[] = ['info', 'success', 'warning', 'error'];
        if (!validLevels.includes(level)) {
          throw new Error(`Invalid notification level: ${level}`);
        }

        // Check rate limit
        if (!checkRateLimit()) {
          console.warn('Notification rate limit exceeded');
          return;
        }

        // Check if window.notify exists
        if (typeof window === 'undefined' || !window.notify) {
          throw new Error(
            'window.notify is not available. Are you running in an MCP UI context?'
          );
        }

        const trimmedMessage = message.trim();

        // Send notification
        window.notify(level, trimmedMessage);

        // Update state only if still mounted
        if (isMountedRef.current) {
          const entry: NotificationHistoryEntry = {
            level,
            message: trimmedMessage,
            timestamp: Date.now(),
          };

          setLastNotification(entry);
          setNotifyError(null);

          // Track in history
          if (trackHistory) {
            setHistory((prev) => {
              const newHistory = [entry, ...prev];
              // Limit history size
              return newHistory.slice(0, maxHistorySize);
            });
          }

          // Call success callback
          if (onNotify) {
            onNotify(level, trimmedMessage);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Update state only if still mounted
        if (isMountedRef.current) {
          setNotifyError(error);

          // Call error callback
          if (onError) {
            onError(error, level, message);
          }
        }
      }
    },
    [trackHistory, maxHistorySize, onNotify, onError, checkRateLimit]
  );

  /**
   * Convenience methods
   */
  const info = useCallback((message: string) => notify('info', message), [notify]);
  const success = useCallback((message: string) => notify('success', message), [notify]);
  const warning = useCallback((message: string) => notify('warning', message), [notify]);
  const error = useCallback((message: string) => notify('error', message), [notify]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    notify,
    info,
    success,
    warning,
    error,
    history,
    clearHistory,
    lastNotification,
    notifyError,
  };
}
