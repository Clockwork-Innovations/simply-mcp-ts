/**
 * Feature Layer End-to-End Integration Validation
 *
 * This comprehensive test validates the complete flow:
 * Interface → Parser → Adapter → BuildMCPServer → InterfaceServer
 *
 * Tests all 5 protocol features: ISampling, IElicit, IRoots, ISubscription, ICompletion
 */

import type {
  ITool,
  IServer,
  ISampling,
  IElicit,
  IRoots,
  ISubscription,
  ICompletion
} from '../src/index.js';

// ============================================================================
// Test Server Interface with ALL Protocol Features
// ============================================================================

interface TestServerInterface extends IServer {
  name: 'feature-layer-test';
  version: '1.0.0';
  description: 'Feature Layer Integration Test Server';
}

// ============================================================================
// Tool Interface (for context access)
// ============================================================================

interface AnalyzeTool extends ITool {
  name: 'analyze_code';
  description: 'Analyze code with LLM sampling';
  params: { code: string };
  result: { analysis: string };
}

interface ConfigureTool extends ITool {
  name: 'configure_system';
  description: 'Configure system with elicitation';
  params: { feature: string };
  result: { configured: boolean };
}

interface ListFilesTool extends ITool {
  name: 'list_files';
  description: 'List files from root directories';
  params: { pattern?: string };
  result: { files: string[] };
}

interface AutocompleteTool extends ITool {
  name: 'autocomplete_city';
  description: 'Get city name completions';
  params: { prefix: string };
  result: { suggestions: string[] };
}

// ============================================================================
// Protocol Feature Interfaces
// ============================================================================

// 1. ISampling Interface
interface TestSampling extends ISampling {
  messages: [
    {
      role: 'user';
      content: {
        type: 'text';
        text: 'Hello, what can you help me with?';
      };
    }
  ];
  options: {
    maxTokens: 500;
    temperature: 0.7;
  };
}

// 2. IElicit Interface
interface TestElicit extends IElicit {
  prompt: 'Please provide your API configuration';
  args: {
    apiKey: {
      type: 'string';
      title: 'API Key';
      description: 'Your service API key';
      minLength: 10;
    };
    endpoint: {
      type: 'string';
      title: 'Endpoint';
      description: 'API endpoint URL';
      format: 'uri';
    };
    enabled: {
      type: 'boolean';
      title: 'Enabled';
      description: 'Enable the service';
    };
  };
  result: {
    apiKey: string;
    endpoint: string;
    enabled: boolean;
  };
}

// 3. IRoots Interface
interface TestRoots extends IRoots {
  name: 'project_roots';
  description: 'Get project root directories from client';
}

// 4. ISubscription Interface
interface ConfigSubscription extends ISubscription {
  uri: 'config://server';
  description: 'Subscribe to server configuration changes';
}

interface StatsSubscription extends ISubscription {
  uri: 'stats://current';
  description: 'Subscribe to real-time statistics updates';
  handler: () => void;
}

// 5. ICompletion Interface
interface CityCompletion extends ICompletion {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
  complete: (value: string) => Promise<string[]>;
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class FeatureLayerTestServer {
  name: 'feature-layer-test' = 'feature-layer-test';
  version: '1.0.0' = '1.0.0';
  description: 'Feature Layer Integration Test Server' = 'Feature Layer Integration Test Server';

  // Tool implementations
  analyzeCode: AnalyzeTool = async (params, context) => {
    if (!context?.sample) {
      return { analysis: 'Sampling not available' };
    }

    const result = await context.sample(
      [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this code:\n${params.code}`
          }
        }
      ],
      { maxTokens: 200 }
    );

    return { analysis: result.content.text || 'No analysis' };
  };

  configureSystem: ConfigureTool = async (params, context) => {
    if (!context?.elicitInput) {
      return { configured: false };
    }

    const result = await context.elicitInput(
      `Configure ${params.feature}`,
      {
        value: {
          type: 'string',
          title: 'Configuration Value',
          description: `Enter value for ${params.feature}`
        }
      }
    );

    return { configured: result.action === 'accept' };
  };

  listFiles: ListFilesTool = async (params, context) => {
    if (!context?.listRoots) {
      return { files: [] };
    }

    const roots = await context.listRoots();
    return {
      files: roots.map(root => `${root.uri}/${params.pattern || '*'}`)
    };
  };

  autocompleteCity: AutocompleteTool = async (params) => {
    const cities = ['New York', 'New Orleans', 'Newark', 'Los Angeles', 'San Francisco'];
    return {
      suggestions: cities.filter(city =>
        city.toLowerCase().startsWith(params.prefix.toLowerCase())
      )
    };
  };

  // Subscription handler (if dynamic)
  'stats://current': StatsSubscription = async () => {
    console.log('[Subscription] Stats subscription activated');
  };

  // Completion handler
  cityAutocomplete: CityCompletion = async (value: string) => {
    const cities = ['New York', 'New Orleans', 'Newark', 'Los Angeles', 'San Francisco'];
    return cities.filter(city => city.toLowerCase().startsWith(value.toLowerCase()));
  };
}
