"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { ProtocolMessage } from '@/lib/mcp/types';

export type DirectionFilter = 'all' | 'sent' | 'received';
export type TypeFilter = 'all' | 'request' | 'response' | 'notification';

export interface LogsState {
  messages: ProtocolMessage[];
  filteredMessages: ProtocolMessage[];
  directionFilter: DirectionFilter;
  typeFilter: TypeFilter;
  autoScroll: boolean;
  isConnected: boolean;
}

export interface UseLogsReturn extends LogsState {
  clearLogs: () => void;
  setDirectionFilter: (filter: DirectionFilter) => void;
  setTypeFilter: (filter: TypeFilter) => void;
  setAutoScroll: (enabled: boolean) => void;
  resetFilters: () => void;
}

const MAX_MESSAGES = 1000; // Memory management limit

export function useLogs(isConnected: boolean): UseLogsReturn {
  const [messages, setMessages] = useState<ProtocolMessage[]>([]);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Filter messages based on current filters
  const filteredMessages = messages.filter((msg) => {
    // Direction filter
    if (directionFilter !== 'all' && msg.direction !== directionFilter) {
      return false;
    }

    // Type filter (basic heuristic based on message type string)
    if (typeFilter !== 'all') {
      const msgType = msg.type.toLowerCase();
      if (typeFilter === 'request' && !msgType.includes('list') && !msgType.includes('call') && !msgType.includes('read') && !msgType.includes('get')) {
        return false;
      }
      if (typeFilter === 'response' && !msgType.includes('result') && !msgType.includes('initialize')) {
        return false;
      }
      if (typeFilter === 'notification' && !msgType.includes('notification') && !msgType.includes('updated')) {
        return false;
      }
    }

    return true;
  });

  // Clear all logs
  const clearLogs = useCallback(() => {
    setMessages([]);
    mcpClient.clearMessages();
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setDirectionFilter('all');
    setTypeFilter('all');
  }, []);

  // Subscribe to protocol messages when connected
  useEffect(() => {
    if (isConnected) {
      // Subscribe to new messages
      unsubscribeRef.current = mcpClient.onMessage((message: ProtocolMessage) => {
        setMessages(prev => {
          const updated = [...prev, message];
          // Limit to last MAX_MESSAGES for memory management
          if (updated.length > MAX_MESSAGES) {
            return updated.slice(-MAX_MESSAGES);
          }
          return updated;
        });
      });

      // Load existing messages from client
      const existingMessages = mcpClient.getMessages();
      if (existingMessages.length > 0) {
        setMessages(existingMessages.slice(-MAX_MESSAGES));
      }
    } else {
      // Unsubscribe when disconnected
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearLogs();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isConnected, clearLogs]);

  return {
    messages,
    filteredMessages,
    directionFilter,
    typeFilter,
    autoScroll,
    isConnected,
    clearLogs,
    setDirectionFilter,
    setTypeFilter,
    setAutoScroll,
    resetFilters,
  };
}
