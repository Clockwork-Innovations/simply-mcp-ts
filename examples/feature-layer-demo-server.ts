/**
 * Feature Layer Complete Demo Server
 *
 * Comprehensive demonstration of ALL Feature Layer capabilities:
 * - FL-1: Static hidden flags (compile-time)
 * - FT-1: Dynamic hidden evaluation (runtime)
 * - FL-2: Manual skills (hardcoded markdown)
 * - FT-2: Auto-generated skills (from components)
 * - FT-3: Compile-time validation (warnings for orphaned items)
 *
 * This server demonstrates the complete progressive disclosure pattern with:
 * - 3 visible tools (public API)
 * - 2 visible resources (public data)
 * - 1 visible prompt (public help)
 * - 5 static hidden tools (debug tools - always hidden)
 * - 3 dynamic hidden tools (admin tools - context-aware)
 * - 3 hidden resources (internal data)
 * - 1 manual skill (FL-2 style)
 * - 2 auto-generated skills (FT-2 style)
 *
 * Usage:
 * ```bash
 * # Compile and run
 * npm run cli -- compile examples/feature-layer-demo-server.ts
 * npm run cli -- run examples/feature-layer-demo-server.ts
 *
 * # Test with Claude CLI
 * cat > /tmp/test-mcp-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "feature-demo": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/feature-layer-demo-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # Test initial discovery (anonymous user - only public API visible)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "List all available tools, resources, prompts, and skills"
 *
 * # Test with admin context (admin tools become visible)
 * # Note: This requires modifying the CLI to pass context metadata
 *
 * # Discover hidden capabilities via manual skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Get the debug_manual skill"
 *
 * # Discover hidden capabilities via auto-generated skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Get the internal_ops skill"
 * ```
 */

import {
  ITool,
  IResource,
  IPrompt,
  ISkill,
  ToolHelper,
  ResourceHelper,
  PromptHelper,
  SkillHelper,
  HiddenEvaluationContext,
} from '../src/index.js';

// ============================================================================
// PUBLIC API (Visible to all users)
// ============================================================================

// PUBLIC TOOLS (3 visible)
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public data';
  params: { query: string };
  result: { results: string[] };
}

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Perform calculations';
  params: { expression: string };
  result: { value: number };
}

interface InfoTool extends ITool {
  name: 'info';
  description: 'Get server information';
  params: {};
  result: { version: string; uptime: number };
}

// PUBLIC RESOURCES (2 visible)
interface PublicConfigResource extends IResource {
  uri: 'public://config';
  name: 'Public Configuration';
  description: 'Public server configuration';
  mimeType: 'application/json';
  data: { version: string; mode: string };
}

interface PublicDocsResource extends IResource {
  uri: 'public://docs';
  name: 'Public Documentation';
  description: 'Public API documentation';
  mimeType: 'text/markdown';
  data: string;
}

// PUBLIC PROMPT (1 visible)
interface HelpPrompt extends IPrompt {
  name: 'help';
  description: 'Get help with the server';
  args: { topic?: string };
  result: string;
}

// ============================================================================
// STATIC HIDDEN (FL-1: Always hidden, discovered via skills)
// ============================================================================

// STATIC HIDDEN TOOLS (5 static hidden - debug tools)
interface InspectTool extends ITool {
  name: 'inspect_state';
  description: 'Inspect internal state';
  params: { component?: string };
  result: { state: Record<string, any> };
  hidden: true; // FL-1: Static hidden flag
}

interface TraceTool extends ITool {
  name: 'trace_request';
  description: 'Trace request execution';
  params: { request_id: string };
  result: { trace: string[] };
  hidden: true; // FL-1: Static hidden flag
}

interface LogsTool extends ITool {
  name: 'dump_logs';
  description: 'Dump server logs';
  params: { limit?: number };
  result: { logs: string[] };
  hidden: true; // FL-1: Static hidden flag
}

interface BenchmarkTool extends ITool {
  name: 'benchmark';
  description: 'Run performance benchmark';
  params: { test: string };
  result: { duration_ms: number };
  hidden: true; // FL-1: Static hidden flag
}

interface ValidateTool extends ITool {
  name: 'validate_config';
  description: 'Validate configuration';
  params: { config: Record<string, any> };
  result: { valid: boolean; errors?: string[] };
  hidden: true; // FL-1: Static hidden flag
}

// ============================================================================
// DYNAMIC HIDDEN (FT-1: Context-aware hiding based on user role)
// ============================================================================

// DYNAMIC HIDDEN TOOLS (3 dynamic hidden - admin tools)
interface ResetTool extends ITool {
  name: 'reset_server';
  description: 'Reset server to initial state';
  params: { confirm: boolean };
  result: { reset: boolean };
  // FT-1: Dynamic hidden evaluation - only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

interface ConfigureTool extends ITool {
  name: 'configure_server';
  description: 'Update server configuration';
  params: { key: string; value: any };
  result: { updated: boolean };
  // FT-1: Dynamic hidden evaluation - only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

interface ShutdownTool extends ITool {
  name: 'shutdown_server';
  description: 'Gracefully shutdown server';
  params: { delay_ms?: number };
  result: { shutting_down: boolean };
  // FT-1: Dynamic hidden evaluation - only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

// HIDDEN RESOURCES (3 hidden)
interface InternalConfigResource extends IResource {
  uri: 'internal://config';
  name: 'Internal Configuration';
  description: 'Internal server configuration';
  mimeType: 'application/json';
  data: { debug: boolean; flags: string[] };
  hidden: true; // FL-1: Static hidden flag
}

interface MetricsResource extends IResource {
  uri: 'internal://metrics';
  name: 'Performance Metrics';
  description: 'Internal performance metrics';
  mimeType: 'application/json';
  data: { requests: number; errors: number };
  hidden: true; // FL-1: Static hidden flag
}

interface DebugInfoResource extends IResource {
  uri: 'internal://debug';
  name: 'Debug Information';
  description: 'Internal debug information';
  mimeType: 'application/json';
  data: { node_version: string; uptime: number };
  hidden: true; // FL-1: Static hidden flag
}

// ============================================================================
// SKILLS (Manual + Auto-generated)
// ============================================================================

// MANUAL SKILL (FL-2: Handcrafted markdown)
interface DebugManualSkill extends ISkill {
  name: 'debug_manual';
  description: 'Debug toolkit manual (handcrafted)';
  returns: string;
}

// AUTO-GENERATED SKILL 1 (FT-2: Generated from components - debug tools)
interface DebugToolkitSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug operations (auto-generated)';
  components: {
    tools: ['inspect_state', 'trace_request', 'dump_logs', 'benchmark', 'validate_config'];
    resources: ['internal://config', 'internal://metrics', 'internal://debug'];
  };
}

// AUTO-GENERATED SKILL 2 (FT-2: Generated from components - admin tools)
interface AdminPanelSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations (auto-generated)';
  components: {
    tools: ['reset_server', 'configure_server', 'shutdown_server'];
  };
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class FeatureLayerDemo {
  private state = {
    requestCount: 0,
    startTime: Date.now(),
    config: { debug: true, flags: ['feature_a', 'feature_b'] },
  };

  // ========== PUBLIC TOOLS ==========
  search: ToolHelper<SearchTool> = async ({ query }) => {
    this.state.requestCount++;
    return { results: [`Result 1 for "${query}"`, `Result 2 for "${query}"`] };
  };

  calculate: ToolHelper<CalculateTool> = async ({ expression }) => {
    this.state.requestCount++;
    // Simple eval for demo (don't do this in production!)
    try {
      const value = eval(expression);
      return { value: Number(value) };
    } catch {
      throw new Error('Invalid expression');
    }
  };

  info: ToolHelper<InfoTool> = async () => {
    this.state.requestCount++;
    return {
      version: '1.0.0',
      uptime: Date.now() - this.state.startTime,
    };
  };

  // ========== PUBLIC RESOURCES ==========
  publicConfigResource: ResourceHelper<PublicConfigResource> = async () => ({
    version: '1.0.0',
    mode: 'production',
  });

  publicDocsResource: ResourceHelper<PublicDocsResource> = async () =>
    `# Feature Layer Demo API\n\n` +
    `## Public API\n` +
    `- search: Search public data\n` +
    `- calculate: Perform calculations\n` +
    `- info: Get server information\n\n` +
    `## Skills\n` +
    `- debug_manual: Manual debug guide (FL-2)\n` +
    `- debug_toolkit: Auto-generated debug guide (FT-2)\n` +
    `- admin_panel: Auto-generated admin guide (FT-2)\n`;

  // ========== PUBLIC PROMPT ==========
  help: PromptHelper<HelpPrompt> = async ({ topic }) => {
    return (
      `# Help${topic ? ` - ${topic}` : ''}\n\n` +
      `This server demonstrates all Feature Layer capabilities:\n\n` +
      `**Public API (visible to all):**\n` +
      `- Tools: search, calculate, info\n` +
      `- Resources: public://config, public://docs\n` +
      `- Prompts: help\n\n` +
      `**Hidden Capabilities (discovered via skills):**\n` +
      `- Static hidden: Debug tools (FL-1)\n` +
      `- Dynamic hidden: Admin tools (FT-1 - requires admin role)\n` +
      `- Manual skill: debug_manual (FL-2)\n` +
      `- Auto-gen skills: debug_toolkit, admin_panel (FT-2)\n\n` +
      `**Compile-time validation (FT-3):**\n` +
      `- Warnings for orphaned hidden items\n` +
      `- Validation of skill references\n`
    );
  };

  // ========== MANUAL SKILL (FL-2) ==========
  debugManual: SkillHelper<DebugManualSkill> = () => `
# Debug Toolkit Manual

> **Note:** This is a manually crafted skill (FL-2 style) demonstrating handcrafted documentation.

## Purpose

This manual describes the complete set of debug tools available for troubleshooting.

## Debug Tools (Static Hidden)

All debug tools use FL-1 static hidden flags - they're always hidden from discovery
but remain fully accessible.

### State Inspection

**inspect_state**
- Description: Inspect internal server state
- Parameters: \`{ component?: string }\`
- Returns: State snapshot
- Example: \`{ "component": "config" }\`

**trace_request**
- Description: Trace request execution path
- Parameters: \`{ request_id: string }\`
- Returns: Execution trace
- Example: \`{ "request_id": "req-123" }\`

### Logging

**dump_logs**
- Description: Dump recent server logs
- Parameters: \`{ limit?: number }\`
- Returns: Log entries
- Example: \`{ "limit": 100 }\`

### Performance

**benchmark**
- Description: Run performance benchmarks
- Parameters: \`{ test: string }\`
- Returns: Benchmark results
- Example: \`{ "test": "list_tools" }\`

### Validation

**validate_config**
- Description: Validate configuration structure
- Parameters: \`{ config: Record<string, any> }\`
- Returns: Validation results
- Example: \`{ "config": { "version": "1.0.0" } }\`

## Debug Resources (Static Hidden)

**internal://config**
- Internal server configuration with debug flags

**internal://metrics**
- Real-time performance metrics

**internal://debug**
- Debug information (Node version, uptime, etc.)

## Usage Pattern

1. Discover tools via this skill
2. Call tools directly by name (they work even though hidden)
3. Monitor via resources
4. Validate changes with validation tools

This demonstrates FL-1 (static hidden) + FL-2 (manual skills) working together.
`;

  // ========== AUTO-GENERATED SKILLS (FT-2) ==========
  // These return empty string - markdown is auto-generated from components
  debugToolkit: SkillHelper<DebugToolkitSkill> = () => '';
  adminPanel: SkillHelper<AdminPanelSkill> = () => '';

  // ========== STATIC HIDDEN TOOLS (FL-1) ==========
  inspectState: ToolHelper<InspectTool> = async ({ component }) => {
    return {
      state: component
        ? { [component]: this.state }
        : {
            requestCount: this.state.requestCount,
            uptime: Date.now() - this.state.startTime,
            config: this.state.config,
          },
    };
  };

  traceRequest: ToolHelper<TraceTool> = async ({ request_id }) => {
    return {
      trace: [
        `Request ${request_id} received`,
        'Validating parameters',
        'Executing handler',
        'Returning response',
      ],
    };
  };

  dumpLogs: ToolHelper<LogsTool> = async ({ limit = 10 }) => {
    const allLogs = [
      '[INFO] Server started',
      '[DEBUG] Configuration loaded',
      `[INFO] Processed ${this.state.requestCount} requests`,
      '[DEBUG] Cache size: 0',
      '[INFO] All systems operational',
    ];
    return { logs: allLogs.slice(0, limit) };
  };

  benchmark: ToolHelper<BenchmarkTool> = async ({ test }) => {
    // Mock benchmark
    const start = Date.now();
    // Simulate work
    for (let i = 0; i < 1000000; i++) {}
    return { duration_ms: Date.now() - start };
  };

  validateConfig: ToolHelper<ValidateTool> = async ({ config }) => {
    const errors: string[] = [];
    if (!config.version) errors.push('Missing version');
    if (!config.mode) errors.push('Missing mode');
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  };

  // ========== DYNAMIC HIDDEN TOOLS (FT-1) ==========
  resetServer: ToolHelper<ResetTool> = async ({ confirm }) => {
    if (!confirm) {
      return { reset: false };
    }
    this.state = {
      requestCount: 0,
      startTime: Date.now(),
      config: { debug: true, flags: ['feature_a', 'feature_b'] },
    };
    return { reset: true };
  };

  configureServer: ToolHelper<ConfigureTool> = async ({ key, value }) => {
    (this.state.config as any)[key] = value;
    return { updated: true };
  };

  shutdownServer: ToolHelper<ShutdownTool> = async ({ delay_ms = 0 }) => {
    // In a real server, this would initiate shutdown
    return { shutting_down: true };
  };

  // ========== HIDDEN RESOURCES ==========
  internalConfigResource: ResourceHelper<InternalConfigResource> = async () => this.state.config;

  metricsResource: ResourceHelper<MetricsResource> = async () => ({
    requests: this.state.requestCount,
    errors: 0,
  });

  debugInfoResource: ResourceHelper<DebugInfoResource> = async () => ({
    node_version: process.version,
    uptime: Date.now() - this.state.startTime,
  });
}
