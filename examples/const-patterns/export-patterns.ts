/**
 * Export Patterns Reference
 *
 * This example demonstrates different export patterns for const-based servers
 * and explains which patterns are currently supported by the compiler.
 *
 * Export patterns covered:
 * 1. Named exports (RECOMMENDED - fully supported)
 * 2. Export default class (fully supported)
 * 3. Export default object literal (NOT currently supported)
 * 4. Mixed exports (fully supported)
 *
 * Compiler Discovery Rules:
 * - Looks for: const server: IServer
 * - Looks for: const X: ToolHelper<T>
 * - Looks for: const X: IUI, IToolRouter, etc.
 * - Looks for: export default class
 * - Does NOT look for: export default { ... } object literals
 */

import type {
  IServer,
  ITool,
  IParam,
  IToolRouter,
  IUI,
  ToolHelper
} from '../../src/index.js';

// ============================================================================
// PATTERN 1: NAMED EXPORTS (RECOMMENDED)
// ============================================================================

/**
 * This is the RECOMMENDED pattern for const-based servers.
 *
 * Benefits:
 * - Explicit and clear
 * - Full compiler support
 * - Easy to understand what's exported
 * - Works with all const patterns
 *
 * How it works:
 * 1. Define const implementations
 * 2. Export them by name
 * 3. Compiler discovers all const declarations
 */

const server: IServer = {
  name: 'export-patterns-demo',
  version: '1.0.0',
  description: 'Demonstrates export patterns'
};

interface MessageParam extends IParam {
  type: 'string';
  description: 'Message to process';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: {
    name: MessageParam;
  };
  result: {
    greeting: string;
  };
}

const greet: ToolHelper<GreetTool> = async (params) => {
  return {
    greeting: `Hello, ${params.name}!`
  };
};

interface WelcomeUI extends IUI {
  uri: 'ui://welcome';
  name: 'Welcome Screen';
  source: string;
}

const welcome: WelcomeUI = {
  source: '<div><h1>Welcome!</h1></div>'
};

// Named exports - RECOMMENDED
export {
  server,
  greet,
  welcome
};

/**
 * Why named exports are recommended:
 * - Explicit: You can see exactly what's being exported
 * - Discoverable: Easy to find in code
 * - Tree-shakeable: Bundlers can optimize unused exports
 * - IDE-friendly: Better autocomplete and navigation
 */

// ============================================================================
// PATTERN 2: EXPORT DEFAULT CLASS (TRADITIONAL)
// ============================================================================

/**
 * This is the traditional pattern for class-based servers.
 *
 * Benefits:
 * - Backward compatible
 * - Auto-instantiation (no need for const instance = new Class())
 * - Works with stateful implementations
 * - Full compiler support
 *
 * How it works:
 * 1. Define export default class
 * 2. Class properties are discovered
 * 3. Auto-instantiated by compiler
 */

// Example (commented out to avoid conflict):
/*
export default class ExportPatternServer {
  greet: GreetTool = async (params) => {
    return {
      greeting: `Hello, ${params.name}!`
    };
  };

  welcome: WelcomeUI = {
    source: '<div><h1>Welcome!</h1></div>'
  };
}
*/

/**
 * When to use export default class:
 * - You need shared state (this.something)
 * - You prefer class-based patterns
 * - You're migrating from older code
 * - You have complex initialization logic
 */

// ============================================================================
// PATTERN 3: EXPORT DEFAULT OBJECT (NOT SUPPORTED)
// ============================================================================

/**
 * This pattern is NOT currently supported by the compiler.
 *
 * The compiler does NOT support:
 * - export default { server, greet, welcome }
 * - export default { ...implementations }
 *
 * Why not?
 * - Compiler looks for const declarations at top level
 * - Object literals in export default are not parsed
 * - Would require additional AST traversal
 * - Complexity vs value tradeoff
 *
 * Workaround: Use named exports instead (Pattern 1)
 */

// ❌ NOT SUPPORTED - Don't use this pattern
/*
export default {
  server,
  greet,
  welcome
};
*/

/**
 * If you try this pattern, you'll get:
 * - No server discovered
 * - No tools discovered
 * - Server won't start
 *
 * Solution: Use named exports instead
 */

// ============================================================================
// PATTERN 4: MIXED EXPORTS (FULLY SUPPORTED)
// ============================================================================

/**
 * You can mix const exports with class exports.
 *
 * This works because:
 * - Compiler discovers const declarations (Pattern 1)
 * - Compiler discovers export default class (Pattern 2)
 * - Both discovery mechanisms work together
 */

// Example: Const server + export default class
/*
// Server config as const (discovered)
const server: IServer = {
  name: 'mixed-exports',
  version: '1.0.0'
};

// Export const
export { server };

// Class with tools (discovered and auto-instantiated)
export default class MixedExportServer {
  greet: GreetTool = async (params) => {
    return { greeting: `Hello, ${params.name}!` };
  };
}
*/

/**
 * When to use mixed exports:
 * - Const for server config (clearer)
 * - Class for tools (if you need state)
 * - Best of both worlds
 */

// ============================================================================
// PATTERN COMPARISON TABLE
// ============================================================================

/**
 * | Pattern                  | Supported | Use Case                       |
 * |--------------------------|-----------|--------------------------------|
 * | Named exports            | ✅ Yes    | Const-based servers (default)  |
 * | Export default class     | ✅ Yes    | Class-based servers            |
 * | Export default object    | ❌ No     | Not supported - use named      |
 * | Mixed (const + class)    | ✅ Yes    | Hybrid approach                |
 */

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * 1. For new const-based servers:
 *    → Use named exports (Pattern 1)
 *
 * 2. For class-based servers:
 *    → Use export default class (Pattern 2)
 *
 * 3. For migration:
 *    → Use mixed exports (Pattern 4)
 *    → Gradually move to named exports
 *
 * 4. Avoid:
 *    → Export default object literal (not supported)
 *
 * 5. Organization:
 *    → Group related exports together
 *    → Export server first
 *    → Then primitives in logical order
 */

// ============================================================================
// RECOMMENDED FILE STRUCTURE
// ============================================================================

/**
 * For const-based servers, organize your file like this:
 *
 * 1. Imports
 * 2. Server configuration
 * 3. Parameter interfaces
 * 4. Tool/Prompt/Resource interfaces
 * 5. Const implementations
 * 6. Named exports at the end
 *
 * Example:
 */

// --- 1. Imports ---
// import type { ... } from 'simply-mcp';

// --- 2. Server configuration ---
// const server: IServer = { ... };

// --- 3. Parameter interfaces ---
// interface NameParam extends IParam { ... }

// --- 4. Tool interfaces ---
// interface GreetTool extends ITool { ... }

// --- 5. Const implementations ---
// const greet: ToolHelper<GreetTool> = async (params) => { ... };

// --- 6. Named exports ---
// export { server, greet };

/**
 * This structure makes it easy to:
 * - Find what you're looking for
 * - Understand the server's capabilities
 * - Add new primitives
 * - Review in pull requests
 */

// ============================================================================
// COMPILER DISCOVERY INTERNALS (FYI)
// ============================================================================

/**
 * How the compiler discovers const implementations:
 *
 * 1. Parses TypeScript AST
 * 2. Looks for VariableStatement nodes
 * 3. Checks type annotation:
 *    - IServer → server config
 *    - ToolHelper<T> → tool implementation
 *    - IUI, XUI → UI implementation
 *    - IToolRouter, XRouter → router implementation
 *    - CompletionHelper<T> → completion implementation
 *    - XRoots → roots implementation
 *    - XSubscription → subscription implementation
 * 4. Links const name to interface
 * 5. Generates runtime metadata
 *
 * For export default class:
 * 1. Finds ClassDeclaration with export + default modifiers
 * 2. Auto-instantiates the class
 * 3. Discovers class properties (same as v3)
 *
 * For export default object literal:
 * - NOT IMPLEMENTED
 * - Would need to:
 *   1. Find ExportAssignment node
 *   2. Check if it's ObjectLiteralExpression
 *   3. Extract property references
 *   4. Link to discovered const implementations
 * - Complexity: Medium
 * - Value: Low (named exports work fine)
 * - Decision: Not implemented (use named exports)
 */

// ============================================================================
// FUTURE CONSIDERATIONS
// ============================================================================

/**
 * If export default object bundling is needed in the future:
 *
 * Possible implementation:
 * 1. Add ExportAssignment node visitor in main-compiler.ts
 * 2. Check for ObjectLiteralExpression
 * 3. Extract shorthand properties (e.g., { server, greet })
 * 4. Match property names to discovered const implementations
 * 5. Link them together
 *
 * Complexity factors:
 * - Need to handle both shorthand and regular properties
 * - Need to resolve property value references
 * - Need to validate all properties exist
 * - Need to avoid breaking existing patterns
 *
 * Alternative: Re-export pattern
 * Instead of export default object, could support:
 *
 *   export const exports = { server, greet, welcome };
 *
 * This would be easier to discover (still a const declaration)
 * but less ergonomic than export default.
 *
 * Recommendation: Stick with named exports for now.
 * They're explicit, well-supported, and work great.
 */

/**
 * SUMMARY
 *
 * ✅ DO use:
 *   - export { server, greet, welcome }  // Named exports
 *   - export default class Server { }    // Class export
 *   - export { server }; export default class // Mixed
 *
 * ❌ DON'T use:
 *   - export default { server, greet }   // Not supported
 *
 * When in doubt: Use named exports!
 */
