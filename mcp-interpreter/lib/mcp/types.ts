// lib/mcp/types.ts
// Comprehensive type definitions for MCP client library

// Connection state
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionInfo {
  status: ConnectionStatus;
  serverName?: string;
  serverVersion?: string;
  transport?: string;
  error?: string;
}

// Server capabilities (all 9 MCP primitives)
export interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  roots?: boolean;
  elicitation?: boolean;
  completions?: boolean;
  sampling?: boolean;
  subscriptions?: boolean;
  logging?: boolean;
}

// Tools primitive
export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any
  }>;
  isError?: boolean;
}

// Resources primitive
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// Prompts primitive
export interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: string;
    text?: string;
    [key: string]: any;
  };
}

export interface PromptResult {
  messages: PromptMessage[];
  description?: string;
}

// Roots primitive
export interface Root {
  uri: string;
  name?: string;
}

// Completions primitive
export interface CompletionRequest {
  ref: {
    type: 'ref/prompt' | 'ref/resource';
    name: string;
  };
  argument: {
    name: string;
    value: string;
  };
}

export interface CompletionResult {
  completion: {
    values: string[];
    total?: number;
    hasMore?: boolean;
  };
}

// Elicitation primitive (client-side handling)
export interface ElicitationRequest {
  type: 'elicitation';
  data: {
    prompt: string;
    fields?: Array<{
      name: string;
      label: string;
      type: 'text' | 'number' | 'boolean' | 'select';
      required?: boolean;
      options?: string[];
    }>;
  };
}

export interface ElicitationResponse {
  fields: Record<string, any>;
}

// Sampling primitive (client-side handling)
export interface SamplingRequest {
  type: 'sampling';
  data: {
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
    modelPreferences?: {
      hints?: Array<{ name: string }>;
      costPriority?: number;
      speedPriority?: number;
      intelligencePriority?: number;
    };
    systemPrompt?: string;
    includeContext?: 'none' | 'thisServer' | 'allServers';
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    metadata?: Record<string, unknown>;
  };
}

export interface SamplingResponse {
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  };
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

// Subscriptions primitive
export interface Subscription {
  uri: string;
  callback: (content: ResourceContent) => void;
}

// Logs primitive (protocol messages)
export interface ProtocolMessage {
  timestamp: Date;
  direction: 'sent' | 'received';
  type: string;
  content: any;
}

// Error handling
export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Request/Response types for low-level protocol
export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  result?: any;
  error?: MCPError;
}

// Notification types (for subscriptions)
export interface ResourceUpdatedNotification {
  method: 'notifications/resources/updated';
  params: {
    uri: string;
  };
}
