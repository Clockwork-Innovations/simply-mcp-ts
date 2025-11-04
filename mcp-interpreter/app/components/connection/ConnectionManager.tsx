"use client";

import { useState } from 'react';
import { useMCPConnection } from '@/hooks/useMCPConnection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type TransportType = 'stdio' | 'http-stateful' | 'http-stateless';

export function ConnectionManager() {
  const { connectionState, serverInfo, error, isConnecting, connect, disconnect } = useMCPConnection();

  // Transport configuration
  const [transportType, setTransportType] = useState<TransportType>('stdio');
  const [serverPath, setServerPath] = useState('/mnt/Shared/cs-projects/simply-mcp-ts/examples/interface-test-harness-demo.ts');
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/mcp');

  // Authentication configuration
  const [useAuth, setUseAuth] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('x-api-key');

  const handleConnect = async () => {
    // Build connection config based on transport type
    const config: any = { type: transportType };

    if (transportType === 'stdio') {
      config.serverPath = serverPath;
    } else {
      config.url = serverUrl;

      // Add auth if enabled
      if (useAuth && apiKey.trim()) {
        config.auth = {
          type: 'apiKey',
          key: apiKey,
          headerName: apiKeyHeader || 'x-api-key',
        };
      }
    }

    await connect(config);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const getStatusDisplay = () => {
    switch (connectionState) {
      case 'disconnected':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm text-muted-foreground">Disconnected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-muted-foreground">Connecting...</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-sm text-foreground">Connected</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm text-destructive">Error: {error}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getCapabilitiesCount = () => {
    if (!serverInfo || connectionState !== 'connected') return 0;

    // Count capabilities from the ConnectionInfo
    // Since we don't have direct access to capabilities in ConnectionInfo,
    // we'll need to make an assumption or check serverInfo for capability data
    return 0; // Placeholder - will be updated when we have capability data
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Connection Manager</CardTitle>
        <CardDescription>Connect to an MCP server to begin testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transport Type Selector */}
        <div className="space-y-2">
          <Label>Transport Type</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="stdio"
                checked={transportType === 'stdio'}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                disabled={connectionState === 'connected' || isConnecting}
                className="text-primary"
              />
              <span className="text-sm">Stdio (Local)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="http-stateful"
                checked={transportType === 'http-stateful'}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                disabled={connectionState === 'connected' || isConnecting}
                className="text-primary"
              />
              <span className="text-sm">HTTP Stateful (SSE)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="http-stateless"
                checked={transportType === 'http-stateless'}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                disabled={connectionState === 'connected' || isConnecting}
                className="text-primary"
              />
              <span className="text-sm">HTTP Stateless (REST)</span>
            </label>
          </div>
        </div>

        {/* Server Configuration */}
        <div className="space-y-2">
          {transportType === 'stdio' ? (
            <div>
              <Label htmlFor="serverPath">Server Path</Label>
              <Input
                id="serverPath"
                type="text"
                placeholder="/path/to/server.ts"
                value={serverPath}
                onChange={(e) => setServerPath(e.target.value)}
                disabled={connectionState === 'connected' || isConnecting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Path to TypeScript server file (will run via simply-mcp CLI)
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                type="text"
                placeholder="http://localhost:3000/mcp"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={connectionState === 'connected' || isConnecting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                HTTP endpoint for MCP server
              </p>
            </div>
          )}
        </div>

        {/* Authentication (HTTP only) */}
        {transportType !== 'stdio' && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useAuth"
                checked={useAuth}
                onChange={(e) => setUseAuth(e.target.checked)}
                disabled={connectionState === 'connected' || isConnecting}
                className="text-primary"
              />
              <Label htmlFor="useAuth">Use API Key Authentication</Label>
            </div>

            {useAuth && (
              <div className="space-y-2 ml-6">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={connectionState === 'connected' || isConnecting}
                  />
                </div>
                <div>
                  <Label htmlFor="apiKeyHeader">Header Name (optional)</Label>
                  <Input
                    id="apiKeyHeader"
                    type="text"
                    placeholder="x-api-key"
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    disabled={connectionState === 'connected' || isConnecting}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connect/Disconnect Button */}
        <div className="flex gap-2">
          {connectionState === 'connected' ? (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              disabled={isConnecting}
              className="flex-1"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting || (transportType === 'stdio' ? !serverPath.trim() : !serverUrl.trim())}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          )}
        </div>

        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {getStatusDisplay()}
          </div>

          {/* Server Info when connected */}
          {connectionState === 'connected' && serverInfo && (
            <div className="flex items-center gap-2">
              {serverInfo.transport && (
                <Badge variant="default">
                  {serverInfo.transport === 'stdio' && '📡 Stdio'}
                  {serverInfo.transport === 'http-stateful' && '🌐 HTTP (SSE)'}
                  {serverInfo.transport === 'http-stateless' && '🌐 HTTP (REST)'}
                </Badge>
              )}
              {serverInfo.serverName && (
                <Badge variant="outline">{serverInfo.serverName}</Badge>
              )}
              {serverInfo.serverVersion && (
                <Badge variant="secondary">v{serverInfo.serverVersion}</Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
