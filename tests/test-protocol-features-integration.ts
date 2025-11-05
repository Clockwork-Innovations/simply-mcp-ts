/**
 * Integration Test: Protocol Features (Foundation Layer)
 *
 * Tests the end-to-end flow of the 5 new MCP protocol features:
 * 1. Sampling (ISampling) - LLM completion requests
 * 2. Elicitation (IElicit) - User input requests
 * 3. Roots (IRoots) - Client working directory discovery
 * 4. Subscriptions (ISubscription) - Resource update notifications
 * 5. Completions (ICompletion) - Autocomplete for prompt arguments
 *
 * This test verifies:
 * - Parser extracts all 5 protocol interface types
 * - Adapter auto-enables capabilities for detected features
 * - BuildMCPServer receives correct capabilities
 * - InterfaceServer runtime config includes capabilities
 */

import type {
  ITool,
  IServer,
  ISampling,
  IElicit,
  IRoots,
  ISubscription,
  ICompletion,
} from '../src/interface-types.js';

// ===== Protocol Feature Interfaces =====

/**
 * Sampling interface - requests LLM completions from client
 */
interface CodeAnalysisSampling extends ISampling {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: string; text: string };
  }>;
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

/**
 * Elicitation interface - requests user input from client
 */
interface ApiKeyElicit extends IElicit {
  prompt: 'Please enter your API key';
  args: {
    apiKey: {
      type: 'string';
      title: 'API Key';
      description: 'Your API key for external services';
    };
  };
  result: { apiKey: string };
}

/**
 * Roots interface - requests client's working directories
 */
interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Get project root directories';
}

/**
 * Subscription interface - allows clients to subscribe to resource updates
 */
interface ConfigSubscription extends ISubscription {
  uri: 'config://server';
  description: 'Server configuration changes';
}

/**
 * Completion interface - provides autocomplete for prompt arguments
 */
interface CityCompletion extends ICompletion {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
  complete: (value: string) => Promise<string[]>;
}

// ===== Tool Interface =====

interface AnalyzeCodeTool extends ITool {
  name: 'analyze_code';
  description: 'Analyze code using LLM sampling';
  params: { code: string };
  result: string;
}

// ===== Server Interface =====

const server: IServer = {
  name: 'protocol-test-server',
  version: '1.0.0',
  description: 'Test server for protocol feature integration'
}

// ===== Implementation =====

export default class ProtocolTestServerImpl {
  // Tool that uses sampling capability
  analyzeCode: AnalyzeCodeTool = async (params, context) => {
    // In a real scenario, this would use context.sample()
    // For foundation layer, we just verify the capability is enabled
    if (context?.sample) {
      return 'Sampling capability is available';
    }
    return `Analyzing code: ${params.code}`;
  };

  // Elicitation - accessed via context.elicitInput() in tools
  // No explicit implementation needed for foundation layer

  // Roots - accessed via context.listRoots() in tools
  // No explicit implementation needed for foundation layer

  // Subscription - automatically wired by adapter
  // No explicit handler needed for foundation layer

  // Completion - handler registered but returns empty for foundation layer
  // No explicit implementation needed for foundation layer
}
