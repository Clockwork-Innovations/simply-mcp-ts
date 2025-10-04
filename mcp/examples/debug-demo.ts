/**
 * Debug Demo Server
 *
 * This server demonstrates debugging features with SimpleMCP.
 *
 * To debug this server:
 *   simplymcp run mcp/examples/debug-demo.ts --inspect
 *   simplymcp run mcp/examples/debug-demo.ts --inspect-brk
 *   simplymcp run mcp/examples/debug-demo.ts --inspect --inspect-port 9230
 *
 * Then connect with:
 * - Chrome DevTools: chrome://inspect
 * - VS Code: Attach to port 9229 (or your custom port)
 */

import { defineMCP, Schema } from '../single-file-types.js';

// This function will be called during tool execution
// Set a breakpoint here to inspect the execution
function processData(input: string): string {
  // Add a debugger statement to pause execution
  debugger;

  const processed = input.toUpperCase();
  console.error(`[DEBUG] Processed: ${input} -> ${processed}`);
  return processed;
}

export default defineMCP({
  name: 'debug-demo',
  version: '1.0.0',

  tools: [
    {
      name: 'echo',
      description: 'Echo back the input (useful for testing debugging)',
      parameters: Schema.object({
        message: Schema.string({
          description: 'The message to echo',
        }),
      }),
      execute: async (args) => {
        console.error('[DEBUG] Echo tool called with:', args.message);

        // This line is a good place to set a breakpoint
        const result = processData(args.message);

        console.error('[DEBUG] Echo tool returning:', result);
        return result;
      },
    },

    {
      name: 'calculate',
      description: 'Perform a calculation (demonstrates debugging complex logic)',
      parameters: Schema.object({
        a: Schema.number({ description: 'First number' }),
        b: Schema.number({ description: 'Second number' }),
        operation: Schema.enum(['add', 'subtract', 'multiply', 'divide'], {
          description: 'Operation to perform',
        }),
      }),
      execute: async (args) => {
        console.error('[DEBUG] Calculate called:', args);

        // Set breakpoint here to inspect variables
        let result: number;

        switch (args.operation) {
          case 'add':
            result = args.a + args.b;
            break;
          case 'subtract':
            result = args.a - args.b;
            break;
          case 'multiply':
            result = args.a * args.b;
            break;
          case 'divide':
            if (args.b === 0) {
              // Set breakpoint here to catch division by zero
              throw new Error('Division by zero');
            }
            result = args.a / args.b;
            break;
          default:
            throw new Error(`Unknown operation: ${args.operation}`);
        }

        console.error('[DEBUG] Result:', result);
        return `${args.a} ${args.operation} ${args.b} = ${result}`;
      },
    },

    {
      name: 'async-demo',
      description: 'Demonstrates debugging async operations',
      parameters: Schema.object({
        delay: Schema.number({
          description: 'Delay in milliseconds',
          minimum: 0,
          maximum: 5000,
        }),
      }),
      execute: async (args) => {
        console.error('[DEBUG] Starting async operation with delay:', args.delay);

        // Set breakpoint here
        const startTime = Date.now();

        await new Promise(resolve => setTimeout(resolve, args.delay));

        // Set another breakpoint here to see the elapsed time
        const elapsed = Date.now() - startTime;
        console.error('[DEBUG] Async operation completed in:', elapsed, 'ms');

        return `Completed after ${elapsed}ms`;
      },
    },

    {
      name: 'error-demo',
      description: 'Demonstrates debugging error handling',
      parameters: Schema.object({
        shouldThrow: Schema.boolean({
          description: 'Whether to throw an error',
        }),
        errorMessage: Schema.string({
          description: 'Custom error message',
          optional: true,
        }),
      }),
      execute: async (args) => {
        console.error('[DEBUG] Error demo called with:', args);

        if (args.shouldThrow) {
          // Set breakpoint here to inspect error before throwing
          const message = args.errorMessage || 'Intentional error for debugging';
          console.error('[DEBUG] About to throw error:', message);
          throw new Error(message);
        }

        return 'No error thrown';
      },
    },
  ],
});
