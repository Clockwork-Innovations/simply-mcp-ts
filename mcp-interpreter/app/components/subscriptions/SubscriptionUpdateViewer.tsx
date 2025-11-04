"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SubscriptionUpdate } from '@/hooks/useSubscriptions';

export interface SubscriptionUpdateViewerProps {
  update: SubscriptionUpdate;
  index: number;
}

/**
 * Component that displays individual subscription update
 * Shows timestamp, content preview, and expandable full content
 */
export function SubscriptionUpdateViewer({ update, index }: SubscriptionUpdateViewerProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getContentPreview = (text?: string) => {
    if (!text) return '(empty)';

    // For JSON, try to extract meaningful preview
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''} }`;
      }
    } catch {
      // Not JSON, use text preview
    }

    // For text, show first 60 characters
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  };

  const formatContent = (text?: string, mimeType?: string) => {
    if (!text) return '(empty)';

    // Try to format JSON
    if (mimeType === 'application/json') {
      try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // Fall through to plain text
      }
    }

    return text;
  };

  return (
    <Card className={`transition-all ${update.isNew ? 'border-primary shadow-md' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={update.isNew ? 'default' : 'outline'} className="text-xs">
              {formatTimestamp(update.timestamp)}
            </Badge>
            {update.isNew && (
              <Badge variant="default" className="text-xs animate-pulse">
                New
              </Badge>
            )}
            {update.content.mimeType && (
              <Badge variant="secondary" className="text-xs">
                {update.content.mimeType}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isExpanded ? (
          <div className="text-xs text-muted-foreground font-mono truncate">
            {getContentPreview(update.content.text)}
          </div>
        ) : (
          <ScrollArea className="h-[200px] w-full mt-2">
            <pre className="text-xs whitespace-pre-wrap p-3 bg-muted rounded-md font-mono">
              {formatContent(update.content.text, update.content.mimeType)}
            </pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
