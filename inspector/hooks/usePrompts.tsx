"use client";

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '@/lib/mcp';
import type { Prompt, PromptResult } from '@/lib/mcp/types';

export interface PromptsState {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  isLoading: boolean;
  isExecuting: boolean;
  messages: PromptResult | null;
  error: string | null;
}

export interface UsePromptsReturn extends PromptsState {
  loadPrompts: () => Promise<void>;
  selectPrompt: (prompt: Prompt | null) => void;
  getPrompt: (name: string, args: Record<string, any>) => Promise<void>;
  clearMessages: () => void;
}

export function usePrompts(isConnected: boolean): UsePromptsReturn {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState<PromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load prompts from MCP server
  const loadPrompts = useCallback(async () => {
    if (!mcpClient.isConnected()) {
      setError('Not connected to MCP server');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const promptsList = await mcpClient.listPrompts();
      setPrompts(promptsList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
      setError(errorMessage);
      console.error('Error loading prompts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a prompt
  const selectPrompt = useCallback((prompt: Prompt | null) => {
    setSelectedPrompt(prompt);
    setMessages(null);
    setError(null);
  }, []);

  // Get prompt messages (execute prompt with arguments)
  const getPrompt = useCallback(async (name: string, args: Record<string, any>) => {
    if (!mcpClient.isConnected()) {
      setError('Not connected to MCP server');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setMessages(null);

    try {
      const result = await mcpClient.getPrompt(name, args);
      setMessages(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get prompt';
      setError(errorMessage);
      console.error('Error getting prompt:', err);
    } finally {
      setIsExecuting(false);
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages(null);
    setError(null);
  }, []);

  // Auto-load prompts when connected - consolidated single useEffect
  useEffect(() => {
    const loadData = async () => {
      if (!mcpClient.isConnected()) {
        setError('Not connected to MCP server');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const promptsList = await mcpClient.listPrompts();
        setPrompts(promptsList);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
        setError(errorMessage);
        console.error('Error loading prompts:', err);
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
    prompts,
    selectedPrompt,
    isLoading,
    isExecuting,
    messages,
    error,
    loadPrompts,
    selectPrompt,
    getPrompt,
    clearMessages,
  };
}
