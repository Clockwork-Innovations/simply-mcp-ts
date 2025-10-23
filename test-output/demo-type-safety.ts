/**
 * Demo: Zero-Annotation Type Safety
 *
 * This demonstrates how the generated .d.ts file provides
 * full type safety and IDE autocomplete without any type annotations
 * in the implementation.
 */

// BEFORE: User had to write this (with annotations)
// greet: ToolHandler<GreetTool> = async (params) => { ... }

// AFTER: User can write this (NO annotations needed!)
// The .d.ts file provides the types automatically

import MinimalServerImpl from '../examples/interface-minimal.js';

// Create instance
const server = new MinimalServerImpl();

// TypeScript knows the exact parameter types from .d.ts!
async function testTypeInference() {
  // ✅ Valid call - TypeScript knows params.name is required
  const result1 = await server.greet({ name: 'Alice' });
  console.log('Result 1:', result1);

  // ✅ Valid call - formal is optional
  const result2 = await server.greet({ name: 'Bob', formal: true });
  console.log('Result 2:', result2);

  // ✅ Valid call - both numbers required
  const result3 = await server.add({ a: 5, b: 3 });
  console.log('Result 3:', result3);

  // TypeScript error examples (uncomment to see errors):

  // ❌ Error: Property 'name' is missing
  // const error1 = await server.greet({});

  // ❌ Error: Type 'number' is not assignable to type 'string'
  // const error2 = await server.greet({ name: 123 });

  // ❌ Error: Object literal may only specify known properties
  // const error3 = await server.greet({ name: 'Alice', unknownProp: true });

  // ❌ Error: Expected 2 arguments, but got 0
  // const error4 = await server.add({ a: 5 });
}

// The .d.ts file enables:
// 1. Full IntelliSense in VSCode (try typing "server." and see autocomplete)
// 2. Compile-time type checking (wrong types = compiler error)
// 3. Zero annotation overhead in implementation
// 4. Perfect developer experience

console.log('Type safety demo - check this file in VSCode for autocomplete!');
