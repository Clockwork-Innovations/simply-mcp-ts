"use client";

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { Root } from '@/lib/mcp/types';

export interface RootsState {
  roots: Root[];
  isLoading: boolean;
  error: string | null;
}

export interface UseRootsReturn extends RootsState {
  loadRoots: () => Promise<void>;
  refreshRoots: () => Promise<void>;
}

export function useRoots(isConnected: boolean): UseRootsReturn {
  const [roots, setRoots] = useState<Root[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load roots from MCP server
  const loadRoots = useCallback(async () => {
    if (!mcpClient.isConnected()) {
      setError('Not connected to MCP server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rootsList = await mcpClient.listRoots();
      setRoots(rootsList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load roots';
      setError(errorMessage);
      console.error('Error loading roots:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh roots (alias for loadRoots)
  const refreshRoots = useCallback(async () => {
    await loadRoots();
  }, [loadRoots]);

  // Auto-load roots when connected - consolidated single useEffect
  useEffect(() => {
    const loadData = async () => {
      if (!mcpClient.isConnected()) {
        setError('Not connected to MCP server');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rootsList = await mcpClient.listRoots();
        setRoots(rootsList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load roots';
        setError(errorMessage);
        console.error('Error loading roots:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleConnection = () => {
      loadData();
    };

    // Load immediately if already connected
    if (mcpClient.isConnected()) {
      loadData();
    }

    // Listen for future connections
    window.addEventListener('mcp-connected', handleConnection);
    return () => {
      window.removeEventListener('mcp-connected', handleConnection);
    };
  }, []); // Empty dependency array - fully self-contained

  return {
    roots,
    isLoading,
    error,
    loadRoots,
    refreshRoots,
  };
}
