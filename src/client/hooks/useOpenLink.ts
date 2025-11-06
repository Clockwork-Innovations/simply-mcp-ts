/**
 * useOpenLink Hook - Open URLs/Links
 *
 * Hook for opening URLs from MCP UI components. Provides URL validation,
 * state tracking, and callback support.
 *
 * @example
 * ```tsx
 * import { useOpenLink } from 'simply-mcp/client';
 * import { Button } from '@/components/ui/button';
 *
 * function ExternalLink() {
 *   const openLink = useOpenLink({
 *     onOpen: (url) => console.log('Opening:', url)
 *   });
 *
 *   return (
 *     <Button onClick={() => openLink.open('https://example.com')}>
 *       Visit Website
 *     </Button>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Options for useOpenLink hook
 */
export interface UseOpenLinkOptions {
  /**
   * Called when link is opened
   */
  onOpen?: (url: string) => void;

  /**
   * Called when link opening fails
   */
  onError?: (error: Error, url: string) => void;

  /**
   * Validate URLs before opening
   * @default true
   */
  validateUrl?: boolean;

  /**
   * Allow only HTTPS URLs
   * @default false
   */
  httpsOnly?: boolean;

  /**
   * Track link opening history
   * @default true
   */
  trackHistory?: boolean;

  /**
   * Maximum history size
   * @default 50
   */
  maxHistorySize?: number;

  /**
   * Allowed domains (empty = all allowed)
   * @default []
   */
  allowedDomains?: string[];
}

/**
 * Link history entry
 */
export interface LinkHistoryEntry {
  url: string;
  timestamp: number;
}

/**
 * Return value from useOpenLink hook
 */
export interface UseOpenLinkResult {
  /**
   * Open a URL
   */
  open: (url: string) => void;

  /**
   * Whether a link is being opened
   */
  opening: boolean;

  /**
   * Last opened URL
   */
  lastUrl: string | null;

  /**
   * History of opened links
   */
  history: LinkHistoryEntry[];

  /**
   * Clear link history
   */
  clearHistory: () => void;

  /**
   * Error from last open attempt
   */
  error: Error | null;
}

/**
 * Validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Hook for opening URLs/links
 *
 * @param options - Hook configuration options
 * @returns Link opening methods and state
 *
 * @example
 * ```tsx
 * // Basic usage
 * const link = useOpenLink();
 * link.open('https://example.com');
 *
 * // With validation
 * const link = useOpenLink({
 *   validateUrl: true,
 *   httpsOnly: true
 * });
 *
 * // With domain whitelist
 * const link = useOpenLink({
 *   allowedDomains: ['example.com', 'trusted-site.com']
 * });
 *
 * // With callbacks
 * const link = useOpenLink({
 *   onOpen: (url) => console.log('Opened:', url),
 *   onError: (err) => console.error('Failed:', err)
 * });
 *
 * // With history tracking
 * const link = useOpenLink({
 *   trackHistory: true
 * });
 * console.log('Recently opened:', link.history);
 * ```
 */
export function useOpenLink(options: UseOpenLinkOptions = {}): UseOpenLinkResult {
  const {
    onOpen,
    onError,
    validateUrl = true,
    httpsOnly = false,
    trackHistory = true,
    maxHistorySize = 50,
    allowedDomains = [],
  } = options;

  const [opening, setOpening] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<LinkHistoryEntry[]>([]);
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
   * Open a URL
   */
  const open = useCallback(
    (url: string) => {
      try {
        // Validate input
        if (typeof url !== 'string' || !url.trim()) {
          throw new Error('URL must be a non-empty string');
        }

        const trimmedUrl = url.trim();

        // Validate URL format
        if (validateUrl && !isValidUrl(trimmedUrl)) {
          throw new Error(`Invalid URL format: ${trimmedUrl}`);
        }

        // Check HTTPS requirement
        if (httpsOnly && !trimmedUrl.startsWith('https://')) {
          throw new Error(`Only HTTPS URLs are allowed: ${trimmedUrl}`);
        }

        // Check domain whitelist
        if (allowedDomains.length > 0) {
          const domain = extractDomain(trimmedUrl);
          if (!allowedDomains.includes(domain)) {
            throw new Error(
              `Domain not allowed: ${domain}. Allowed domains: ${allowedDomains.join(', ')}`
            );
          }
        }

        // Check if window.openLink exists
        if (typeof window === 'undefined' || !window.openLink) {
          throw new Error(
            'window.openLink is not available. Are you running in an MCP UI context?'
          );
        }

        // Mark as opening
        setOpening(true);
        setError(null);

        // Open link
        window.openLink(trimmedUrl);

        // Update state only if still mounted
        if (isMountedRef.current) {
          setLastUrl(trimmedUrl);
          setOpening(false);

          // Track in history
          if (trackHistory) {
            setHistory((prev) => {
              const entry: LinkHistoryEntry = {
                url: trimmedUrl,
                timestamp: Date.now(),
              };
              const newHistory = [entry, ...prev];
              // Limit history size
              return newHistory.slice(0, maxHistorySize);
            });
          }

          // Call success callback
          if (onOpen) {
            onOpen(trimmedUrl);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Update state only if still mounted
        if (isMountedRef.current) {
          setError(error);
          setOpening(false);

          // Call error callback
          if (onError) {
            onError(error, url);
          }
        }
      }
    },
    [
      validateUrl,
      httpsOnly,
      allowedDomains,
      trackHistory,
      maxHistorySize,
      onOpen,
      onError,
    ]
  );

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    open,
    opening,
    lastUrl,
    history,
    clearHistory,
    error,
  };
}
