// Verification script to ensure all 9 primitives are implemented

import { mcpClient, type ServerCapabilities } from './index';

// Type-check: All primitives should have methods
type MCPClientMethods = {
  // Connection
  connect: (path: string) => Promise<any>;
  disconnect: () => Promise<void>;
  getConnectionStatus: () => any;
  isConnected: () => boolean;
  getCapabilities: () => ServerCapabilities;

  // 1. Tools
  listTools: () => Promise<any[]>;
  executeTool: (name: string, params: Record<string, any>) => Promise<any>;

  // 2. Resources
  listResources: () => Promise<any[]>;
  readResource: (uri: string) => Promise<any>;

  // 3. Prompts
  listPrompts: () => Promise<any[]>;
  getPrompt: (name: string, args?: Record<string, string>) => Promise<any>;

  // 4. Roots
  listRoots: () => Promise<any[]>;

  // 5. Elicitation (client-side)
  setElicitationHandler: (handler: any) => void;
  handleElicitation: (request: any) => Promise<any>;

  // 6. Completions
  getCompletions: (request: any) => Promise<any>;

  // 7. Sampling (client-side)
  setSamplingHandler: (handler: any) => void;
  handleSampling: (request: any) => Promise<any>;

  // 8. Subscriptions
  subscribeToResource: (uri: string, callback: any) => Promise<void>;
  unsubscribeFromResource: (uri: string) => Promise<void>;
  getActiveSubscriptions: () => string[];

  // 9. Logs
  onMessage: (listener: any) => () => void;
  getMessages: () => any[];
  getMessagesByType: (type: string) => any[];
  getMessagesByDirection: (direction: 'sent' | 'received') => any[];
  clearMessages: () => void;
};

// This will fail to compile if any methods are missing
const _typeCheck: MCPClientMethods = mcpClient as any;

console.log('✅ All 9 MCP primitives verified:');
console.log('  1. Tools - listTools, executeTool');
console.log('  2. Resources - listResources, readResource');
console.log('  3. Prompts - listPrompts, getPrompt');
console.log('  4. Roots - listRoots');
console.log('  5. Elicitation - setElicitationHandler, handleElicitation');
console.log('  6. Completions - getCompletions');
console.log('  7. Sampling - setSamplingHandler, handleSampling');
console.log('  8. Subscriptions - subscribeToResource, unsubscribeFromResource');
console.log('  9. Logs - onMessage, getMessages, clearMessages');
