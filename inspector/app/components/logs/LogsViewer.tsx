"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { useLogs } from "@/hooks/useLogs";
import { useMCPConnection } from "@/hooks/useMCPConnection";
import { LogFilter } from "./LogFilter";

export function LogsViewer() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';
  const {
    filteredMessages,
    directionFilter,
    typeFilter,
    autoScroll,
    clearLogs,
    setDirectionFilter,
    setTypeFilter,
    setAutoScroll,
    resetFilters,
  } = useLogs(isConnected);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages, autoScroll]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Protocol Logs</CardTitle>
          <CardDescription>
            Real-time stream of MCP protocol messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Connect to an MCP server to view protocol messages
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              All protocol communication will be logged here in real-time
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
            <CardTitle>Protocol Messages</CardTitle>
            <CardDescription>
              Real-time stream of all MCP protocol communication
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="auto-scroll" className="text-sm cursor-pointer">
                Auto-scroll
              </Label>
            </div>
            <Button
              onClick={clearLogs}
              disabled={filteredMessages.length === 0}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Logs
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <LogFilter
          directionFilter={directionFilter}
          typeFilter={typeFilter}
          onDirectionChange={setDirectionFilter}
          onTypeChange={setTypeFilter}
          onReset={resetFilters}
        />

        {/* Message Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>
            Showing {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Messages Stream */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {directionFilter !== 'all' || typeFilter !== 'all'
                ? 'No messages match the current filters'
                : 'No protocol messages yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {directionFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more messages'
                : 'Messages will appear here as you interact with the server'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] rounded-lg border">
            <div ref={scrollRef} className="p-4 space-y-3">
              {filteredMessages.map((message, index) => {
                const isRequest = message.direction === 'sent';
                const timestamp = new Date(message.timestamp).toLocaleTimeString();

                return (
                  <div key={`${message.type}-${index}-${message.timestamp}`} className="space-y-2">
                    {/* Message Header */}
                    <div className="flex items-center gap-2">
                      {isRequest ? (
                        <Badge variant="default" className="gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ArrowLeft className="w-3 h-3" />
                          Received
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono text-xs">
                        {message.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timestamp}
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(message.content, null, 2)}
                      </pre>
                    </div>

                    {/* Separator between messages */}
                    {index < filteredMessages.length - 1 && (
                      <Separator className="my-3" />
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}

        {/* Memory warning */}
        {filteredMessages.length >= 900 && (
          <p className="text-xs text-muted-foreground">
            Approaching message limit (1000). Older messages will be automatically removed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
