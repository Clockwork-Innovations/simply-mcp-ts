"use client";

import { useTools } from '@/hooks/useTools';
import { useMCPConnection } from '@/hooks/useMCPConnection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wrench } from 'lucide-react';
import { ToolCard } from './ToolCard';
import { ElicitationForm } from '../elicitation/ElicitationForm';

export function ToolsList() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';
  const {
    tools,
    selectedTool,
    isLoading,
    isExecuting,
    executionResult,
    error,
    elicitationRequest,
    loadTools,
    selectTool,
    executeTool,
    clearResults,
    respondToElicitation,
    cancelElicitation,
  } = useTools(isConnected);

  // Note: Tools are automatically loaded by useTools hook via event listener

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>Loading available tools...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && tools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>Failed to load tools</CardDescription>
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

  // No tools available
  if (tools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            No tools available from the connected server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Wrench className="h-4 w-4" />
            <AlertDescription>
              The connected MCP server does not expose any tools.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Tools ({tools.length})
          </CardTitle>
          <CardDescription>
            Select a tool to view parameters and execute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <Accordion type="single" collapsible className="w-full">
              {tools.map((tool) => (
                <AccordionItem key={tool.name} value={tool.name}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {tool.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(tool.inputSchema.properties || {}).length} params
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4">
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {tool.description}
                        </p>
                      )}
                      <ToolCard
                        tool={tool}
                        isExecuting={isExecuting}
                        executionResult={executionResult}
                        error={error}
                        onExecute={(args) => {
                          selectTool(tool);
                          executeTool(tool.name, args);
                        }}
                        onClearResults={clearResults}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Elicitation Dialog */}
      {elicitationRequest && (
        <ElicitationForm
          request={elicitationRequest}
          onSubmit={respondToElicitation}
          onCancel={cancelElicitation}
        />
      )}
    </>
  );
}
