"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, MessageSquare, AlertCircle, Brain, Clock } from "lucide-react";
import { useSampling } from "@/hooks/useSampling";
import { useMCPConnection } from "@/hooks/useMCPConnection";

export function SamplingViewer() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';
  const { history, pendingRequest, clearHistory } = useSampling(isConnected);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sampling</CardTitle>
          <CardDescription>
            Monitor and test LLM sampling requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Connect to an MCP server to monitor LLM sampling requests
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              When tools request LLM completions, they will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>LLM Sampling Requests</CardTitle>
            <CardDescription>
              View and respond to sampling requests from tools
            </CardDescription>
          </div>
          <Button
            onClick={clearHistory}
            disabled={history.length === 0}
            variant="outline"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingRequest && (
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Sampling request pending... Auto-responding with mock data in 2 seconds
            </AlertDescription>
          </Alert>
        )}

        {history.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No sampling requests yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Execute a tool that makes LLM requests to see sampling activity here
            </p>
          </div>
        )}

        {history.length > 0 && (
          <>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              <span>Total requests: {history.length}</span>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <Accordion type="single" collapsible className="space-y-2">
                {history.map((entry) => (
                  <AccordionItem
                    key={entry.id}
                    value={entry.id}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {entry.request.data.messages[0]?.content.substring(0, 50)}...
                            </span>
                            {entry.isPending && (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                            {!entry.isPending && entry.response && (
                              <Badge variant="default">Completed</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-4">
                      {/* Request Section */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Request
                        </h4>
                        <div className="space-y-2">
                          {/* Messages */}
                          <div className="bg-muted/50 rounded p-3">
                            <p className="text-xs font-semibold mb-2 text-muted-foreground">
                              Messages:
                            </p>
                            {entry.request.data.messages.map((msg, idx) => (
                              <div key={idx} className="mb-2 last:mb-0">
                                <Badge variant="outline" className="text-xs mb-1">
                                  {msg.role}
                                </Badge>
                                <p className="text-sm pl-2">
                                  {msg.content}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* System Prompt */}
                          {entry.request.data.systemPrompt && (
                            <div className="bg-muted/50 rounded p-3">
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                System Prompt:
                              </p>
                              <p className="text-sm">{entry.request.data.systemPrompt}</p>
                            </div>
                          )}

                          {/* Model Preferences */}
                          {entry.request.data.modelPreferences && (
                            <div className="bg-muted/50 rounded p-3">
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                Model Preferences:
                              </p>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(entry.request.data.modelPreferences, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Additional Parameters */}
                          <div className="flex gap-2 flex-wrap">
                            {entry.request.data.temperature !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                temp: {entry.request.data.temperature}
                              </Badge>
                            )}
                            {entry.request.data.maxTokens !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                max tokens: {entry.request.data.maxTokens}
                              </Badge>
                            )}
                            {entry.request.data.includeContext && (
                              <Badge variant="secondary" className="text-xs">
                                context: {entry.request.data.includeContext}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Response Section */}
                      {entry.response && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Response
                          </h4>
                          <div className="space-y-2">
                            <div className="bg-muted/50 rounded p-3">
                              <div className="flex gap-2 mb-2">
                                <Badge variant="default" className="text-xs">
                                  {entry.response.model}
                                </Badge>
                                {entry.response.stopReason && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.response.stopReason}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {entry.response.content.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pending State */}
                      {entry.isPending && !entry.response && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Waiting for response... Auto-completing with mock data
                          </AlertDescription>
                        </Alert>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
