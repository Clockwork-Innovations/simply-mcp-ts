# AI Skills Guide

> **Feature Status:** Stable (v4.4.0+)
> **Audience:** Developers building MCP servers
> **Goal:** Learn how to use AI Skills for progressive disclosure

## Table of Contents

- [What are AI Skills?](#what-are-ai-skills)
- [Why Use Skills?](#why-use-skills)
- [Quick Start](#quick-start)
- [Creating Skills](#creating-skills)
- [Progressive Disclosure Patterns](#progressive-disclosure-patterns)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## What are AI Skills?

**AI Skills** are meta-capabilities that provide documentation about your server's tools, resources, and prompts. Think of them as "user manuals" that AI clients can request on-demand to discover hidden capabilities.

**Key Concept:**
Instead of exposing all 50+ tools upfront (consuming thousands of tokens), you can:
1. Show only the essential public API initially (~300 tokens)
2. Provide skills that document hidden capabilities
3. Let the AI discover capabilities as needed (~1700 tokens total)

**Result:** 60-67% token reduction while maintaining full functionality.

**Analogy:**
- **Traditional MCP:** A restaurant menu listing every dish, ingredient, and preparation method upfront
- **Skills:** A concise menu with categories ("Ask about our specials" or "See our wine list")

---

## Why Use Skills?

### Problem: Token Bloat

Traditional MCP servers expose everything in initial discovery:
```
tools/list → [50 tools with full schemas] = 5000+ tokens
resources/list → [30 resources] = 2000+ tokens
prompts/list → [20 prompts] = 1500+ tokens
Total: ~8500 tokens before any actual work!
```

### Solution: Progressive Disclosure

With skills, you control what's visible:
```
Initial discovery (public API only):
tools/list → [10 public tools] = 300 tokens
skills → [3 skill gateways] = 200 tokens
Total: ~500 tokens

On-demand discovery (when needed):
Get "debug_toolkit" skill → [40 hidden tools] = 1200 tokens
Total: ~1700 tokens (80% reduction!)
```

### Benefits

✅ **Massive Token Savings**: 60-67% reduction in discovery phase
✅ **Context-Aware Access**: Hide tools based on roles, permissions, or feature flags
✅ **Better Organization**: Group related capabilities logically
✅ **Zero Maintenance**: Auto-generated docs update when tools change
✅ **Security**: Sensitive tools not exposed in public lists
✅ **Backward Compatible**: Existing tools still work normally

---

## Quick Start

### Step 1: Hide Internal Tools

Add `hidden: true` to tools you want to hide from initial discovery:

```typescript
interface DebugTool extends ITool {
  name: 'inspect_state';
  description: 'Inspect internal server state';
  params: { component?: string };
  result: { state: Record<string, any> };
  hidden: true;  // Hidden from tools/list
}
```

### Step 2: Create a Skill

Create a skill that documents your hidden tools:

```typescript
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: {
    tools: ['inspect_state', 'clear_cache', 'dump_logs'];
  };
}
```

### Step 3: That's It!

No implementation needed! The framework auto-generates documentation from your tool definitions.

### Step 4: Test It

```bash
# Initial discovery - only shows public tools
claude --print --model haiku \
  --mcp-config config.json \
  "List all tools"
# Returns: [public_tool_1, public_tool_2, ...]

# Discover hidden tools via skill
claude --print --model haiku \
  --mcp-config config.json \
  "Get the debug_toolkit skill manual"
# Returns: Auto-generated docs for inspect_state, clear_cache, dump_logs

# Call hidden tool directly
claude --print --model haiku \
  --mcp-config config.json \
  "Call inspect_state"
# Works perfectly! Hidden ≠ inaccessible
```

---

## Creating Skills

### Pattern 1: Auto-Generated Skills (Recommended)

**Use when:** Documenting a collection of related tools/resources/prompts

```typescript
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations and queries';
  components: {
    tools: ['query', 'migrate', 'backup'];
    resources: ['db://schema', 'db://stats'];
    prompts: ['sql_helper'];
  };
}

// No implementation needed! Framework auto-generates:
// - Tool descriptions with JSON schemas
// - Resource info with MIME types
// - Prompt descriptions with argument schemas
```

**Benefits:**
- Zero maintenance (updates automatically)
- Consistent formatting
- Compile-time validation
- 70% less code than manual

### Pattern 2: Manual Skills

**Use when:** You need custom content, examples, or narrative explanations

```typescript
interface OnboardingSkill extends ISkill {
  name: 'getting_started';
  description: 'Onboarding guide for new users';
  returns: string;  // Manual markdown content
}

export default class Server {
  gettingStarted: SkillHelper<OnboardingSkill> = () => {
    return `
# Getting Started

Welcome! Here's how to use this server effectively:

## Step 1: Authentication
Call the \`login\` tool with your credentials...

## Step 2: Explore Available Tools
Use \`list_categories\` to see what's available...

## Common Workflows

### Workflow 1: Data Analysis
1. Call \`fetch_data({ source: "analytics" })\`
2. Call \`analyze({ data, type: "trends" })\`
3. Call \`generate_report({ analysis })\`

### Workflow 2: User Management
...
    `.trim();
  };
}
```

**Benefits:**
- Full control over content and format
- Can include examples, workflows, warnings
- Great for conceptual or tutorial content

### Pattern 3: Skill Membership (Auto-Grouping)

**Use when:** You want tools to declare which skill(s) they belong to

```typescript
// Tools declare their skill membership
interface QueryTool extends ITool {
  name: 'db_query';
  description: 'Execute SQL queries';
  params: { sql: string };
  result: { rows: any[] };
  skill: 'database';  // Auto-grouped into database skill
}

interface ExportTool extends ITool {
  name: 'export_data';
  description: 'Export data to files';
  params: { format: string };
  result: { url: string };
  skill: ['database', 'reporting'];  // Multiple skills!
}

// Skill automatically includes all members
interface DatabaseSkill extends ISkill {
  name: 'database';
  description: 'Database operations';
  components: {
    // db_query and export_data auto-included via membership!
  };
}
```

**Benefits:**
- DRY principle (declare once on the tool)
- Less boilerplate in skill definitions
- Easier refactoring
- Self-documenting code

---

## Progressive Disclosure Patterns

### Pattern 1: Hide Debug Tools

**Scenario:** You have debug/diagnostic tools that shouldn't clutter the main API

```typescript
// Public API
interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public data';
  params: { query: string };
  result: { results: string[] };
  // No hidden flag = visible
}

// Debug tools (hidden)
interface InspectTool extends ITool {
  name: 'inspect_state';
  description: 'Inspect internal state';
  params: { component?: string };
  result: { state: any };
  hidden: true;  // Always hidden
}

// Skill for debug tools
interface DebugSkill extends ISkill {
  name: 'debug_toolkit';
  description: 'Debug and diagnostic tools';
  components: { tools: ['inspect_state', 'clear_cache'] };
}
```

**Token savings:** Public API: 300 tokens → With debug skill: 1200 tokens (vs 5000 without hiding)

### Pattern 2: Role-Based Access

**Scenario:** Admin-only tools should be hidden from regular users

```typescript
interface DeleteUserTool extends ITool {
  name: 'delete_user';
  description: 'Delete a user account';
  params: { user_id: string };
  result: { deleted: boolean };
  // Dynamic hidden - context-aware
  hidden: (ctx?: HiddenEvaluationContext) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';  // Hide if not admin
  };
}

interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations (admin only)';
  components: { tools: ['delete_user', 'reset_server'] };
}
```

**Behavior:**
- Regular users: `tools/list` returns public tools only
- Admin users: `tools/list` includes admin tools (if context provided)
- Both can still call tools directly if they know the name

### Pattern 3: Feature Flags

**Scenario:** Experimental features hidden behind feature flags

```typescript
interface ExperimentalTool extends ITool {
  name: 'new_feature';
  description: 'Experimental new feature (beta)';
  params: { input: string };
  result: { output: string };
  hidden: (ctx?: HiddenEvaluationContext) => {
    const flags = ctx?.metadata?.feature_flags as string[] | undefined;
    return !flags?.includes('experimental');  // Hide unless flag set
  };
}

interface BetaSkill extends ISkill {
  name: 'beta_features';
  description: 'Experimental features (requires feature flag)';
  components: { tools: ['new_feature'] };
}
```

**Use cases:**
- Gradual rollouts
- A/B testing
- Preview access for beta users

### Pattern 4: Environment-Based Hiding

**Scenario:** Debug tools only in development

```typescript
interface DebugTool extends ITool {
  name: 'debug_logs';
  description: 'Access debug logs';
  params: {};
  result: { logs: string[] };
  hidden: (ctx?: HiddenEvaluationContext) => {
    // Hide in production
    return ctx?.server?.isProduction === true;
  };
}
```

---

## Best Practices

### 1. Use Auto-Generated Skills by Default

**✅ Good:**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug';
  components: { tools: ['inspect', 'trace'] };
}
```

**❌ Avoid:**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug';
  returns: string;
}
// Then manually write 100 lines of markdown...
```

Use manual skills only when you need custom content like tutorials or workflows.

### 2. Group Related Capabilities Logically

**✅ Good:**
```typescript
interface DatabaseSkill extends ISkill {
  name: 'database';
  components: {
    tools: ['query', 'migrate'];
    resources: ['db://schema'];
  };
}

interface AuthSkill extends ISkill {
  name: 'auth';
  components: { tools: ['login', 'logout'] };
}
```

**❌ Avoid:**
```typescript
interface EverythingSkill extends ISkill {
  name: 'hidden_stuff';
  components: {
    tools: ['query', 'login', 'debug', 'admin', ...];  // Too broad
  };
}
```

### 3. Write Clear Descriptions

Skills descriptions help AI decide when to request them.

**✅ Good:**
```typescript
description: 'Database operations and SQL queries'
description: 'Debug tools for troubleshooting server issues'
description: 'Administrative operations for user and system management'
```

**❌ Avoid:**
```typescript
description: 'Skill'  // Too vague
description: 'This skill contains various tools and resources'  // Not specific
```

### 4. Keep Public API Small

Only expose tools that users need immediately:

**✅ Good:**
```typescript
// Public (3 tools)
- search
- calculate
- help

// Hidden (47 tools in various skills)
- debug_*
- admin_*
- internal_*
```

**❌ Avoid:**
```typescript
// Public (50 tools)
- Everything exposed upfront
```

### 5. Test Discovery Flow

```bash
# Test 1: Initial discovery should be small
claude --print "List all tools" | wc -w
# Should be ~100-200 words, not 1000+

# Test 2: Skills should be discoverable
claude --print "What skills are available?"

# Test 3: Hidden tools should work
claude --print "Call the inspect_state tool"
```

### 6. Use Validation

Enable compile-time validation to catch issues:

```javascript
// simplemcp.config.js
export default {
  skillValidation: {
    rules: {
      orphanedHidden: 'warn',      // Warn if hidden tool not in any skill
      invalidReferences: 'error',  // Error if skill references non-existent tool
      nonHiddenComponents: 'warn', // Warn if skill references visible tools
      emptySkills: 'warn'          // Warn if skill has no components
    }
  }
};
```

---

## Real-World Examples

### Example 1: SaaS Admin Panel

```typescript
// Public API (customer-facing)
interface GetAccountTool extends ITool {
  name: 'get_account';
  description: 'Get account information';
  params: { account_id: string };
  result: { account: any };
}

// Admin-only (hidden)
interface DeleteAccountTool extends ITool {
  name: 'delete_account';
  description: 'Delete an account (admin only)';
  params: { account_id: string; confirm: boolean };
  result: { deleted: boolean };
  hidden: (ctx) => {
    const user = ctx?.metadata?.user as { role?: string } | undefined;
    return user?.role !== 'admin';
  };
}

interface AdminSkill extends ISkill {
  name: 'admin_operations';
  description: 'Administrative operations for support staff';
  components: {
    tools: ['delete_account', 'refund_payment', 'reset_password'];
    resources: ['admin://audit_log', 'admin://metrics'];
  };
}
```

**Benefits:**
- Customers see clean, simple API
- Support staff can discover admin tools via skill
- Reduces token usage by 70%+ for regular users

### Example 2: Analytics Platform

```typescript
// Public API
interface QueryDataTool extends ITool {
  name: 'query_data';
  description: 'Query analytics data';
  params: { sql: string };
  result: { rows: any[] };
}

// Advanced features (hidden behind skill)
interface PredictTool extends ITool {
  name: 'predict_trends';
  description: 'ML-powered trend prediction';
  params: { metric: string; days: number };
  result: { predictions: number[] };
  skill: 'advanced_analytics';  // Auto-grouped
}

interface AdvancedSkill extends ISkill {
  name: 'advanced_analytics';
  description: 'Advanced analytics and ML features';
  components: {
    // predict_trends auto-included via membership
    resources: ['ml://models', 'ml://training_data'];
  };
}
```

### Example 3: Developer Tools

```typescript
// Public API
interface CompileTool extends ITool {
  name: 'compile';
  description: 'Compile TypeScript code';
  params: { code: string };
  result: { js: string };
}

// Debug tools (always hidden)
interface ProfilerTool extends ITool {
  name: 'profiler';
  description: 'Profile compilation performance';
  params: { code: string };
  result: { metrics: any };
  hidden: true;
}

interface TraceTool extends ITool {
  name: 'trace_compile';
  description: 'Trace compilation steps';
  params: { code: string };
  result: { trace: string[] };
  hidden: true;
}

// Manual skill with examples
interface DebugSkill extends ISkill {
  name: 'compiler_debug';
  description: 'Debug compilation issues';
  returns: string;
}

export default class Server {
  compilerDebug: SkillHelper<DebugSkill> = () => `
# Compiler Debug Guide

## Tools

### \`profiler\`
Profile compilation performance to identify bottlenecks.

**Example:**
\`\`\`typescript
profiler({ code: "const x = 1;" })
// Returns: { parseTime: 2ms, checkTime: 5ms, emitTime: 1ms }
\`\`\`

### \`trace_compile\`
Trace each step of compilation for debugging.

**Example:**
\`\`\`typescript
trace_compile({ code: "const x = 1;" })
// Returns: ["parse", "bind", "check", "transform", "emit"]
\`\`\`

## Common Issues

### Slow Compilation
1. Run \`profiler\` to identify slow phase
2. Use \`trace_compile\` to see execution order
3. Check for circular dependencies

### Type Errors
1. Use \`trace_compile\` to see where type checking fails
2. Check the "check" phase timing in profiler
  `.trim();
  };
}
```

---

## Integration

### With Router Tools

Skills work seamlessly with router tools:

```typescript
interface AdminRouterTool extends ITool {
  name: 'admin';
  description: 'Admin operations router';
  params: { operation: string; args: any };
  result: any;
  routes: {
    'users.delete': DeleteUserRoute;
    'users.reset': ResetUserRoute;
  };
  hidden: (ctx) => ctx?.metadata?.user?.role !== 'admin';
}

interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations';
  components: {
    tools: ['admin'];  // References the router tool
  };
}
```

The skill will document the router tool and its routes.

### With MCP UI Protocol

Skills can include UI-enabled tools:

```typescript
interface DashboardTool extends ITool {
  name: 'dashboard';
  description: 'Interactive analytics dashboard';
  params: {};
  result: { component: string };
  ui: {
    component: './Dashboard.tsx';
    props: { theme: string };
  };
  skill: 'analytics';
}
```

### With OAuth 2.1 Authentication

Dynamic hiding based on auth state:

```typescript
interface SecureTool extends ITool {
  name: 'secure_operation';
  description: 'Authenticated operation';
  params: { data: string };
  result: { success: boolean };
  hidden: (ctx) => {
    // Hide if not authenticated
    return !ctx?.metadata?.auth?.access_token;
  };
}
```

---

## Troubleshooting

### Issue: "Tool X is hidden but not referenced in any skill"

**Warning:**
```
Warning: Tool 'debug_state' is hidden but not referenced in any skill
```

**Cause:** You marked a tool as `hidden: true` but didn't add it to any skill's `components`.

**Fix:**
```typescript
interface DebugSkill extends ISkill {
  name: 'debug';
  components: {
    tools: ['debug_state'];  // Add missing tool
  };
}
```

### Issue: "Skill references non-existent tool"

**Error:**
```
Error: Skill 'admin' references non-existent tool 'delete_user'
```

**Cause:** Skill references a tool that doesn't exist (typo or removed tool).

**Fix:**
```typescript
// Check tool name spelling
interface DeleteUserTool extends ITool {
  name: 'delete_user';  // Must match exactly
}

interface AdminSkill extends ISkill {
  components: {
    tools: ['delete_user'];  // Must match exactly
  };
}
```

### Issue: Hidden tools still appear in list

**Problem:** Marked tool as hidden, but it appears in `tools/list`.

**Causes:**
1. Not running compiled code: `npm run build` then test
2. TypeScript compilation error: Check `npm run build` output
3. Context makes it visible: Dynamic hidden function returns `false`

**Debug:**
```typescript
// Add logging to debug dynamic hidden
hidden: (ctx) => {
  const shouldHide = ctx?.metadata?.user?.role !== 'admin';
  console.log('Hide tool?', shouldHide, 'Context:', ctx);
  return shouldHide;
}
```

### Issue: Skill returns empty documentation

**Problem:** Auto-generated skill has no content.

**Causes:**
1. Empty components: `components: { tools: [] }`
2. Invalid references: Tools listed don't exist
3. No implementation: Manual skill missing `SkillHelper` implementation

**Fix:**
```typescript
// Auto-generated: Ensure components exist
interface MySkill extends ISkill {
  components: {
    tools: ['existing_tool'];  // Must exist!
  };
}

// Manual: Provide implementation
const mySkill: SkillHelper<MySkill> = () => {
  return '# Documentation here';
};
```

---

## API Reference

For complete API documentation, see:

- **[ISkill API Reference](../api/iskill-reference.md)** - Complete interface documentation
- **[Progressive Disclosure Guide](./progressive-disclosure.md)** - Technical implementation details
- **[Migration Guide](./migration-fl-to-ft.md)** - Upgrading from v4.3.x

### Quick Reference

**Key Interfaces:**
```typescript
interface ISkill {
  name: string;                      // Unique identifier
  description: string;               // When to use this skill
  returns?: string;                  // Manual markdown (mutually exclusive with components)
  components?: ISkillComponents;     // Auto-generated (mutually exclusive with returns)
  hidden?: HiddenValue;              // Hide skill itself
}

interface ISkillComponents {
  tools?: string[];                  // Tool names to document
  resources?: string[];              // Resource URIs to document
  prompts?: string[];                // Prompt names to document
}

type SkillHelper<T extends ISkill> = () => string;
```

**Hidden Value Types:**
```typescript
type HiddenValue = boolean | HiddenPredicate;
type HiddenPredicate = (context?: HiddenEvaluationContext) => boolean;

interface HiddenEvaluationContext {
  metadata?: Record<string, unknown>;  // Custom metadata (user, roles, flags)
  server?: { isProduction?: boolean };  // Server state
  [key: string]: unknown;               // Extensible
}
```

---

## Next Steps

1. **Try the Quick Start** - Hide a tool and create your first skill
2. **Review Examples** - Check `examples/progressive-disclosure-demo-server.ts`
3. **Enable Validation** - Configure `simplemcp.config.js` to catch issues
4. **Measure Impact** - Run `tests/manual/benchmark-token-reduction.ts`
5. **Read Technical Docs** - Deep dive into [progressive-disclosure.md](./progressive-disclosure.md)

---

**Version:** 4.4.0
**Last Updated:** 2025-11-14
