# Progressive Disclosure with AI Skills

> **Feature Status:** Stable (v4.4.0+)
> **Layer:** Foundation + Feature
> **Breaking Changes:** List methods now async (requires `await`)

## Table of Contents

- [Overview](#overview)
- [Why Progressive Disclosure?](#why-progressive-disclosure)
- [Quick Start](#quick-start)
- [Foundation Layer: Static Hidden](#foundation-layer-static-hidden)
- [Feature Layer: Dynamic Hidden](#feature-layer-dynamic-hidden)
- [AI Skills (ISkill)](#ai-skills-iskill)
- [Auto-Generation](#auto-generation)
- [Compile-Time Validation](#compile-time-validation)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

---

## Overview

Progressive disclosure allows you to hide MCP capabilities (tools, resources, prompts) from initial discovery while making them accessible through AI skills. This dramatically reduces token usage in the discovery phase while preserving full functionality.

**Key Benefits:**
- **60-67% token reduction** in initial discovery
- **Context-aware hiding** based on user roles, permissions, or feature flags
- **Auto-generated documentation** for hidden capabilities
- **Compile-time validation** catches configuration issues early
- **100% backward compatible** (except async list methods)

**Three Layers:**
1. **Foundation Layer (FL)**: Static hidden flags and basic skills
2. **Feature Layer (FT)**: Dynamic evaluation, auto-generation, validation
3. **Polish Layer (PL)**: Advanced features and optimizations

---

## Why Progressive Disclosure?

### The Problem

Traditional MCP servers expose all capabilities in `tools/list`, `resources/list`, and `prompts/list` responses. For large servers with 50+ tools, this creates:
- **Token bloat**: Thousands of tokens just listing capabilities
- **Context pollution**: AI must process irrelevant tools
- **Slow discovery**: Large responses impact latency
- **Security concerns**: All capabilities exposed upfront

### The Solution

Progressive disclosure hides capabilities from initial discovery but makes them accessible through **AI Skills**:

```typescript
// Before: All 50 tools visible in tools/list
[tool1, tool2, tool3, ..., tool50]  // 5000+ tokens

// After: Only public API visible initially
[search, calculate, info]  // 300 tokens

// Hidden capabilities discovered via skills
AI: "Get the debug_toolkit skill"
Server: Returns documentation for 10 hidden debug tools
```

**Token Reduction:**
- Initial discovery: 5000 tokens → 300 tokens (94% reduction)
- With skill discovery: 5000 tokens → 1700 tokens (66% reduction)
- **Overall: 60-67% reduction** while maintaining full functionality

---

## Quick Start

### 1. Installation

Progressive disclosure is built into Simply MCP v4.4.0+:

```bash
npm install simply-mcp@latest
```

### 2. Basic Example

```typescript
// server.ts
import { ITool, ISkill, ToolHelper, HiddenEvaluationContext } from 'simply-mcp';

// ===== PUBLIC TOOL (Visible to everyone) =====
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public data';
  params: { query: string };
  result: { results: string[] };
  // No hidden flag = visible by default
}

// ===== STATIC HIDDEN TOOL (Always hidden) =====
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug internal state';
  params: { component: string };
  result: { state: any };
  hidden: true;  // FL-1: Static hidden flag
}

// ===== DYNAMIC HIDDEN TOOL (Context-aware) =====
interface AdminTool extends ITool {
  name: 'reset';
  description: 'Reset server state';
  params: { confirm: boolean };
  result: { success: boolean };
  // FT-1: Dynamic hidden - only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}

// ===== AUTO-GENERATED SKILL =====
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug operations';
  // FT-2: Auto-generate documentation from components
  components: {
    tools: ['debug'];
  };
}

// ===== IMPLEMENTATIONS =====
export default class Server {
  search: ToolHelper<SearchTool> = async ({ query }) => {
    return { results: [`Result for "${query}"`] };
  };

  debug: ToolHelper<DebugTool> = async ({ component }) => {
    return { state: { [component]: 'debug data' } };
  };

  reset: ToolHelper<AdminTool> = async ({ confirm }) => {
    if (confirm) {
      // Reset logic
      return { success: true };
    }
    return { success: false };
  };
}
```

### 3. Discovery Flow

```bash
# 1. Initial discovery (anonymous user)
claude --print --model haiku \
  --mcp-config config.json \
  "List all tools"
# Returns: [search]  ← Only public tool visible

# 2. Discover hidden capabilities via skills
claude --print --model haiku \
  --mcp-config config.json \
  "Get the debug_toolkit skill"
# Returns: Auto-generated documentation for debug tool

# 3. Call hidden tool (if accessible)
claude --print --model haiku \
  --mcp-config config.json \
  "Call the debug tool with component 'cache'"
# Returns: { state: { cache: 'debug data' } }
```

**Note:** Dynamic hidden tools (like `reset`) require passing context metadata through the MCP protocol. See [Dynamic Hidden](#feature-layer-dynamic-hidden) for details.

---

## Foundation Layer: Static Hidden

### FL-1: Hidden Flag Infrastructure

Add a `hidden` flag to any tool, resource, or prompt to exclude it from list responses:

```typescript
interface InternalTool extends ITool {
  name: 'internal_operation';
  description: 'Internal operation (not for public use)';
  params: { data: string };
  result: { processed: boolean };
  hidden: true;  // Excluded from tools/list
}

interface InternalResource extends IResource {
  uri: 'internal://config';
  name: 'Internal Config';
  description: 'Internal configuration';
  mimeType: 'application/json';
  data: { secret: string };
  hidden: true;  // Excluded from resources/list
}

interface InternalPrompt extends IPrompt {
  name: 'internal_prompt';
  description: 'Internal prompt template';
  args: { context: string };
  result: string;
  hidden: true;  // Excluded from prompts/list
}
```

**How it works:**
- Tools with `hidden: true` are excluded from `tools/list`
- Resources with `hidden: true` are excluded from `resources/list`
- Prompts with `hidden: true` are excluded from `prompts/list`
- Hidden items are **still callable** via direct invocation (`tools/call`, `resources/read`, `prompts/get`)

**Use cases:**
- Debug tools (only for development)
- Admin operations (only for privileged users)
- Internal utilities (implementation details)
- Experimental features (not ready for production)

### FL-2: Basic Skills (Manual)

Create skills with **manual documentation** to describe hidden capabilities:

```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  returns: string;  // Manual markdown documentation
}

export default class Server {
  debug_toolkit: SkillHelper<DebugSkill> = async () => {
    return `
# Debug Toolkit

Internal debugging and diagnostic tools.

## Tools

### \`inspect_state\`
Inspect internal server state.

**Parameters:**
- \`component\` (string, optional): Component to inspect

**Returns:** \`{ state: Record<string, any> }\`

### \`trace_request\`
Trace request execution.

**Parameters:**
- \`request_id\` (string): Request ID to trace

**Returns:** \`{ trace: string[] }\`

## Resources

### \`internal://config\`
Internal configuration settings.

**MIME type:** \`application/json\`
    `.trim();
  };
}
```

**Benefits:**
- Full control over documentation format
- Can include examples, warnings, and context
- Works with any MCP client

**Drawbacks:**
- Manual maintenance (docs can become stale)
- Verbose (requires writing markdown by hand)
- No compile-time validation of references

---

## Feature Layer: Dynamic Hidden

### FT-1: Runtime Dynamic Hidden Evaluation

Use **functions** instead of booleans for context-aware hiding:

```typescript
import { HiddenEvaluationContext } from 'simply-mcp';

interface AdminTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user account';
  params: { user_id: string };
  result: { deleted: boolean };
  // Dynamic hidden: function instead of boolean
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}
```

**HiddenEvaluationContext:**
```typescript
interface HiddenEvaluationContext {
  metadata?: Record<string, unknown>;  // Custom metadata
}
```

**How it works:**
1. When a list method is called, the server receives optional context metadata
2. For each item with a dynamic `hidden` function:
   - The function is evaluated with the context
   - If it returns `true`, the item is excluded
   - If it returns `false`, the item is included
3. The filtered list is returned to the client

**Performance:**
- Overhead: ~5ms per list call (well under 10ms target)
- Timeout protection: 100ms per function (prevents infinite loops)
- No caching (simple implementation)

**Common Patterns:**

**Role-based hiding:**
```typescript
hidden: (ctx) => {
  const user = ctx?.metadata?.user as { role?: string } | undefined;
  return user?.role !== 'admin';
}
```

**Permission-based hiding:**
```typescript
hidden: (ctx) => {
  const perms = ctx?.metadata?.permissions as string[] | undefined;
  return !perms?.includes('debug:read');
}
```

**Feature flag hiding:**
```typescript
hidden: (ctx) => {
  const flags = ctx?.metadata?.feature_flags as string[] | undefined;
  return !flags?.includes('experimental_feature');
}
```

**Time-based hiding:**
```typescript
hidden: (ctx) => {
  const hour = new Date().getHours();
  return hour < 9 || hour > 17;  // Hide outside business hours
}
```

**Breaking Change:** List methods are now `async` to support dynamic evaluation:

```typescript
// Before (v4.3.x)
const tools = server.listTools();

// After (v4.4.x)
const tools = await server.listTools();
```

TypeScript will catch missing `await` keywords at compile time.

---

## AI Skills (ISkill)

### What is an AI Skill?

An **AI skill** is a meta-capability that provides documentation about hidden tools, resources, and prompts. Instead of listing all capabilities upfront, the AI can discover capabilities on-demand by requesting skills.

**Think of skills as:**
- **API documentation** for hidden capabilities
- **User manuals** that explain how to use tools
- **Discovery mechanism** for progressive disclosure

### Manual Skills

Create skills with handcrafted documentation:

```typescript
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations manual';
  returns: string;  // Markdown documentation
}

export default class Server {
  database: SkillHelper<DatabaseSkill> = async () => {
    return `
# Database Operations

Tools for interacting with the database.

## Tools

### \`query\`
Execute a SQL query.

**Parameters:**
- \`sql\` (string): SQL query to execute

**Returns:** \`{ rows: any[] }\`

**Example:**
\`\`\`
Call query({ sql: "SELECT * FROM users" })
\`\`\`
    `.trim();
  };
}
```

**Pros:**
- Full control over content and format
- Can include rich context, examples, and warnings

**Cons:**
- Manual maintenance required
- Can become stale if tools change

### Auto-Generated Skills (Recommended)

Use the `components` field to automatically generate documentation:

```typescript
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  // FT-2: Auto-generate from components
  components: {
    tools: ['query', 'migrate', 'backup'];
    resources: ['db://schema', 'db://stats'];
    prompts: ['sql_helper'];
  };
}

// No implementation needed! Documentation is generated automatically.
```

**How it works:**
1. The server reads the `components` field
2. For each referenced tool/resource/prompt:
   - Extracts name, description, and parameter schema
   - Formats as markdown
3. Returns generated documentation via `resources/read` with `skill://` URI

**Generated Output Example:**
```markdown
# database

Database operations

## Tools

### `query`
Execute a SQL query.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "sql": {
      "type": "string",
      "description": "SQL query to execute"
    }
  },
  "required": ["sql"]
}
```

## Resources

### `db://schema`
**Name:** Database Schema
**Description:** Current database schema
**MIME Type:** application/json

### `db://stats`
**Name:** Database Statistics
**Description:** Database performance stats
**MIME Type:** application/json

## Prompts

### `sql_helper`
SQL query generation helper.

**Arguments:**
- `table` (string, optional): Table name
```

**Pros:**
- Zero maintenance (docs auto-update when tools change)
- Compile-time validation (catches invalid references)
- Consistent formatting

**Cons:**
- Less control over format (standardized output)
- No custom examples or warnings (just schema)

**Best Practice:** Use auto-generated skills for 80% of cases, manual skills for critical documentation that needs custom content.

### Mutual Exclusivity

Skills must use **either** `returns` (manual) **or** `components` (auto-gen), not both:

```typescript
// ✅ Valid: Manual skill
interface Skill1 extends ISkill {
  name: 'manual';
  description: 'Manual docs';
  returns: string;
}

// ✅ Valid: Auto-generated skill
interface Skill2 extends ISkill {
  name: 'auto';
  description: 'Auto-generated docs';
  components: { tools: ['foo'] };
}

// ❌ Invalid: Both returns and components
interface Skill3 extends ISkill {
  name: 'invalid';
  description: 'Invalid';
  returns: string;
  components: { tools: ['foo'] };
}
```

The compiler will detect this and emit an error:
```
Error: Skill 'invalid' must specify either 'returns' (manual) or 'components' (auto-generated), not both.
```

---

## Auto-Generation

### FT-2: Auto-Generation System

Auto-generation creates skill documentation from component references:

```typescript
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations';
  components: {
    tools: ['reset_server', 'configure_server', 'shutdown_server'];
    resources: ['internal://config'];
    prompts: ['admin_help'];
  };
}

// No implementation needed! Generated automatically at runtime.
```

**Generation Process:**
1. **Parse components**: Extract tool, resource, and prompt names
2. **Resolve references**: Look up definitions from registered capabilities
3. **Extract metadata**: Get name, description, schemas from interfaces
4. **Format markdown**: Generate structured documentation
5. **Return result**: Send to client via `resources/read` with `skill://` URI

**Performance:**
- Generation time: **< 1ms** (sub-millisecond)
- No pre-compilation required
- Generated on-demand (no caching yet)

**Generated Format:**

```markdown
# {skill_name}

{skill_description}

## Tools

### `{tool_name}`
{tool_description}

**Input Schema:**
```json
{json_schema}
```

## Resources

### `{resource_uri}`
**Name:** {resource_name}
**Description:** {resource_description}
**MIME Type:** {mime_type}

## Prompts

### `{prompt_name}`
{prompt_description}

**Arguments:**
```json
{args_schema}
```
```

**Note:** Optional fields are marked with `(optional)` in the generated docs.

### Skill Membership (Auto-Grouping)

**Feature:** PL-1 (v4.4.0)

Tools, resources, and prompts can declare which skill(s) they belong to using the `skill` field. This enables automatic grouping in auto-generated skill documentation without manually listing every component.

**Single Skill Membership:**

```typescript
interface QueryTool extends ITool {
  name: 'db_query';
  description: 'Execute a SQL query';
  params: { sql: string };
  result: { rows: any[] };
  skill: 'database';  // ← Declares membership in 'database' skill
}

interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  components: {
    // NOTE: db_query tool will be automatically included!
    // No need to list it in components.tools
  };
}
```

**Multiple Skill Membership:**

```typescript
interface ExportTool extends ITool {
  name: 'export_data';
  description: 'Export data in various formats';
  params: { format: string };
  result: { url: string };
  skill: ['analytics', 'reporting'];  // ← Member of MULTIPLE skills
}

// This tool will automatically appear in BOTH skills
```

**Works for All Component Types:**

```typescript
// Resources
interface MetricsResource extends IResource {
  uri: 'analytics://metrics';
  name: 'Metrics';
  description: 'Current metrics';
  mimeType: 'application/json';
  returns: { users: number };
  skill: 'analytics';  // ← Auto-grouped
}

// Prompts
interface AnalysisPrompt extends IPrompt {
  name: 'analyze_report';
  description: 'Analyze a report';
  args: { report_url: { description: 'Report URL' } };
  skill: 'analytics';  // ← Auto-grouped
}
```

**Combining Explicit and Membership-Based:**

```typescript
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  components: {
    tools: ['db_backup'];  // ← Explicitly listed
    // db_query, db_insert, db_update will be auto-included via skill field
  };
}
```

The framework automatically:
1. **Merges** explicit components with membership-based components
2. **Deduplicates** if a component appears in both lists
3. **Validates** that skill references are valid (see validation rules below)

**Benefits:**
- ✅ Less boilerplate - no need to manually list every component
- ✅ DRY principle - skill membership defined once on the component
- ✅ Easier refactoring - rename skills without updating every skill definition
- ✅ Self-documenting - components clearly show which skill(s) they belong to

**Example:** See `examples/skill-membership-demo-server.ts` for a complete demonstration.

---

## Compile-Time Validation

### FT-3: Compile-Time Validation

The framework validates skill configurations at compile time and emits warnings for common issues:

```bash
npm run build
# Or
npm run cli -- compile server.ts
```

**Validation Rules:**

#### 1. Orphaned Hidden Items (Warning)
Hidden items not referenced by any skill:

```typescript
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug tool';
  params: {};
  result: {};
  hidden: true;  // ⚠️ Not referenced in any skill
}

// Warning: Tool 'debug' is hidden but not referenced in any skill
```

**Fix:** Add the tool to a skill's `components`:
```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug tools';
  components: { tools: ['debug'] };  // ✅ Now referenced
}
```

#### 2. Invalid References (Error)
Skills referencing non-existent components:

```typescript
interface AdminSkill extends ISkill {
  name: 'admin';
  description: 'Admin tools';
  components: {
    tools: ['reset', 'shutdown', 'nonexistent'];  // ❌ 'nonexistent' not found
  };
}

// Error: Skill 'admin' references non-existent tool 'nonexistent'
```

**Fix:** Remove invalid references or add missing tools.

#### 3. Non-Hidden Components (Warning)
Auto-generated skills referencing visible items:

```typescript
interface PublicTool extends ITool {
  name: 'search';
  description: 'Search';
  params: {};
  result: {};
  // No hidden flag = visible
}

interface SearchSkill extends ISkill {
  name: 'search_help';
  description: 'Search help';
  components: { tools: ['search'] };  // ⚠️ 'search' is already visible
}

// Warning: Skill 'search_help' references non-hidden tool 'search'
```

**Fix:** Only reference hidden items in auto-generated skills.

#### 4. Empty Skills (Warning)
Skills with no components or implementation:

```typescript
interface EmptySkill extends ISkill {
  name: 'empty';
  description: 'Empty skill';
  components: { tools: [] };  // ⚠️ No components
}

// Warning: Skill 'empty' has no components
```

**Fix:** Add components or remove the skill.

#### 5. Orphaned Skill Membership (Warning)

**Feature:** PL-1 (v4.4.0)

Components declaring membership in non-existent skills:

```typescript
interface QueryTool extends ITool {
  name: 'db_query';
  description: 'Database query tool';
  params: { sql: string };
  result: { rows: any[] };
  skill: 'database';  // ⚠️ No 'database' skill exists
}

// Warning: Tool 'db_query' declares membership in skill 'database' which doesn't exist
```

**Fix:** Create the referenced skill or fix the skill name:

```typescript
// Option 1: Create the skill
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  components: {};  // db_query will be auto-included via membership
}

// Option 2: Fix the typo
interface QueryTool extends ITool {
  skill: 'data_operations';  // ✅ Correct skill name
}
```

This validation helps catch typos and ensures all skill membership declarations are valid.

### Configuration

Configure validation rules in `simplemcp.config.js`:

```javascript
export default {
  skillValidation: {
    rules: {
      orphanedHidden: 'warn',      // 'off' | 'warn' | 'error'
      invalidReferences: 'error',  // 'off' | 'warn' | 'error'
      nonHiddenComponents: 'warn', // 'off' | 'warn' | 'error'
      emptySkills: 'warn'          // 'off' | 'warn' | 'error'
    }
  }
};
```

**Defaults:**
- `orphanedHidden`: `warn` (not blocking)
- `invalidReferences`: `error` (blocking)
- `nonHiddenComponents`: `warn` (not blocking)
- `emptySkills`: `warn` (not blocking)

**Performance:**
- Validation time: **< 2ms** (50x better than 100ms target)
- Zero impact on runtime performance (compile-time only)

---

## Performance

### Benchmarks

Performance results from Foundation and Feature Layer testing:

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **Token Reduction** | 60-67% | >50% | ✅ Exceeds by 20-34% |
| **Compilation** | ~1-2s | <5s | ✅ 2.5-5x better |
| **Validation** | <2ms | <100ms | ✅ 50x better |
| **List Calls** | ~10ms | <50ms | ✅ 5x better |
| **Auto-generation** | <1ms | <50ms | ✅ 50x better |
| **Dynamic Eval** | ~5ms | <10ms | ✅ 2x better |

**Token Reduction Breakdown:**

```
Traditional MCP Server (50 tools):
- Initial discovery: ~5000 tokens
- Total context: ~5000 tokens

Progressive Disclosure (10 public + 40 hidden):
- Initial discovery: ~300 tokens (public only)
- With skill discovery: ~1700 tokens (public + skill docs)
- Total reduction: 66% vs traditional

Token savings scale with server size:
- 10 tools: ~40% reduction
- 25 tools: ~55% reduction
- 50 tools: ~67% reduction
- 100+ tools: ~75% reduction
```

**Performance Characteristics:**

1. **Compilation** (~1-2s):
   - AST parsing and type extraction
   - Schema generation from interfaces
   - Validation rules execution
   - Zero runtime cost (compile-time only)

2. **List Calls** (~10ms):
   - Filter hidden items (static or dynamic)
   - Dynamic evaluation with timeout protection
   - JSON serialization
   - Scales linearly with item count

3. **Auto-generation** (<1ms):
   - Component resolution from registry
   - Metadata extraction
   - Markdown formatting
   - No caching (instant even without)

4. **Validation** (<2ms):
   - Four validation rules
   - Graph traversal for orphaned items
   - Reference checking
   - Warning formatting

**Optimization Opportunities:**
- Caching for dynamic hidden evaluation (future PL-2)
- Parallel validation (future enhancement)
- Incremental compilation (future enhancement)

---

## Best Practices

### 1. Use Auto-Generated Skills

**❌ Manual (verbose, hard to maintain):**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug';
  description: 'Debug tools';
  returns: string;
}

export default class Server {
  debug: SkillHelper<DebugSkill> = async () => {
    return `
# Debug Tools

## Tools

### inspect_state
Inspect internal state...
    `.trim();
  };
}
```

**✅ Auto-generated (concise, auto-updates):**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug';
  description: 'Debug tools';
  components: { tools: ['inspect_state', 'trace_request'] };
}
// No implementation needed!
```

### 2. Group Related Capabilities

Create logical skill groupings:

```typescript
// ✅ Good: Logical groupings
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  components: {
    tools: ['query', 'migrate', 'backup'];
    resources: ['db://schema', 'db://stats'];
  };
}

interface AuthSkill extends ISkill {
  name: 'auth';
  description: 'Authentication operations';
  components: {
    tools: ['login', 'logout', 'refresh_token'];
    resources: ['auth://config'];
  };
}

// ❌ Bad: One giant skill
interface AllSkill extends ISkill {
  name: 'everything';
  description: 'All hidden stuff';
  components: {
    tools: ['query', 'login', 'debug', 'admin', ...];  // Too broad
  };
}
```

### 3. Use Dynamic Hidden for Conditional Access

**✅ Static hidden for debug/internal tools:**
```typescript
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug tool';
  params: {};
  result: {};
  hidden: true;  // Always hidden
}
```

**✅ Dynamic hidden for role-based access:**
```typescript
interface AdminTool extends ITool {
  name: 'delete_user';
  description: 'Delete user';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: (ctx) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Context-aware
  };
}
```

### 4. Add Validation Configuration

Configure validation to match your needs:

```javascript
// simplemcp.config.js
export default {
  skillValidation: {
    rules: {
      orphanedHidden: 'error',  // Block orphaned items in production
      invalidReferences: 'error',
      nonHiddenComponents: 'warn',
      emptySkills: 'warn'
    }
  }
};
```

### 5. Hide Implementation Details

Only expose the public API, hide everything else:

```typescript
// ✅ Public API (visible)
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public data';
  params: { query: string };
  result: { results: string[] };
}

// ✅ Internal utilities (hidden)
interface IndexTool extends ITool {
  name: 'rebuild_index';
  description: 'Rebuild search index';
  params: {};
  result: { rebuilt: boolean };
  hidden: true;  // Implementation detail
}

interface CacheTool extends ITool {
  name: 'clear_cache';
  description: 'Clear search cache';
  params: {};
  result: { cleared: boolean };
  hidden: true;  // Implementation detail
}

// ✅ Skill for internal tools
interface SearchInternalSkill extends ISkill {
  name: 'search_internal';
  description: 'Search internal operations';
  components: { tools: ['rebuild_index', 'clear_cache'] };
}
```

### 6. Test with Claude CLI

Use the Claude CLI to test progressive disclosure:

```bash
# 1. Test initial discovery (should be small)
claude --print --model haiku \
  --mcp-config config.json \
  "List all tools"

# 2. Test skill discovery
claude --print --model haiku \
  --mcp-config config.json \
  "Get the debug_toolkit skill"

# 3. Test hidden tool calls
claude --print --model haiku \
  --mcp-config config.json \
  "Call the inspect_state tool"
```

---

## Migration Guide

See [Migration Guide](./migration-fl-to-ft.md) for detailed upgrade instructions from v4.3.x to v4.4.x.

**Quick Summary:**

### Breaking Change: Async List Methods

```typescript
// Before (v4.3.x)
const tools = server.listTools();
const resources = server.listResources();
const prompts = server.listPrompts();

// After (v4.4.x)
const tools = await server.listTools();
const resources = await server.listResources();
const prompts = await server.listPrompts();
```

TypeScript will catch missing `await` at compile time.

### Adding Progressive Disclosure to Existing Servers

**Step 1:** Add `hidden: true` to internal tools:
```typescript
interface DebugTool extends ITool {
  name: 'debug';
  description: 'Debug tool';
  params: { component: string };
  result: { state: any };
  hidden: true;  // ← Add this
}
```

**Step 2:** Create an auto-generated skill:
```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug tools';
  components: { tools: ['debug'] };  // ← Reference hidden tool
}
```

**Step 3:** Rebuild and test:
```bash
npm run build
npm run cli -- run server.ts
```

That's it! No implementation changes needed.

---

## Examples

### Example 1: Role-Based Access

```typescript
// examples/auth-gated-server.ts
import { ITool, ISkill, ToolHelper, HiddenEvaluationContext } from 'simply-mcp';

// Public tool (visible to everyone)
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public data';
  params: { query: string };
  result: { results: string[] };
}

// Admin-only tool (dynamic hidden)
interface DeleteTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user account';
  params: { user_id: string };
  result: { deleted: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}

// Skill for admin tools
interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations (requires admin role)';
  components: { tools: ['delete_user'] };
}

export default class Server {
  search: ToolHelper<SearchTool> = async ({ query }) => {
    return { results: [`Result for "${query}"`] };
  };

  delete_user: ToolHelper<DeleteTool> = async ({ user_id }) => {
    // Delete user logic
    return { deleted: true };
  };
}
```

### Example 2: Feature Flags

```typescript
// examples/feature-flags-server.ts
import { ITool, ISkill, ToolHelper, HiddenEvaluationContext } from 'simply-mcp';

// Experimental tool (hidden behind feature flag)
interface ExperimentalTool extends ITool {
  name: 'experimental_feature';
  description: 'Experimental feature (beta)';
  params: { data: string };
  result: { processed: boolean };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = ctx?.metadata?.feature_flags as string[] | undefined;
    return !flags?.includes('experimental_feature');  // Hide if flag not set
  };
}

// Skill for experimental features
interface BetaSkill extends ISkill {
  name: 'beta_features';
  description: 'Experimental features (requires feature flag)';
  components: { tools: ['experimental_feature'] };
}

export default class Server {
  experimental_feature: ToolHelper<ExperimentalTool> = async ({ data }) => {
    // Experimental logic
    return { processed: true };
  };
}
```

### Example 3: Complete Server

See `examples/feature-layer-demo-server.ts` for a comprehensive example with:
- 3 visible tools (public API)
- 5 static hidden tools (debug tools)
- 3 dynamic hidden tools (admin tools)
- 2 visible resources (public data)
- 3 hidden resources (internal data)
- 1 visible prompt (help)
- 1 manual skill (FL-2 style)
- 2 auto-generated skills (FT-2 style)

```bash
# Run the demo
npm run cli -- run examples/feature-layer-demo-server.ts

# Test with Claude CLI
claude --print --model haiku \
  --mcp-config /tmp/demo-config.json \
  "List all capabilities and then get the debug_toolkit skill"
```

---

## FAQ

### Q: Do I need to implement auto-generated skills?

**A:** No! Auto-generated skills have no implementation. Just define the interface with `components`, and the framework generates the documentation automatically.

### Q: Can I mix manual and auto-generated skills?

**A:** Yes! Use auto-generated skills for most cases, manual skills for critical documentation that needs custom content.

### Q: What happens if a client calls a hidden tool directly?

**A:** Hidden tools are still callable via `tools/call`. The `hidden` flag only affects list responses, not invocation.

### Q: How do I pass context metadata to the server?

**A:** Context metadata must be passed through the MCP protocol. The Simply-MCP CLI doesn't support this yet (future enhancement). For now, use dynamic hidden in HTTP transport where you control the session metadata.

### Q: Can I disable validation warnings?

**A:** Yes! Configure validation rules in `simplemcp.config.js`:
```javascript
export default {
  skillValidation: {
    rules: {
      orphanedHidden: 'off',  // Disable orphaned hidden warnings
      invalidReferences: 'error',
      nonHiddenComponents: 'off',
      emptySkills: 'off'
    }
  }
};
```

### Q: What if I don't want progressive disclosure?

**A:** Don't use it! Progressive disclosure is opt-in. If you don't add `hidden` flags or create skills, your server works exactly as before.

### Q: How does this compare to MCP's native sampling/pagination?

**A:** Progressive disclosure is complementary to MCP protocol features:
- **Sampling/pagination**: Control _how_ data is returned (chunking)
- **Progressive disclosure**: Control _what_ is exposed (hiding capabilities)

Both reduce tokens, but serve different purposes.

---

## Next Steps

1. **Read the [Migration Guide](./migration-fl-to-ft.md)** to upgrade existing servers
2. **Review the [ISkill API Reference](../api/iskill-reference.md)** for complete interface documentation
3. **Explore the [Examples](../../examples/)** for real-world patterns
4. **Run the [Benchmark](../../tests/manual/benchmark-token-reduction.ts)** to measure token reduction in your server

---

## Support

- **GitHub Issues**: [github.com/simply-mcp/simply-mcp-ts/issues](https://github.com/simply-mcp/simply-mcp-ts/issues)
- **Documentation**: [docs/guides/](../guides/)
- **Examples**: [examples/](../../examples/)

---

**Version:** 4.4.0
**Last Updated:** 2025-11-12
