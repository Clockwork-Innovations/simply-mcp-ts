/**
 * Isolated VM Code Execution Example
 *
 * Demonstrates secure code execution using isolated-vm executor.
 * Provides strong isolation with separate V8 isolates for untrusted AI-generated code.
 *
 * Prerequisites:
 *   npm install isolated-vm
 *
 * Usage:
 *   npx tsx examples/v4/isolated-vm-server.ts
 *
 * Test with Claude CLI:
 *   claude --print --model haiku \
 *     --mcp-config /tmp/test-mcp-config.json \
 *     --strict-mcp-config \
 *     --dangerously-skip-permissions \
 *     "Execute JavaScript code that calculates fibonacci(10)"
 */

import { IServer } from '../../src/index.js';

const server: IServer = {
  name: 'isolated-vm-executor',
  description: 'Secure code execution using isolated-vm with strong isolation',
  version: '1.0.0',

  /**
   * Code execution configuration using isolated-vm
   *
   * isolated-vm provides:
   * - Separate V8 isolate per execution (true isolation)
   * - Memory limits (default 128MB)
   * - Timeout enforcement
   * - No access to Node.js built-ins
   */
  codeExecution: {
    mode: 'isolated-vm', // Use isolated-vm for strong isolation
    language: 'typescript', // Support TypeScript with compilation
    timeout: 10000, // 10 second timeout
    introspectTools: true, // Enable tool injection
    captureOutput: true, // Capture console output
  },

  /**
   * Example tools that can be called from executed code
   */
  tools: [
    {
      name: 'getTime',
      description: 'Get current timestamp',
      parameters: {},
      handler: async () => {
        return {
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };
      },
    },
    {
      name: 'calculate',
      description: 'Perform a calculation',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'Operation to perform',
          },
          a: {
            type: 'number',
            description: 'First operand',
          },
          b: {
            type: 'number',
            description: 'Second operand',
          },
        },
        required: ['operation', 'a', 'b'],
      },
      handler: async ({ operation, a, b }: { operation: string; a: number; b: number }) => {
        switch (operation) {
          case 'add':
            return a + b;
          case 'subtract':
            return a - b;
          case 'multiply':
            return a * b;
          case 'divide':
            if (b === 0) throw new Error('Division by zero');
            return a / b;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      },
    },
  ],

  /**
   * Example resources
   */
  resources: [
    {
      uri: 'config://limits',
      name: 'Execution Limits',
      description: 'Code execution limits and security configuration',
      mimeType: 'application/json',
      handler: async () => {
        return {
          contents: [
            {
              uri: 'config://limits',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  executor: 'isolated-vm',
                  timeout: '10000ms',
                  memoryLimit: '128MB',
                  isolation: 'V8 isolate',
                  features: {
                    separateIsolate: true,
                    memoryLimits: true,
                    timeoutEnforcement: true,
                    noNodeBuiltins: true,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      },
    },
  ],

  /**
   * Example prompts with code execution usage
   */
  prompts: [
    {
      name: 'fibonacci',
      description: 'Calculate Fibonacci numbers using code execution',
      arguments: [
        {
          name: 'n',
          description: 'The nth Fibonacci number to calculate',
          required: true,
        },
      ],
      handler: async (args) => {
        const n = parseInt(args.n as string);
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Use the tool_runner to calculate the ${n}th Fibonacci number. Write TypeScript code that implements the Fibonacci sequence.`,
              },
            },
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `I'll calculate the ${n}th Fibonacci number using TypeScript code execution in an isolated VM.`,
              },
            },
          ],
        };
      },
    },
    {
      name: 'tool-composition',
      description: 'Demonstrate tool composition with code execution',
      arguments: [],
      handler: async () => {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Use the tool_runner to execute TypeScript code that:
1. Calls getTime() to get the current timestamp
2. Calls calculate() to perform some math with the timestamp
3. Returns a formatted result

The code will run in an isolated VM with tool injection enabled.`,
              },
            },
          ],
        };
      },
    },
  ],
};

export default server;
