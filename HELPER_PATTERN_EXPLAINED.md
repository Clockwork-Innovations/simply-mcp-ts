# Helper Pattern Explained: Your Little Helpers

## TL;DR: Helpers are **OPTIONAL TypeScript Type Utilities** for Better Type Inference

**Helpers are NOT required** - your code works without them! They're just TypeScript type annotations that provide better autocomplete and type safety.

---

## What ARE Helpers?

Helpers are TypeScript **type utilities** that:
1. Extract types from your interface definitions
2. Provide automatic type inference for function parameters
3. Give you better IDE autocomplete/IntelliSense

**Key Point:** Helpers are **compile-time only** - they don't exist at runtime!

```typescript
// This is just a TypeScript type alias:
export type ToolHelper<T extends { params: any; result: any }> =
  (params: InferParams<T>, context?: HandlerContext) =>
    Promise<T['result']> | T['result'];
```

It's a fancy way of saying: "Given a tool interface T, create a function type that takes the right params and returns the right result."

---

## Why Your Tests Work Without Helpers

Your tests work because **helpers are optional type annotations**. These are equivalent:

### ❌ **WITHOUT Helper** (Still works!)
```typescript
// Define the tool interface
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: { sum: number };
}

// Implementation WITHOUT helper - you have to type params manually
const add = async (params: { a: number; b: number }) => {
  //                      ^^^^^^^^^^^^^^^^^^^^^^^^
  //                      You manually type this
  return { sum: params.a + params.b };
};

// Export
export default {
  name: 'math-server',
  description: 'Math operations',
  add  // Works fine!
};
```

### ✅ **WITH Helper** (Better type safety!)
```typescript
// Same interface
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: {
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: { sum: number };
}

// Implementation WITH helper - types are inferred automatically
const add: ToolHelper<AddTool> = async (params) => {
  //                                     ^^^^^^
  //                                     TypeScript KNOWS params has { a: number; b: number }
  //                                     Without you typing it!
  return { sum: params.a + params.b };
};

// Export
export default {
  name: 'math-server',
  description: 'Math operations',
  add  // Works fine AND better type safety!
};
```

---

## What Helpers Actually Do (Under the Hood)

Let's demystify the magic:

### 1. **InferParams** - Extracts parameter types

```typescript
// Given this tool interface:
interface AddTool extends ITool {
  params: {
    a: { type: 'number'; description: 'First' };
    b: { type: 'number'; description: 'Second' };
  };
  result: { sum: number };
}

// InferParams extracts:
type ExtractedParams = InferParams<AddTool>;
// Result: { a: number; b: number }

// How? By looking at the 'type' field in each param:
// - a has type: 'number' → TypeScript type: number
// - b has type: 'number' → TypeScript type: number
```

### 2. **ToolHelper** - Creates function signature

```typescript
// ToolHelper combines everything:
type ToolHelper<AddTool> =
  (params: { a: number; b: number }, context?: HandlerContext) =>
    Promise<{ sum: number }> | { sum: number };
```

That's it! It's just TypeScript type manipulation.

---

## When to Use Helpers vs Manual Types

### ✅ Use Helpers When:

1. **You want automatic type inference**
   ```typescript
   const myTool: ToolHelper<MyTool> = async (params) => {
     // params.field autocompletes!
     // Return type is checked against MyTool['result']
   };
   ```

2. **You want TypeScript to catch mismatches**
   ```typescript
   interface AddTool extends ITool {
     result: { sum: number };
   }

   const add: ToolHelper<AddTool> = async (params) => {
     return { total: params.a + params.b };  // ❌ ERROR! Should be 'sum', not 'total'
   };
   ```

3. **You're building a library/framework**
   - Other developers benefit from type safety
   - Reduces documentation burden

### ⚠️ Skip Helpers When:

1. **Writing quick test fixtures**
   ```typescript
   // Quick and dirty - no types needed
   export default {
     name: 'test-server',
     description: 'Test',
     ping: async (params) => ({ echoed: params.message })
   };
   ```

2. **Types are simple/obvious**
   ```typescript
   // Manual typing is just as clear
   const echo = async (params: { msg: string }) => params.msg;
   ```

3. **You prefer explicit control**
   - Some developers prefer seeing types explicitly
   - That's totally fine!

---

## Real Example from Your Codebase

### Example 1: interface-type-coercion.ts (Uses Helpers)

```typescript
// Interface defines metadata
interface NumberTestTool extends ITool {
  params: { value: { type: 'number'; description: 'Test number' } };
  result: {
    received: any;
    type: string;
    isNumber: boolean;
    doubled: number;
  };
}

// Implementation with helper
const testNumber: ToolHelper<NumberTestTool> = async (params) => {
  //                                                    ^^^^^^
  //                                                    TypeScript knows:
  //                                                    params = { value: number }
  return {
    received: params.value,
    type: typeof params.value,
    isNumber: typeof params.value === 'number',
    doubled: params.value * 2
  };
};
```

**What helper provides:**
- ✅ `params.value` is typed as `number` automatically
- ✅ Return object is checked against `result` type
- ✅ IDE shows autocomplete for all fields
- ✅ TypeScript errors if you return wrong shape

### Example 2: Same Code WITHOUT Helper

```typescript
// Same interface
interface NumberTestTool extends ITool {
  params: { value: { type: 'number'; description: 'Test number' } };
  result: {
    received: any;
    type: string;
    isNumber: boolean;
    doubled: number;
  };
}

// Implementation WITHOUT helper - manual typing
const testNumber = async (params: { value: number }): Promise<{
  //                               ^^^^^^^^^^^^^^^^^
  //                               Must type manually
  received: any;
  type: string;
  isNumber: boolean;
  doubled: number;
}> => {
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Must type return manually
  return {
    received: params.value,
    type: typeof params.value,
    isNumber: typeof params.value === 'number',
    doubled: params.value * 2
  };
};
```

**Notice the difference?**
- ❌ More verbose (duplicate type definitions)
- ❌ Easy to get out of sync (change interface, forget to update function)
- ✅ Still works perfectly at runtime!

---

## The "Inconsistency" I Found

The inconsistency is **NOT about whether you USE helpers** (that's optional).

The inconsistency is about **whether helpers EXIST** for all patterns.

### Current State:

| Interface | Helper Type Exists? | Usage |
|-----------|-------------------|-------|
| ITool | ✅ `ToolHelper<T>` | Optional but available |
| IResource | ✅ `ResourceHelper<T>` | Optional but available |
| IPrompt | ✅ `PromptHelper<T>` | Optional but available |
| ICompletion | ❌ None | Must type manually |
| IRoots | ❌ None | Must type manually |

### The Issue:

```typescript
// For tools - helper exists (consistent)
interface MyTool extends ITool { ... }
const myTool: ToolHelper<MyTool> = async (params) => { ... };

// For completions - NO helper (inconsistent)
interface MyCompletion extends ICompletion { ... }
const myCompletion = async (value: string, context?: any) => { ... };
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                          No CompletionHelper to use!
```

### The Fix:

Add helper types for completions and roots so the pattern is consistent **for people who want to use them**:

```typescript
// Add these helper types:
export type CompletionHelper<T extends ICompletion> =
  (value: string, context?: any) => Promise<T['suggestions']> | T['suggestions'];

export type RootsHelper<T extends IRoots> =
  () => Promise<Array<{ uri: string; name?: string }>>;

// Now completions can optionally use helpers like tools do:
const myCompletion: CompletionHelper<MyCompletion> = async (value) => { ... };
```

---

## Summary: Helper Pattern Philosophy

### What Helpers Are:
- **Optional TypeScript type utilities**
- Provide automatic type inference
- Improve IDE experience
- Catch type errors at compile time

### What Helpers Are NOT:
- Required for functionality
- Runtime code (they disappear after compilation)
- A replacement for interfaces
- Necessary for tests to pass

### The Pattern:
```
┌─────────────────────┐
│   Interface (I*)    │  ← Defines metadata (name, params, result)
│   Metadata only     │
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Helper Type       │  ← Optional: Provides type inference
│   *Helper<T>        │     (InferParams, type checking)
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Implementation    │  ← Your actual code
│   const/function    │     (Can use helper or manual types)
└─────────────────────┘
```

### Why Tests Work Without Helpers:
Because **helpers don't do anything at runtime**! They're just TypeScript annotations. Your JavaScript code works with or without them.

```typescript
// These compile to THE SAME JavaScript:

// With helper:
const add: ToolHelper<AddTool> = async (params) => ({ sum: params.a + params.b });

// Without helper:
const add = async (params) => ({ sum: params.a + params.b });

// Both compile to:
const add = async (params) => ({ sum: params.a + params.b });
```

---

## Recommendation

**For library/framework code:** Use helpers for consistency and developer experience

**For tests/examples:** Use helpers if you want type safety, skip if you want brevity

**For the framework itself:** Provide helpers for ALL patterns (ITool, IResource, IPrompt, ICompletion, IRoots) so users have the option to use them consistently.

---

**Your little helpers are just that - helpers! They help TypeScript help you, but they're not required.**
