"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw, Radio, Loader2, CheckCheck } from 'lucide-react';
import type { Resource, ResourceContent } from '@/lib/mcp/types';
import { UIResourceRenderer, isUIResource } from 'simply-mcp/client';
import type { UIResourceContent, UIActionResult } from 'simply-mcp/client';
import { useUIActions } from '@/hooks/useUIActions';

export interface ResourceViewerProps {
  resource: Resource | null;
  content: ResourceContent | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  isSubscribed: boolean;
  onRefresh: () => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

/**
 * Component that displays resource content with proper formatting based on MIME type
 * Supports text, JSON, HTML, and other content types
 */
export function ResourceViewer({
  resource,
  content,
  isLoading,
  lastUpdated,
  isSubscribed,
  onRefresh,
  onSubscribe,
  onUnsubscribe,
}: ResourceViewerProps) {
  const [copied, setCopied] = useState(false);
  const { handleUIAction, isProcessing, lastError } = useUIActions();

  // Set up postMessage listener to handle iframe actions and send results back
  // NOTE: This is DEPRECATED - UIResourceRenderer now handles postMessage directly
  // This code exists for backward compatibility with older UI resources
  // that may still use the old MCP_UI_ACTION format.
  //
  // New spec-compliant format is handled by HTMLResourceRenderer's onUIAction prop
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate message structure
      if (!event.data || typeof event.data !== 'object' || !event.data.type) {
        return;
      }

      // Extract messageId for response handling (spec-compliant)
      const messageId = event.data.messageId;

      console.log('[ResourceViewer] Received postMessage action:', event.data);

      // Check if this is a spec-compliant UI action
      const validActionTypes = ['tool', 'prompt', 'notify', 'intent', 'link'];
      if (!validActionTypes.includes(event.data.type)) {
        // Not a UI action - ignore
        return;
      }

      try {
        // Send acknowledgment immediately (spec-compliant)
        if (messageId && event.source) {
          (event.source as Window).postMessage({
            type: 'ui-message-received',
            messageId: messageId,
          }, '*');
        }

        // Execute the action (useUIActions handles both spec-compliant and legacy formats)
        const result = await handleUIAction(event.data);
        console.log('[ResourceViewer] Action result:', result);

        // Send result back to iframe (spec-compliant)
        if (messageId && event.source) {
          (event.source as Window).postMessage({
            type: 'ui-message-response',
            messageId: messageId,
            result: result.data,
            error: result.error,
          }, '*');
          console.log('[ResourceViewer] Sent result back to iframe:', messageId);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ResourceViewer] Error processing action:', error);

        // Send error back to iframe (spec-compliant)
        if (messageId && event.source) {
          (event.source as Window).postMessage({
            type: 'ui-message-response',
            messageId: messageId,
            error: errorMessage,
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleUIAction]);

  if (!resource) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Select a resource to view its content</p>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async () => {
    if (content?.text) {
      await navigator.clipboard.writeText(content.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatContent = () => {
    if (!content) return null;

    // Check if this is a UI resource
    // UI resources must have uri, mimeType, and be recognized by isUIResource
    if (content && typeof content === 'object' && 'uri' in content && 'mimeType' in content) {
      const uiResource = content as unknown as UIResourceContent;

      // Only render as UI if it has a ui:// URI and is a valid UI resource
      if (uiResource.uri?.startsWith('ui://') && isUIResource(uiResource)) {
        return (
          <div className="w-full min-h-[400px] border rounded-lg overflow-hidden">
            <UIResourceRenderer
              resource={uiResource}
            />
            {isProcessing && (
              <div className="p-2 bg-blue-50 border-t border-blue-200 text-blue-700 text-sm text-center">
                Processing action...
              </div>
            )}
            {lastError && (
              <div className="p-2 bg-red-50 border-t border-red-200 text-red-700 text-sm text-center">
                Error: {lastError}
              </div>
            )}
          </div>
        );
      }
    }

    // Non-UI resource handling - require text content
    if (!content?.text) return null;

    const mimeType = content.mimeType || resource.mimeType;

    // JSON formatting
    if (mimeType === 'application/json') {
      try {
        const parsed = JSON.parse(content.text);
        return (
          <pre className="text-xs overflow-x-auto p-4 bg-muted rounded-md">
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } catch {
        // Fall through to plain text if JSON parsing fails
      }
    }

    // HTML display (as text for safety) - only for non-UI resources
    if (mimeType === 'text/html') {
      return (
        <div className="space-y-2">
          <Badge variant="outline">HTML Content (displayed as text)</Badge>
          <ScrollArea className="h-[400px] w-full">
            <pre className="text-xs overflow-x-auto p-4 bg-muted rounded-md">
              <code>{content.text}</code>
            </pre>
          </ScrollArea>
        </div>
      );
    }

    // Markdown (displayed as text)
    if (mimeType === 'text/markdown') {
      return (
        <div className="space-y-2">
          <Badge variant="outline">Markdown</Badge>
          <ScrollArea className="h-[400px] w-full">
            <pre className="text-xs whitespace-pre-wrap p-4 bg-muted rounded-md font-mono">
              {content.text}
            </pre>
          </ScrollArea>
        </div>
      );
    }

    // Plain text
    if (mimeType?.startsWith('text/')) {
      return (
        <ScrollArea className="h-[400px] w-full">
          <pre className="text-xs whitespace-pre-wrap p-4 bg-muted rounded-md font-mono">
            {content.text}
          </pre>
        </ScrollArea>
      );
    }

    // Default: display as text
    return (
      <ScrollArea className="h-[400px] w-full">
        <pre className="text-xs overflow-x-auto p-4 bg-muted rounded-md">
          <code>{content.text}</code>
        </pre>
      </ScrollArea>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{resource.name}</CardTitle>
            <CardDescription className="break-all mt-1">
              <code className="text-xs">{resource.uri}</code>
            </CardDescription>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>

            {content?.text && (
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                disabled={!content.text}
              >
                {copied ? (
                  <CheckCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}

            {isSubscribed ? (
              <Button
                onClick={onUnsubscribe}
                variant="destructive"
                size="sm"
              >
                <Radio className="h-4 w-4 mr-1" />
                Unsubscribe
              </Button>
            ) : (
              <Button
                onClick={onSubscribe}
                variant="default"
                size="sm"
              >
                <Radio className="h-4 w-4 mr-1" />
                Subscribe
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          {(content?.mimeType || resource.mimeType) && (
            <Badge variant="secondary">
              {content?.mimeType || resource.mimeType}
            </Badge>
          )}
          {lastUpdated && (
            <Badge variant="outline">
              Updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
          {isSubscribed && (
            <Badge variant="default" className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              Live Updates
            </Badge>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading content...</span>
          </div>
        ) : content ? (
          formatContent()
        ) : (
          <Alert>
            <AlertDescription>
              No content available. Click refresh to load resource content.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
