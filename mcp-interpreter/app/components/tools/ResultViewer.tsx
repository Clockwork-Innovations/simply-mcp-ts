"use client";

import { useState } from 'react';
import type { ToolExecutionResult } from '@/lib/mcp/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultViewerProps {
  result: ToolExecutionResult;
}

export function ResultViewer({ result }: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!result || !result.content) {
    return null;
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderContent = (content: any, index: number) => {
    const contentType = content.type || 'text';
    const text = content.text || JSON.stringify(content, null, 2);

    return (
      <div key={index} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{contentType}</Badge>
            {result.isError && (
              <Badge variant="destructive">Error</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(text)}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="h-auto max-h-[400px] w-full">
          {renderContentByType(contentType, text)}
        </ScrollArea>
      </div>
    );
  };

  const renderContentByType = (type: string, text: string) => {
    // JSON content - pretty print with syntax highlighting
    if (type === 'json' || type === 'application/json') {
      try {
        const parsed = typeof text === 'string' ? JSON.parse(text) : text;
        const formatted = JSON.stringify(parsed, null, 2);
        return (
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
            <code className="text-foreground">{formatted}</code>
          </pre>
        );
      } catch {
        // Fall through to text rendering if JSON parsing fails
      }
    }

    // HTML content - render as text for safety
    if (type === 'html' || type === 'text/html') {
      return (
        <div className="bg-muted p-4 rounded-md space-y-2">
          <p className="text-xs text-muted-foreground">HTML content (rendered as text for safety):</p>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
            <code className="text-foreground">{text}</code>
          </pre>
        </div>
      );
    }

    // Default text rendering
    return (
      <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
        <code className="text-foreground">{text}</code>
      </pre>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Execution Result</CardTitle>
            <CardDescription>
              {result.content.length} content item{result.content.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {result.content.map((content, index) => renderContent(content, index))}
        </CardContent>
      )}
    </Card>
  );
}
