/**
 * Interface-Driven API - Protocol Features Comprehensive Example
 *
 * Demonstrates ALL 5 new MCP protocol features working together:
 * 1. ISampling - LLM completion requests
 * 2. IElicit - User input requests
 * 3. IRoots - Directory listing
 * 4. ISubscription - Resource update notifications
 * 5. ICompletion - Autocomplete for prompts
 *
 * This example shows how these features integrate and complement each other
 * in real-world scenarios. Each tool demonstrates feature combinations.
 *
 * Key Integration Patterns:
 * - Tool that elicits input, then uses sampling to process it
 * - Tool that lists roots, provides completions for files within roots
 * - Resources that update and notify subscribers
 * - Prompts with autocomplete for better UX
 *
 * Usage:
 *   npx simply-mcp run examples/interface-protocol-comprehensive.ts
 *
 * Requirements:
 * - MCP client with support for: sampling, elicitation, roots, subscriptions, completions
 * - All features gracefully degrade if not available
 */

import type { ITool, IPrompt, IResource, IServer, ICompletion, ISamplingMessage } from 'simply-mcp';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

interface ComprehensiveServer extends IServer {
  name: 'protocol-comprehensive';
  version: '1.0.0';
  description: 'Comprehensive demonstration of all 5 MCP protocol features';
}

// ============================================================================
// TOOLS - Demonstrating Feature Integration
// ============================================================================

/**
 * AI-Assisted Configuration Tool
 *
 * Integration: Elicitation + Sampling
 * - Elicits configuration from user
 * - Uses sampling to validate and improve configuration
 */
interface SmartConfigureTool extends ITool {
  name: 'smart_configure';
  description: 'Configure service with AI assistance (elicitation + sampling)';
  params: {
    /** Service to configure */
    service: string;
  };
  result: {
    success: boolean;
    message: string;
    config?: Record<string, any>;
    aiSuggestions?: string;
  };
}

/**
 * Workspace File Search Tool
 *
 * Integration: Roots + Completions
 * - Uses roots to scope file search
 * - Provides completions for file paths within roots
 */
interface WorkspaceSearchTool extends ITool {
  name: 'workspace_search';
  description: 'Search files in workspace roots with intelligent suggestions';
  params: {
    /** Search pattern (gets autocompleted) */
    pattern: string;
    /** File type filter */
    fileType?: string;
  };
  result: {
    success: boolean;
    rootsChecked: number;
    filesFound: Array<{
      path: string;
      root: string;
      name: string;
    }>;
  };
}

/**
 * Real-time Analysis Tool
 *
 * Integration: Sampling + Subscriptions
 * - Uses sampling to analyze data
 * - Publishes results to subscribable resource
 * - Notifies subscribers of updates
 */
interface AnalyzeDataTool extends ITool {
  name: 'analyze_data';
  description: 'Analyze data with AI and publish results (sampling + subscriptions)';
  params: {
    /** Data to analyze */
    data: string;
    /** Analysis type */
    analysisType: 'sentiment' | 'summary' | 'classification';
  };
  result: {
    success: boolean;
    analysisId: string;
    result: string;
    subscribersNotified: boolean;
  };
}

/**
 * Interactive Code Review Tool
 *
 * Integration: Elicitation + Sampling + Roots
 * - Elicits code file selection
 * - Uses roots to show available files
 * - Uses sampling to perform AI code review
 */
interface InteractiveReviewTool extends ITool {
  name: 'interactive_review';
  description: 'Interactive code review with AI (elicitation + sampling + roots)';
  params: {
    /** Review focus */
    focus?: 'security' | 'performance' | 'style' | 'all';
  };
  result: {
    success: boolean;
    fileReviewed?: string;
    review?: string;
    issues?: string[];
  };
}

/**
 * Project Setup Wizard Tool
 *
 * Integration: All 5 Features
 * - Elicits project details
 * - Uses roots to determine workspace
 * - Uses sampling for configuration suggestions
 * - Creates subscribable progress resource
 * - Provides completions for framework names
 */
interface ProjectWizardTool extends ITool {
  name: 'project_wizard';
  description: 'Complete project setup wizard (all features integrated)';
  params: {
    /** Project name */
    projectName: string;
  };
  result: {
    success: boolean;
    message: string;
    project?: {
      name: string;
      framework: string;
      location: string;
      features: string[];
    };
    setupProgress?: string;
  };
}

// ============================================================================
// PROMPTS WITH COMPLETIONS
// ============================================================================

/**
 * Framework selection prompt with autocomplete
 */
interface FrameworkPrompt extends IPrompt {
  name: 'select_framework';
  description: 'Select framework with autocomplete';
  args: {
    /** Framework name (autocompleted) */
    framework: string;
    /** Project type */
    projectType: 'web' | 'api' | 'cli' | 'library';
  };
  template: `Setup a {projectType} project using {framework}.

Provide recommended configuration and best practices for this stack.`;
}

/**
 * File operation prompt with path completion
 */
interface FilePrompt extends IPrompt {
  name: 'file_operation';
  description: 'File operation with path autocomplete';
  args: {
    /** File path (autocompleted from roots) */
    path: string;
    /** Operation */
    operation: string;
  };
  template: `Perform {operation} on file: {path}

Consider workspace context and best practices.`;
}

// ============================================================================
// COMPLETIONS
// ============================================================================

/**
 * Framework name completion
 */
interface FrameworkCompletion extends ICompletion<string[]> {
  name: 'framework_autocomplete';
  description: 'Autocomplete framework names';
  ref: { type: 'argument'; name: 'framework' };
}

/**
 * File path completion (from workspace roots)
 */
interface PathCompletion extends ICompletion<string[]> {
  name: 'path_autocomplete';
  description: 'Autocomplete file paths from workspace';
  ref: { type: 'argument'; name: 'path' };
}

/**
 * Search pattern completion
 */
interface PatternCompletion extends ICompletion<string[]> {
  name: 'pattern_autocomplete';
  description: 'Autocomplete search patterns';
  ref: { type: 'argument'; name: 'pattern' };
}

// ============================================================================
// SUBSCRIBABLE RESOURCES
// ============================================================================

/**
 * Analysis results resource (subscribable)
 *
 * Updates when new analysis completes
 */
interface AnalysisResultsResource extends IResource {
  uri: 'analysis://results';
  name: 'Analysis Results';
  description: 'Real-time analysis results';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    latestAnalysis: {
      id: string;
      type: string;
      result: string;
      timestamp: string;
    } | null;
    history: Array<{
      id: string;
      type: string;
      timestamp: string;
    }>;
  };
}

/**
 * Workspace status resource (subscribable)
 *
 * Updates when workspace changes
 */
interface WorkspaceStatusResource extends IResource {
  uri: 'workspace://status';
  name: 'Workspace Status';
  description: 'Current workspace state';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    roots: Array<{ uri: string; name?: string }>;
    filesIndexed: number;
    lastUpdate: string;
  };
}

/**
 * Setup progress resource (subscribable)
 *
 * Updates during project wizard execution
 */
interface SetupProgressResource extends IResource {
  uri: 'setup://progress';
  name: 'Setup Progress';
  description: 'Project setup progress';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    active: boolean;
    projectName: string;
    step: string;
    progress: number;
    message: string;
  };
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class ComprehensiveServerImpl implements ComprehensiveServer {
  // State management
  private analysisHistory: Array<{ id: string; type: string; result: string; timestamp: string }> = [];
  private workspaceRoots: Array<{ uri: string; name?: string }> = [];
  private setupProgress = {
    active: false,
    projectName: '',
    step: '',
    progress: 0,
    message: 'Ready',
  };

  // ========================================================================
  // TOOLS - Feature Integration Demonstrations
  // ========================================================================

  /**
   * Smart Configure Tool
   * Integration: Elicitation + Sampling
   */
  smartConfigure: SmartConfigureTool = async ({ service }, context) => {
    // Check feature availability
    if (!context?.elicitInput || !context?.sample) {
      return {
        success: false,
        message: 'Requires elicitation and sampling capabilities',
      };
    }

    try {
      // ELICITATION: Get configuration from user
      const elicitResult = await context.elicitInput(
        `Configure ${service}`,
        {
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: 'Service API key',
            minLength: 10,
          },
          region: {
            type: 'string',
            title: 'Region',
            description: 'Service region',
            default: 'us-east-1',
          },
          timeout: {
            type: 'integer',
            title: 'Timeout (seconds)',
            default: 30,
            min: 1,
            max: 300,
          },
        }
      );

      if (elicitResult.action !== 'accept') {
        return {
          success: false,
          message: 'Configuration cancelled',
        };
      }

      const config = elicitResult.content as Record<string, any>;

      // SAMPLING: Get AI suggestions for configuration
      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this ${service} configuration and provide optimization suggestions:\n${JSON.stringify(config, null, 2)}`,
          },
        },
      ];

      const aiResult = await context.sample(messages, {
        maxTokens: 300,
        temperature: 0.7,
      });

      const aiSuggestions = aiResult.content?.text || aiResult.message?.content || '';

      return {
        success: true,
        message: `${service} configured successfully`,
        config,
        aiSuggestions,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };

  /**
   * Workspace Search Tool
   * Integration: Roots + Completions (used via pattern param)
   */
  workspaceSearch: WorkspaceSearchTool = async ({ pattern, fileType }, context) => {
    // Check roots capability
    if (!context?.listRoots) {
      return {
        success: false,
        rootsChecked: 0,
        filesFound: [],
      };
    }

    try {
      // Get workspace roots
      const roots = await context.listRoots();
      this.workspaceRoots = roots;

      // Simulated file search (in production, actually search filesystem)
      const mockFiles = [
        { path: '/src/index.ts', root: roots[0]?.uri || '', name: 'index.ts' },
        { path: '/src/server.ts', root: roots[0]?.uri || '', name: 'server.ts' },
        { path: '/tests/test.ts', root: roots[0]?.uri || '', name: 'test.ts' },
      ];

      // Filter by pattern
      const filesFound = mockFiles.filter((f) => f.name.includes(pattern));

      // Notify workspace status subscribers
      if (context?.notifyResourceUpdate) {
        context.notifyResourceUpdate('workspace://status');
      }

      return {
        success: true,
        rootsChecked: roots.length,
        filesFound,
      };
    } catch (error) {
      return {
        success: false,
        rootsChecked: 0,
        filesFound: [],
      };
    }
  };

  /**
   * Analyze Data Tool
   * Integration: Sampling + Subscriptions
   */
  analyzeData: AnalyzeDataTool = async ({ data, analysisType }, context) => {
    // Check sampling capability
    if (!context?.sample) {
      return {
        success: false,
        analysisId: '',
        result: 'Sampling not available',
        subscribersNotified: false,
      };
    }

    try {
      const analysisId = `analysis_${Date.now()}`;

      // SAMPLING: Perform AI analysis
      const prompts: Record<string, string> = {
        sentiment: 'Analyze the sentiment of this text (positive/negative/neutral):',
        summary: 'Provide a concise summary of this text:',
        classification: 'Classify this text into categories:',
      };

      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${prompts[analysisType]}\n\n${data}`,
          },
        },
      ];

      const aiResult = await context.sample(messages, {
        maxTokens: 200,
        temperature: 0.5,
      });

      const result = aiResult.content?.text || aiResult.message?.content || 'Analysis failed';

      // Store in history
      this.analysisHistory.push({
        id: analysisId,
        type: analysisType,
        result,
        timestamp: new Date().toISOString(),
      });

      // Keep last 10
      if (this.analysisHistory.length > 10) {
        this.analysisHistory = this.analysisHistory.slice(-10);
      }

      // SUBSCRIPTIONS: Notify subscribers
      let subscribersNotified = false;
      if (context?.notifyResourceUpdate) {
        context.notifyResourceUpdate('analysis://results');
        subscribersNotified = true;
      }

      return {
        success: true,
        analysisId,
        result,
        subscribersNotified,
      };
    } catch (error) {
      return {
        success: false,
        analysisId: '',
        result: `Error: ${error instanceof Error ? error.message : String(error)}`,
        subscribersNotified: false,
      };
    }
  };

  /**
   * Interactive Review Tool
   * Integration: Elicitation + Sampling + Roots
   */
  interactiveReview: InteractiveReviewTool = async ({ focus = 'all' }, context) => {
    // Check all required capabilities
    if (!context?.elicitInput || !context?.sample || !context?.listRoots) {
      return {
        success: false,
        fileReviewed: undefined,
        review: 'Requires elicitation, sampling, and roots capabilities',
      };
    }

    try {
      // ROOTS: Get available files
      const roots = await context.listRoots();

      // ELICITATION: Ask user to select file
      const elicitResult = await context.elicitInput('Select file to review', {
        file: {
          type: 'string',
          title: 'File Path',
          description: `Available roots: ${roots.map((r) => r.name || r.uri).join(', ')}`,
        },
        includeTests: {
          type: 'boolean',
          title: 'Include test recommendations',
          default: true,
        },
      });

      if (elicitResult.action !== 'accept') {
        return {
          success: false,
          review: 'Review cancelled',
        };
      }

      const file = elicitResult.content?.file as string;

      // SAMPLING: Perform AI review
      const focusInstructions = {
        security: 'Focus on security vulnerabilities and best practices',
        performance: 'Focus on performance optimizations',
        style: 'Focus on code style and readability',
        all: 'Perform comprehensive review',
      };

      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review this file: ${file}\n\n${focusInstructions[focus]}\n\nProvide structured feedback.`,
          },
        },
      ];

      const aiResult = await context.sample(messages, {
        maxTokens: 500,
        temperature: 0.6,
      });

      const review = aiResult.content?.text || aiResult.message?.content || 'Review failed';

      // Extract issues (simplified)
      const issues = review.split('\n').filter((line) => line.includes('issue') || line.includes('warning'));

      return {
        success: true,
        fileReviewed: file,
        review,
        issues: issues.length > 0 ? issues : undefined,
      };
    } catch (error) {
      return {
        success: false,
        review: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };

  /**
   * Project Wizard Tool
   * Integration: ALL 5 FEATURES
   */
  projectWizard: ProjectWizardTool = async ({ projectName }, context) => {
    // Check all capabilities
    const hasElicitation = !!context?.elicitInput;
    const hasSampling = !!context?.sample;
    const hasRoots = !!context?.listRoots;
    const hasSubscriptions = !!context?.notifyResourceUpdate;

    if (!hasElicitation || !hasSampling || !hasRoots) {
      return {
        success: false,
        message: 'Requires elicitation, sampling, and roots capabilities',
      };
    }

    try {
      // Initialize progress
      this.setupProgress = {
        active: true,
        projectName,
        step: 'Collecting information',
        progress: 10,
        message: 'Starting project setup wizard...',
      };

      if (hasSubscriptions) {
        context.notifyResourceUpdate!('setup://progress');
      }

      // ROOTS: Get workspace location
      const roots = await context.listRoots!();
      const workspaceRoot = roots[0]?.uri || '/workspace';

      // Update progress
      this.setupProgress.step = 'Selecting framework';
      this.setupProgress.progress = 30;
      if (hasSubscriptions) {
        context.notifyResourceUpdate!('setup://progress');
      }

      // ELICITATION: Get project configuration (with COMPLETIONS support for framework)
      const elicitResult = await context.elicitInput!('Configure project', {
        framework: {
          type: 'string',
          title: 'Framework',
          description: 'Select framework (autocompleted)',
          // Framework completion handler provides suggestions
        },
        features: {
          type: 'string',
          title: 'Features',
          description: 'Comma-separated features',
          default: 'typescript,testing',
        },
        gitInit: {
          type: 'boolean',
          title: 'Initialize Git',
          default: true,
        },
      });

      if (elicitResult.action !== 'accept') {
        this.setupProgress.active = false;
        return {
          success: false,
          message: 'Project setup cancelled',
        };
      }

      const config = elicitResult.content as Record<string, any>;

      // Update progress
      this.setupProgress.step = 'Generating configuration';
      this.setupProgress.progress = 60;
      if (hasSubscriptions) {
        context.notifyResourceUpdate!('setup://progress');
      }

      // SAMPLING: Generate optimized configuration
      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate optimal project configuration for:\nProject: ${projectName}\nFramework: ${config.framework}\nFeatures: ${config.features}\n\nProvide package.json and setup recommendations.`,
          },
        },
      ];

      const aiResult = await context.sample!(messages, {
        maxTokens: 400,
        temperature: 0.7,
      });

      // Update progress
      this.setupProgress.step = 'Complete';
      this.setupProgress.progress = 100;
      this.setupProgress.message = 'Project setup complete!';
      if (hasSubscriptions) {
        context.notifyResourceUpdate!('setup://progress');
      }

      // Complete setup
      this.setupProgress.active = false;

      return {
        success: true,
        message: 'Project setup complete',
        project: {
          name: projectName,
          framework: config.framework,
          location: workspaceRoot,
          features: (config.features as string).split(','),
        },
        setupProgress: this.setupProgress.message,
      };
    } catch (error) {
      this.setupProgress.active = false;
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };

  // ========================================================================
  // COMPLETION HANDLERS
  // ========================================================================

  /**
   * Framework autocomplete
   */
  frameworkAutocomplete: FrameworkCompletion = async (value: string) => {
    const frameworks = [
      'React',
      'Vue',
      'Angular',
      'Svelte',
      'Next.js',
      'Nuxt',
      'Express',
      'Fastify',
      'NestJS',
    ];
    return frameworks.filter((f) => f.toLowerCase().startsWith(value.toLowerCase()));
  };

  /**
   * Path autocomplete (uses cached roots)
   */
  pathAutocomplete: PathCompletion = async (value: string) => {
    // Use cached workspace roots to suggest paths
    const basePaths = ['/src/', '/tests/', '/docs/', '/config/'];
    return basePaths.filter((p) => p.startsWith(value));
  };

  /**
   * Pattern autocomplete
   */
  patternAutocomplete: PatternCompletion = async (value: string) => {
    const patterns = ['*.ts', '*.js', '*.json', '*.md', 'test*', 'src/', 'dist/'];
    return patterns.filter((p) => p.startsWith(value));
  };

  // ========================================================================
  // DYNAMIC RESOURCES
  // ========================================================================

  /**
   * Analysis results resource
   */
  'analysis://results': AnalysisResultsResource = async () => {
    const latest = this.analysisHistory.length > 0 ? this.analysisHistory[this.analysisHistory.length - 1] : null;

    return {
      latestAnalysis: latest,
      history: this.analysisHistory.map((a) => ({
        id: a.id,
        type: a.type,
        timestamp: a.timestamp,
      })),
    };
  };

  /**
   * Workspace status resource
   */
  'workspace://status': WorkspaceStatusResource = async () => {
    return {
      roots: this.workspaceRoots,
      filesIndexed: 42, // Simulated
      lastUpdate: new Date().toISOString(),
    };
  };

  /**
   * Setup progress resource
   */
  'setup://progress': SetupProgressResource = async () => {
    return this.setupProgress;
  };
}
