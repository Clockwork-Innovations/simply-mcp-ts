/**
 * Progressive Disclosure Demo Server
 *
 * Demonstrates the complete Foundation Layer progressive disclosure pattern:
 * - Public API: 3 visible tools, 2 visible resources, 1 visible prompt, 3 visible skills
 * - Internal/Debug: 10 hidden tools, 5 hidden resources, 2 hidden prompts (discovered via skills)
 *
 * This pattern significantly reduces token usage during initial discovery while
 * maintaining full functionality through progressive disclosure.
 *
 * Usage:
 * ```bash
 * # Test with Claude CLI
 * cat > /tmp/test-mcp-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "demo": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/progressive-disclosure-demo-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # Initial discovery (only shows visible items)
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "List all available tools, resources, prompts, and skills"
 *
 * # Discover hidden capabilities via skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Get the debug_toolkit skill manual"
 *
 * # Access hidden tool directly
 * claude --print --model haiku \
 *   --mcp-config /tmp/test-mcp-config.json \
 *   --strict-mcp-config \
 *   --dangerously-skip-permissions \
 *   "Call the inspect_state tool"
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
} from '../src/index.js';

// ============================================================================
// PUBLIC API (Visible - User-Facing Operations)
// ============================================================================

// PUBLIC TOOLS (3 visible)
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user with a friendly message';
  params: { name: string };
  result: { message: string };
}

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Perform basic arithmetic calculations';
  params: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number };
  result: { result: number };
}

interface GetWeatherTool extends ITool {
  name: 'get_weather';
  description: 'Get current weather for a location';
  params: { city: string };
  result: { temperature: number; conditions: string };
}

// PUBLIC RESOURCES (2 visible)
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Public server configuration';
  mimeType: 'application/json';
  data: { version: string; environment: string };
}

interface DocsResource extends IResource {
  uri: 'docs://api';
  name: 'API Documentation';
  description: 'Public API documentation';
  mimeType: 'text/markdown';
  data: string;
}

// PUBLIC PROMPT (1 visible)
interface HelpPrompt extends IPrompt {
  name: 'help';
  description: 'Get help with using the server';
  args: { topic?: string };
  result: string;
}

// PUBLIC SKILLS (3 visible - Gateway to Hidden Capabilities)
interface UserGuideSkill extends ISkill {
  name: 'user_guide';
  description: 'User guide for getting started with the server';
  returns: string;
}

interface DebugToolkitSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug toolkit for troubleshooting and diagnostics';
  returns: string;
}

interface AdminPanelSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations and system management';
  returns: string;
}

// ============================================================================
// INTERNAL/DEBUG API (Hidden - Discovered via Skills)
// ============================================================================

// HIDDEN TOOLS (10 hidden)
interface InspectStateTool extends ITool {
  name: 'inspect_state';
  description: 'Inspect internal server state';
  params: { component?: string };
  result: { state: Record<string, any> };
  hidden: true;
}

interface ClearCacheTool extends ITool {
  name: 'clear_cache';
  description: 'Clear internal caches';
  params: { cache_type?: string };
  result: { cleared: number };
  hidden: true;
}

interface ValidateConfigTool extends ITool {
  name: 'validate_config';
  description: 'Validate configuration structure';
  params: { config: Record<string, any> };
  result: { valid: boolean; errors?: string[] };
  hidden: true;
}

interface BenchmarkTool extends ITool {
  name: 'benchmark';
  description: 'Run performance benchmarks';
  params: { test_name: string };
  result: { duration_ms: number; operations_per_sec: number };
  hidden: true;
}

interface GetMetricsTool extends ITool {
  name: 'get_metrics';
  description: 'Get internal performance metrics';
  params: { metric_type?: string };
  result: { metrics: Record<string, number> };
  hidden: true;
}

interface TraceRequestTool extends ITool {
  name: 'trace_request';
  description: 'Trace request execution path';
  params: { request_id: string };
  result: { trace: string[] };
  hidden: true;
}

interface DumpLogsTool extends ITool {
  name: 'dump_logs';
  description: 'Dump internal logs';
  params: { level?: string; limit?: number };
  result: { logs: string[] };
  hidden: true;
}

interface AnalyzeMemoryTool extends ITool {
  name: 'analyze_memory';
  description: 'Analyze memory usage';
  params: {};
  result: { heap_used: number; heap_total: number; external: number };
  hidden: true;
}

interface TestConnectionTool extends ITool {
  name: 'test_connection';
  description: 'Test internal connections';
  params: { endpoint: string };
  result: { reachable: boolean; latency_ms?: number };
  hidden: true;
}

interface ResetServerTool extends ITool {
  name: 'reset_server';
  description: 'Reset server to initial state';
  params: { confirm: boolean };
  result: { reset: boolean };
  hidden: true;
}

// HIDDEN RESOURCES (5 hidden)
interface InternalConfigResource extends IResource {
  uri: 'internal://config';
  name: 'Internal Configuration';
  description: 'Internal server configuration (hidden from discovery)';
  mimeType: 'application/json';
  data: { debug: boolean; verbose: boolean; internal_flags: string[] };
  hidden: true;
}

interface DiagnosticsResource extends IResource {
  uri: 'internal://diagnostics';
  name: 'Diagnostics Data';
  description: 'Internal diagnostics data';
  mimeType: 'application/json';
  data: { uptime: number; request_count: number; error_count: number };
  hidden: true;
}

interface LogsResource extends IResource {
  uri: 'internal://logs';
  name: 'Server Logs';
  description: 'Internal server logs';
  mimeType: 'text/plain';
  data: string;
  hidden: true;
}

interface MetricsResource extends IResource {
  uri: 'internal://metrics';
  name: 'Performance Metrics';
  description: 'Internal performance metrics';
  mimeType: 'application/json';
  data: { cpu: number; memory: number; requests_per_sec: number };
  hidden: true;
}

interface DebugInfoResource extends IResource {
  uri: 'internal://debug';
  name: 'Debug Information';
  description: 'Internal debug information';
  mimeType: 'application/json';
  data: { node_version: string; platform: string; uptime: number };
  hidden: true;
}

// HIDDEN PROMPTS (2 hidden)
interface DebugPrompt extends IPrompt {
  name: 'debug_session';
  description: 'Start a debug session with context';
  args: { issue: string; context?: string };
  result: string;
  hidden: true;
}

interface AdminPrompt extends IPrompt {
  name: 'admin_task';
  description: 'Execute an administrative task';
  args: { task: string; params?: Record<string, any> };
  result: string;
  hidden: true;
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class ProgressiveDisclosureDemo {
  private state = {
    requestCount: 0,
    cacheSize: 0,
    uptime: Date.now(),
  };

  // PUBLIC TOOLS IMPLEMENTATION
  greet: ToolHelper<GreetTool> = async ({ name }) => {
    this.state.requestCount++;
    return { message: `Hello, ${name}! Welcome to the Progressive Disclosure Demo.` };
  };

  calculate: ToolHelper<CalculateTool> = async ({ operation, a, b }) => {
    this.state.requestCount++;
    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
    }
    return { result };
  };

  getWeather: ToolHelper<GetWeatherTool> = async ({ city }) => {
    this.state.requestCount++;
    // Mock weather data
    return {
      temperature: Math.round(15 + Math.random() * 15),
      conditions: ['sunny', 'cloudy', 'rainy', 'windy'][Math.floor(Math.random() * 4)],
    };
  };

  // PUBLIC RESOURCES IMPLEMENTATION
  configServerResource: ResourceHelper<ConfigResource> = async () => ({
    version: '1.0.0',
    environment: 'production',
  });

  docsApiResource: ResourceHelper<DocsResource> = async () =>
    `# API Documentation\n\n` +
    `## Available Operations\n` +
    `- **greet**: Greet a user\n` +
    `- **calculate**: Perform calculations\n` +
    `- **get_weather**: Get weather information\n\n` +
    `## Skills\n` +
    `Use skills to discover additional capabilities:\n` +
    `- **user_guide**: Getting started guide\n` +
    `- **debug_toolkit**: Debug tools\n` +
    `- **admin_panel**: Admin operations\n`;

  // PUBLIC PROMPT IMPLEMENTATION
  help: PromptHelper<HelpPrompt> = async ({ topic }) => {
    return `# Help ${topic ? `- ${topic}` : ''}\n\n` +
      `This server demonstrates progressive disclosure.\n\n` +
      `**Public API:**\n` +
      `- Tools: greet, calculate, get_weather\n` +
      `- Resources: config://server, docs://api\n` +
      `- Prompts: help\n\n` +
      `**Discover More:**\n` +
      `- Use the \`debug_toolkit\` skill to discover debug tools\n` +
      `- Use the \`admin_panel\` skill to discover admin operations\n` +
      `- Hidden capabilities are accessible but not shown in initial discovery\n\n` +
      `This pattern reduces token usage by >50% while maintaining full functionality.`;
  };

  // PUBLIC SKILLS IMPLEMENTATION (Gateway to Hidden Capabilities)
  userGuide: SkillHelper<UserGuideSkill> = () => `
# User Guide

## Getting Started

This server demonstrates **progressive disclosure** - a pattern that reduces token usage
during initial discovery while maintaining full functionality.

## Public API

When you first connect, you'll see:

### Tools (3 visible)
- **greet**: Greet a user with a friendly message
- **calculate**: Perform arithmetic calculations
- **get_weather**: Get weather for a location

### Resources (2 visible)
- **config://server**: Public server configuration
- **docs://api**: API documentation

### Prompts (1 visible)
- **help**: Get help with using the server

### Skills (3 visible)
- **user_guide**: This guide
- **debug_toolkit**: Debug tools (reveals hidden capabilities)
- **admin_panel**: Admin operations (reveals hidden capabilities)

## Hidden Capabilities

Hidden items are not shown in initial discovery but remain fully accessible:
- Call hidden tools directly by name
- Read hidden resources directly by URI
- Get hidden prompts directly by name
- Get hidden skills directly by name

## Token Reduction

This pattern achieves >50% token reduction on initial discovery:
- **Flat API**: All 20 capabilities visible → ~5000 tokens
- **Progressive**: 9 visible + 20 hidden → ~2000 tokens (60% reduction)

## Next Steps

1. Explore the **debug_toolkit** skill to discover debug tools
2. Explore the **admin_panel** skill to discover admin operations
3. Try calling hidden tools directly (they work!)
`;

  debugToolkit: SkillHelper<DebugToolkitSkill> = () => `
# Debug Toolkit

## Purpose

This skill reveals hidden debug tools for troubleshooting and diagnostics.

## Hidden Debug Tools

The following tools are hidden from initial discovery but fully accessible:

### State Inspection
- **inspect_state**: Inspect internal server state
  - Params: \`{ component?: string }\`
  - Returns: Internal state snapshot

### Cache Management
- **clear_cache**: Clear internal caches
  - Params: \`{ cache_type?: string }\`
  - Returns: Number of items cleared

### Configuration
- **validate_config**: Validate configuration structure
  - Params: \`{ config: Record<string, any> }\`
  - Returns: Validation result with errors

### Performance
- **benchmark**: Run performance benchmarks
  - Params: \`{ test_name: string }\`
  - Returns: Performance metrics

- **get_metrics**: Get internal performance metrics
  - Params: \`{ metric_type?: string }\`
  - Returns: Performance metrics

### Diagnostics
- **trace_request**: Trace request execution path
  - Params: \`{ request_id: string }\`
  - Returns: Execution trace

- **dump_logs**: Dump internal logs
  - Params: \`{ level?: string, limit?: number }\`
  - Returns: Log entries

- **analyze_memory**: Analyze memory usage
  - Params: \`{}\`
  - Returns: Memory usage statistics

- **test_connection**: Test internal connections
  - Params: \`{ endpoint: string }\`
  - Returns: Connection status

- **reset_server**: Reset server to initial state
  - Params: \`{ confirm: boolean }\`
  - Returns: Reset confirmation

## Hidden Debug Resources

- **internal://config**: Internal configuration
- **internal://diagnostics**: Diagnostics data
- **internal://logs**: Server logs
- **internal://metrics**: Performance metrics
- **internal://debug**: Debug information

## Hidden Debug Prompt

- **debug_session**: Start a debug session with context
  - Args: \`{ issue: string, context?: string }\`
  - Returns: Debug session prompt

## Usage

Simply call these tools/resources/prompts directly - they're hidden from discovery
but fully functional!

\`\`\`
# Call hidden tool
tools/call: inspect_state

# Read hidden resource
resources/read: internal://diagnostics

# Get hidden prompt
prompts/get: debug_session
\`\`\`
`;

  adminPanel: SkillHelper<AdminPanelSkill> = () => `
# Admin Panel

## Purpose

Administrative operations and system management capabilities.

## Hidden Admin Capabilities

### System Management
- **reset_server**: Reset server to initial state
- **clear_cache**: Clear system caches
- **validate_config**: Validate configuration

### Monitoring
- **get_metrics**: System performance metrics
- **analyze_memory**: Memory usage analysis
- **inspect_state**: Internal state inspection

### Testing
- **test_connection**: Test internal connections
- **benchmark**: Performance benchmarks

### Logging
- **dump_logs**: Access server logs
- **trace_request**: Trace request execution

## Hidden Admin Resources

- **internal://config**: Full internal configuration
- **internal://metrics**: Real-time metrics
- **internal://debug**: Debug information

## Hidden Admin Prompt

- **admin_task**: Execute administrative tasks
  - Args: \`{ task: string, params?: Record<string, any> }\`
  - Returns: Task execution prompt

## Security Note

These capabilities are hidden from initial discovery to reduce token usage and
prevent accidental exposure. They remain fully functional when called directly.
`;

  // HIDDEN TOOLS IMPLEMENTATION
  inspectState: ToolHelper<InspectStateTool> = async ({ component }) => {
    return {
      state: component
        ? { [component]: this.state }
        : {
            requestCount: this.state.requestCount,
            cacheSize: this.state.cacheSize,
            uptime: Date.now() - this.state.uptime,
          },
    };
  };

  clearCache: ToolHelper<ClearCacheTool> = async ({ cache_type }) => {
    const cleared = this.state.cacheSize;
    this.state.cacheSize = 0;
    return { cleared };
  };

  validateConfig: ToolHelper<ValidateConfigTool> = async ({ config }) => {
    // Mock validation
    const errors: string[] = [];
    if (!config.version) errors.push('Missing version');
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  };

  benchmark: ToolHelper<BenchmarkTool> = async ({ test_name }) => {
    // Mock benchmark
    const duration = Math.round(Math.random() * 100);
    return {
      duration_ms: duration,
      operations_per_sec: Math.round(1000 / duration),
    };
  };

  getMetrics: ToolHelper<GetMetricsTool> = async ({ metric_type }) => {
    return {
      metrics: {
        requests: this.state.requestCount,
        uptime: Date.now() - this.state.uptime,
        cache_size: this.state.cacheSize,
      },
    };
  };

  traceRequest: ToolHelper<TraceRequestTool> = async ({ request_id }) => {
    return {
      trace: [
        `Request ${request_id} received`,
        'Validating parameters',
        'Executing handler',
        'Returning response',
      ],
    };
  };

  dumpLogs: ToolHelper<DumpLogsTool> = async ({ level, limit }) => {
    const logs = [
      '[INFO] Server started',
      '[DEBUG] Configuration loaded',
      '[INFO] Request processed',
      '[DEBUG] Cache cleared',
    ];
    return { logs: logs.slice(0, limit || logs.length) };
  };

  analyzeMemory: ToolHelper<AnalyzeMemoryTool> = async () => {
    const usage = process.memoryUsage();
    return {
      heap_used: usage.heapUsed,
      heap_total: usage.heapTotal,
      external: usage.external,
    };
  };

  testConnection: ToolHelper<TestConnectionTool> = async ({ endpoint }) => {
    // Mock connection test
    return {
      reachable: true,
      latency_ms: Math.round(Math.random() * 50),
    };
  };

  resetServer: ToolHelper<ResetServerTool> = async ({ confirm }) => {
    if (confirm) {
      this.state = {
        requestCount: 0,
        cacheSize: 0,
        uptime: Date.now(),
      };
      return { reset: true };
    }
    return { reset: false };
  };

  // HIDDEN RESOURCES IMPLEMENTATION
  internalConfigResource: ResourceHelper<InternalConfigResource> = async () => ({
    debug: true,
    verbose: true,
    internal_flags: ['feature_a', 'feature_b'],
  });

  diagnosticsResource: ResourceHelper<DiagnosticsResource> = async () => ({
    uptime: Date.now() - this.state.uptime,
    request_count: this.state.requestCount,
    error_count: 0,
  });

  logsResource: ResourceHelper<LogsResource> = async () =>
    '[INFO] Server started\n' +
    '[DEBUG] Configuration loaded\n' +
    `[INFO] Processed ${this.state.requestCount} requests\n`;

  metricsResource: ResourceHelper<MetricsResource> = async () => ({
    cpu: Math.random() * 100,
    memory: process.memoryUsage().heapUsed / 1024 / 1024,
    requests_per_sec: this.state.requestCount / ((Date.now() - this.state.uptime) / 1000),
  });

  debugInfoResource: ResourceHelper<DebugInfoResource> = async () => ({
    node_version: process.version,
    platform: process.platform,
    uptime: Date.now() - this.state.uptime,
  });

  // HIDDEN PROMPTS IMPLEMENTATION
  debugSession: PromptHelper<DebugPrompt> = async ({ issue, context }) => {
    return `# Debug Session\n\n` +
      `**Issue**: ${issue}\n` +
      `${context ? `**Context**: ${context}\n` : ''}` +
      `\n## Available Debug Tools\n` +
      `- inspect_state: Check internal state\n` +
      `- dump_logs: Review logs\n` +
      `- trace_request: Trace execution\n` +
      `- analyze_memory: Check memory usage\n`;
  };

  adminTask: PromptHelper<AdminPrompt> = async ({ task, params }) => {
    return `# Admin Task: ${task}\n\n` +
      `**Parameters**: ${JSON.stringify(params || {}, null, 2)}\n\n` +
      `## Available Admin Tools\n` +
      `- reset_server: Reset to initial state\n` +
      `- clear_cache: Clear caches\n` +
      `- validate_config: Validate configuration\n` +
      `- get_metrics: View metrics\n`;
  };
}
