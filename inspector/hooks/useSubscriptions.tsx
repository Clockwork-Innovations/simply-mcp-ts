"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { ResourceContent } from '@/lib/mcp/types';

export interface SubscriptionUpdate {
  timestamp: Date;
  content: ResourceContent;
  isNew?: boolean;
}

export interface SubscriptionState {
  uri: string;
  updates: SubscriptionUpdate[];
  updateCount: number;
  lastUpdate: Date | null;
  error: string | null;
}

export interface UseSubscriptionsReturn {
  subscriptions: Map<string, SubscriptionState>;
  activeSubscriptions: string[];
  subscribe: (uri: string) => Promise<void>;
  unsubscribe: (uri: string) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
  getSubscription: (uri: string) => SubscriptionState | undefined;
  clearUpdates: (uri: string) => void;
  isSubscribed: (uri: string) => boolean;
}

const MAX_UPDATES_HISTORY = 10;

/**
 * Hook for managing resource subscriptions and real-time updates
 * Handles subscribing/unsubscribing and tracking update history
 */
export function useSubscriptions(isConnected: boolean): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<Map<string, SubscriptionState>>(new Map());
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);

  // Track timeouts for clearing "new" indicator
  const newIndicatorTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Subscribe to a resource for real-time updates
   */
  const subscribe = useCallback(async (uri: string) => {
    if (!isConnected) {
      console.error('Cannot subscribe: not connected');
      return;
    }

    if (activeSubscriptions.includes(uri)) {
      console.log('Already subscribed to:', uri);
      return;
    }

    try {
      // Create subscription state
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.set(uri, {
          uri,
          updates: [],
          updateCount: 0,
          lastUpdate: null,
          error: null,
        });
        return newMap;
      });

      // Subscribe with callback
      await mcpClient.subscribeToResource(uri, (content: ResourceContent) => {
        const now = new Date();

        setSubscriptions(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(uri);

          if (current) {
            const newUpdate: SubscriptionUpdate = {
              timestamp: now,
              content,
              isNew: true,
            };

            // Keep only last MAX_UPDATES_HISTORY updates
            const updates = [newUpdate, ...current.updates].slice(0, MAX_UPDATES_HISTORY);

            newMap.set(uri, {
              ...current,
              updates,
              updateCount: current.updateCount + 1,
              lastUpdate: now,
            });
          }

          return newMap;
        });

        // Clear "new" indicator after 5 seconds
        const timeoutId = setTimeout(() => {
          setSubscriptions(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(uri);

            if (current) {
              newMap.set(uri, {
                ...current,
                updates: current.updates.map((u, idx) =>
                  idx === 0 ? { ...u, isNew: false } : u
                ),
              });
            }

            return newMap;
          });

          newIndicatorTimeouts.current.delete(uri);
        }, 5000);

        // Clear any existing timeout
        const existingTimeout = newIndicatorTimeouts.current.get(uri);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        newIndicatorTimeouts.current.set(uri, timeoutId);
      });

      setActiveSubscriptions(prev => [...prev, uri]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';

      setSubscriptions(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(uri);

        if (current) {
          newMap.set(uri, {
            ...current,
            error: errorMessage,
          });
        }

        return newMap;
      });

      console.error('Failed to subscribe:', err);
    }
  }, [isConnected, activeSubscriptions]);

  /**
   * Unsubscribe from a resource
   */
  const unsubscribe = useCallback(async (uri: string) => {
    if (!isConnected) {
      console.error('Cannot unsubscribe: not connected');
      return;
    }

    try {
      await mcpClient.unsubscribeFromResource(uri);

      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(uri);
        return newMap;
      });

      setActiveSubscriptions(prev => prev.filter(u => u !== uri));

      // Clear any pending timeout
      const timeout = newIndicatorTimeouts.current.get(uri);
      if (timeout) {
        clearTimeout(timeout);
        newIndicatorTimeouts.current.delete(uri);
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  }, [isConnected]);

  /**
   * Unsubscribe from all resources
   */
  const unsubscribeAll = useCallback(async () => {
    const uris = [...activeSubscriptions];

    for (const uri of uris) {
      await unsubscribe(uri);
    }
  }, [activeSubscriptions, unsubscribe]);

  /**
   * Get subscription state for a specific URI
   */
  const getSubscription = useCallback((uri: string): SubscriptionState | undefined => {
    return subscriptions.get(uri);
  }, [subscriptions]);

  /**
   * Clear update history for a subscription
   */
  const clearUpdates = useCallback((uri: string) => {
    setSubscriptions(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(uri);

      if (current) {
        newMap.set(uri, {
          ...current,
          updates: [],
        });
      }

      return newMap;
    });
  }, []);

  /**
   * Check if subscribed to a resource
   */
  const isSubscribed = useCallback((uri: string): boolean => {
    return activeSubscriptions.includes(uri);
  }, [activeSubscriptions]);

  /**
   * Cleanup on disconnect
   */
  useEffect(() => {
    if (!isConnected) {
      // Clear all subscriptions when disconnected
      setSubscriptions(new Map());
      setActiveSubscriptions([]);

      // Clear all timeouts
      newIndicatorTimeouts.current.forEach(timeout => clearTimeout(timeout));
      newIndicatorTimeouts.current.clear();
    }
  }, [isConnected]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      newIndicatorTimeouts.current.forEach(timeout => clearTimeout(timeout));
      newIndicatorTimeouts.current.clear();
    };
  }, []);

  return {
    subscriptions,
    activeSubscriptions,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getSubscription,
    clearUpdates,
    isSubscribed,
  };
}
