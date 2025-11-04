"use client";

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { Tool, ToolExecutionResult, ElicitationRequest, ElicitationResponse } from '@/lib/mcp/types';

export interface ToolsState {
  tools: Tool[];
  selectedTool: Tool | null;
  isLoading: boolean;
  isExecuting: boolean;
  executionResult: ToolExecutionResult | null;
  error: string | null;
  elicitationRequest: ElicitationRequest | null;
}

export interface UseToolsReturn extends ToolsState {
  loadTools: () => Promise<void>;
  selectTool: (tool: Tool | null) => void;
  executeTool: (name: string, args: Record<string, any>) => Promise<void>;
  clearResults: () => void;
  respondToElicitation: (response: ElicitationResponse) => void;
  cancelElicitation: () => void;
}

export function useTools(isConnected: boolean): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ToolExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elicitationRequest, setElicitationRequest] = useState<ElicitationRequest | null>(null);
  const [elicitationResolver, setElicitationResolver] = useState<{
    resolve: (response: ElicitationResponse) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  // Load tools from MCP server
  const loadTools = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to MCP server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const toolsList = await mcpClient.listTools();
      setTools(toolsList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tools';
      setError(errorMessage);
      console.error('Error loading tools:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Select a tool for execution
  const selectTool = useCallback((tool: Tool | null) => {
    setSelectedTool(tool);
    setExecutionResult(null);
    setError(null);
  }, []);

  // Execute a tool with given arguments
  const executeTool = useCallback(async (name: string, args: Record<string, any>) => {
    if (!mcpClient.isConnected()) {
      setError('Not connected to MCP server');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      const result = await mcpClient.executeTool(name, args);
      setExecutionResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tool execution failed';
      setError(errorMessage);
      console.error('Error executing tool:', err);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Clear execution results
  const clearResults = useCallback(() => {
    setExecutionResult(null);
    setError(null);
  }, []);

  // Respond to elicitation request
  const respondToElicitation = useCallback((response: ElicitationResponse) => {
    if (elicitationResolver) {
      elicitationResolver.resolve(response);
      setElicitationRequest(null);
      setElicitationResolver(null);
    }
  }, [elicitationResolver]);

  // Cancel elicitation request
  const cancelElicitation = useCallback(() => {
    if (elicitationResolver) {
      elicitationResolver.reject(new Error('Elicitation cancelled by user'));
      setElicitationRequest(null);
      setElicitationResolver(null);
    }
  }, [elicitationResolver]);

  // Set up elicitation handler on mount
  useEffect(() => {
    mcpClient.setElicitationHandler(async (request: ElicitationRequest) => {
      return new Promise<ElicitationResponse>((resolve, reject) => {
        setElicitationRequest(request);
        setElicitationResolver({ resolve, reject });
      });
    });

    return () => {
      mcpClient.setElicitationHandler(async () => {
        throw new Error('No elicitation handler registered');
      });
    };
  }, []);

  // Auto-load tools when connected - use event listener pattern like useResources
  useEffect(() => {
    const loadData = async () => {
      if (!mcpClient.isConnected()) {
        setError('Not connected to MCP server');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const toolsList = await mcpClient.listTools();
        setTools(toolsList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tools';
        setError(errorMessage);
        console.error('Error loading tools:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleConnection = () => {
      loadData();
    };

    // Load immediately if already connected
    if (mcpClient.isConnected()) {
      loadData();
    }

    // Listen for future connections
    window.addEventListener('mcp-connected', handleConnection);
    return () => {
      window.removeEventListener('mcp-connected', handleConnection);
    };
  }, []); // Empty dependency array - fully self-contained

  return {
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
  };
}
