// lib/mcp/index.ts
// Main export file for MCP client library

export { MCPClient, mcpClient } from './client';
export type {
  // Connection
  ConnectionInfo,
  ConnectionStatus,
  ServerCapabilities,

  // Tools
  Tool,
  ToolExecutionResult,

  // Resources
  Resource,
  ResourceContent,

  // Prompts
  Prompt,
  PromptMessage,
  PromptResult,

  // Roots
  Root,

  // Completions
  CompletionRequest,
  CompletionResult,

  // Elicitation
  ElicitationRequest,
  ElicitationResponse,

  // Sampling
  SamplingRequest,
  SamplingResponse,

  // Subscriptions
  Subscription,

  // Logs
  ProtocolMessage,

  // Low-level protocol
  MCPError,
  MCPRequest,
  MCPResponse,
  ResourceUpdatedNotification,
} from './types';
