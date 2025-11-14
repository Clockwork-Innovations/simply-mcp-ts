/**
 * Feature Flags MCP Server Example
 *
 * Demonstrates feature flag gating using dynamic hidden evaluation.
 *
 * **Features:**
 * - Stable tools visible to everyone (search_v1, calculate)
 * - Beta tools visible only when feature flags are enabled
 * - Experimental tools visible only with experimental flags
 * - Dynamic hidden evaluation based on feature flags
 * - Auto-generated skills for beta/experimental features
 *
 * **Feature Flags:**
 * - `search_v2`: Enable enhanced search with filters
 * - `ai_search`: Enable AI-powered semantic search
 * - `advanced_calc`: Enable advanced calculation features
 * - `experimental`: Enable all experimental features
 *
 * **Usage:**
 * ```bash
 * # Compile and run
 * npm run cli -- compile examples/feature-flags-server.ts
 * npm run cli -- run examples/feature-flags-server.ts
 *
 * # Test with Claude CLI
 * cat > /tmp/features-mcp-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "features-demo": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/feature-flags-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # Default - only stable tools visible
 * claude --print --model haiku \
 *   --mcp-config /tmp/features-mcp-config.json \
 *   "List all available tools"
 * # Expected: [search_v1, calculate, get_features]
 *
 * # Discover beta features via skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/features-mcp-config.json \
 *   "Get the beta_features skill"
 * # Returns: Documentation for beta tools
 *
 * # Discover experimental features via skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/features-mcp-config.json \
 *   "Get the experimental_features skill"
 * # Returns: Documentation for experimental tools
 * ```
 *
 * **Note:** The Simply-MCP CLI doesn't support passing context metadata yet.
 * To test feature flag hiding, use HTTP transport where you control session data:
 *
 * ```typescript
 * // HTTP transport example
 * app.post('/mcp', async (req, res) => {
 *   const context = {
 *     metadata: {
 *       feature_flags: req.session.feature_flags  // ['search_v2', 'ai_search']
 *     }
 *   };
 *
 *   const tools = await server.listTools(context);
 *   res.json({ tools });
 * });
 * ```
 */

import {
  ITool,
  IResource,
  IPrompt,
  ISkill,
  IServer,
  ToolHelper,
  ResourceHelper,
  PromptHelper,
  HiddenEvaluationContext,
} from '../src/index.js';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const server: IServer = {
  name: 'feature-flags-demo',
  version: '1.0.0',
  description: 'Feature flag gating demo server',
};

// ============================================================================
// HELPER FUNCTIONS (Feature Flag Checks)
// ============================================================================

function getFeatureFlags(ctx?: HiddenEvaluationContext): string[] {
  return (ctx?.metadata?.feature_flags as string[]) || [];
}

function hasFeature(ctx: HiddenEvaluationContext | undefined, flag: string): boolean {
  const flags = getFeatureFlags(ctx);
  return flags.includes(flag) || flags.includes('experimental');
}

// ============================================================================
// STABLE TOOLS (Visible to everyone)
// ============================================================================

interface SearchV1Tool extends ITool {
  name: 'search_v1';
  description: 'Search content (stable)';
  params: { query: string };
  result: { results: Array<{ id: string; title: string; score: number }> };
  // No hidden flag = visible to everyone
}

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Basic calculator';
  params: { expression: string };
  result: { value: number };
  // No hidden flag = visible to everyone
}

interface GetFeaturesTool extends ITool {
  name: 'get_features';
  description: 'Get list of enabled features';
  params: {};
  result: { enabled: string[]; available: string[] };
  // No hidden flag = visible to everyone
}

// ============================================================================
// BETA TOOLS (Feature flag gated)
// ============================================================================

interface SearchV2Tool extends ITool {
  name: 'search_v2';
  description: 'Enhanced search with filters (beta)';
  params: {
    query: string;
    filters?: {
      author?: string;
      date_from?: string;
      date_to?: string;
      tags?: string[];
    };
  };
  result: {
    results: Array<{
      id: string;
      title: string;
      author: string;
      date: string;
      tags: string[];
      score: number;
    }>;
  };
  // Dynamic hidden: only visible with search_v2 flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'search_v2');
}

interface AISearchTool extends ITool {
  name: 'ai_search';
  description: 'AI-powered semantic search (beta)';
  params: { query: string; context?: string };
  result: {
    results: Array<{
      id: string;
      title: string;
      relevance: number;
      explanation: string;
    }>;
  };
  // Dynamic hidden: only visible with ai_search flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'ai_search');
}

interface AdvancedCalcTool extends ITool {
  name: 'advanced_calc';
  description: 'Advanced calculator with functions (beta)';
  params: { expression: string; variables?: Record<string, number> };
  result: { value: number; steps: string[] };
  // Dynamic hidden: only visible with advanced_calc flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'advanced_calc');
}

// ============================================================================
// EXPERIMENTAL TOOLS (Requires experimental flag)
// ============================================================================

interface PredictTool extends ITool {
  name: 'predict_trends';
  description: 'Predict future trends (experimental)';
  params: { data: number[]; periods: number };
  result: { predictions: number[]; confidence: number };
  // Dynamic hidden: only visible with experimental flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'experimental');
}

interface OptimizeTool extends ITool {
  name: 'optimize_query';
  description: 'Optimize search queries (experimental)';
  params: { query: string };
  result: { optimized: string; improvements: string[] };
  // Dynamic hidden: only visible with experimental flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'experimental');
}

// ============================================================================
// RESOURCES (Some feature gated)
// ============================================================================

interface PublicDocsResource extends IResource {
  uri: 'docs://stable';
  name: 'Stable API Documentation';
  description: 'Documentation for stable APIs';
  mimeType: 'text/markdown';
  data: string;
  // No hidden flag = visible to everyone
}

interface BetaDocsResource extends IResource {
  uri: 'docs://beta';
  name: 'Beta Features Documentation';
  description: 'Documentation for beta features';
  mimeType: 'text/markdown';
  data: string;
  // Dynamic hidden: only visible with any beta flag
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = getFeatureFlags(ctx);
    return !flags.some((f) => ['search_v2', 'ai_search', 'advanced_calc'].includes(f));
  };
}

interface ExperimentalDocsResource extends IResource {
  uri: 'docs://experimental';
  name: 'Experimental Features Documentation';
  description: 'Documentation for experimental features';
  mimeType: 'text/markdown';
  data: string;
  // Dynamic hidden: only visible with experimental flag
  hidden: (ctx?: HiddenEvaluationContext) => !hasFeature(ctx, 'experimental');
}

// ============================================================================
// PROMPTS
// ============================================================================

interface HelpPrompt extends IPrompt {
  name: 'help';
  description: 'Get help with available features';
  args: { feature?: string };
  result: string;
  // No hidden flag = visible to everyone
}

interface BetaHelpPrompt extends IPrompt {
  name: 'beta_help';
  description: 'Get help with beta features';
  args: { feature?: string };
  result: string;
  // Dynamic hidden: only visible with any beta flag
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = getFeatureFlags(ctx);
    return !flags.some((f) => ['search_v2', 'ai_search', 'advanced_calc'].includes(f));
  };
}

// ============================================================================
// SKILLS (Auto-generated documentation for feature-gated capabilities)
// ============================================================================

interface BetaSkill extends ISkill {
  name: 'beta_features';
  description: 'Beta features (requires feature flags: search_v2, ai_search, advanced_calc)';
  components: {
    tools: ['search_v2', 'ai_search', 'advanced_calc'];
    resources: ['docs://beta'];
    prompts: ['beta_help'];
  };
  // Beta skills visible to everyone (to discover capabilities)
  // Actual tools are hidden based on feature flags
}

interface ExperimentalSkill extends ISkill {
  name: 'experimental_features';
  description: 'Experimental features (requires feature flag: experimental)';
  components: {
    tools: ['predict_trends', 'optimize_query'];
    resources: ['docs://experimental'];
  };
  // Experimental skills visible to everyone (to discover capabilities)
  // Actual tools are hidden based on feature flags
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class FeatureFlagsServer {
  private searchIndex = new Map<string, { title: string; author: string; date: string; tags: string[] }>([
    ['doc1', { title: 'Getting Started', author: 'Alice', date: '2025-01-01', tags: ['tutorial', 'beginner'] }],
    ['doc2', { title: 'Advanced Topics', author: 'Bob', date: '2025-01-15', tags: ['advanced', 'expert'] }],
    ['doc3', { title: 'API Reference', author: 'Alice', date: '2025-02-01', tags: ['reference', 'api'] }],
  ]);

  // ========== STABLE TOOLS ==========

  search_v1: ToolHelper<SearchV1Tool> = async ({ query }) => {
    const results = Array.from(this.searchIndex.entries())
      .filter(([_, doc]) => doc.title.toLowerCase().includes(query.toLowerCase()))
      .map(([id, doc]) => ({
        id,
        title: doc.title,
        score: Math.random(), // Simple scoring
      }));

    return { results };
  };

  calculate: ToolHelper<CalculateTool> = async ({ expression }) => {
    try {
      // Simple eval for demo (don't use in production!)
      const value = eval(expression);
      return { value: Number(value) };
    } catch (error) {
      throw new Error(`Invalid expression: ${expression}`);
    }
  };

  get_features: ToolHelper<GetFeaturesTool> = async () => {
    return {
      enabled: [], // Would come from context in real implementation
      available: ['search_v2', 'ai_search', 'advanced_calc', 'experimental'],
    };
  };

  // ========== BETA TOOLS ==========

  search_v2: ToolHelper<SearchV2Tool> = async ({ query, filters }) => {
    let results = Array.from(this.searchIndex.entries()).filter(([_, doc]) =>
      doc.title.toLowerCase().includes(query.toLowerCase())
    );

    // Apply filters
    if (filters?.author) {
      results = results.filter(([_, doc]) => doc.author === filters.author);
    }
    if (filters?.tags) {
      results = results.filter(([_, doc]) => filters.tags!.some((tag) => doc.tags.includes(tag)));
    }

    return {
      results: results.map(([id, doc]) => ({
        id,
        title: doc.title,
        author: doc.author,
        date: doc.date,
        tags: doc.tags,
        score: Math.random(),
      })),
    };
  };

  ai_search: ToolHelper<AISearchTool> = async ({ query, context }) => {
    // Simulate AI-powered search
    const results = Array.from(this.searchIndex.entries()).map(([id, doc]) => ({
      id,
      title: doc.title,
      relevance: Math.random(),
      explanation: `This document matches "${query}" based on semantic similarity${context ? ` in context of "${context}"` : ''
        }.`,
    }));

    return { results: results.sort((a, b) => b.relevance - a.relevance) };
  };

  advanced_calc: ToolHelper<AdvancedCalcTool> = async ({ expression, variables = {} }) => {
    // Simulate advanced calculation
    const steps = [
      'Parse expression',
      'Substitute variables',
      'Evaluate sub-expressions',
      'Compute final result',
    ];

    try {
      // Simple eval with variables (demo only!)
      const context = { ...variables, Math };
      const value = eval(`with (context) { ${expression} }`);
      return { value: Number(value), steps };
    } catch (error) {
      throw new Error(`Invalid expression: ${expression}`);
    }
  };

  // ========== EXPERIMENTAL TOOLS ==========

  predict_trends: ToolHelper<PredictTool> = async ({ data, periods }) => {
    // Simulate trend prediction
    const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
    const trend = (data[data.length - 1] - data[0]) / data.length;

    const predictions = Array.from({ length: periods }, (_, i) => avg + trend * (i + 1));

    return {
      predictions,
      confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0
    };
  };

  optimize_query: ToolHelper<OptimizeTool> = async ({ query }) => {
    // Simulate query optimization
    const improvements = [];
    let optimized = query.trim();

    // Remove stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but'];
    const words = optimized.split(' ').filter((w) => !stopWords.includes(w.toLowerCase()));
    if (words.length < optimized.split(' ').length) {
      improvements.push('Removed stop words');
      optimized = words.join(' ');
    }

    // Add wildcards
    if (!optimized.includes('*')) {
      improvements.push('Added wildcards for broader matching');
      optimized = optimized.split(' ').join('* ') + '*';
    }

    return { optimized, improvements };
  };

  // ========== RESOURCES ==========

  'docs://stable': ResourceHelper<PublicDocsResource> = async () => {
    return `
# Stable API Documentation

## Available Tools

### search_v1
Basic search functionality.

### calculate
Basic calculator for arithmetic expressions.

### get_features
Get list of available feature flags.

## Usage

All stable tools are production-ready and fully supported.
    `.trim();
  };

  'docs://beta': ResourceHelper<BetaDocsResource> = async () => {
    return `
# Beta Features Documentation

## Available Tools

### search_v2
Enhanced search with filtering capabilities.

**Requires feature flag:** \`search_v2\`

### ai_search
AI-powered semantic search.

**Requires feature flag:** \`ai_search\`

### advanced_calc
Advanced calculator with variables and functions.

**Requires feature flag:** \`advanced_calc\`

## Beta Notice

Beta features are functional but may change in future releases.
Feedback is welcome!
    `.trim();
  };

  'docs://experimental': ResourceHelper<ExperimentalDocsResource> = async () => {
    return `
# Experimental Features Documentation

## Available Tools

### predict_trends
Predict future trends from historical data.

### optimize_query
Automatically optimize search queries.

## ⚠️ Warning

Experimental features are unstable and may be removed or changed
without notice. Use at your own risk.

**Requires feature flag:** \`experimental\`
    `.trim();
  };

  // ========== PROMPTS ==========

  help: PromptHelper<HelpPrompt> = async ({ feature }) => {
    if (feature) {
      return `Help for feature: ${feature}\n\nCheck the documentation for details.`;
    }
    return `Available features:\n- Stable: search_v1, calculate, get_features\n- Beta: search_v2, ai_search, advanced_calc (requires flags)\n- Experimental: predict_trends, optimize_query (requires experimental flag)\n\nEnable feature flags to unlock additional capabilities.`;
  };

  beta_help: PromptHelper<BetaHelpPrompt> = async ({ feature }) => {
    if (feature) {
      return `Beta help for feature: ${feature}\n\nBeta features are functional but may change.`;
    }
    return `Beta features:\n- search_v2: Enhanced search with filters\n- ai_search: AI-powered semantic search\n- advanced_calc: Advanced calculator\n\nEnable the corresponding feature flags to use these features.`;
  };
}

export { server };
