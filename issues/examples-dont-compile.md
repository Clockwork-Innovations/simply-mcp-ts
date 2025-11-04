# Issue: Official Examples Don't Type-Check

**Severity**: CRITICAL  
**Category**: Examples / TypeScript  
**Discovered**: 2025-10-31  
**Affects**: v4.0.0 examples  
**Impact**: New users cannot validate their code with TypeScript

---

## Summary

The official `interface-minimal.ts` example does not pass TypeScript type checking (`tsc --noEmit`), producing multiple type errors. This creates a critical problem for users trying to learn the framework.

---

## Reproduction

```bash
cd /mnt/Shared/cs-projects/simply-mcp-ts
npx tsc examples/interface-minimal.ts --noEmit
```

**Errors**:
```
examples/interface-minimal.ts(136,22): error TS2420: Class 'MinimalServerImpl' incorrectly implements interface 'MinimalServer'.
  Type 'MinimalServerImpl' is missing the following properties from type 'MinimalServer': name, description, version

examples/interface-minimal.ts(148,3): error TS2739: Type '(params: any) => Promise<string>' is missing the following properties from type 'GreetTool': description, params, result

examples/interface-minimal.ts(164,3): error TS2739: Type '(params: any) => Promise<{ sum: any; equation: string; }>' is missing the following properties from type 'AddTool': description, params, result

examples/interface-minimal.ts(182,3): error TS2739: Type '(params: any) => Promise<any>' is missing the following properties from type 'EchoTool': description, params, result
```

---

## The Problem

### Issue 1: Server Interface Implementation

The framework expects:
```typescript
interface MinimalServer extends IServer {
  name: 'interface-minimal';
  description: 'Minimal interface-driven MCP server...';
  version: '1.0.0';
}

export default class MinimalServerImpl implements MinimalServer {
  //  TS Error: missing name, description, version properties
}
```

TypeScript complains that the class doesn't have `name`, `description`, and `version` properties.

### Issue 2: Tool Type Mismatch

The framework expects:
```typescript
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: { name: string; formal?: boolean };
  result: string;
}

greet: GreetTool = async (params) => {
  // TS Error: Type '(params: any) => Promise<string>' is missing 
  // properties: description, params, result
  return `Hello, ${params.name}!`;
};
```

TypeScript expects the implementation to include metadata fields (description, params, result), but the implementation is just a function.

---

## User Impact

**Critical workflow broken**:
1. User reads Quick Start
2. User copies interface-minimal.ts example
3. User runs `tsc` to validate code
4. **FAILS** with type errors
5. User is confused - "Is the example wrong? Is my setup wrong?"

**Expected vs Reality**:
- **Expected**: Official examples compile cleanly and serve as reference implementations
- **Reality**: Examples produce type errors, creating doubt and confusion

---

## Root Cause Analysis

The TypeScript interface system and the framework's runtime behavior appear to be intentionally decoupled:

1. **Interfaces** define metadata (description, params, result) for the CLI parser
2. **Implementation** is just callable functions
3. **TypeScript** sees a type mismatch because the function signature doesn't match the interface shape

**This is actually correct behavior for the framework**, but it creates TypeScript errors.

---

## Possible Solutions

### Option 1: Use TypeScript Declaration Merging

```typescript
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: { name: string; formal?: boolean };
  result: string;
}

// Separate the callable signature
type GreetToolImpl = (params: { name: string; formal?: boolean }) => Promise<string>;

// Implementation
greet: GreetToolImpl = async (params) => {
  return `Hello, ${params.name}!`;
};
```

### Option 2: Adjust tsconfig.json

Add to project `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noImplicitAny": false
  }
}
```

**Problem**: This weakens type safety globally, not ideal.

### Option 3: Document the Type Errors

Add to Quick Start and examples:

```markdown
## TypeScript Type Checking

**Note**: The Interface API uses TypeScript interfaces for metadata extraction, which may produce type checking warnings. This is expected behavior:

- ✅ **Runtime**: Code works correctly
- ⚠️ **Type checking**: May show interface mismatch errors

These errors don't affect functionality. The CLI parser reads interface definitions directly from the AST, while implementations are standard TypeScript functions.

To suppress these warnings, add to your `tsconfig.json`:
\`\`\`json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
\`\`\`
```

### Option 4: Create Type-Safe Wrappers (Framework Change)

Provide utility types that separate metadata from implementation:

```typescript
import { defineTool } from 'simply-mcp';

const greet = defineTool({
  name: 'greet',
  description: 'Greet a person',
  params: { name: String, formal: Boolean },
  result: String
}, async (params) => {
  // Fully type-safe implementation
  return `Hello, ${params.name}!`;
});
```

---

## Recommended Immediate Fix

**Short term** (Quick win):
1. Add note to Quick Start explaining type errors are expected
2. Provide recommended `tsconfig.json` settings
3. Add FAQ: "Why do examples show type errors?"

**Medium term** (Better DX):
1. Create utility functions like `defineTool`, `definePrompt`, etc.
2. Update all examples to use utilities
3. Provide migration guide from interface pattern

**Long term** (Ideal):
1. Redesign Interface API to be fully type-safe
2. Use TypeScript transformers or macros to extract metadata
3. Achieve zero type errors in examples

---

## Priority

**CRITICAL** - This affects every new user's first experience with the framework. Type errors in the getting-started example create immediate doubt and friction.

**Estimated Fix Time**: 
- Documentation fix: 30 minutes
- Utility function approach: 4-6 hours
- Full type-safe redesign: 40+ hours

---

## Related Issues

- `/issues/iparam-inline-types-contradiction.md` - Another TypeScript pattern confusion

