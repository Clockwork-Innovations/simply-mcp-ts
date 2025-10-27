/**
 * Completion Handler
 *
 * Handles completion handler registration for autocomplete functionality.
 * Supports both function-based and object literal patterns.
 */

import type { ParsedCompletion } from '../server/parser.js';
import type { BuildMCPServer } from '../server/builder-server.js';

/**
 * Register completion handlers with the MCP server
 *
 * Supports two patterns:
 * 1. Function-based: Implementation is just the completion function
 * 2. Object literal: Implementation is an object with complete() method
 */
export function registerCompletions(
  server: BuildMCPServer,
  serverInstance: any,
  completions: ParsedCompletion[],
  verbose?: boolean
): void {
  for (const completion of completions) {
    registerCompletion(server, serverInstance, completion, verbose);
  }
}

/**
 * Register a single completion handler
 */
function registerCompletion(
  server: BuildMCPServer,
  serverInstance: any,
  completion: ParsedCompletion,
  verbose?: boolean
): void {
  const { name, methodName, description, refType } = completion;

  // Get the implementation from the server instance
  const implementation = serverInstance[methodName];

  if (!implementation) {
    if (verbose) {
      console.warn(`[Completion Handler] No implementation found for completion '${name}' (method: ${methodName})`);
    }
    return;
  }

  // Parse the ref type to extract type and name
  // refType format: "{ type: 'argument'; name: 'city' }" or "{ type: 'resource'; name: 'uri' }"
  const ref = parseRefType(refType);

  if (!ref) {
    if (verbose) {
      console.warn(`[Completion Handler] Invalid ref type for completion '${name}': ${refType}`);
    }
    return;
  }

  // Determine the handler function based on implementation type
  let handlerFn: (value: string, context?: any) => any | Promise<any>;

  if (typeof implementation === 'function') {
    // Function-based pattern (recommended)
    handlerFn = implementation;
  } else if (typeof implementation === 'object' && typeof implementation.complete === 'function') {
    // Object literal pattern
    handlerFn = implementation.complete.bind(implementation);
  } else {
    if (verbose) {
      console.warn(
        `[Completion Handler] Invalid implementation for completion '${name}'. ` +
        `Expected function or object with complete() method, got: ${typeof implementation}`
      );
    }
    return;
  }

  // Register the completion handler
  server.addCompletion(name, description, ref, handlerFn);

  if (verbose) {
    console.log(`[Completion Handler] Registered completion '${name}' for ${ref.type} '${ref.name}'`);
  }
}

/**
 * Parse ref type string to extract type and name
 *
 * Handles formats like:
 * - "{ type: 'argument'; name: 'city' }"
 * - "{ type: 'resource'; name: 'uri' }"
 */
function parseRefType(refType: string): { type: 'argument' | 'resource'; name: string } | null {
  try {
    // Remove whitespace and extract type and name values
    const typeMatch = refType.match(/type:\s*['"](\w+)['"]/);
    const nameMatch = refType.match(/name:\s*['"]([^'"]+)['"]/);

    if (!typeMatch || !nameMatch) {
      return null;
    }

    const type = typeMatch[1];
    const name = nameMatch[1];

    if (type !== 'argument' && type !== 'resource') {
      return null;
    }

    return { type: type as 'argument' | 'resource', name };
  } catch (error) {
    return null;
  }
}
