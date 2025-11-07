"use client";

import { useMCPConnection } from '@/hooks/useMCPConnection';
import { usePrompts } from '@/hooks/usePrompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { PromptViewer } from './PromptViewer';

export function PromptsList() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';

  const {
    prompts,
    selectedPrompt,
    isLoading,
    isExecuting,
    messages,
    error,
    selectPrompt,
    getPrompt,
    clearMessages,
  } = usePrompts(isConnected);

  // Not connected state
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>
            Test prompts with argument autocomplete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect to an MCP server to view available prompts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>Loading available prompts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state (only show if no prompts loaded)
  if (error && prompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>Failed to load prompts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No prompts available
  if (prompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>
            No prompts available from the connected server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              The connected MCP server does not expose any prompts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Prompts ({prompts.length})
        </CardTitle>
        <CardDescription>
          Select a prompt to view details and execute with arguments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <Accordion type="single" collapsible className="w-full">
            {prompts.map((prompt) => {
              const requiredArgs = prompt.arguments?.filter((arg) => arg.required) || [];
              const optionalArgs = prompt.arguments?.filter((arg) => !arg.required) || [];
              const totalArgs = prompt.arguments?.length || 0;

              return (
                <AccordionItem key={prompt.name} value={prompt.name}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">
                          {prompt.name}
                        </span>
                        {totalArgs > 0 && (
                          <>
                            {requiredArgs.length > 0 && (
                              <Badge variant="default" className="text-xs">
                                {requiredArgs.length} required
                              </Badge>
                            )}
                            {optionalArgs.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {optionalArgs.length} optional
                              </Badge>
                            )}
                          </>
                        )}
                        {totalArgs === 0 && (
                          <Badge variant="outline" className="text-xs">
                            no args
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4">
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {prompt.description}
                        </p>
                      )}
                      <PromptViewer
                        prompt={prompt}
                        isExecuting={isExecuting && selectedPrompt?.name === prompt.name}
                        messages={selectedPrompt?.name === prompt.name ? messages : null}
                        error={selectedPrompt?.name === prompt.name ? error : null}
                        onExecute={(args) => {
                          selectPrompt(prompt);
                          getPrompt(prompt.name, args);
                        }}
                        onClear={clearMessages}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
