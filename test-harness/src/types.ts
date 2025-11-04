/**
 * Type definitions for Simply MCP Test Harness
 */

/**
 * Server configuration for the test harness
 */
export interface ServerConfig {
  /** Path to the MCP server file to load */
  serverFile: string;
  /** Port for the UI/API server (default: 8080) */
  uiPort: number;
  /** Port for the MCP server (default: 3100) */
  mcpPort: number;
  /** Enable mock sampling/elicitation context */
  mockContext: boolean;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Information about the loaded MCP server
 */
export interface ServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server capabilities */
  capabilities: {
    tools?: boolean;
    prompts?: boolean;
    resources?: boolean;
    sampling?: boolean;
    elicitation?: boolean;
    roots?: boolean;
    completions?: boolean;
  };
  /** MCP server port */
  mcpPort: number;
  /** Server status */
  status: 'running' | 'stopped' | 'error';
}

/**
 * API Response for server info endpoint
 */
export interface ServerInfoResponse {
  name: string;
  version: string;
  mcpPort: number;
  status: string;
  capabilities?: Record<string, boolean>;
}

/**
 * URLs returned by launchTestHarness
 */
export interface TestHarnessURLs {
  /** UI server URL */
  ui: string;
  /** MCP server URL */
  mcp: string;
}

/**
 * Tool definition from MCP server
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: any;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  params: Record<string, any>;
}

/**
 * Tool execution response
 */
export interface ToolExecutionResponse {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Resource definition from MCP server
 */
export interface ResourceDefinition {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/**
 * Resource read response
 */
export interface ResourceReadResponse {
  success: boolean;
  uri: string;
  mimeType?: string;
  contents: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>;
  error?: string;
}

/**
 * Prompt definition from MCP server
 */
export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Prompt execution request
 */
export interface PromptExecutionRequest {
  args?: Record<string, any>;
}

/**
 * Prompt execution response
 */
export interface PromptExecutionResponse {
  success: boolean;
  messages?: Array<{
    role: 'user' | 'assistant';
    content: { type: string; text?: string };
  }>;
  error?: string;
}

/**
 * Completion request
 */
export interface CompletionRequest {
  ref: string;
  arg: string;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  success: boolean;
  completions?: Array<{
    value: string;
    label?: string;
    description?: string;
  }>;
  error?: string;
}

/**
 * Metrics response
 */
export interface MetricsResponse {
  tools: number;
  prompts: number;
  resources: number;
  routers?: number;
  assignedTools?: number;
  unassignedTools?: number;
  flattenRouters?: boolean;
}

/**
 * Config response
 */
export interface ConfigResponse {
  serverFile: string;
  uiPort: number;
  mcpPort: number;
  mockContext: boolean;
  verbose: boolean;
  serverName: string;
  serverVersion: string;
}
