# Internal Method Calls & Naming Variations

## TL;DR

**The naming variation matching is ONLY a facade for MCP registration** - it doesn't modify your actual code or function names. All internal method calls use the **actual names** as written in your class.

---

## How It Works

When you define a tool/prompt method in your server class:

```typescript
export default class MyServer {
  search_pokemon: SearchTool = async (params) => {
    // Your code here
  }
}
```

**What the framework does:**

1. **Registration time:** Finds the method `search_pokemon` on your class (trying variations like `searchPokemon` if needed)
2. **MCP registration:** Registers it with MCP under the name `'search_pokemon'`
3. **Runtime:** When MCP calls the tool, it calls `serverInstance.search_pokemon(args)`

**What the framework does NOT do:**
- ❌ Doesn't rename your methods
- ❌ Doesn't modify your code
- ❌ Doesn't affect `this.method()` calls

---

## Real-World Examples

### Example 1: Helper Methods

```typescript
export default class PokemonServer {
  // Tool method (registered with MCP)
  search_pokemon: SearchTool = async (params) => {
    // INTERNAL CALL - uses actual method name
    const results = await this.fetch_from_database(params.query);
    return results;
  }

  // Helper method (not registered, just used internally)
  private async fetch_from_database(query: string) {
    // Your database logic
    return { data: [...] };
  }
}
```

✅ **Works perfectly!** The call to `this.fetch_from_database()` uses the actual method name.

---

### Example 2: Tool Calling Another Tool

```typescript
export default class PokemonServer {
  // Tool 1
  search_pokemon: SearchTool = async (params) => {
    // INTERNAL CALL to another tool - uses actual method name
    const details = await this.get_pokemon_details({ name: params.name });
    return { search: params.name, ...details };
  }

  // Tool 2 (also registered with MCP)
  get_pokemon_details: GetDetailsTool = async (params) => {
    return { name: params.name, type: 'electric' };
  }
}
```

✅ **Works perfectly!** Tools can call each other using their actual names.

---

### Example 3: Mixed Naming Conventions

```typescript
export default class MyServer {
  // Tool using snake_case
  search_pokemon: SearchTool = async (params) => {
    // INTERNAL CALL to camelCase helper - works fine!
    return await this.fetchFromDatabase(params.query);
  }

  // Helper using camelCase
  private async fetchFromDatabase(query: string) {
    return { data: [...] };
  }
}
```

✅ **Works!** You can mix conventions (though consistency is recommended for readability).

---

### Example 4: Complex Real-World Server

```typescript
export default class PokemonServer {
  private cache: Map<string, any> = new Map();
  private baseUrl = 'https://api.pokemon.com';

  // Public tool
  search_pokemon: SearchTool = async (params) => {
    // Check cache using private method
    const cached = this._checkCache(params.query);
    if (cached) return cached;

    // Perform search using private method
    const results = await this._performSearch(params.query);

    // Update cache using private method
    this._updateCache(params.query, results);

    return results;
  }

  // Public tool that can be called internally
  get_pokemon_details: GetDetailsTool = async (params) => {
    const url = this._buildUrl(`pokemon/${params.name}`);
    return await fetch(url).then(r => r.json());
  }

  // Private helper methods
  private _checkCache(key: string) {
    return this.cache.get(key);
  }

  private async _performSearch(query: string) {
    // Internally calls another public tool
    return await this.get_pokemon_details({ name: query });
  }

  private _updateCache(key: string, value: any) {
    this.cache.set(key, value);
  }

  private _buildUrl(path: string) {
    return `${this.baseUrl}/${path}`;
  }
}
```

✅ **All internal calls work perfectly!**

- ✅ Tool calls private methods: `this._checkCache()`
- ✅ Tool calls other tools: `this.get_pokemon_details()`
- ✅ Private methods call other private methods: `this._buildUrl()`
- ✅ Class properties accessed: `this.cache`, `this.baseUrl`

---

## Why This Works

The framework's naming variation logic **only affects registration**, not execution:

```
┌─────────────────────────────────────────────────────────────┐
│ Registration Time (Once)                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Framework looks for method "searchPokemon" (expected)   │
│ 2. Not found → tries variations                            │
│ 3. Finds "search_pokemon" → SUCCESS                        │
│ 4. Registers with MCP as tool "search_pokemon"             │
│ 5. Stores reference: () => instance.search_pokemon(args)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Runtime (Every call)                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. MCP calls tool "search_pokemon"                         │
│ 2. Framework executes: instance.search_pokemon(args)       │
│ 3. Your method runs with its ACTUAL name                   │
│ 4. All internal calls use ACTUAL names                     │
│    - this.fetch_from_database() ✓                          │
│    - this._privateHelper() ✓                               │
│    - this.cache.get() ✓                                    │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** The stored reference points to the **actual method** on your class instance. No renaming, no proxies, no wrappers.

---

## What About `this` Context?

All methods are called with `.call(serverInstance, args)`, so `this` always refers to your server instance:

```typescript
export default class MyServer {
  private apiKey = 'secret';

  search_pokemon: SearchTool = async (params) => {
    // 'this' refers to MyServer instance
    console.log(this.apiKey); // ✓ Works
    const result = await this.helper(); // ✓ Works
    return result;
  }

  private async helper() {
    // 'this' still refers to MyServer instance
    return { key: this.apiKey }; // ✓ Works
  }
}
```

✅ **`this` context is preserved** for all methods.

---

## Arrow Functions

Arrow functions capture lexical `this`, which also works correctly:

```typescript
export default class MyServer {
  private baseUrl = 'https://api.example.com';

  search_pokemon: SearchTool = async (params) => {
    // Arrow function captures 'this' from surrounding context
    const buildUrl = (endpoint: string) => `${this.baseUrl}/${endpoint}`;

    const url = buildUrl('pokemon'); // ✓ Works
    return { url };
  }
}
```

✅ **Arrow functions work correctly** with lexical `this`.

---

## Test Coverage

All scenarios are tested in `tests/unit/internal-method-calls.test.ts`:

✅ snake_case method calling snake_case helper
✅ camelCase method calling camelCase helper
✅ Tool calling another tool internally
✅ Mixed naming (snake_case calling camelCase)
✅ Private helper methods
✅ Arrow functions with `this` context
✅ Real-world complex server with cache, multiple tools, and private methods

**7/7 tests passing** ✓

---

## Summary

| Aspect | Behavior |
|--------|----------|
| **Method names in code** | Never changed - always use actual names |
| **Internal calls** | Use actual names: `this.method_name()` |
| **Tool-to-tool calls** | Use actual names: `this.other_tool()` |
| **Private methods** | Work normally: `this._helper()` |
| **Class properties** | Work normally: `this.cache`, `this.apiKey` |
| **`this` context** | Preserved for all methods |
| **Arrow functions** | Work with lexical `this` |
| **Naming consistency** | Your choice - framework doesn't care |

**Bottom Line:** Write your server class however you want. Use whatever naming convention you prefer. Call methods internally by their actual names. The framework just finds and registers them - it never modifies your code.
