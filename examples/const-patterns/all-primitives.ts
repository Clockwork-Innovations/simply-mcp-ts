/**
 * Complete Const Patterns Reference
 *
 * This file demonstrates const pattern usage for ALL MCP primitives.
 * Use this as a reference guide for the const-based API.
 *
 * Primitives covered:
 * 1. Server Configuration (IServer)
 * 2. Tools (ITool + ToolHelper)
 * 3. Prompts (IPrompt + PromptHelper)
 * 4. Resources (IResource + ResourceHelper)
 * 5. UIs (IUI)
 * 6. Routers (IToolRouter)
 * 7. Completions (ICompletion + CompletionHelper)
 * 8. Roots (IRoots)
 * 9. Subscriptions (ISubscription)
 * 10. Authentication (Inline API Key & OAuth2)
 */

import type {
  IServer,
  ITool,
  IPrompt,
  IResource,
  IUI,
  IToolRouter,
  ICompletion,
  IRoots,
  ISubscription,
  IParam,
  ToolHelper,
  PromptHelper,
  ResourceHelper,
  CompletionHelper
} from '../../src/index.js';

// ============================================================================
// 1. SERVER CONFIGURATION
// ============================================================================

/**
 * PATTERN: Server Configuration with Inline Auth
 *
 * const server: IServer = {
 *   name: 'server-name',
 *   version: '1.0.0',
 *   description: 'Server description',
 *   auth?: { ... }  // Optional inline auth
 * }
 *
 * Benefits:
 * - All server metadata in one place
 * - No class needed
 * - Inline auth (no separate interface)
 */

// Example 1A: Server with API Key Auth
const server: IServer = {
  name: 'const-patterns-demo',
  version: '1.0.0',
  description: 'Complete demonstration of const-based patterns',

  // Inline API Key authentication
  auth: {
    type: 'apiKey',
    headerName: 'X-API-Key',
    allowAnonymous: false,
    keys: [
      {
        name: 'admin',
        key: 'admin-secret-key',
        permissions: ['read', 'write', 'admin']
      },
      {
        name: 'user',
        key: 'user-secret-key',
        permissions: ['read', 'write']
      }
    ]
  }
};

// Example 1B: Server with OAuth2 Auth (alternative)
const serverWithOAuth: IServer = {
  name: 'oauth-server',
  version: '1.0.0',
  description: 'Server with OAuth2 authentication',

  // Inline OAuth2 authentication
  auth: {
    type: 'oauth2',
    issuerUrl: 'https://auth.example.com',
    clients: [
      {
        clientId: 'web-client',
        clientSecret: 'web-secret',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write']
      }
    ],
    tokenExpiration: 3600,
    refreshTokenExpiration: 86400
  }
};

// ============================================================================
// 2. TOOLS - ToolHelper Pattern
// ============================================================================

/**
 * PATTERN: Tool Implementation
 *
 * Step 1: Define parameter interfaces
 * interface XParam extends IParam { type: 'string'; description: '...' }
 *
 * Step 2: Define tool interface
 * interface XTool extends ITool {
 *   name: 'tool_name';
 *   description: '...';
 *   params: { param1: Param1, ... };
 *   result: { ... };
 * }
 *
 * Step 3: Implement with const
 * const toolName: ToolHelper<XTool> = async (params) => { ... }
 *
 * Benefits:
 * - Full type inference for params and result
 * - No class needed
 * - Direct const assignment
 */

// Example: Calculator tool
interface AParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number';
}

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: AParam;
    b: BParam;
  };
  result: {
    sum: number;
  };
}

const add: ToolHelper<AddTool> = async (params) => {
  return {
    sum: params.a + params.b
  };
};

// ============================================================================
// 3. PROMPTS - PromptHelper Pattern
// ============================================================================

/**
 * PATTERN: Prompt Implementation
 *
 * Step 1: Define prompt interface with args
 * interface XPrompt extends IPrompt {
 *   name: 'prompt_name';
 *   description: '...';
 *   args: {
 *     arg1: { description: '...'; type?: '...'; required?: boolean };
 *     ...
 *   };
 * }
 *
 * Step 2: Implement with const
 * const promptName: PromptHelper<XPrompt> = (args) => { ... return "prompt text"; }
 *
 * Benefits:
 * - Type inference for args
 * - Simple function implementation
 * - No class needed
 */

// Example: Code review prompt
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Review code for issues';
  args: {
    code: { description: 'Code to review' };
    language: { description: 'Programming language'; required: false };
    focus: {
      description: 'Review focus area';
      enum: ['security', 'performance', 'style', 'all'];
      required: false;
    };
  };
}

const codeReview: PromptHelper<CodeReviewPrompt> = (args) => {
  const language = args.language || 'unknown';
  const focus = args.focus || 'all';

  return `Review the following ${language} code with focus on ${focus}:\n\n${args.code}\n\nProvide detailed feedback on issues found.`;
};

// ============================================================================
// 4. RESOURCES - ResourceHelper Pattern
// ============================================================================

/**
 * PATTERN: Resource Implementation
 *
 * For STATIC resources (compile-time data):
 * interface XResource extends IResource {
 *   uri: 'scheme://path';
 *   name: 'Resource Name';
 *   mimeType: 'application/json';
 *   value: { ... };  // Inline literal data only
 * }
 * (No implementation needed - framework serves it)
 *
 * For DYNAMIC resources (runtime data):
 * interface XResource extends IResource {
 *   uri: 'scheme://path';
 *   name: 'Resource Name';
 *   mimeType: 'application/json';
 *   returns: { ... };  // Type definition
 * }
 * const resourceName: ResourceHelper<XResource> = async () => { ... }
 *
 * Benefits:
 * - Choose static or dynamic based on needs
 * - Type-safe resource data
 * - Simple const implementation for dynamic
 */

// Example 4A: Static resource (no implementation needed)
interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'Application Config';
  mimeType: 'application/json';
  value: {
    version: '1.0.0';
    features: ['auth', 'caching'];
  };
}

// Example 4B: Dynamic resource (const implementation)
interface StatsResource extends IResource {
  uri: 'stats://server';
  name: 'Server Statistics';
  mimeType: 'application/json';
  returns: {
    uptime: number;
    requests: number;
    timestamp: string;
  };
}

const serverStats: ResourceHelper<StatsResource> = async () => {
  return {
    uptime: process.uptime(),
    requests: 1234,
    timestamp: new Date().toISOString()
  };
};

// ============================================================================
// 5. UIS - Const Pattern
// ============================================================================

/**
 * PATTERN: UI Implementation
 *
 * Pattern 1 (Base IUI):
 * const uiName: IUI = { source: '...' }
 *
 * Pattern 2 (Extended interface):
 * interface XUI extends IUI {
 *   uri: 'ui://path';
 *   name: 'UI Name';
 *   description: 'UI description';
 *   source: string;
 *   tools?: string[];
 * }
 * const uiName: XUI = { source: '...' }
 *
 * Benefits:
 * - Simple object literal
 * - No class needed
 * - Direct source assignment
 */

// Example 5A: Base IUI pattern
const simpleUI: IUI = {
  source: '<div><h1>Simple UI</h1><p>Minimal example</p></div>'
};

// Example 5B: Extended UI interface
interface DashboardUI extends IUI {
  uri: 'ui://dashboard';
  name: 'Control Dashboard';
  description: 'Main control interface';
  source: string;
  tools: ['refresh', 'update'];
}

const dashboard: DashboardUI = {
  source: `
    <div style="padding: 2rem; font-family: system-ui;">
      <h1>Control Dashboard</h1>
      <button onclick="window.mcpTools?.refresh()">Refresh Data</button>
    </div>
  `
};

// ============================================================================
// 6. ROUTERS - Const Pattern
// ============================================================================

/**
 * PATTERN: Router Implementation
 *
 * Step 1: Define router interface
 * interface XRouter extends IToolRouter {
 *   name: 'router_name';
 *   description: 'Router description';
 *   tools: ['tool1', 'tool2'];
 * }
 *
 * Step 2: Implement with const
 * const routerName: XRouter = {
 *   name: 'router_name',
 *   description: 'Router description',
 *   tools: ['tool1', 'tool2']
 * }
 *
 * Step 3: Implement router tools
 * const tool1: ToolHelper<Tool1> = async (params) => { ... }
 *
 * Benefits:
 * - Simple object literal for router
 * - Clear tool grouping
 * - No class needed
 */

// Example: Math router with multiple tools
interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: { a: AParam; b: BParam };
  result: { product: number };
}

interface DivideTool extends ITool {
  name: 'divide';
  description: 'Divide two numbers';
  params: { a: AParam; b: BParam };
  result: { quotient: number };
}

interface MathRouter extends IToolRouter {
  name: 'math';
  description: 'Mathematical operations';
  tools: ['multiply', 'divide'];
}

const mathRouter: MathRouter = {
  name: 'math',
  description: 'Mathematical operations',
  tools: ['multiply', 'divide']
};

const multiply: ToolHelper<MultiplyTool> = async (params) => {
  return { product: params.a * params.b };
};

const divide: ToolHelper<DivideTool> = async (params) => {
  if (params.b === 0) {
    throw new Error('Division by zero');
  }
  return { quotient: params.a / params.b };
};

// ============================================================================
// 7. COMPLETIONS - CompletionHelper Pattern
// ============================================================================

/**
 * PATTERN: Completion Implementation
 *
 * Step 1: Define completion interface
 * interface XCompletion extends ICompletion {
 *   name: 'completion_name';
 *   description: '...';
 *   args: {
 *     arg1: ArgInterface;
 *   };
 * }
 *
 * Step 2: Implement with const
 * const completionName: CompletionHelper<XCompletion> = async (args) => {
 *   return { values: [...], total: N, hasMore: false };
 * }
 *
 * Benefits:
 * - Type inference for args
 * - Simple const assignment
 * - Direct return value
 */

// Example: Command completion
interface PartialParam extends IParam {
  type: 'string';
  description: 'Partial command to complete';
}

interface CommandCompletion extends ICompletion {
  name: 'command_completion';
  description: 'Autocomplete shell commands';
  args: {
    partial: PartialParam;
  };
}

const commandComplete: CompletionHelper<CommandCompletion> = async (args) => {
  const commands = ['ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'echo'];
  const matches = commands.filter(cmd =>
    cmd.startsWith(args.partial.toLowerCase())
  );

  return {
    values: matches,
    total: matches.length,
    hasMore: false
  };
};

// ============================================================================
// 8. ROOTS - Const Pattern
// ============================================================================

/**
 * PATTERN: Roots Implementation
 *
 * Step 1: Define roots interface
 * interface XRoots extends IRoots {
 *   name: 'roots_name';
 *   description: 'Roots description';
 * }
 *
 * Step 2: Implement with const
 * const rootsName: XRoots = async () => {
 *   return { roots: [{ uri: '...', name: '...' }] };
 * }
 *
 * Benefits:
 * - Simple const assignment
 * - Direct function implementation
 */

// Example: Workspace roots
interface WorkspaceRoots extends IRoots {
  name: 'workspace_roots';
  description: 'Available workspace directories';
}

const workspaceRoots: WorkspaceRoots = async () => {
  return {
    roots: [
      {
        uri: 'file:///home/user/projects/app',
        name: 'App Project'
      },
      {
        uri: 'file:///home/user/projects/lib',
        name: 'Library Project'
      }
    ]
  };
};

// ============================================================================
// 9. SUBSCRIPTIONS - Const Pattern
// ============================================================================

/**
 * PATTERN: Subscription Implementation
 *
 * Step 1: Define subscription interface
 * interface XSubscription extends ISubscription {
 *   uri: 'scheme://path';
 *   description: 'Subscription description';
 * }
 *
 * Step 2: Implement with const
 * const subName: XSubscription = async () => {
 *   return { uri: '...', mimeType: '...', text: '...' };
 * }
 *
 * Benefits:
 * - Simple const assignment
 * - Direct function implementation
 */

// Example: Log subscription
interface LogSubscription extends ISubscription {
  uri: 'logs://server';
  description: 'Server log updates';
}

const logSub: LogSubscription = async () => {
  return {
    uri: 'logs://server',
    mimeType: 'text/plain',
    text: `[${new Date().toISOString()}] Server log entry`
  };
};

// ============================================================================
// EXPORTS - All const implementations
// ============================================================================

/**
 * The compiler automatically discovers all const implementations:
 *
 * Server: server
 * Tools: add, multiply, divide
 * Prompts: codeReview
 * Resources: serverStats (ConfigResource is static, no impl needed)
 * UIs: simpleUI, dashboard
 * Routers: mathRouter
 * Completions: commandComplete
 * Roots: workspaceRoots
 * Subscriptions: logSub
 *
 * Just export them and you're done!
 */

export {
  server,
  // Tools
  add,
  multiply,
  divide,
  // Prompts
  codeReview,
  // Resources
  serverStats,
  // UIs
  simpleUI,
  dashboard,
  // Routers
  mathRouter,
  // Completions
  commandComplete,
  // Roots
  workspaceRoots,
  // Subscriptions
  logSub
};

/**
 * SUMMARY: Const Pattern Benefits
 *
 * 1. Less Boilerplate
 *    - No class declaration needed
 *    - Direct const assignments
 *    - Simpler file structure
 *
 * 2. Better Type Inference
 *    - ToolHelper<T> infers params and result types
 *    - PromptHelper<T> infers args types
 *    - CompletionHelper<T> infers args and return types
 *
 * 3. Functional Style
 *    - Each primitive is a pure function
 *    - Easy to test in isolation
 *    - Composable patterns
 *
 * 4. No Interface Extension
 *    - Use types directly (IUI, IToolRouter)
 *    - Or extend for extra type safety
 *    - Your choice!
 *
 * 5. Clearer Intent
 *    - const server: IServer - "this is a server config"
 *    - const add: ToolHelper<AddTool> - "this implements AddTool"
 *    - Explicit and readable
 *
 * When to Use Const Patterns:
 * - ✅ New projects (start simple)
 * - ✅ Functional programming style preference
 * - ✅ Small to medium servers
 * - ✅ Stateless tool implementations
 *
 * When to Use Class Patterns:
 * - ✅ Need instance state
 * - ✅ Sharing state between tools
 * - ✅ Complex initialization logic
 * - ✅ Existing codebase with classes
 *
 * Both patterns work! Choose what fits your style.
 */
