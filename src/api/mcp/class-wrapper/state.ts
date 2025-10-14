/**
 * State management for Class Wrapper Wizard
 *
 * Tracks the transformation process of converting a TypeScript class
 * into an MCP server by adding decorators.
 */

/**
 * Wizard step tracking
 */
export type ClassWrapperStep =
  | 'init'                // Wizard started
  | 'file_loaded'         // File loaded and parsed
  | 'metadata_confirmed'  // Server metadata confirmed
  | 'decorating'          // Adding tool decorators
  | 'complete';           // File written

/**
 * Parsed method from class
 */
export interface ParsedMethod {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    optional: boolean;
    hasDefault: boolean;
    defaultValue?: any;
  }>;
  returnType: string;
  jsdoc?: {
    description?: string;
    params?: Map<string, string>;
  };
  isPublic: boolean;
}

/**
 * Parsed class information
 */
export interface ParsedClass {
  className: string;
  isExported: boolean;
  methods: ParsedMethod[];
  filePath: string;
  fileContent: string;
  existingImports: string[];
  hasExistingDecorators: boolean;
}

/**
 * Server metadata for @MCPServer decorator
 */
export interface ServerMetadata {
  name: string;
  version: string;
  description?: string;
}

/**
 * Complete wizard state
 */
export interface ClassWrapperState {
  // Current step
  currentStep: ClassWrapperStep;

  // File information
  filePath?: string;
  parsedClass?: ParsedClass;

  // Metadata
  suggestedMetadata?: ServerMetadata;
  confirmedMetadata?: ServerMetadata;

  // Tool decorators to add (method name -> description)
  toolDecorators: Map<string, string>;

  // Session info
  sessionId?: string;
  createdAt: number;
  lastUpdated: number;
}

/**
 * State manager for class wrapper wizard
 *
 * Supports both STDIO (single state) and HTTP (multiple sessions)
 */
export class ClassWrapperStateManager {
  // HTTP: Multiple concurrent wizards by session
  private states: Map<string, ClassWrapperState> = new Map();

  // STDIO: Single wizard state
  private stdioState?: ClassWrapperState;

  /**
   * Create a new wizard state
   */
  createState(sessionId?: string): ClassWrapperState {
    const state: ClassWrapperState = {
      currentStep: 'init',
      toolDecorators: new Map(),
      sessionId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    if (sessionId) {
      this.states.set(sessionId, state);
    } else {
      this.stdioState = state;
    }

    return state;
  }

  /**
   * Get wizard state by session (or default for STDIO)
   */
  getState(sessionId?: string): ClassWrapperState | undefined {
    if (sessionId) {
      return this.states.get(sessionId);
    }
    return this.stdioState;
  }

  /**
   * Update wizard state
   */
  updateState(state: ClassWrapperState, sessionId?: string): void {
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
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): string[] {
    return Array.from(this.states.keys());
  }
}
