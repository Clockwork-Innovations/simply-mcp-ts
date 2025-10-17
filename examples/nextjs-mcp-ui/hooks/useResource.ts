/**
 * useResource Hook for MCP-UI Layer 1 Demo
 *
 * React hook for loading UIResourceContent objects from the mock MCP client.
 * Provides loading state, error handling, and refetch capability.
 *
 * This hook manages the full lifecycle of resource loading:
 * - Automatic loading on mount
 * - Loading state management
 * - Error handling
 * - Caching with refetch capability
 * - Cleanup on unmount
 *
 * @module hooks/useResource
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UIResourceContent } from '../../../src/client/ui-types.js';
import { mockMcpClient } from '../lib/mockMcpClient.js';

/**
 * Result object returned by useResource hook
 */
export interface UseResourceResult {
  /** The loaded resource, or null if not yet loaded or error */
  resource: UIResourceContent | null;

  /** Whether the resource is currently loading */
  loading: boolean;

  /** Error message if loading failed, null otherwise */
  error: Error | null;

  /** Function to manually refetch the resource */
  refetch: () => void;
}

/**
 * Hook for loading a UI resource
 *
 * Automatically loads the resource when the component mounts or when the URI changes.
 * Provides loading state, error handling, and manual refetch capability.
 *
 * @param uri - Resource URI or ID to load
 * @returns Object containing resource, loading state, error, and refetch function
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { resource, loading, error, refetch } = useResource('product-card');
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!resource) return <div>No resource found</div>;
 *
 *   return <UIResourceRenderer resource={resource} />;
 * }
 * ```
 */
export function useResource(uri: string): UseResourceResult {
  const [resource, setResource] = useState<UIResourceContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  // Cache to avoid redundant loads (keyed by URI)
  const cacheRef = useRef<Map<string, UIResourceContent>>(new Map());

  /**
   * Load resource from mock MCP client
   */
  const loadResource = useCallback(async () => {
    // Reset states
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = cacheRef.current.get(uri);
      if (cached) {
        if (isMountedRef.current) {
          setResource(cached);
          setLoading(false);
        }
        return;
      }

      // Load from client
      const loadedResource = await mockMcpClient.loadResource(uri);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setResource(loadedResource);
        cacheRef.current.set(uri, loadedResource);
        setLoading(false);
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setResource(null);
        setLoading(false);
      }
    }
  }, [uri]);

  /**
   * Refetch resource (bypasses cache)
   */
  const refetch = useCallback(() => {
    // Clear cache for this URI
    cacheRef.current.delete(uri);

    // Reload resource
    loadResource();
  }, [uri, loadResource]);

  /**
   * Load resource on mount and when URI changes
   */
  useEffect(() => {
    loadResource();
  }, [loadResource]);

  /**
   * Cleanup: mark component as unmounted
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    resource,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for loading multiple resources
 *
 * Loads multiple resources in parallel and returns their states.
 * Useful for pages that display multiple demos side-by-side.
 *
 * @param uris - Array of resource URIs or IDs to load
 * @returns Object containing resources array, loading state, errors array, and refetch function
 *
 * @example
 * ```typescript
 * function MultiDemoComponent() {
 *   const { resources, loading, errors, refetch } = useResources([
 *     'product-card',
 *     'info-card',
 *     'welcome-card'
 *   ]);
 *
 *   if (loading) return <div>Loading demos...</div>;
 *
 *   return (
 *     <div>
 *       {resources.map((resource, i) => (
 *         resource ? (
 *           <UIResourceRenderer key={i} resource={resource} />
 *         ) : (
 *           <div key={i}>Error: {errors[i]?.message}</div>
 *         )
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResources(uris: string[]): {
  resources: (UIResourceContent | null)[];
  loading: boolean;
  errors: (Error | null)[];
  refetch: () => void;
} {
  const [resources, setResources] = useState<(UIResourceContent | null)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<(Error | null)[]>([]);

  const isMountedRef = useRef<boolean>(true);

  /**
   * Load all resources in parallel
   */
  const loadResources = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled(
      uris.map((uri) => mockMcpClient.loadResource(uri))
    );

    if (isMountedRef.current) {
      const loadedResources: (UIResourceContent | null)[] = [];
      const loadErrors: (Error | null)[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          loadedResources.push(result.value);
          loadErrors.push(null);
        } else {
          loadedResources.push(null);
          loadErrors.push(
            result.reason instanceof Error ? result.reason : new Error(String(result.reason))
          );
        }
      });

      setResources(loadedResources);
      setErrors(loadErrors);
      setLoading(false);
    }
  }, [uris]);

  /**
   * Refetch all resources
   */
  const refetch = useCallback(() => {
    loadResources();
  }, [loadResources]);

  /**
   * Load resources on mount and when URIs change
   */
  useEffect(() => {
    loadResources();
  }, [loadResources]);

  /**
   * Cleanup: mark component as unmounted
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    resources,
    loading,
    errors,
    refetch,
  };
}

/**
 * Hook for preloading resources
 *
 * Preloads resources without rendering them. Useful for prefetching
 * resources that will be needed soon (e.g., on next page).
 *
 * @param uris - Array of resource URIs or IDs to preload
 *
 * @example
 * ```typescript
 * function NavigationComponent() {
 *   // Preload resources for next page
 *   usePreloadResources(['feature-list', 'statistics-display']);
 *
 *   return <nav>...</nav>;
 * }
 * ```
 */
export function usePreloadResources(uris: string[]): void {
  useEffect(() => {
    // Preload in background, don't wait for results
    uris.forEach((uri) => {
      mockMcpClient.loadResource(uri).catch(() => {
        // Silently ignore errors for preloading
      });
    });
  }, [uris]);
}
