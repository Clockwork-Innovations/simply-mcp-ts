/**
 * Mixed Patterns Example
 *
 * This example demonstrates how to mix const-based and class-based patterns
 * in the same MCP server. This shows backward compatibility and gives you
 * flexibility to choose the best pattern for each use case.
 *
 * Use cases for mixing:
 * - Migrating from class-based to const-based gradually
 * - Using const for simple stateless tools
 * - Using class for complex tools that need shared state
 * - Team preferences (some developers prefer classes)
 *
 * Features demonstrated:
 * - Const server configuration
 * - Const tools (stateless)
 * - Class-based tools (with state)
 * - Const routers
 * - Mixed UI implementations
 * - Const and class resources
 */

import type {
  IServer,
  ITool,
  IParam,
  IToolRouter,
  IUI,
  IResource,
  ToolHelper,
  ResourceHelper
} from '../../src/index.js';

// ============================================================================
// SERVER CONFIGURATION - Const Pattern
// ============================================================================

/**
 * Server config as const (recommended for all servers)
 *
 * Even when using classes, define server config as const for clarity
 */
const server: IServer = {
  name: 'mixed-patterns-server',
  version: '1.0.0',
  description: 'Server demonstrating mixed const and class patterns',

  // Inline auth works with any pattern
  auth: {
    type: 'apiKey',
    headerName: 'Authorization',
    keys: [
      {
        name: 'admin',
        key: 'admin-key',
        permissions: ['read', 'write']
      }
    ]
  }
};

// ============================================================================
// CONST TOOLS - Stateless, Simple Operations
// ============================================================================

/**
 * Use const pattern for:
 * - Simple stateless tools
 * - Pure functions with no side effects
 * - Tools that don't need shared state
 */

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message to echo';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo a message back';
  params: {
    message: MessageParam;
  };
  result: {
    echoed: string;
  };
}

/**
 * Const tool - stateless and simple
 */
const echo: ToolHelper<EchoTool> = async (params) => {
  return {
    echoed: params.message
  };
};

// ============================================================================
// CONST ROUTER - Grouping Related Tools
// ============================================================================

/**
 * Routers work great as const objects
 */

interface UppercaseTool extends ITool {
  name: 'uppercase';
  description: 'Convert text to uppercase';
  params: {
    text: MessageParam;
  };
  result: {
    result: string;
  };
}

interface LowercaseTool extends ITool {
  name: 'lowercase';
  description: 'Convert text to lowercase';
  params: {
    text: MessageParam;
  };
  result: {
    result: string;
  };
}

interface TextRouter extends IToolRouter {
  name: 'text';
  description: 'Text manipulation tools';
  tools: ['uppercase', 'lowercase'];
}

const textRouter: TextRouter = {
  name: 'text',
  description: 'Text manipulation tools',
  tools: ['uppercase', 'lowercase']
};

/**
 * Router tools implemented as const
 */
const uppercase: ToolHelper<UppercaseTool> = async (params) => {
  return { result: params.text.toUpperCase() };
};

const lowercase: ToolHelper<LowercaseTool> = async (params) => {
  return { result: params.text.toLowerCase() };
};

// ============================================================================
// CLASS-BASED TOOLS - Stateful, Complex Operations
// ============================================================================

/**
 * Use class pattern for:
 * - Tools that need shared state
 * - Complex initialization logic
 * - Tools that share helper methods
 * - Database connections, caches, etc.
 */

interface IncrementTool extends ITool {
  name: 'increment';
  description: 'Increment and return counter';
  params: {};
  result: {
    count: number;
  };
}

interface ResetTool extends ITool {
  name: 'reset';
  description: 'Reset counter to zero';
  params: {};
  result: {
    count: number;
  };
}

interface GetCountTool extends ITool {
  name: 'get_count';
  description: 'Get current counter value';
  params: {};
  result: {
    count: number;
  };
}

/**
 * Class implementation for stateful tools
 *
 * This demonstrates why you might use a class:
 * - Shared state (counter)
 * - Multiple related tools accessing same state
 * - Initialization logic (constructor)
 */
export default class MixedServer {
  // Shared state - this is why we use a class here
  private counter: number = 0;

  constructor() {
    // Complex initialization could go here
    console.log('MixedServer initialized with counter at 0');
  }

  /**
   * Class property tools (traditional pattern)
   *
   * These tools need access to this.counter, so they must be class methods
   */
  increment: IncrementTool = async () => {
    this.counter++;
    return { count: this.counter };
  };

  reset: ResetTool = async () => {
    this.counter = 0;
    return { count: this.counter };
  };

  getCount: GetCountTool = async () => {
    return { count: this.counter };
  };

  /**
   * Class property resources (traditional pattern)
   *
   * This resource needs access to this.counter
   */
  'stats://counter': IResource & {
    uri: 'stats://counter';
    name: 'Counter Stats';
    mimeType: 'application/json';
    returns: {
      current: number;
      timestamp: string;
    };
  } = async () => {
    return {
      current: this.counter,
      timestamp: new Date().toISOString()
    };
  };

  /**
   * Class property UI (traditional pattern)
   *
   * This UI displays the counter value
   */
  counterUI: IUI & {
    uri: 'ui://counter';
    name: 'Counter Display';
    description: 'Display current counter';
  } = {
    source: `
      <div style="padding: 2rem; font-family: system-ui;">
        <h1>Counter Dashboard</h1>
        <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
          <p style="font-size: 3rem; font-weight: bold; text-align: center; margin: 0;">
            ${this.counter}
          </p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button
            onclick="window.mcpTools?.increment({})"
            style="flex: 1; padding: 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Increment
          </button>
          <button
            onclick="window.mcpTools?.reset({})"
            style="flex: 1; padding: 1rem; background: #cc0000; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reset
          </button>
        </div>
      </div>
    `
  };
}

// ============================================================================
// CONST RESOURCES - Simple Static Data
// ============================================================================

/**
 * Use const pattern for resources that:
 * - Don't need class state
 * - Return simple data
 * - Are stateless
 */

interface VersionResource extends IResource {
  uri: 'config://version';
  name: 'Version Info';
  mimeType: 'application/json';
  returns: {
    version: string;
    buildDate: string;
  };
}

const versionInfo: ResourceHelper<VersionResource> = async () => {
  return {
    version: server.version,
    buildDate: new Date().toISOString()
  };
};

// ============================================================================
// CONST UIS - Static UIs
// ============================================================================

/**
 * Use const pattern for UIs that:
 * - Don't need dynamic data from class state
 * - Are purely presentational
 * - Don't change based on server state
 */

interface WelcomeUI extends IUI {
  uri: 'ui://welcome';
  name: 'Welcome Screen';
  description: 'Welcome message and info';
  source: string;
}

const welcomeUI: WelcomeUI = {
  source: `
    <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0066cc;">Welcome to Mixed Patterns Server</h1>
      <p style="color: #666;">
        This server demonstrates how to mix const-based and class-based patterns
        in the same MCP server.
      </p>

      <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin-top: 2rem;">
        <h2 style="margin-top: 0; font-size: 1.2rem;">Pattern Guide</h2>

        <div style="margin: 1rem 0;">
          <strong style="color: #0066cc;">Const Patterns:</strong>
          <ul style="margin: 0.5rem 0;">
            <li>Simple stateless tools (echo)</li>
            <li>Static resources (version info)</li>
            <li>Presentational UIs (this one!)</li>
            <li>Routers (text router)</li>
          </ul>
        </div>

        <div style="margin: 1rem 0;">
          <strong style="color: #cc6600;">Class Patterns:</strong>
          <ul style="margin: 0.5rem 0;">
            <li>Stateful tools (counter)</li>
            <li>Shared state resources (counter stats)</li>
            <li>Dynamic UIs (counter display)</li>
            <li>Complex initialization</li>
          </ul>
        </div>
      </div>

      <p style="color: #666; margin-top: 2rem; font-size: 0.875rem;">
        Choose the pattern that fits your use case. Both work perfectly together!
      </p>
    </div>
  `
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export const implementations
 *
 * The compiler will discover:
 * - server (const)
 * - echo (const tool)
 * - textRouter (const router)
 * - uppercase, lowercase (const router tools)
 * - versionInfo (const resource)
 * - welcomeUI (const UI)
 * - MixedServer (export default class with stateful tools)
 *
 * All patterns work together seamlessly!
 */

export {
  server,
  echo,
  textRouter,
  uppercase,
  lowercase,
  versionInfo,
  welcomeUI
};

/**
 * MIGRATION GUIDE: Class to Const
 *
 * If you have an existing class-based server and want to migrate to const:
 *
 * Step 1: Start with server config
 *   class Server { }
 *   const server: IServer = { ... }  // Extract to const
 *
 * Step 2: Extract stateless tools
 *   // Before (in class)
 *   echo: EchoTool = async (params) => { ... }
 *
 *   // After (const)
 *   const echo: ToolHelper<EchoTool> = async (params) => { ... }
 *
 * Step 3: Keep stateful tools in class
 *   // These need this.counter, keep in class
 *   increment: IncrementTool = async () => { this.counter++; ... }
 *
 * Step 4: Gradually migrate
 *   - One tool at a time
 *   - Test after each change
 *   - No rush - both patterns work!
 *
 * Step 5: Final state
 *   - Const for stateless primitives
 *   - Class only for stateful operations
 *   - Best of both worlds!
 */

/**
 * PATTERN DECISION TREE
 *
 * "Should I use const or class?"
 *
 * Does it need shared state? (this.something)
 *   YES → Use class
 *   NO  → Use const
 *
 * Does it need initialization logic? (constructor)
 *   YES → Use class
 *   NO  → Use const
 *
 * Do multiple tools share data?
 *   YES → Use class
 *   NO  → Use const
 *
 * Is it a pure function?
 *   YES → Use const
 *   NO  → Use class
 *
 * Are you unsure?
 *   → Start with const, refactor to class if needed
 *
 * Remember: You can always mix both patterns!
 */
