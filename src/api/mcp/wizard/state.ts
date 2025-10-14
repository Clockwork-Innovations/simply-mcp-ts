/**
 * Wizard state management for building MCP servers step-by-step
 *
 * The wizard accumulates configuration through multiple LLM interactions,
 * building up a complete server configuration that can be generated to code.
 */

/**
 * Wizard step tracking
 */
export type WizardStep =
  | 'init'           // Wizard started, ready for server info
  | 'server_info'    // Server info collected, ready to add tools
  | 'adding_tools'   // Adding tools, can add more or finish
  | 'complete';      // Wizard complete, code generated

/**
 * Tool in progress (being defined)
 */
export interface ToolInProgress {
  purpose: string;                    // Natural language purpose
  parameters_description?: string;    // LLM's description of parameters
}

/**
 * Parameter definition (structured by LLM)
 */
export interface ParamDef {
  name: string;           // Parameter name (snake_case)
  type: string;           // Type (string, number, boolean, array, object)
  description: string;    // Clear description for agents
  required: boolean;      // Is this parameter required?
  default?: any;          // Optional default value
}

/**
 * Completed tool definition (ready for code generation)
 */
export interface CompletedTool {
  name: string;                 // Tool name (kebab-case)
  description: string;          // Tool description
  parameters: ParamDef[];       // Structured parameter definitions
  zodSchemaCode?: string;       // Generated Zod schema code
  implementationNotes?: string; // How to implement (optional)
}

/**
 * Server configuration being built
 */
export interface ServerConfig {
  name?: string;        // Server name (kebab-case)
  version?: string;     // Semver version
  description?: string; // Server description
}

/**
 * Complete wizard state
 *
 * This state is accumulated across multiple tool calls,
 * building up a complete MCP server configuration.
 */
export interface WizardState {
  // Wizard step tracking
  currentStep: WizardStep;

  // Accumulated server config
  serverConfig: ServerConfig;

  // Tools being built
  currentTool?: ToolInProgress;      // Tool currently being defined
  completedTools: CompletedTool[];   // Tools fully defined

  // Metadata
  sessionId?: string;                // Session ID (for HTTP mode)
  createdAt: number;                 // Timestamp of creation
  lastUpdated: number;               // Last update timestamp
}

/**
 * State storage strategy
 *
 * HTTP Mode: Map<sessionId, WizardState> in wizard server
 * STDIO Mode: Single global state (only one wizard at a time)
 */
export class WizardStateManager {
  // HTTP: Multiple concurrent wizards by session
  private states: Map<string, WizardState> = new Map();

  // STDIO: Single wizard state
  private stdioState?: WizardState;

  /**
   * Create a new wizard state
   */
  createState(sessionId?: string): WizardState {
    const state: WizardState = {
      currentStep: 'init',
      serverConfig: {},
      completedTools: [],
      sessionId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    if (sessionId) {
      // HTTP mode: store by session
      this.states.set(sessionId, state);
    } else {
      // STDIO mode: single state
      this.stdioState = state;
    }

    return state;
  }

  /**
   * Get wizard state by session (or default for STDIO)
   */
  getState(sessionId?: string): WizardState | undefined {
    if (sessionId) {
      return this.states.get(sessionId);
    }
    return this.stdioState;
  }

  /**
   * Update wizard state
   */
  updateState(state: WizardState, sessionId?: string): void {
    state.lastUpdated = Date.now();

    if (sessionId) {
      this.states.set(sessionId, state);
    } else {
      this.stdioState = state;
    }
  }

  /**
   * Delete wizard state (cleanup after completion)
   */
  deleteState(sessionId?: string): void {
    if (sessionId) {
      this.states.delete(sessionId);
    } else {
      this.stdioState = undefined;
    }
  }

  /**
   * Get all active sessions (for HTTP mode monitoring)
   */
  getActiveSessions(): string[] {
    return Array.from(this.states.keys());
  }
}
