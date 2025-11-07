"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { ConnectionStatus, ConnectionInfo } from '@/lib/mcp/types';

export interface MCPConnectionState {
  connectionState: ConnectionStatus;
  serverInfo: ConnectionInfo | null;
  error: string | null;
  isConnecting: boolean;
}

export interface UseMCPConnectionReturn extends MCPConnectionState {
  connect: (config: any) => Promise<void>;
  disconnect: () => Promise<void>;
  getStatus: () => ConnectionInfo;
}

export function useMCPConnection(): UseMCPConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionStatus>('disconnected');
  const [serverInfo, setServerInfo] = useState<ConnectionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const statusPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-poll connection status when connected
  useEffect(() => {
    if (connectionState === 'connected') {
      statusPollingInterval.current = setInterval(() => {
        const status = mcpClient.getConnectionStatus();
        setServerInfo(status);
        if (status.status !== 'connected') {
          setConnectionState(status.status);
          if (status.error) {
            setError(status.error);
          }
        }
      }, 5000); // Poll every 5 seconds
    } else {
      if (statusPollingInterval.current) {
        clearInterval(statusPollingInterval.current);
        statusPollingInterval.current = null;
      }
    }

    return () => {
      if (statusPollingInterval.current) {
        clearInterval(statusPollingInterval.current);
      }
    };
  }, [connectionState]);

  const connect = useCallback(async (config: any) => {
    if (!config) {
      setError('Connection config is required');
      return;
    }

    setIsConnecting(true);
    setConnectionState('connecting');
    setError(null);

    try {
      const result = await mcpClient.connect(config);

      if (result.status === 'error') {
        setConnectionState('error');
        setError(result.error || 'Connection failed');
        setServerInfo(null);
      } else if (result.status === 'connected') {
        // Update state synchronously
        setConnectionState('connected');
        setServerInfo(result);
        setError(null);

        // Dispatch custom event to notify all components
        window.dispatchEvent(new CustomEvent('mcp-connected', {
          detail: { serverInfo: result }
        }));

        // Verify connection is actually usable by attempting to get status
        try {
          const status = mcpClient.getConnectionStatus();
          if (status.status !== 'connected') {
            throw new Error('Connection verification failed');
          }
        } catch (verifyErr) {
          console.error('Connection verification failed:', verifyErr);
          setConnectionState('error');
          setError('Connection established but verification failed');
          setServerInfo(null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionState('error');
      setError(errorMessage);
      setServerInfo(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await mcpClient.disconnect();
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setConnectionState('disconnected');
      setServerInfo(null);
      setError(null);
      setIsConnecting(false);
    }
  }, []);

  const getStatus = useCallback((): ConnectionInfo => {
    return mcpClient.getConnectionStatus();
  }, []);

  return {
    connectionState,
    serverInfo,
    error,
    isConnecting,
    connect,
    disconnect,
    getStatus,
  };
}
