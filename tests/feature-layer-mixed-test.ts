/**
 * Mixed Feature Test
 *
 * Tests combinations of tools with protocol features to ensure they work together.
 */

import type {
  ITool,
  IPrompt,
  IResource,
  IServer,
  ISampling,
  IElicit,
  IRoots,
  ISubscription,
} from '../src/index.js';

// ============================================================================
// Server Interface
// ============================================================================

const server: IServer = {
  name: 'mixed-feature-test',
  version: '1.0.0',
  description: 'Tests mixed combinations of features'
}

// ============================================================================
// Scenario 1: Tools + Sampling + Roots
// ============================================================================

interface AnalyzeProjectTool extends ITool {
  name: 'analyze_project';
  description: 'Analyze project files using LLM sampling and roots';
  params: { pattern: string };
  result: { analysis: string; rootsUsed: number };
}

interface ProjectSampling extends ISampling {
  messages: [
    {
      role: 'user';
      content: {
        type: 'text';
        text: 'Analyze this project structure';
      };
    }
  ];
}

interface ProjectRoots extends IRoots {
  name: 'project_workspace';
  description: 'Project workspace roots';
}

// ============================================================================
// Scenario 2: Tools + Prompts + Elicitation
// ============================================================================

interface SetupTool extends ITool {
  name: 'setup_environment';
  description: 'Setup development environment with user input';
  params: { environmentType: string };
  result: { configured: boolean; settings: any };
}

interface SetupPrompt extends IPrompt {
  name: 'setup_guide';
  description: 'Guide for environment setup';
  args: { envType: string };
  template: 'Setup guide for {envType} environment';
}

interface SetupElicit extends IElicit {
  prompt: 'Enter environment configuration';
  args: {
    nodeVersion: {
      type: 'string';
      title: 'Node Version';
      description: 'Node.js version to use';
    };
    packageManager: {
      type: 'string';
      title: 'Package Manager';
      description: 'npm, yarn, or pnpm';
      enum: ['npm', 'yarn', 'pnpm'];
    };
  };
  result: {
    nodeVersion: string;
    packageManager: string;
  };
}

// ============================================================================
// Scenario 3: Resources + Subscriptions
// ============================================================================

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Configuration';
  description: 'App configuration data';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    version: string;
    features: string[];
  };
}

interface ConfigSubscription extends ISubscription {
  uri: 'config://app';
  description: 'Subscribe to configuration changes';
}

interface StatsResource extends IResource {
  uri: 'stats://realtime';
  name: 'Real-time Statistics';
  description: 'Live server statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    requests: number;
    uptime: number;
  };
}

interface StatsSubscription extends ISubscription {
  uri: 'stats://realtime';
  description: 'Subscribe to real-time stats';
  handler: () => void;
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class MixedFeatureServerImpl {
  name: 'mixed-feature-test' = 'mixed-feature-test';
  version: '1.0.0' = '1.0.0';
  description: 'Tests mixed combinations of features' = 'Tests mixed combinations of features';

  private configVersion = 0;
  private requestCount = 0;
  private startTime = Date.now();

  // Scenario 1: Tool using both sampling and roots
  analyzeProject: AnalyzeProjectTool = async (params, context) => {
    if (!context?.listRoots || !context?.sample) {
      return { analysis: 'Features not available', rootsUsed: 0 };
    }

    // Get roots
    const roots = await context.listRoots();

    // Use sampling to analyze
    const analysisResult = await context.sample(
      [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze files matching ${params.pattern} in ${roots.length} roots`
          }
        }
      ],
      { maxTokens: 300 }
    );

    return {
      analysis: analysisResult.content.text || 'No analysis',
      rootsUsed: roots.length
    };
  };

  // Scenario 2: Tool using elicitation
  setupEnvironment: SetupTool = async (params, context) => {
    if (!context?.elicitInput) {
      return { configured: false, settings: {} };
    }

    const result = await context.elicitInput(
      'Configure environment settings',
      {
        nodeVersion: {
          type: 'string',
          title: 'Node Version'
        },
        packageManager: {
          type: 'string',
          title: 'Package Manager'
        }
      }
    );

    if (result.action === 'accept') {
      return {
        configured: true,
        settings: {
          type: params.environmentType,
          ...result.content
        }
      };
    }

    return { configured: false, settings: {} };
  };

  // Scenario 2: Static prompt
  setupGuide: SetupPrompt = (args) => {
    return `Setup guide for ${args.envType} environment`;
  };

  // Scenario 3: Dynamic resources with subscriptions
  'config://app': ConfigResource = async () => {
    this.configVersion++;
    return {
      version: `1.0.${this.configVersion}`,
      features: ['sampling', 'elicitation', 'roots', 'subscriptions']
    };
  };

  'stats://realtime': StatsResource = async () => {
    this.requestCount++;
    return {
      requests: this.requestCount,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  };

  // Subscription handler
  'stats://realtime-handler': StatsSubscription = async () => {
    console.log('[Mixed Test] Stats subscription activated');
  };
}
