"use client";

import { useState, useCallback, useEffect } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { Resource, ResourceContent } from '@/lib/mcp/types';

export interface ResourcesState {
  resources: Resource[];
  selectedResource: Resource | null;
  content: ResourceContent | null;
  isLoading: boolean;
  isLoadingContent: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseResourcesReturn extends ResourcesState {
  loadResources: () => Promise<void>;
  readResource: (uri: string) => Promise<void>;
  selectResource: (resource: Resource) => void;
  clearContent: () => void;
  refreshContent: () => Promise<void>;
}

/**
 * Hook for managing resources state
 * Handles listing resources, reading content, and tracking selected resource
 */
export function useResources(isConnected: boolean): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [content, setContent] = useState<ResourceContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Load all available resources from the server
   */
  const loadResources = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resourcesList = await mcpClient.listResources();
      setResources(resourcesList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load resources';
      setError(errorMessage);
      console.error('Failed to load resources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  /**
   * Read content from a specific resource
   */
  const readResource = useCallback(async (uri: string) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    setIsLoadingContent(true);
    setError(null);

    try {
      const resourceContent = await mcpClient.readResource(uri);
      setContent(resourceContent);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read resource';
      setError(errorMessage);
      console.error('Failed to read resource:', err);
    } finally {
      setIsLoadingContent(false);
    }
  }, [isConnected]);

  /**
   * Select a resource and load its content
   */
  const selectResource = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    readResource(resource.uri);
  }, [readResource]);

  /**
   * Clear current resource content
   */
  const clearContent = useCallback(() => {
    setContent(null);
    setSelectedResource(null);
    setLastUpdated(null);
    setError(null);
  }, []);

  /**
   * Refresh content for currently selected resource
   */
  const refreshContent = useCallback(async () => {
    if (selectedResource) {
      await readResource(selectedResource.uri);
    }
  }, [selectedResource, readResource]);

  /**
   * Auto-load resources when connected - consolidated single useEffect
   */
  useEffect(() => {
    const loadData = async () => {
      if (!mcpClient.isConnected()) {
        setError('Not connected to MCP server');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const resourcesList = await mcpClient.listResources();
        setResources(resourcesList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load resources';
        setError(errorMessage);
        console.error('Error loading resources:', err);
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
    resources,
    selectedResource,
    content,
    isLoading,
    isLoadingContent,
    error,
    lastUpdated,
    loadResources,
    readResource,
    selectResource,
    clearContent,
    refreshContent,
  };
}
