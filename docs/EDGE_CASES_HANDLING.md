# Edge Cases Handling in simply-mcp-ts

This document describes how the framework handles various edge cases with name overlaps, URI collisions, and ambiguous configurations.

## Table of Contents
1. [Method Name Collisions](#method-name-collisions)
2. [URI Template Overlaps](#uri-template-overlaps)
3. [Resource Registration Order](#resource-registration-order)
4. [Best Practices](#best-practices)

---

## Method Name Collisions

### ✅ **Handled: Ambiguous Method Names are Detected**

**Problem:** Developer defines both `searchPokemon` and `search_pokemon` methods.

**Behavior:** Framework **throws an error** immediately during registration.

```typescript
// ❌ This will ERROR
export default class MyServer {
  searchPokemon: SearchTool = async (params) => { ... }  // camelCase
  search_pokemon: SearchTool = async (params) => { ... } // snake_case
}
```

**Error Message:**
```
❌ Tool "search_pokemon" has ambiguous method names - multiple naming variations exist:
  - searchPokemon
  - search_pokemon

This is ambiguous. Please keep only ONE of these methods.
Recommended: Use camelCase "searchPokemon" and remove the others.

Why this matters: Having multiple naming variations causes confusion about which
method will be called and makes the codebase harder to maintain.
```

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:75-103`

---

### ✅ **Handled: Both Naming Conventions are Valid**

**Scenario 1: camelCase**
```typescript
export default class MyServer {
  searchPokemon: SearchTool = async (params) => { ... }  // ✅ Works
}
```

**Scenario 2: snake_case**
```typescript
export default class MyServer {
  search_pokemon: SearchTool = async (params) => { ... }  // ✅ Works (no warnings)
}
```

**No Enforcement:** Since tool/prompt names are stored as snake_case in the MCP protocol anyway (e.g., `'search_pokemon'`), both naming conventions are equally valid. The framework doesn't enforce or prefer one over the other.

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:105-130`

---

## URI Template Overlaps

### ⚠️ **Known Limitation: Ambiguous Templates - First Wins**

**Problem:** Two templates with identical structure but different parameter names.

```typescript
// ❌ AMBIGUOUS - both templates match "data://test"
server.addResource({
  uri: 'data://{type}',      // Could extract { type: "test" }
  name: 'Data by Type',
  content: 'single param'
});

server.addResource({
  uri: 'data://{category}',  // Could extract { category: "test" }
  name: 'Data by Category',
  content: 'different param name'
});

// Request: data://test
// Result: Depends on Map iteration order (first registered wins)
```

**Behavior:** First matching template wins (depends on registration order).

**Recommendation:** Avoid registering multiple templates with the same structure. Use distinct URI schemes or path segments:

```typescript
// ✅ BETTER
server.addResource({ uri: 'data://type/{name}', ... });
server.addResource({ uri: 'data://category/{name}', ... });
```

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:31-48`

---

### ✅ **Handled: Exact Match Takes Priority**

**Behavior:** Exact URI matches always take precedence over template matches, regardless of registration order.

```typescript
// Register template FIRST, then exact
server.addResource({ uri: 'pokemon://{name}', content: 'template' });
server.addResource({ uri: 'pokemon://pikachu', content: 'exact' });

// Request: pokemon://pikachu
// Result: 'exact' (not 'template')

// Request: pokemon://charizard
// Result: 'template' with { name: 'charizard' }
```

**Why this matters:** Developers can override templates with specific exact URIs for special cases.

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:130-147`

---

### ✅ **Handled: Specific vs Generic Templates**

**Problem:** Multiple templates could match the same URI.

```typescript
server.addResource({ uri: 'api://{version}/users', ... });      // More specific
server.addResource({ uri: 'api://{version}/{endpoint}', ... }); // More generic

// Request: api://v1/users
```

**Behavior:** First matching template wins (in registration order).

**Current Matching Logic:**
1. Try exact match first
2. Iterate through templates in registration order
3. Return first match found

**Best Practice:** Register more specific templates before generic ones:

```typescript
// ✅ RECOMMENDED ORDER
server.addResource({ uri: 'api://v1/users', ... });           // Exact (highest priority)
server.addResource({ uri: 'api://{version}/users', ... });    // Specific template
server.addResource({ uri: 'api://{version}/{endpoint}', ... }); // Generic template
```

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:50-66`

---

## Resource Registration Order

### ✅ **Handled: Deterministic Exact Match Behavior**

**Guarantee:** Exact matches always win, regardless of when they're registered.

```typescript
// Order 1: Template first
resources.set('pokemon://{name}', templateResource);
resources.set('pokemon://pikachu', exactResource);
matchResourceUri('pokemon://pikachu', resources);
// => Returns exactResource

// Order 2: Exact first
resources.set('pokemon://pikachu', exactResource);
resources.set('pokemon://{name}', templateResource);
matchResourceUri('pokemon://pikachu', resources);
// => Returns exactResource (same result)
```

**Implementation:** `matchResourceUri()` tries exact match before iterating templates.

**Test Coverage:** `tests/unit/edge-case-overlaps.test.ts:130-147`

---

## Best Practices

### ✅ **Naming Conventions**

**Both conventions are valid:**
```typescript
// Option 1: camelCase
export default class MyServer {
  searchPokemon: SearchTool = async (params) => { ... }
  getPokemonDetails: GetDetailsTool = async (params) => { ... }
}

// Option 2: snake_case
export default class MyServer {
  search_pokemon: SearchTool = async (params) => { ... }
  get_pokemon_details: GetDetailsTool = async (params) => { ... }
}

// Option 3: Mix (if desired - though consistency is recommended)
export default class MyServer {
  searchPokemon: SearchTool = async (params) => { ... }
  get_pokemon_details: GetDetailsTool = async (params) => { ... }
}
```

**DON'T:**
```typescript
// ❌ NEVER define both variations for the SAME tool/prompt
export default class MyServer {
  searchPokemon: SearchTool = async (params) => { ... }
  search_pokemon: SearchTool = async (params) => { ... } // ERROR! Ambiguous
}
```

---

### ✅ **URI Template Design**

**DO:**
```typescript
// Use distinct schemes or paths
server.addResource({ uri: 'pokemon://species/{name}', ... });
server.addResource({ uri: 'pokemon://trainer/{id}', ... });
server.addResource({ uri: 'api://v1/{endpoint}', ... });

// Register exact URIs for special cases
server.addResource({ uri: 'pokemon://species/pikachu', ... }); // Override template
```

**DON'T:**
```typescript
// ❌ Don't register identical template structures
server.addResource({ uri: 'data://{type}', ... });
server.addResource({ uri: 'data://{category}', ... });  // AMBIGUOUS!

// ❌ Don't rely on registration order for templates
// (Use distinct paths instead)
```

---

### ✅ **Error Handling**

The framework provides **clear, actionable error messages**:

**Ambiguous Method Names:**
```
❌ Tool "search_pokemon" has ambiguous method names - multiple naming variations exist:
  - searchPokemon
  - search_pokemon

This is ambiguous. Please keep only ONE of these methods.
Recommended: Use camelCase "searchPokemon" and remove the others.
```

**Missing Methods:**
```
❌ Tool "search_pokemon" requires method "searchPokemon" but it was not found on server class.

🔤 Tried these naming variations automatically:
  - searchPokemon
  - search_pokemon
  - SearchPokemon

📋 Available methods on your class:
  - getPokemonDetails
  - listPokemon
```

**Unknown Resources:**
```
Unknown resource: pokemon://unknown

Available resources: pokemon://pikachu, pokemon://{name}
```

---

## Summary

| Edge Case | Behavior | Status |
|-----------|----------|--------|
| Both `methodName` and `method_name` exist | ❌ ERROR (ambiguous) | ✅ Detected |
| Only `method_name` exists | ✅ WORKS (no warnings) | ✅ Handled |
| Only `methodName` exists | ✅ WORKS (no warnings) | ✅ Handled |
| Exact URI + Template URI | ✅ Exact wins | ✅ Handled |
| Multiple identical templates | ⚠️ First wins | ⚠️ Limitation |
| Specific vs generic templates | First match wins | ⚠️ Order-dependent |

---

## Test Coverage

All edge cases are covered by comprehensive tests:

- **URI Template Matching:** `tests/unit/uri-template-matcher.test.ts` (18 tests)
- **Prompt Naming Variations:** `tests/unit/prompt-naming-variations.test.ts` (8 tests)
- **Edge Case Overlaps:** `tests/unit/edge-case-overlaps.test.ts` (6 tests)

**Total: 32 passing tests** validating edge case handling.
