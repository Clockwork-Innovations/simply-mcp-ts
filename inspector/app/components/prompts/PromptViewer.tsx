"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Trash2, Copy, CheckCircle, AlertCircle, User, Bot, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Prompt, PromptResult } from '@/lib/mcp/types';
import { useCompletions } from '@/hooks/useCompletions';
import { AutocompleteInput } from '../completions/AutocompleteInput';

export interface PromptViewerProps {
  prompt: Prompt;
  isExecuting: boolean;
  messages: PromptResult | null;
  error: string | null;
  onExecute: (args: Record<string, any>) => void;
  onClear: () => void;
}

export function PromptViewer({
  prompt,
  isExecuting,
  messages,
  error,
  onExecute,
  onClear,
}: PromptViewerProps) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const completions = useCompletions();

  // Initialize args with empty strings for all arguments
  useEffect(() => {
    const initialArgs: Record<string, string> = {};
    prompt.arguments?.forEach((arg) => {
      initialArgs[arg.name] = '';
    });
    setArgs(initialArgs);
  }, [prompt.name, prompt.arguments]);

  // Handle argument value change
  const handleArgChange = (argName: string, value: string) => {
    setArgs((prev) => ({ ...prev, [argName]: value }));
  };

  // Handle execute prompt
  const handleExecute = () => {
    // Validate required arguments
    const missingRequired = prompt.arguments?.filter(
      (arg) => arg.required && (!args[arg.name] || args[arg.name].trim() === '')
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Please provide required arguments: ${missingRequired.map((a) => a.name).join(', ')}`);
      return;
    }

    onExecute(args);
  };

  // Handle copy messages to clipboard
  const handleCopy = () => {
    if (messages) {
      navigator.clipboard.writeText(JSON.stringify(messages.messages, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Get role color classes
  const getRoleClasses = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'assistant':
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300';
      case 'system':
        return 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-300 italic';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div className="space-y-4">
      {/* Arguments Form */}
      {prompt.arguments && prompt.arguments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Arguments</h4>
          {prompt.arguments.map((arg) => (
            <div key={arg.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`arg-${prompt.name}-${arg.name}`} className="text-sm">
                  {arg.name}
                  {arg.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {arg.required ? (
                  <Badge variant="default" className="text-xs">
                    required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    optional
                  </Badge>
                )}
              </div>
              {arg.description && (
                <p className="text-xs text-muted-foreground">{arg.description}</p>
              )}
              <AutocompleteInput
                value={args[arg.name] || ''}
                onChange={(value) => handleArgChange(arg.name, value)}
                onCompletionRequest={(value) => {
                  completions.getCompletions(prompt.name, arg.name, value);
                }}
                suggestions={completions.suggestions}
                isLoading={completions.isLoading}
                placeholder={`Enter ${arg.name}...`}
                disabled={isExecuting}
              />
            </div>
          ))}
        </div>
      )}

      {/* No arguments message */}
      {(!prompt.arguments || prompt.arguments.length === 0) && (
        <p className="text-sm text-muted-foreground">
          This prompt has no arguments.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExecute}
          disabled={isExecuting}
          size="sm"
          className="flex items-center gap-2"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Get Prompt
            </>
          )}
        </Button>
        {messages && (
          <>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </>
              )}
            </Button>
            <Button
              onClick={onClear}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Display */}
      {messages && messages.messages && messages.messages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Messages ({messages.messages.length})</h4>
            {messages.description && (
              <p className="text-xs text-muted-foreground">{messages.description}</p>
            )}
          </div>
          <ScrollArea className="max-h-96 pr-4">
            <div className="space-y-3">
              {messages.messages.map((message, index) => (
                <Card
                  key={index}
                  className={cn(
                    'border transition-colors',
                    getRoleClasses(message.role)
                  )}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(message.role)}
                      <Badge
                        variant="outline"
                        className="text-xs font-mono capitalize"
                      >
                        {message.role}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {message.content.type}
                      </Badge>
                    </div>
                    {message.content.text && (
                      <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                        {message.content.text}
                      </pre>
                    )}
                    {message.content.type === 'image' && message.content.data && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Image ({message.content.mimeType || 'unknown format'})
                        </p>
                        <img
                          src={`data:${message.content.mimeType || 'image/png'};base64,${
                            message.content.data
                          }`}
                          alt="Prompt content"
                          className="max-w-full rounded border"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty state after execution */}
      {messages && (!messages.messages || messages.messages.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Prompt executed successfully but returned no messages.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
