# NPX Package Bundle Optimization - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing dependency optimizations to reduce the simply-mcp NPX package bundle size from ~200KB to ~130KB (35% reduction).

## Quick Reference

| Phase | Tasks | Effort | Risk | Savings |
|---|---|---|---|---|
| **Phase 1** | Remove v3.4.0 + lazy express/cors + @babel dynamic | 4.5h | LOW | 400KB |
| **Phase 2** | Lazy CLI commands + decorator detection + fs.watch | 8h | MEDIUM | 200KB |
| **Phase 3** | CLI parser replacement + feature gates | 13h | HIGH | 200KB |

---

## PHASE 1: FOUNDATION (WEEK 1-2)

### Task 1.1: Remove simply-mcp v3.4.0 Circular Dependency

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/package.json`

**Current (Line 109):**
```json
"simply-mcp": "^3.4.0",
```

**Action:** Delete the entire line

**Rationale:**
- Creates circular dependency (v3.4.0 inside v4.0.0)
- Adds 450KB to node_modules unnecessarily
- No apparent usage in codebase

**Verification:**
```bash
grep -r "from.*simply-mcp" src/ | grep -v "\.test\."
```

**Expected Result:** No matches (or only in tests)

**Effort:** 15 minutes
**Risk:** NONE
**Savings:** 450KB node_modules

---

### Task 1.2: Lazy-load express/cors

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/src/server/builder-server.ts`

**Step 1: Find the HTTP server initialization**

Current code (around line 500-600):
```typescript
export class BuildMCPServer {
  // ... existing code ...
  
  private async startHTTP(port: number): Promise<void> {
    let express: typeof import('express');
    let cors: typeof import('cors');
    try {
      const expressModule = await import('express');
      const corsModule = await import('cors');
      express = expressModule.default;
      cors = corsModule.default;
      // ... rest of implementation
```

Wait, check if this is already lazy-loaded:

**Verification:**
```bash
grep -n "import express\|import cors" src/server/builder-server.ts
```

**If already lazy-loaded (lines say "await import"):** SKIP THIS TASK

**If top-level imports found:**

**Replace:** Top-level imports
```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
```

**With:** Inside the HTTP method
```typescript
export class BuildMCPServer {
  private async startHTTP(port: number): Promise<void> {
    let express: any, cors: any;
    
    try {
      const expressModule = await import('express');
      const corsModule = await import('cors');
      express = expressModule.default;
      cors = corsModule.default;
    } catch (error) {
      throw new Error(
        'HTTP transport requires express and cors.\n' +
        'Install them with: npm install express cors\n\n' +
        'Or use stdio transport: npm run dev -- --no-http'
      );
    }
    
    const app = express();
    app.use(cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }));
    
    // ... rest of implementation unchanged
```

**Testing:**
```bash
npm run build:prod
npm test -- src/server/builder-server  # If tests exist
```

Test HTTP transport:
```bash
npm run dev -- --http --port 3001
# Should start without errors
```

**Effort:** 2 hours
**Risk:** LOW (already conditional usage)
**Savings:** 135KB

---

### Task 1.3: Make @babel/standalone Dynamic

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/src/features/ui/ui-react-compiler.ts`

**Current (Line 18):**
```typescript
import * as Babel from '@babel/standalone';
```

**Change to:**
```typescript
// Remove top-level import, load dynamically in function
```

**Step 1: Find the compileReactComponent function**

Around line 109-186:
```typescript
export async function compileReactComponent(
  options: ReactCompilerOptions
): Promise<CompiledReactComponent> {
```

**Step 2: Add dynamic import at start of function**
```typescript
export async function compileReactComponent(
  options: ReactCompilerOptions
): Promise<CompiledReactComponent> {
  // ... validation code ...
  
  // Dynamically load Babel only when needed
  let Babel: any;
  try {
    Babel = await import('@babel/standalone');
  } catch (error) {
    throw new Error(
      'React component compilation requires @babel/standalone.\n' +
      'Install it with: npm install @babel/standalone\n\n' +
      'Or use inline HTML resources:\n' +
      '  import { createInlineHTMLResource } from "simply-mcp";'
    );
  }

  // ... rest of function unchanged, use Babel.transform as before ...
```

**Step 3: Update the Babel.transform call**

No changes needed - Babel reference remains the same after import.

**Testing:**
```bash
npm run build:prod
npm test -- features/ui/ui-react-compiler  # If tests exist
```

Test without @babel (simulate missing package):
```bash
# This validates error handling
npm test -- ui-react-compiler
```

**Effort:** 1 hour
**Risk:** LOW (feature-isolated)
**Savings:** 1.5MB (for users without React UI)

---

### Task 1.4: Create Validation Subpath Export

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/package.json`

**Current (Lines 10-22):**
```json
"exports": {
  ".": {
    "types": "./dist/src/index.d.ts",
    "import": "./dist/src/index.js",
    "default": "./dist/src/index.js"
  },
  "./client": {
    "types": "./dist/src/client/index.d.ts",
    "import": "./dist/src/client/index.js",
    "default": "./dist/src/client/index.js"
  },
  "./package.json": "./package.json"
},
```

**Add after "./client":**
```json
"./validation": {
  "types": "./dist/src/features/validation/index.d.ts",
  "import": "./dist/src/features/validation/index.js",
  "default": "./dist/src/features/validation/index.js"
},
```

**Step 1: Create validation/index.ts if not exists**

Check:
```bash
ls src/features/validation/index.ts
```

If missing, create it:
```typescript
// Export all validation utilities
export { InputValidator } from './InputValidator.js';
export { InputSanitizer } from './InputSanitizer.js';
export { ValidationError } from './ValidationError.js';
export { JsonSchemaToZod } from './JsonSchemaToZod.js';
export { createLLMFriendlyValidationError, formatErrorForLLM } from './LLMFriendlyErrors.js';
export { validateAndSanitize } from './index.js'; // Re-export main
```

**Step 2: Update users can now use**
```typescript
// Old: Always loaded
import { InputValidator } from 'simply-mcp';

// New: Separate import for tree-shaking
import { InputValidator } from 'simply-mcp/validation';
```

**Testing:**
```bash
npm run build:prod
node -e "const m = require('./dist/src/features/validation/index.js'); console.log(Object.keys(m));"
```

**Effort:** 1 hour
**Risk:** LOW (backward compatible)
**Savings:** Enables tree-shaking (30-50KB)

---

## PHASE 1 COMPLETION CHECKLIST

- [ ] Task 1.1: Removed v3.4.0 dependency
- [ ] Task 1.2: express/cors lazy-loaded
- [ ] Task 1.3: @babel dynamic import
- [ ] Task 1.4: validation subpath created
- [ ] Build succeeds: `npm run build:prod`
- [ ] Tests pass: `npm test:unit`
- [ ] NPX works: `npm pack && npm install simply-mcp-4.0.0.tgz && npx simply-mcp --help`
- [ ] Bundle size verified: Check dist size reduction

**Expected Results:**
- dist size: ~2.1M (was 3.1M) - DOWN 1MB
- gzipped size: ~180KB (was 200KB) - DOWN 10%
- Zero breaking changes

---

## PHASE 2: MEDIUM-TERM (WEEK 3-4)

### Task 2.1: Lazy-load CLI Commands

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/src/cli/index.ts`

**Current (Lines 1-39):**
```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';
import { bundleCommand } from './bundle.js';
import { createBundleCommand } from './create-bundle.js';
import { runCommand } from './run.js';
import { listCommand } from './list.js';
import { stopCommand } from './stop.js';
import { configCommand } from './config-command.js';

yargs(hideBin(process.argv))
  .scriptName('simplymcp')
  .usage('$0 <command> [options]')
  .command(runCommand)
  .command(bundleCommand)
  .command(createBundleCommand)
  .command(listCommand)
  .command(stopCommand)
  .command(configCommand)
  .demandCommand(1, 'You must provide a command')
  .help('h')
  .alias('h', 'help')
  .version(packageJson.version)
  .alias('V', 'version')
  .strict()
  .parse();
```

**Change to:**
```typescript
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'module';

// Get package version
const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

// Lazy-load commands
const commands = {
  run: () => import('./run.js').then(m => m.runCommand),
  bundle: () => import('./bundle.js').then(m => m.bundleCommand),
  'create-bundle': () => import('./create-bundle.js').then(m => m.createBundleCommand),
  list: () => import('./list.js').then(m => m.listCommand),
  stop: () => import('./stop.js').then(m => m.stopCommand),
  config: () => import('./config-command.js').then(m => m.configCommand),
};

async function loadCommand(name: string) {
  if (!commands[name as keyof typeof commands]) {
    throw new Error(`Unknown command: ${name}`);
  }
  return commands[name as keyof typeof commands]();
}

// Build yargs with lazy-loaded commands
async function main() {
  let argv = yargs(hideBin(process.argv))
    .scriptName('simplymcp')
    .usage('$0 <command> [options]');

  // Register command loaders
  for (const [name, loader] of Object.entries(commands)) {
    argv = argv.command({
      command: name === 'create-bundle' ? 'create-bundle' : name,
      describe: `Run the ${name} command`,
      handler: async (args) => {
        const cmd = await loader();
        // Inject command directly into yargs
        return cmd.handler(args);
      }
    });
  }

  await argv
    .demandCommand(1, 'You must provide a command')
    .help('h')
    .alias('h', 'help')
    .version(packageJson.version)
    .alias('V', 'version')
    .strict()
    .parse();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Testing:**
```bash
npm run build:prod
npx simply-mcp run --help
npx simply-mcp bundle --help
npx simply-mcp list --help
```

**Effort:** 2 hours
**Risk:** LOW (command isolation)
**Savings:** Commands unused in execution not loaded

---

### Task 2.2: Conditional reflect-metadata

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/src/cli/run.ts`

**Current (Lines 1-10):**
```typescript
import 'reflect-metadata';
import { readFile, readdir } from 'node:fs/promises';
// ... rest of imports
```

**Add decorator detection function:**
```typescript
import { readFileSync } from 'node:fs';

function requiresDecorators(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Check for decorator syntax
    if (/@\w+\(/.test(content)) {
      return true;
    }
    // Check for decorator in exports
    if (/export\s+@\w+/.test(content)) {
      return true;
    }
    // Check for class decorator pattern
    if (/^\s*@\w+/.test(content)) {
      return true;
    }
    return false;
  } catch {
    return false; // If can't read, assume no decorators
  }
}
```

**Modify runInterfaceAdapter:**
```typescript
export async function runInterfaceAdapter(
  filePath: string,
  useHttp: boolean,
  useHttpStateless: boolean,
  port: number,
  verbose: boolean = false,
  uiWatch: boolean = false
): Promise<void> {
  // Load reflect-metadata only if decorators detected
  if (requiresDecorators(filePath)) {
    await import('reflect-metadata');
  }
  
  // ... rest of function unchanged
```

**Testing:**
```bash
npm run build:prod
npm test -- cli/run  # If tests exist

# Test with decorator server
npm run dev examples/interface-something.ts

# Test with non-decorator server
npm run dev examples/interface-minimal.ts
```

**Effort:** 3 hours
**Risk:** MEDIUM (affects decorator detection)
**Savings:** 10KB + cleaner path

---

### Task 2.3: Replace chokidar with fs.watch

**File:** `/mnt/Shared/cs-projects/simply-mcp-ts/src/cli/watch-mode.ts`

**Current (Lines 75+ usage):**
```typescript
import chokidar: typeof import('chokidar');
// ...
const watcher = chokidar.watch(watchPaths, watchOptions);
```

**Replace with Node.js fs.watch:**
```typescript
import { watch } from 'node:fs';
import { resolve } from 'node:path';

interface WatchHandle {
  close(): void;
}

function createFileWatcher(
  paths: string[],
  callback: (event: string, filename: string) => void
): WatchHandle {
  const watchers = paths.map(path => {
    const watcher = watch(resolve(path), { recursive: true }, (event, filename) => {
      callback(event, filename);
    });
    return watcher;
  });

  return {
    close: () => {
      watchers.forEach(w => w.close());
    }
  };
}
```

**In startWatchMode function:**
```typescript
// Instead of chokidar.watch(watchPaths, watchOptions);
const watcher = createFileWatcher(watchPaths, (event, filename) => {
  console.log(`${timestamp()} [Watch] File changed: ${filename}`);
  handleFileChange(event, filename);
});
```

**Testing:**
```bash
npm run build:prod
npm run test:integration:watch  # If integration tests exist
```

**Effort:** 3 hours
**Risk:** LOW (already conditional, fs.watch is stable in Node 20+)
**Savings:** 170KB for non-watch users

---

## PHASE 2 COMPLETION CHECKLIST

- [ ] Task 2.1: CLI commands lazy-loaded
- [ ] Task 2.2: reflect-metadata conditional
- [ ] Task 2.3: chokidar → fs.watch
- [ ] Build succeeds: `npm run build:prod`
- [ ] Tests pass: `npm test`
- [ ] CLI works: `npx simply-mcp run --help`
- [ ] Watch mode works: `npm run dev -- --watch`
- [ ] Bundle size verified

**Expected Results:**
- dist size: ~1.8M (was 2.1M) - DOWN 300KB additional
- gzipped size: ~165KB (was 180KB) - DOWN 17.5% total
- Zero breaking changes

---

## PHASE 3: ADVANCED (WEEK 5-6)

### Task 3.1: Replace yargs with minimist

This is complex and requires full CLI refactoring. See DEPENDENCY_OPTIMIZATION_ANALYSIS.md Section 13 for detailed code examples.

**Effort:** 5-6 hours
**Risk:** HIGH
**Savings:** 105KB

### Task 3.2: Feature Gates System

This requires creating a feature detection and loading system. See DEPENDENCY_OPTIMIZATION_ANALYSIS.md Section 8 for implementation details.

**Effort:** 8+ hours  
**Risk:** HIGH
**Savings:** 200KB (conditional)

---

## VERIFICATION CHECKLIST

### After Each Phase

```bash
# Build
npm run build:prod

# Size check
du -sh dist/

# Gzip size
gzip -c dist/src/index.js | wc -c

# Tests
npm test:unit

# NPX test
npm pack
npm install ./simply-mcp-4.0.0.tgz -g --force
simplymcp --version
simplymcp run --help
npm uninstall simply-mcp -g

# Clean up
rm simply-mcp-4.0.0.tgz
```

### Specific Feature Tests

```bash
# HTTP transport
npm run dev -- examples/interface-http.ts --http --port 3001

# React component compilation  
npm test -- ui-react-compiler

# Watch mode
npm run dev -- examples/interface-minimal.ts --watch

# CLI commands
npm run build:prod && npm test -- cli/
```

---

## ROLLBACK PROCEDURES

If issues occur:

**For Phase 1:**
1. Remove dynamic imports, return to static imports
2. Re-add simply-mcp v3.4.0 to package.json if needed
3. Rebuild: `npm run clean && npm run build:prod`

**For Phase 2:**
1. Remove lazy command loading, restore static imports
2. Remove decorator detection, always load reflect-metadata
3. Replace fs.watch back to chokidar

**For Phase 3:**
1. Restore yargs from minimist
2. Remove feature gates

All changes should be Git commits, so can use: `git revert <commit-hash>`

---

## SUCCESS CRITERIA

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| Bundle (gzipped) | 200KB | 180KB | 165KB | 130KB |
| % Reduction | 0% | 10% | 17.5% | 35% |
| Tests Passing | ✓ | ✓ | ✓ | ✓ |
| Breaking Changes | - | None | None | None |
| Backward Compat | - | 100% | 100% | 100% |

---

## CONCLUSION

This guide provides concrete, actionable steps for optimizing the simply-mcp NPX bundle. Start with Phase 1 (low risk, quick wins) and progress to Phase 2 and 3 as needed.

**Recommended:** Implement Phase 1 immediately (4.5 hours), Phase 2 in next sprint (8 hours), and Phase 3 as backlog (13 hours).

**Total potential savings:** 70KB gzipped (35% reduction)

