/**
 * Debug Breakpoint Demo
 *
 * This example shows how to use debugger statements effectively.
 *
 * Run with debugger:
 *   simplymcp run mcp/examples/debug-breakpoint-demo.ts --inspect
 *
 * Connect Chrome DevTools or VS Code, then the debugger statements will pause execution.
 */

import { MCPServer, tool } from 'simply-mcp';

@MCPServer({ name: 'breakpoint-demo', version: '1.0.0' })
class BreakpointDemo {
  /**
   * Process a string with debugging checkpoints
   * @param input String to process
   */
  @tool('Process input through multiple transformation steps')
  processString(input: string): string {
    console.error('[Step 1] Input received:', input);

    // BREAKPOINT 1: Pause to inspect initial input
    debugger;

    const trimmed = input.trim();
    console.error('[Step 2] After trimming:', trimmed);

    // BREAKPOINT 2: Pause to see trimmed result
    debugger;

    const uppercase = trimmed.toUpperCase();
    console.error('[Step 3] After uppercase:', uppercase);

    // BREAKPOINT 3: Pause to see final result
    debugger;

    return uppercase;
  }

  /**
   * Demonstrate debugging in a loop
   * @param count Number of iterations
   */
  @tool('Run a loop with debugging')
  debugLoop(count: number): string {
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      console.error(`[Loop] Iteration ${i + 1}/${count}`);

      // BREAKPOINT: Pause on each iteration to inspect loop state
      // TIP: Use conditional breakpoints in DevTools: i === 2
      debugger;

      results.push(`Result ${i + 1}`);
    }

    return results.join(', ');
  }

  /**
   * Demonstrate debugging async operations
   * @param delay Milliseconds to wait
   */
  @tool('Debug async/await operations')
  async debugAsync(delay: number): Promise<string> {
    console.error('[Async] Starting async operation...');

    // BREAKPOINT 1: Before await
    debugger;

    console.error(`[Async] Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // BREAKPOINT 2: After await (inspect how long it took)
    debugger;

    console.error('[Async] Async operation completed');
    return `Completed after ${delay}ms`;
  }

  /**
   * Demonstrate debugging error paths
   * @param shouldFail Whether to trigger an error
   */
  @tool('Debug error handling')
  debugError(shouldFail: boolean): string {
    console.error('[Error] Testing error handling...');

    try {
      // BREAKPOINT 1: Before potential error
      debugger;

      if (shouldFail) {
        console.error('[Error] About to throw error');

        // BREAKPOINT 2: At error throw point
        debugger;

        throw new Error('Intentional error for debugging');
      }

      return 'Success - no error';

    } catch (error) {
      // BREAKPOINT 3: In catch block (inspect error object)
      debugger;

      console.error('[Error] Caught error:', error);
      return `Error caught: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Demonstrate debugging object inspection
   * @param name Person's name
   * @param age Person's age
   */
  @tool('Debug object manipulation')
  debugObject(name: string, age: number): string {
    console.error('[Object] Creating person object...');

    const person = {
      name,
      age,
      greeting: `Hello, I'm ${name}`,
    };

    // BREAKPOINT 1: Inspect the person object structure
    debugger;

    const enriched = {
      ...person,
      isAdult: age >= 18,
      category: age < 18 ? 'minor' : age < 65 ? 'adult' : 'senior',
    };

    // BREAKPOINT 2: Compare original and enriched objects
    debugger;

    console.error('[Object] Final object:', enriched);
    return JSON.stringify(enriched, null, 2);
  }

  /**
   * Private helper method (won't be registered as tool)
   */
  private _helperFunction(value: string): string {
    console.error('[Helper] Processing in private method:', value);

    // BREAKPOINT: Debug private method calls
    debugger;

    return value.split('').reverse().join('');
  }

  /**
   * Demonstrate debugging method calls
   * @param text Text to reverse
   */
  @tool('Debug method call chain')
  debugMethodCall(text: string): string {
    console.error('[Method] Calling helper function...');

    // BREAKPOINT 1: Before calling helper
    debugger;

    const reversed = this._helperFunction(text);

    // BREAKPOINT 2: After helper returns (inspect result)
    debugger;

    return `Original: ${text}, Reversed: ${reversed}`;
  }
}

export default BreakpointDemo;
