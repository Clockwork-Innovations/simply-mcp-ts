/**
 * Code Execution Server Example
 *
 * Demonstrates secure code execution for untrusted AI-generated code using the tool_runner meta-tool.
 * This example shows TypeScript code execution that can orchestrate tool calls with proper isolation.
 *
 * SECURITY NOTE:
 * - 'isolated-vm' (default) provides strong V8 isolate isolation for development/testing
 * - 'docker' provides maximum container isolation for production environments
 * - Both modes are safe for executing untrusted AI-generated code
 *
 * Features:
 * - TypeScript/JavaScript execution with V8 isolate isolation
 * - Timeout enforcement
 * - Memory limits
 * - Stdout/stderr capture
 * - Error handling with stack traces
 * - Tool orchestration (multi-tool workflows)
 *
 * The tool_runner tool is auto-registered when codeExecution config is present.
 */

import type { IServer } from '../../src/index.js';

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Server with code execution enabled
 *
 * The codeExecution config automatically registers the 'tool_runner' tool.
 * No need to define the tool explicitly - it's a meta-tool.
 */
export const server: IServer = {
  name: 'code-execution-server',
  version: '1.0.0',
  description: 'MCP server with TypeScript code execution and tool orchestration',

  // Enable code execution with isolated-vm (secure default)
  codeExecution: {
    // mode: 'isolated-vm',  // Default: Strong V8 isolate isolation (recommended)
    // mode: 'docker',       // Production: Maximum isolation with containers
    timeout: 5000,           // Default timeout: 5 seconds
    captureOutput: true,     // Capture console.log, console.error, etc.
    language: 'typescript',  // Use TypeScript by default
    introspectTools: true,   // Enable tool introspection (auto-inject tools)
  },
};

/**
 * No server class needed for this example!
 *
 * The tool_runner tool is auto-registered by the framework.
 * Just run this server and call the tool:
 *
 * Tool: tool_runner
 * Params:
 *   - language: 'typescript'
 *   - code: 'const result: number = 42; console.log("Hello"); return result;'
 *   - timeout: 5000 (optional)
 *
 * Result:
 *   - success: true
 *   - returnValue: 42
 *   - stdout: "Hello\n"
 *   - executionTime: 12
 */

// Empty class to satisfy the adapter (bare server pattern)
// The tool_runner tool is auto-registered, so no tools need to be defined
export default class CodeExecutionServer {
  // No tools needed - tool_runner is a meta-tool
}

/**
 * Example Usage with Claude CLI:
 *
 * 1. Install dependencies:
 *    npm install vm2 typescript
 *
 * 2. Build the CLI:
 *    npm run build
 *
 * 3. Create MCP config:
 *    cat > /tmp/code-exec-config.json << 'EOF'
 *    {
 *      "mcpServers": {
 *        "code-exec": {
 *          "command": "node",
 *          "args": [
 *            "./dist/src/cli/index.js",
 *            "run",
 *            "./examples/v4/code-execution-server.ts"
 *          ]
 *        }
 *      }
 *    }
 *    EOF
 *
 * 4. Test with Claude:
 *    claude --print \
 *      --model haiku \
 *      --mcp-config /tmp/code-exec-config.json \
 *      --strict-mcp-config \
 *      --dangerously-skip-permissions \
 *      "List available tools"
 *
 *    claude --print \
 *      --model haiku \
 *      --mcp-config /tmp/code-exec-config.json \
 *      --strict-mcp-config \
 *      --dangerously-skip-permissions \
 *      "Execute this TypeScript: const result: number = 42 + 8; console.log('Hello from Claude!'); return result;"
 *
 * Expected output:
 * {
 *   "success": true,
 *   "returnValue": 50,
 *   "stdout": "Hello from Claude!\n",
 *   "executionTime": 15
 * }
 *
 * Example Error Handling:
 *    claude --print \
 *      --model haiku \
 *      --mcp-config /tmp/code-exec-config.json \
 *      --strict-mcp-config \
 *      --dangerously-skip-permissions \
 *      "Execute this TypeScript: throw new Error('Test error');"
 *
 * Expected output:
 * {
 *   "success": false,
 *   "error": "Test error",
 *   "stackTrace": "Error: Test error\n    at ...",
 *   "executionTime": 8
 * }
 *
 * Example Timeout:
 *    claude --print \
 *      --model haiku \
 *      --mcp-config /tmp/code-exec-config.json \
 *      --strict-mcp-config \
 *      --dangerously-skip-permissions \
 *      "Execute this TypeScript: while(true) {}"
 *
 * Expected output:
 * {
 *   "success": false,
 *   "error": "Execution timed out after 5000ms",
 *   "executionTime": 5001
 * }
 */
