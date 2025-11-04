"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Folder, AlertCircle } from "lucide-react";
import { useRoots } from "@/hooks/useRoots";
import { useMCPConnection } from "@/hooks/useMCPConnection";

export function RootsList() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';
  const { roots, isLoading, error, refreshRoots } = useRoots(isConnected);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roots</CardTitle>
          <CardDescription>
            Navigate filesystem roots and directory structures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Connect to an MCP server to view directory roots exposed by the server.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Directory Roots</CardTitle>
            <CardDescription>
              Filesystem roots exposed by the MCP server
            </CardDescription>
          </div>
          <Button
            onClick={refreshRoots}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && !error && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading roots...
          </div>
        )}

        {!isLoading && !error && roots.length === 0 && (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No roots available from this server
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              The server has not exposed any directory roots
            </p>
          </div>
        )}

        {!isLoading && !error && roots.length > 0 && (
          <div className="space-y-3">
            {roots.map((root, index) => (
              <div
                key={`${root.uri}-${index}`}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Folder className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {root.name && (
                        <h3 className="font-semibold text-sm">{root.name}</h3>
                      )}
                      <Badge variant="secondary" className="text-xs font-mono">
                        root
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {root.uri}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && roots.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Total roots: <span className="font-semibold">{roots.length}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
