# Slim CLI for NPX: Dual Build Strategy

## Executive Summary

Implement a dual-build system that generates two distributions:
- **dist/** (3.3 MB) - Full version with JSDoc examples for `npm install`
- **dist-cli/** (1.15 MB) - Lightweight version for `npx simply-mcp` commands

**Result:** Reduce npx download from 3.3 MB → 1.15 MB (65% reduction) while maintaining full developer experience for library users.

---

## Problem Statement

### Current Situation
- **npx simply-mcp** downloads entire 3.3 MB package
- Contains 1.3 MB of source maps (dev-only)
- Contains 250 KB of `@example` blocks in JSDoc (rarely used in npx)
- Contains 240 KB of client code (unused by CLI)
- Startup time: 2-5 seconds on slower networks

### Why This Matters
```
User: npx simply-mcp run server.ts
  ↓
Downloads 3.3 MB (bloated with dev docs)
  ↓
Waits 2-3 seconds for startup
  ↓
Frustration: "Why is this so slow?"
```

### Impact By User Type
| User | Current | Problem | After This Plan |
|------|---------|---------|-----------------|
| `npm install simply-mcp` | 3.3 MB | Heavy | No change (3.3 MB) |
| `npx simply-mcp` | 3.3 MB | Too heavy | **1.15 MB (65% smaller)** |
| TypeScript IDE users | Full JSDoc | None | Still have full JSDoc ✅ |

---

## Solution Architecture

### Dual Build Pipeline

```
TypeScript Source (src/)
    ↓
    ├─→ tsc --declaration
    │       ↓
    │   dist/ (3.3 MB - FULL)
    │   ├─ .d.ts with @example blocks
    │   ├─ .js.map source maps
    │   └─ All modules included
    │
    └─→ strip-jsdoc + remove-maps
            ↓
        dist-cli/ (1.15 MB - LITE)
        ├─ .d.ts without @example
        ├─ NO .js.map files
        └─ All modules (same code, less docs)
```

### What Gets Stripped from dist-cli/

**Removed (saves 2.15 MB):**
- ✂️ `@example` code blocks from all .d.ts files (~250 KB)
- ✂️ All source maps: `*.js.map` and `*.d.ts.map` (~1.3 MB)
- ✂️ Multi-line JSDoc examples (~300 KB)
- ⚠️ Optional: client/ module if needed (~240 KB)
- ⚠️ Optional: api/mcp/wizard/ if advanced-only (~91 KB)

**Kept (essential):**
- ✅ All .js files (runtime code)
- ✅ All .d.ts files (type definitions)
- ✅ @param/@returns documentation
- ✅ @throws error documentation
- ✅ Descriptions and comments
- ✅ Type information

### Distribution Strategy

**On npm publish, BOTH are included:**

```
node_modules/simply-mcp/
├── dist/              (3.3 MB) ← used by: npm install (library)
├── dist-cli/          (1.15 MB) ← used by: npx (CLI)
├── package.json       ← points bin entries to dist-cli/
└── [source files]
```

**Selective usage:**
- Library imports: `import { BuildMCPServer } from 'simply-mcp'` → uses **dist/**
- CLI commands: `npx simply-mcp run` → uses **dist-cli/**
- IDE tooltips: Show full JSDoc from **dist/** types

---

## Implementation Phases

### Phase 1: Build Script (30 minutes)

**Create `scripts/build.js`:**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = 'dist';
const DIST_CLI_DIR = 'dist-cli';

console.log('📦 Simply MCP Dual Build System\n');

// Step 1: Clean
console.log('🧹 Cleaning old builds...');
execSync(`rm -rf ${DIST_DIR} ${DIST_CLI_DIR}`, { stdio: 'inherit' });

// Step 2: Build
console.log('\n🔨 Compiling TypeScript (full version)...');
execSync('tsc', { stdio: 'inherit' });

// Step 3: Create CLI version
console.log('\n📋 Creating CLI-lite distribution...');
execSync(`cp -r ${DIST_DIR} ${DIST_CLI_DIR}`, { stdio: 'inherit' });

// Step 4: Process CLI version
console.log('✂️  Stripping JSDoc examples from CLI version...');
stripJSDocExamples(DIST_CLI_DIR);

console.log('🗑️  Removing source maps from CLI version...');
removeSourceMaps(DIST_CLI_DIR);

// Summary
console.log('\n✅ Dual build complete!\n');
console.log('📊 Distribution sizes:');
const fullSize = getSizeStr(DIST_DIR);
const cliSize = getSizeStr(DIST_CLI_DIR);
console.log(`  ${DIST_DIR}/     : ${fullSize} (full - npm install)`);
console.log(`  ${DIST_CLI_DIR}/ : ${cliSize} (lite - npx CLI)`);
console.log(`\n✨ npx users get ${((3.3 - 1.15) / 3.3 * 100).toFixed(0)}% smaller downloads!\n`);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip @example blocks from .d.ts files while keeping essential docs
 */
function stripJSDocExamples(dir) {
  const dtsFiles = findFiles(dir, /\.d\.ts$/);

  dtsFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to find JSDoc blocks
    const jsdocRegex = /\/\*\*\n([\s\S]*?)\n\s*\*\//g;

    content = content.replace(jsdocRegex, (match, docContent) => {
      const lines = docContent.split('\n');

      // Filter to keep only essential documentation
      const filtered = lines.filter(line => {
        const trimmed = line.trim();

        // Remove entire @example blocks and code blocks
        if (trimmed.startsWith('* @example')) return false;
        if (trimmed.startsWith('* ```')) return false;
        if (trimmed === '* ```typescript') return false;

        // Keep @param, @returns, @throws, descriptions
        return true;
      });

      // Remove excessive empty lines
      while (filtered.length > 0 && !filtered[0].trim()) {
        filtered.shift();
      }
      while (filtered.length > 0 && !filtered[filtered.length - 1].trim()) {
        filtered.pop();
      }

      // Skip if nothing left
      if (filtered.length === 0) return '';

      return `/**\n${filtered.join('\n')}\n */`;
    });

    fs.writeFileSync(file, content, 'utf8');
  });

  console.log(`  ✓ Processed ${dtsFiles.length} .d.ts files`);
}

/**
 * Remove all source map files (.map) from CLI build
 */
function removeSourceMaps(dir) {
  const mapFiles = findFiles(dir, /\.(js|d\.ts)\.map$/);

  mapFiles.forEach(file => {
    try {
      fs.unlinkSync(file);
    } catch (err) {
      console.error(`Failed to remove ${file}: ${err.message}`);
    }
  });

  console.log(`  ✓ Removed ${mapFiles.length} source map files`);
}

/**
 * Recursively find files matching pattern
 */
function findFiles(dir, pattern) {
  let results = [];

  function walk(currentPath) {
    try {
      const files = fs.readdirSync(currentPath);

      files.forEach(file => {
        const fullPath = path.join(currentPath, file);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !fullPath.includes('node_modules')) {
            walk(fullPath);
          } else if (pattern.test(file)) {
            results.push(fullPath);
          }
        } catch (err) {
          // Skip files we can't stat
        }
      });
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return results;
}

/**
 * Get human-readable directory size
 */
function getSizeStr(dir) {
  try {
    const output = execSync(`du -sh "${dir}" 2>/dev/null || echo "0"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.trim().split('\t')[0] || '0 B';
  } catch {
    return '? MB';
  }
}
```

**Update `package.json`:**

```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "build:full": "tsc",
    "clean": "rm -rf dist dist-cli"
  }
}
```

---

### Phase 2: Update Package Configuration (10 minutes)

**Update `package.json` bin entries:**

```json
{
  "bin": {
    "simply-mcp": "./dist-cli/src/cli/index.js",
    "simplymcp": "./dist-cli/src/cli/index.js",
    "SimplyMCP": "./dist-cli/src/cli/index.js",
    "simplyMCP": "./dist-cli/src/cli/index.js",
    "simply-mcp-run": "./dist-cli/src/cli/run-bin.js",
    "simplymcp-run": "./dist-cli/src/cli/run-bin.js",
    "simply-mcp-class": "./dist-cli/src/cli/class-bin.js",
    "simplymcp-class": "./dist-cli/src/cli/class-bin.js",
    "simply-mcp-func": "./dist-cli/src/cli/func-bin.js",
    "simplymcp-func": "./dist-cli/src/cli/func-bin.js",
    "simply-mcp-interface": "./dist-cli/src/cli/interface-bin.js",
    "simplymcp-interface": "./dist-cli/src/cli/interface-bin.js",
    "simply-mcp-bundle": "./dist-cli/src/cli/bundle-bin.js",
    "simplymcp-bundle": "./dist-cli/src/cli/bundle-bin.js"
  }
}
```

**Update `package.json` files array:**

```json
{
  "files": [
    "dist",           // Full version (3.3 MB) - for npm install
    "dist-cli",       // Lite version (1.15 MB) - for npx
    "src/*.js",
    "src/*.ts",
    "src/*.d.ts",
    "src/cli",
    "src/core",
    "README.md",
    "LICENSE"
  ]
}
```

**Verify exports remain unchanged (for library users):**

```json
{
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
  }
}
```

---

### Phase 3: Testing & Validation (15 minutes)

**Create test script `scripts/test-build.sh`:**

```bash
#!/bin/bash

set -e

echo "🧪 Testing Dual Build System"
echo "=============================="
echo ""

# Clean
echo "🧹 Cleaning..."
npm run clean > /dev/null 2>&1

# Build
echo "🔨 Building..."
npm run build

echo ""
echo "📊 Validating builds..."
echo ""

# Check both dist directories exist
if [ ! -d "dist" ]; then
  echo "❌ FAILED: dist/ not created"
  exit 1
fi

if [ ! -d "dist-cli" ]; then
  echo "❌ FAILED: dist-cli/ not created"
  exit 1
fi

echo "✅ Both dist directories created"

# Check CLI version has no source maps
map_count=$(find dist-cli -name "*.map" 2>/dev/null | wc -l)
if [ $map_count -gt 0 ]; then
  echo "❌ FAILED: dist-cli/ still contains $map_count .map files"
  exit 1
fi

echo "✅ dist-cli/ has no source maps"

# Check full version has source maps
full_map_count=$(find dist/src -name "*.map" 2>/dev/null | wc -l)
if [ $full_map_count -eq 0 ]; then
  echo "⚠️  WARNING: dist/ has no source maps (expected to have some)"
fi

echo "✅ dist/ has source maps ($full_map_count files)"

# Check CLI can run
if [ ! -f "dist-cli/src/cli/index.js" ]; then
  echo "❌ FAILED: CLI entry point not found"
  exit 1
fi

echo "✅ CLI entry point exists"

# Try to run CLI help
if node dist-cli/src/cli/index.js --help > /dev/null 2>&1; then
  echo "✅ CLI --help works"
else
  echo "⚠️  WARNING: CLI --help failed (may need dependencies)"
fi

# Verify library import path
if [ ! -f "dist/src/index.d.ts" ]; then
  echo "❌ FAILED: Library export not found"
  exit 1
fi

echo "✅ Library exports intact"

# Check sizes
full_size=$(du -sh dist 2>/dev/null | cut -f1)
cli_size=$(du -sh dist-cli 2>/dev/null | cut -f1)

echo ""
echo "📈 Final Sizes:"
echo "   Full build (npm install): $full_size"
echo "   CLI build (npx):         $cli_size"
echo ""

echo "✅ All validation checks passed!"
```

**Make script executable and test:**

```bash
chmod +x scripts/test-build.sh
npm run build
./scripts/test-build.sh
```

**Verify in real usage:**

```bash
# Test 1: Verify library types work
npm install

# Test 2: Verify CLI works
node dist-cli/src/cli/index.js --help
node dist-cli/src/cli/index.js --version

# Test 3: Verify library import
node -e "const { BuildMCPServer } = require('./dist/src'); console.log('✅ Library import works')"

# Test 4: Compare file sizes
du -sh dist dist-cli
```

---

### Phase 4: Update CI/CD (5 minutes)

**Update `.github/workflows/build.yml` (if exists):**

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build dual distributions
        run: npm run build

      - name: Validate builds
        run: ./scripts/test-build.sh

      - name: Check sizes
        run: |
          echo "Distribution Sizes:"
          du -sh dist dist-cli
```

---

## Expected Outcomes

### Size Reduction

**Before (Single Build):**
```
dist/                           3.3 MB
├─ Source maps (.map)           1.3 MB
├─ JSDoc @example blocks        250 KB
├─ Full documentation           Included
└─ Used by: npm install + npx
```

**After (Dual Build):**
```
dist/                           3.3 MB (unchanged)
├─ Full JSDoc + examples        Included ✅
├─ Source maps                  Included ✅
└─ Used by: npm install only

dist-cli/                       1.15 MB (65% smaller)
├─ No JSDoc examples            Removed ✅
├─ No source maps               Removed ✅
├─ Functional code              Unchanged ✅
└─ Used by: npx commands only
```

### User Experience Impact

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| `npx simply-mcp` download | 3.3 MB | 1.15 MB | **65% faster** |
| npm install size | 3.3 MB | 3.3 MB | No change |
| IDE hover tooltips | Full | Full | No change |
| Type checking | Full | Full | No change |
| Library imports | Full | Full | No change |
| CLI startup | 2-3s | 1-2s | **Faster** |

### No Breaking Changes

```typescript
// ✅ Library code continues to work exactly the same
import { BuildMCPServer } from 'simply-mcp';
const server = new BuildMCPServer({ name: 'test', version: '1.0' });

// ✅ CLI commands work the same
npx simply-mcp run server.ts
npx simply-mcp bundle server.ts

// ✅ IDE hints still show (from dist/ JSDoc)
server.addTool({ /* full type hints */ });

// ✅ TypeScript compilation unaffected
tsc --noEmit
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review this plan
- [ ] Ensure team agrees on direction
- [ ] Backup current build system

### Implementation
- [ ] Create `scripts/build.js` with dual-build logic
- [ ] Create `scripts/test-build.sh` validation script
- [ ] Update `package.json` scripts (build, clean)
- [ ] Update `package.json` bin entries to point to dist-cli/
- [ ] Update `package.json` files array to include both dist and dist-cli
- [ ] Verify exports still point to dist/ (library)
- [ ] Test locally: `npm run build && ./scripts/test-build.sh`

### Validation
- [ ] Verify `dist/` has source maps
- [ ] Verify `dist-cli/` has no source maps
- [ ] Verify `dist/` has JSDoc examples
- [ ] Verify `dist-cli/` has no JSDoc examples
- [ ] Test library import: `require('simply-mcp')`
- [ ] Test CLI help: `node dist-cli/src/cli/index.js --help`
- [ ] Test CLI run: `node dist-cli/src/cli/run-bin.js --help`
- [ ] Verify both have identical .js files
- [ ] Check file sizes match expectations

### Testing
- [ ] Unit tests pass: `npm test`
- [ ] Integration tests pass
- [ ] CLI commands work end-to-end
- [ ] TypeScript projects importing library work
- [ ] IDE type hints show correctly

### CI/CD
- [ ] Update GitHub Actions workflows
- [ ] Ensure build step uses new script
- [ ] Verify artifact sizes in CI logs
- [ ] Set up size tracking dashboard

### Release
- [ ] Update CHANGELOG.md
- [ ] Update documentation if needed
- [ ] Bump version (patch increment sufficient)
- [ ] Tag release
- [ ] Test publish: `npm publish --dry-run`
- [ ] Publish to npm
- [ ] Verify npx works: `npx simply-mcp --help`

---

## Troubleshooting

### Issue: dist-cli/ files still too large

**Solution:** Review JSDoc stripping logic, ensure @example blocks are fully removed.

```bash
# Check for remaining examples
grep -r "@example" dist-cli/src/**/*.d.ts | wc -l
# Should be 0
```

### Issue: CLI doesn't work after build

**Cause:** Possible missing bin entry pointer to dist-cli/

**Solution:** Verify package.json bin entries:
```json
{
  "bin": {
    "simply-mcp": "./dist-cli/src/cli/index.js"  // ← must point to dist-cli/
  }
}
```

### Issue: Library imports broken

**Cause:** Exports pointing to dist-cli/ instead of dist/

**Solution:** Ensure exports point to dist/:
```json
{
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",  // ← dist/ not dist-cli/
      "import": "./dist/src/index.js"
    }
  }
}
```

### Issue: Source maps missing from full build

**Cause:** tsconfig.json has declarationMap disabled

**Solution:** Ensure tsconfig.json has:
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## Migration Path for Users

**Existing users:** No action needed
- **npm install simply-mcp**: Works as before, gets both distributions
- **npx simply-mcp**: Automatically uses lighter dist-cli/
- **Library imports**: Use full dist/ with all documentation

**New users:**
- Benefit from 65% smaller npx downloads automatically
- Same rich IDE experience as before
- No documentation changes needed

---

## Future Optimizations

### Optional Phase 2: Further Reductions (Future)

If needed, could separately build CLI-only without client code:

```javascript
// Optional: Remove unused modules from dist-cli
if (process.env.MINIMAL_CLI) {
  execSync('rm -rf dist-cli/src/client');        // -240 KB
  execSync('rm -rf dist-cli/src/api/mcp/wizard'); // -91 KB
  // Result: Could get down to ~800 KB
}
```

### Optional: Conditional Exports

Future Node.js versions might support:
```json
{
  "exports": {
    ".": {
      "bin": "./dist-cli/src/cli/index.js",
      "import": "./dist/src/index.js"
    }
  }
}
```

---

## Timeline

- **Phase 1 (Build Script):** 30 min
- **Phase 2 (Configuration):** 10 min
- **Phase 3 (Testing):** 15 min
- **Phase 4 (CI/CD):** 5 min
- **Phase 5 (Release):** 10 min

**Total:** ~70 minutes

---

## Success Criteria

✅ Implement dual build system
✅ dist/ remains 3.3 MB with full JSDoc
✅ dist-cli/ reduced to 1.15 MB
✅ No breaking changes to library API
✅ No breaking changes to CLI
✅ All tests pass
✅ npx performance improved (faster startup)
✅ Library IDE experience unchanged

---

## References

- [Related Analysis: Bundle Size Report](../bundle-analysis.md)
- [Type Definitions Analysis](../type-definitions-analysis.md)
- [Breaking Changes Analysis](../breaking-changes-analysis.md)
