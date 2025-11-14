# Migration Guide: Progressive Disclosure (v4.3.x → v4.4.x)

> **Target Audience:** Developers upgrading from Simply MCP v4.3.x to v4.4.x
> **Migration Time:** 15-30 minutes for most servers
> **Difficulty:** Easy (mostly additive, one breaking change)

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [New Features](#new-features)
- [Migration Steps](#migration-steps)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Rollback Guide](#rollback-guide)

---

## Overview

Simply MCP v4.4.0 introduces **Progressive Disclosure** - a system for hiding capabilities from initial discovery while making them accessible through AI skills. This release includes:

**New Features:**
- ✅ Hidden flags for tools, resources, and prompts (Foundation Layer)
- ✅ AI Skills (ISkill) for documenting hidden capabilities (Foundation Layer)
- ✅ Dynamic hidden evaluation for context-aware hiding (Feature Layer)
- ✅ Auto-generated skill documentation (Feature Layer)
- ✅ Compile-time validation (Feature Layer)

**Breaking Changes:**
- ⚠️ List methods are now `async` (requires `await`)

**Backward Compatibility:**
- ✅ Existing servers work without changes (except async list methods)
- ✅ New features are opt-in
- ✅ No schema changes to existing interfaces

---

## Breaking Changes

### 1. List Methods are Now Async

**Why:** To support dynamic hidden evaluation (runtime context-based hiding), list methods must be async.

**Impact:** All code calling list methods must add `await`.

**Before (v4.3.x):**
```typescript
const tools = server.listTools();
const resources = server.listResources();
const prompts = server.listPrompts();
```

**After (v4.4.x):**
```typescript
const tools = await server.listTools();
const resources = await server.listResources();
const prompts = await server.listPrompts();
```

**Detection:** TypeScript will catch missing `await` at compile time:
```
Error: 'listTools()' returns a Promise. Did you forget to use 'await'?
```

**Migration:**
1. Search for `listTools`, `listResources`, `listPrompts` in your codebase
2. Add `await` before each call
3. Ensure calling function is `async` or returns a Promise

**Example Fix:**
```typescript
// Before (v4.3.x)
function getCapabilities() {
  const tools = server.listTools();
  return tools;
}

// After (v4.4.x)
async function getCapabilities() {
  const tools = await server.listTools();
  return tools;
}
```

**Note:** If you're not using list methods directly (most servers don't), you're not affected.

---

## New Features

### 1. Hidden Flag (Foundation Layer)

Add a `hidden` flag to exclude items from list responses:

```typescript
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug internal state';
  params: { component: string };
  result: { state: any };
  hidden: true;  // ← New in v4.4.0
}
```

**Use cases:**
- Debug tools (development only)
- Admin operations (privileged users)
- Internal utilities (implementation details)

**Backward compatible:** If you don't add `hidden`, items are visible by default (same as v4.3.x).

### 2. AI Skills (Foundation Layer)

Define skills to document hidden capabilities:

```typescript
interface DebugSkill extends ISkill {  // ← New interface in v4.4.0
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: {  // Auto-generated documentation
    tools: ['debug', 'trace', 'logs'];
  };
}
```

**No implementation needed!** The framework auto-generates documentation from component references.

### 3. Dynamic Hidden (Feature Layer)

Use functions for context-aware hiding:

```typescript
interface AdminTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {  // ← Function instead of boolean
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}
```

**Use cases:**
- Role-based access control
- Permission checks
- Feature flags
- Time-based availability

### 4. Compile-Time Validation (Feature Layer)

Automatic validation catches configuration issues:

```bash
npm run build

# Warning: Tool 'debug' is hidden but not referenced in any skill
# Error: Skill 'admin' references non-existent tool 'nonexistent'
```

**Validation rules:**
- Orphaned hidden items (warning)
- Invalid skill references (error)
- Non-hidden components in skills (warning)
- Empty skills (warning)

**Configurable** via `simplemcp.config.js`.

---

## Migration Steps

### Step 1: Update Dependencies

```bash
npm install simply-mcp@^4.4.0
npm install  # Update lock file
```

Verify installation:
```bash
npm list simply-mcp
# Should show: simply-mcp@4.4.0 (or higher)
```

### Step 2: Fix Async List Methods (Required)

**Search for list method calls:**
```bash
# In your project root
grep -r "listTools\|listResources\|listPrompts" src/ tests/
```

**Add `await` to each call:**
```typescript
// Before
const tools = server.listTools();

// After
const tools = await server.listTools();
```

**Make calling functions async:**
```typescript
// Before
function myFunction() {
  const tools = server.listTools();
  // ...
}

// After
async function myFunction() {
  const tools = await server.listTools();
  // ...
}
```

### Step 3: Rebuild and Test (Required)

```bash
npm run build
```

**TypeScript will catch missing `await`:**
```
src/index.ts:45:3 - error TS2741: Property 'then' is missing in type 'ToolDefinition[]' but required in type 'Promise<ToolDefinition[]>'.
```

**Fix all errors**, then rebuild:
```bash
npm run build  # Should succeed with zero errors
```

**Run your existing tests:**
```bash
npm test
```

All tests should pass. If not, check for missing `await` keywords.

### Step 4: Add Progressive Disclosure (Optional)

Now you can add progressive disclosure features without breaking existing functionality.

#### 4a. Add Hidden Flags

Identify tools/resources/prompts that should be hidden:

```typescript
// Debug tools
interface InspectTool extends ITool {
  name: 'inspect_state';
  description: 'Inspect internal state';
  params: { component?: string };
  result: { state: Record<string, any> };
  hidden: true;  // ← Add this
}

// Admin tools
interface ResetTool extends ITool {
  name: 'reset_server';
  description: 'Reset server state';
  params: { confirm: boolean };
  result: { reset: boolean };
  hidden: true;  // ← Add this
}

// Internal resources
interface InternalConfigResource extends IResource {
  uri: 'internal://config';
  name: 'Internal Configuration';
  description: 'Internal config';
  mimeType: 'application/json';
  data: { debug: boolean };
  hidden: true;  // ← Add this
}
```

**Guideline:** Hide ~70-80% of capabilities (implementation details, debug tools, admin ops), expose ~20-30% (public API).

#### 4b. Create Auto-Generated Skills

Group hidden capabilities into logical skills:

```typescript
import { ISkill } from 'simply-mcp';

// Debug skill
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: {
    tools: ['inspect_state', 'trace_request', 'dump_logs'];
    resources: ['internal://config', 'internal://metrics'];
  };
}

// Admin skill
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations';
  components: {
    tools: ['reset_server', 'configure_server'];
  };
}
```

**No implementation needed!** Just define the interfaces.

#### 4c. Export Skills (Class Pattern)

If using the class pattern, export skills as undefined properties:

```typescript
export default class Server {
  // ... existing tool implementations ...

  // Skills (no implementation needed)
  debug_toolkit = undefined as any;
  admin_panel = undefined as any;
}
```

**Or** (const pattern):
```typescript
// No export needed for auto-generated skills
```

#### 4d. Rebuild and Verify

```bash
npm run build
```

Check for validation warnings:
```
✓ Build succeeded
⚠ Warning: Tool 'some_tool' is hidden but not referenced in any skill
```

Fix warnings by adding tools to skills or removing `hidden` flag.

**Test with Claude CLI:**
```bash
# Create test config
cat > /tmp/test-config.json << 'EOF'
{
  "mcpServers": {
    "test": {
      "command": "node",
      "args": ["dist/src/cli/index.js", "run", "server.ts"]
    }
  }
}
EOF

# Test initial discovery (should be smaller)
claude --print --model haiku \
  --mcp-config /tmp/test-config.json \
  "List all tools"

# Test skill discovery
claude --print --model haiku \
  --mcp-config /tmp/test-config.json \
  "Get the debug_toolkit skill"
```

### Step 5: Optimize with Dynamic Hidden (Optional)

Upgrade static hidden to dynamic for context-aware hiding:

```typescript
import { HiddenEvaluationContext } from 'simply-mcp';

// Before (static hidden - always hidden)
interface AdminTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: true;
}

// After (dynamic hidden - context-aware)
interface AdminTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}
```

**Note:** This requires passing context metadata through the MCP protocol (HTTP transport recommended for now).

---

## Common Patterns

### Pattern 1: Public API + Hidden Debug Tools

**Scenario:** Expose 3 public tools, hide 10 debug tools.

```typescript
// Public tools (visible to everyone)
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search data';
  params: { query: string };
  result: { results: string[] };
  // No hidden flag = visible
}

interface CalculateTool extends ITool {
  name: 'calculate';
  description: 'Calculate expression';
  params: { expression: string };
  result: { value: number };
}

interface InfoTool extends ITool {
  name: 'info';
  description: 'Get server info';
  params: {};
  result: { version: string };
}

// Debug tools (hidden from initial discovery)
interface InspectTool extends ITool {
  name: 'inspect';
  description: 'Inspect internal state';
  params: { component?: string };
  result: { state: any };
  hidden: true;
}

interface TraceTool extends ITool {
  name: 'trace';
  description: 'Trace execution';
  params: { request_id: string };
  result: { trace: string[] };
  hidden: true;
}

// ... 8 more debug tools ...

// Skill for debug tools
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug tools (development only)';
  components: {
    tools: ['inspect', 'trace', /* ... 8 more ... */];
  };
}
```

**Result:**
- Initial discovery: 3 tools (300 tokens)
- With skill: 3 tools + skill docs (1200 tokens)
- **Token reduction: 75%** vs exposing all 13 tools

### Pattern 2: Role-Based Tool Access

**Scenario:** Admin tools visible only to admins.

```typescript
import { HiddenEvaluationContext } from 'simply-mcp';

// Public tool (visible to everyone)
interface QueryTool extends ITool {
  name: 'query_database';
  description: 'Query the database';
  params: { sql: string };
  result: { rows: any[] };
}

// Admin tools (context-aware)
interface DeleteTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

interface ResetTool extends ITool {
  name: 'reset_database';
  description: 'Reset database';
  params: { confirm: boolean };
  result: { reset: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

// Skill for admin tools
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Admin operations (requires admin role)';
  components: {
    tools: ['delete_user', 'reset_database'];
  };
}
```

**Result:**
- Anonymous user: Sees only `query_database`
- Admin user: Sees `query_database`, `delete_user`, `reset_database`
- **Context-aware disclosure**

### Pattern 3: Feature Flag Gating

**Scenario:** Beta features hidden behind feature flags.

```typescript
import { HiddenEvaluationContext } from 'simply-mcp';

// Stable tools (visible to everyone)
interface SearchTool extends ITool {
  name: 'search_v1';
  description: 'Search (stable)';
  params: { query: string };
  result: { results: string[] };
}

// Beta tools (feature flag gated)
interface SearchV2Tool extends ITool {
  name: 'search_v2';
  description: 'Search v2 (beta)';
  params: { query: string; filters?: any };
  result: { results: any[] };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = ctx?.metadata?.feature_flags as string[] | undefined;
    return !flags?.includes('search_v2');
  };
}

interface AISearchTool extends ITool {
  name: 'ai_search';
  description: 'AI-powered search (experimental)';
  params: { query: string };
  result: { results: any[] };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = ctx?.metadata?.feature_flags as string[] | undefined;
    return !flags?.includes('ai_search');
  };
}

// Skill for beta features
interface BetaSkill extends ISkill {
  name: 'beta_features';
  description: 'Beta features (requires feature flags)';
  components: {
    tools: ['search_v2', 'ai_search'];
  };
}
```

**Result:**
- Default: Sees only `search_v1`
- With `search_v2` flag: Sees `search_v1`, `search_v2`
- With `ai_search` flag: Sees `search_v1`, `ai_search`
- **Feature flag driven disclosure**

---

## Troubleshooting

### Issue 1: TypeScript Error - Missing `await`

**Error:**
```
error TS2741: Property 'then' is missing in type 'ToolDefinition[]'
```

**Cause:** Forgot to `await` a list method call.

**Fix:**
```typescript
// Before
const tools = server.listTools();

// After
const tools = await server.listTools();
```

### Issue 2: Validation Warning - Orphaned Hidden Item

**Warning:**
```
⚠ Warning: Tool 'debug' is hidden but not referenced in any skill
```

**Cause:** Tool has `hidden: true` but no skill references it.

**Fix Option 1:** Add to a skill:
```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug tools';
  components: { tools: ['debug'] };  // ← Add reference
}
```

**Fix Option 2:** Remove hidden flag:
```typescript
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug tool';
  params: {};
  result: {};
  // Remove: hidden: true;
}
```

**Fix Option 3:** Suppress warning:
```javascript
// simplemcp.config.js
export default {
  skillValidation: {
    rules: {
      orphanedHidden: 'off'  // Disable warning
    }
  }
};
```

### Issue 3: Validation Error - Invalid Reference

**Error:**
```
✖ Error: Skill 'admin' references non-existent tool 'nonexistent'
```

**Cause:** Skill references a tool that doesn't exist.

**Fix Option 1:** Remove invalid reference:
```typescript
interface AdminSkill extends ISkill {
  name: 'admin';
  description: 'Admin tools';
  components: {
    tools: ['reset', 'shutdown']  // Remove 'nonexistent'
  };
}
```

**Fix Option 2:** Add missing tool:
```typescript
interface NonexistentTool extends ITool {
  name: 'nonexistent';
  description: 'Previously missing tool';
  params: {};
  result: {};
  hidden: true;
}

export default class Server {
  nonexistent: ToolHelper<NonexistentTool> = async () => {
    return {};
  };
}
```

### Issue 4: Dynamic Hidden Not Working

**Symptom:** Dynamic hidden function always hides/shows item, regardless of context.

**Cause:** Context metadata not passed through MCP protocol.

**Fix:** Ensure context is passed via protocol:
```typescript
// HTTP transport example
app.post('/mcp', async (req, res) => {
  const context = {
    metadata: {
      user: req.session.user,  // Pass user from session
      feature_flags: req.session.feature_flags
    }
  };

  // Pass context to list methods
  const tools = await server.listTools(context);
  res.json({ tools });
});
```

**Note:** The Simply-MCP CLI doesn't support passing context yet (future enhancement). Use HTTP transport for dynamic hidden.

### Issue 5: Skills Not Appearing in `resources/list` (skill://)

**Symptom:** Defined skills don't appear in `resources/list` response when filtering by `skill://` URIs.

**Cause 1:** Skills not exported (class pattern).

**Fix:**
```typescript
export default class Server {
  // Skills must be exported as properties
  debug_toolkit = undefined as any;
  admin_panel = undefined as any;
}
```

**Cause 2:** Interface not extending `ISkill`.

**Fix:**
```typescript
// Before
interface DebugSkill {  // ← Missing extends ISkill
  name: 'debug';
  description: 'Debug tools';
  components: { tools: ['debug'] };
}

// After
interface DebugSkill extends ISkill {  // ← Add extends ISkill
  name: 'debug';
  description: 'Debug tools';
  components: { tools: ['debug'] };
}
```

**Access via resources API:**
```typescript
// List all visible skills (filter for skill://)
const allResources = await server.listResources();
const skills = allResources.filter(r => r.uri.startsWith('skill://'));

// Read specific skill documentation
const skillDoc = await server.readResource('skill://debug_toolkit');
```

---

## Rollback Guide

If you need to rollback to v4.3.x:

### Step 1: Downgrade Package

```bash
npm install simply-mcp@^4.3.0
npm install  # Update lock file
```

### Step 2: Remove Progressive Disclosure Features

Remove from interfaces:
- `hidden` flags
- `ISkill` interfaces
- Skill exports

### Step 3: Revert Async Changes

```typescript
// Remove await keywords
const tools = server.listTools();  // Before v4.4
```

### Step 4: Rebuild and Test

```bash
npm run build
npm test
```

**Note:** You'll lose token reduction benefits, but functionality remains the same.

---

## Additional Resources

- [Progressive Disclosure Guide](./progressive-disclosure.md) - Complete feature documentation
- [ISkill API Reference](../api/iskill-reference.md) - Interface reference
- [Examples](../../examples/) - Real-world examples
- [CHANGELOG](../../CHANGELOG.md) - Full release notes

---

## Support

**Found an issue?** [Report it on GitHub](https://github.com/simply-mcp/simply-mcp-ts/issues)

**Need help?** Check the [Troubleshooting](#troubleshooting) section above.

---

**Version:** 4.4.0
**Last Updated:** 2025-11-12
