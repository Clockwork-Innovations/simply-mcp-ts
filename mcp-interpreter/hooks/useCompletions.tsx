"use client";

import { useState, useCallback, useRef } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { CompletionResult } from '@/lib/mcp/types';

export interface CompletionsState {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
}

export interface UseCompletionsReturn extends CompletionsState {
  getCompletions: (promptName: string, argumentName: string, partialValue: string) => void;
  clearSuggestions: () => void;
}

const DEBOUNCE_DELAY = 300; // milliseconds

export function useCompletions(): UseCompletionsReturn {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Use ref to store timeout ID to avoid state updates causing re-renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cache to avoid duplicate requests
  const cacheRef = useRef<Map<string, CompletionResult>>(new Map());

  // Get completions with debouncing and caching
  const getCompletions = useCallback(
    (promptName: string, argumentName: string, partialValue: string) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Don't fetch if value is empty
      if (!partialValue || partialValue.trim().length === 0) {
        setSuggestions([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      // Check cache first
      const cacheKey = `${promptName}:${argumentName}:${partialValue}`;
      const cached = cacheRef.current.get(cacheKey);

      if (cached) {
        setSuggestions(cached.completion.values);
        setTotal(cached.completion.total || cached.completion.values.length);
        setHasMore(cached.completion.hasMore || false);
        return;
      }

      // Set loading state immediately
      setIsLoading(true);
      setError(null);

      // Set new debounced timer
      debounceTimerRef.current = setTimeout(async () => {
        if (!mcpClient.isConnected()) {
          setError('Not connected to MCP server');
          setIsLoading(false);
          return;
        }

        try {
          const result = await mcpClient.getCompletions({
            ref: { type: 'ref/prompt', name: promptName },
            argument: { name: argumentName, value: partialValue },
          });

          // Cache the result
          cacheRef.current.set(cacheKey, result);

          // Update state with results
          setSuggestions(result.completion.values);
          setTotal(result.completion.total || result.completion.values.length);
          setHasMore(result.completion.hasMore || false);
          setError(null);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to get completions';
          setError(errorMessage);
          setSuggestions([]);
          setTotal(0);
          setHasMore(false);
          console.error('Error getting completions:', err);
        } finally {
          setIsLoading(false);
        }
      }, DEBOUNCE_DELAY);
    },
    []
  );

  // Clear suggestions and cache
  const clearSuggestions = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSuggestions([]);
    setTotal(0);
    setHasMore(false);
    setError(null);
    setIsLoading(false);
    cacheRef.current.clear();
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    total,
    hasMore,
    getCompletions,
    clearSuggestions,
  };
}
