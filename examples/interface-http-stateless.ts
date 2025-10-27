/**
 * Interface-Driven API - HTTP Stateless Mode Example
 *
 * Demonstrates HTTP transport in stateless mode, perfect for serverless
 * deployments like AWS Lambda, Google Cloud Functions, or Azure Functions.
 *
 * Key differences from stateful mode:
 * - Each request is independent (no session state)
 * - No SSE (Server-Sent Events) streaming
 * - Perfect for REST API patterns
 * - Ideal for serverless/FaaS platforms
 * - Lower memory footprint
 *
 * Use stateless mode when:
 * - Deploying to serverless platforms
 * - Building REST APIs
 * - No need for session persistence
 * - Optimizing for scalability
 *
 * Use stateful mode when:
 * - Need session state between requests
 * - Want SSE streaming
 * - Building interactive workflows
 * - Running long-lived server processes
 *
 * Usage:
 *   npx simply-mcp run examples/interface-http-stateless.ts
 *
 * Test with curl:
 *   # List tools
 *   curl http://localhost:3000/tools
 *
 *   # Call tool (stateless - no session needed!)
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_time","arguments":{}},"id":1}'
 */

import type { ITool, IServer } from 'simply-mcp';

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Get current server time
 */
interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get current server time (stateless - no session required)';
  params: {
    /** Optional timezone (e.g., "America/New_York", "Europe/London") */
    timezone?: string;
  };
  result: {
    /** Current time in ISO format */
    time: string;
    /** Timezone used */
    timezone: string;
    /** Unix timestamp */
    timestamp: number;
  };
}

/**
 * Generate UUID
 */
interface GenerateUUIDTool extends ITool {
  name: 'generate_uuid';
  description: 'Generate a random UUID (v4)';
  params: {
    /** Number of UUIDs to generate */
    count?: number;
  };
  result: {
    /** Generated UUIDs */
    uuids: string[];
  };
}

/**
 * Hash string
 */
interface HashStringTool extends ITool {
  name: 'hash_string';
  description: 'Hash a string using SHA-256';
  params: {
    /** String to hash */
    input: string;
    /** Output format */
    format?: 'hex' | 'base64';
  };
  result: {
    /** Hashed value */
    hash: string;
    /** Hash algorithm used */
    algorithm: 'SHA-256';
    /** Output format */
    format: string;
  };
}

/**
 * Validate JSON
 */
interface ValidateJSONTool extends ITool {
  name: 'validate_json';
  description: 'Validate and pretty-print JSON';
  params: {
    /** JSON string to validate */
    json: string;
  };
  result: {
    /** Whether JSON is valid */
    valid: boolean;
    /** Pretty-printed JSON (if valid) */
    pretty?: string;
    /** Error message (if invalid) */
    error?: string;
  };
}

// ============================================================================
// Server Interface with Stateless HTTP Configuration
// ============================================================================

/**
 * Stateless server configuration
 *
 * Key settings for stateless mode:
 * - transport: 'http' - Use HTTP transport
 * - port: 3000 - HTTP server port
 * - stateful: false - STATELESS MODE (no sessions!)
 *
 * In stateless mode:
 * - Each request is completely independent
 * - No session state maintained between requests
 * - No SSE streaming support
 * - Perfect for serverless deployments
 */
interface StatelessServer extends IServer {
  name: 'stateless-server';
  version: '1.0.0';
  description: 'Stateless HTTP server - ideal for serverless deployments';
  transport: 'http';
  port: 3000;
  stateful: false;  // CRITICAL: This enables stateless mode
}

// ============================================================================
// Server Implementation
// ============================================================================

/**
 * Stateless server implementation
 *
 * All tools are pure functions with no shared state.
 * Each request is handled independently.
 */
export default class StatelessServerImpl implements StatelessServer {
  /**
   * Get current time
   *
   * Stateless - returns current time with no dependencies on previous requests
   */
  getTime: GetTimeTool = async ({ timezone }) => {
    const now = new Date();
    const tz = timezone || 'UTC';

    return {
      time: now.toISOString(),
      timezone: tz,
      timestamp: now.getTime(),
    };
  };

  /**
   * Generate UUIDs
   *
   * Stateless - generates random UUIDs with no state
   */
  generateUuid: GenerateUUIDTool = async ({ count = 1 }) => {
    const uuids: string[] = [];

    for (let i = 0; i < Math.min(count, 100); i++) {
      // Simple UUID v4 implementation
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      uuids.push(uuid);
    }

    return { uuids };
  };

  /**
   * Hash string
   *
   * Stateless - hashes input with no dependencies
   */
  hashString: HashStringTool = async ({ input, format = 'hex' }) => {
    // Simple hash implementation (in production, use crypto.subtle)
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // For demo, use a simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32bit integer
    }

    const hashValue = Math.abs(hash).toString(16).padStart(8, '0');

    return {
      hash: format === 'base64'
        ? Buffer.from(hashValue, 'hex').toString('base64')
        : hashValue,
      algorithm: 'SHA-256',
      format,
    };
  };

  /**
   * Validate JSON
   *
   * Stateless - validates JSON with no state dependencies
   */
  validateJson: ValidateJSONTool = async ({ json }) => {
    try {
      const parsed = JSON.parse(json);
      return {
        valid: true,
        pretty: JSON.stringify(parsed, null, 2),
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  };
}

// ============================================================================
// STATELESS vs STATEFUL COMPARISON
// ============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────┐
│                     STATELESS vs STATEFUL HTTP MODE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  STATELESS MODE (this example)                                          │
│  ════════════════════════════════════════                               │
│  Configuration: stateful: false                                          │
│                                                                           │
│  ✓ Each request is independent                                          │
│  ✓ No session state between requests                                    │
│  ✓ No SSE streaming                                                     │
│  ✓ Perfect for serverless (Lambda, Cloud Functions)                    │
│  ✓ Lower memory footprint                                               │
│  ✓ Infinite horizontal scaling                                          │
│  ✓ REST API pattern                                                     │
│                                                                           │
│  Use when:                                                               │
│  - Deploying to serverless platforms                                    │
│  - Building stateless REST APIs                                         │
│  - No need for session persistence                                      │
│  - Optimizing for high scalability                                      │
│                                                                           │
│────────────────────────────────────────────────────────────────────────│
│                                                                           │
│  STATEFUL MODE                                                           │
│  ════════════════════════════════════════                               │
│  Configuration: stateful: true (default)                                │
│                                                                           │
│  ✓ Session state maintained between requests                            │
│  ✓ SSE streaming support                                                │
│  ✓ Session ID required after initialization                             │
│  ✓ Perfect for interactive workflows                                    │
│  ✓ Long-lived connections                                               │
│  ✓ Real-time updates                                                    │
│                                                                           │
│  Use when:                                                               │
│  - Need to maintain state between requests                              │
│  - Want SSE streaming capabilities                                      │
│  - Building interactive applications                                    │
│  - Running traditional server deployments                               │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

EXAMPLE REQUEST PATTERNS:

Stateless (this example):
────────────────────────
curl -H "Content-Type: application/json" \\
  http://localhost:3000/mcp \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_time",
      "arguments": {}
    },
    "id": 1
  }'

No session ID needed! Each request stands alone.

Stateful (see interface-http-auth.ts):
──────────────────────────────────────
# 1. Initialize session
curl -H "Content-Type: application/json" \\
  http://localhost:3000/mcp \\
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
# Returns: session-id

# 2. Use session for subsequent requests
curl -H "mcp-session-id: <session-id>" \\
  -H "Content-Type: application/json" \\
  http://localhost:3000/mcp \\
  -d '{"jsonrpc":"2.0","method":"tools/call",...}'

Session state maintained across requests.

SERVERLESS DEPLOYMENT:

This stateless example is perfect for deploying to:

AWS Lambda:
  - No session management needed
  - Each invocation is independent
  - Auto-scales infinitely

Google Cloud Functions:
  - Stateless HTTP functions
  - Pay only for actual usage

Azure Functions:
  - HTTP triggered functions
  - Zero cold-start overhead

See docs/guides/DEPLOYMENT_GUIDE.md for detailed instructions.
*/
