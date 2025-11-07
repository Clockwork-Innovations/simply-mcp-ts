"use client";

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { SamplingRequest, SamplingResponse } from '@/lib/mcp/types';

export interface SamplingHistory {
  id: string;
  timestamp: Date;
  request: SamplingRequest;
  response: SamplingResponse | null;
  isPending: boolean;
}

export interface SamplingState {
  history: SamplingHistory[];
  pendingRequest: SamplingHistory | null;
  isEnabled: boolean;
}

export interface UseSamplingReturn extends SamplingState {
  clearHistory: () => void;
  getSamplingHandler: () => (request: SamplingRequest) => Promise<SamplingResponse>;
  respondToSampling: (id: string, response: SamplingResponse) => void;
  setEnabled: (enabled: boolean) => void;
}

export function useSampling(isConnected: boolean): UseSamplingReturn {
  const [history, setHistory] = useState<SamplingHistory[]>([]);
  const [pendingRequest, setPendingRequest] = useState<SamplingHistory | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [resolverMap, setResolverMap] = useState<Map<string, (response: SamplingResponse) => void>>(new Map());

  // Clear sampling history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setPendingRequest(null);
  }, []);

  // Respond to a pending sampling request
  const respondToSampling = useCallback((id: string, response: SamplingResponse) => {
    const resolver = resolverMap.get(id);
    if (resolver) {
      resolver(response);
      resolverMap.delete(id);
      setResolverMap(new Map(resolverMap));
    }

    // Update history
    setHistory(prev => prev.map(item =>
      item.id === id
        ? { ...item, response, isPending: false }
        : item
    ));

    // Clear pending request if it matches
    setPendingRequest(prev => prev?.id === id ? null : prev);
  }, [resolverMap]);

  // Get sampling handler that can be registered with mcpClient
  const getSamplingHandler = useCallback(() => {
    return async (request: SamplingRequest): Promise<SamplingResponse> => {
      const id = `sampling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create history entry
      const historyEntry: SamplingHistory = {
        id,
        timestamp: new Date(),
        request,
        response: null,
        isPending: true,
      };

      setHistory(prev => [historyEntry, ...prev]);
      setPendingRequest(historyEntry);

      // Create promise that resolves when user responds
      return new Promise<SamplingResponse>((resolve) => {
        // Store resolver
        resolverMap.set(id, resolve);
        setResolverMap(new Map(resolverMap));

        // Auto-respond with mock data after timeout (for testing)
        setTimeout(() => {
          if (resolverMap.has(id)) {
            const mockResponse: SamplingResponse = {
              role: 'assistant',
              content: {
                type: 'text',
                text: '[Mock Response] This is a simulated LLM response because no real LLM is connected. In production, this would be a real completion from Claude or another model.',
              },
              model: 'mock-model',
              stopReason: 'endTurn',
            };
            respondToSampling(id, mockResponse);
          }
        }, 2000); // Auto-respond after 2 seconds
      });
    };
  }, [resolverMap, respondToSampling]);

  // Set up sampling handler on mount
  useEffect(() => {
    if (isConnected && isEnabled) {
      mcpClient.setSamplingHandler(getSamplingHandler());
    }

    return () => {
      // Clean up handler on unmount
      mcpClient.setSamplingHandler(async () => {
        throw new Error('No sampling handler registered');
      });
    };
  }, [isConnected, isEnabled, getSamplingHandler]);

  // Clear history when disconnected
  useEffect(() => {
    if (!isConnected) {
      clearHistory();
    }
  }, [isConnected, clearHistory]);

  return {
    history,
    pendingRequest,
    isEnabled,
    clearHistory,
    getSamplingHandler,
    respondToSampling,
    setEnabled: setIsEnabled,
  };
}
