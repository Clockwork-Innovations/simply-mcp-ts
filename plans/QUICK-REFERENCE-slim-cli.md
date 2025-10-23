# Slim CLI for NPX - Quick Reference

## One-Line Summary
Create two build outputs: **dist/** (full, 3.3 MB) for npm, **dist-cli/** (lite, 1.15 MB) for npx.

## Problem
```
npx simply-mcp → downloads 3.3 MB (has 1.3 MB unused source maps, 250 KB unused examples)
```

## Solution
```
npx simply-mcp → uses dist-cli/ (1.15 MB) - 65% smaller
npm install     → uses dist/ (3.3 MB) - unchanged
```

## What Changes

### 1. Create Build Script
**File:** `scripts/build.js`
- Compile TypeScript normally → `dist/`
- Copy to `dist-cli/`
- Strip `@example` blocks from .d.ts
- Remove `.map` files

### 2. Update package.json

**bin entries:**
```json
"bin": {
  "simply-mcp": "./dist-cli/src/cli/index.js",  // ← changed
  ...
}
```

**files array:**
```json
"files": [
  "dist",      // ← add this line
  "dist-cli",  // ← add this line
  "src/*.js",
  "src/*.ts",
  ...
]
```

**scripts:**
```json
"scripts": {
  "build": "node scripts/build.js",  // ← changed
  "clean": "rm -rf dist dist-cli"    // ← changed
}
```

### 3. Verify Exports Still Work
**No changes needed** - exports still point to `dist/`:
```json
"exports": {
  ".": {
    "types": "./dist/src/index.d.ts",  // ← dist/ (not dist-cli/)
    "import": "./dist/src/index.js"
  }
}
```

## What Gets Stripped from dist-cli/

| Item | Size | Reason |
|------|------|--------|
| `@example` code blocks | ~250 KB | Rarely used in npx |
| Source maps (.map) | ~1.3 MB | Dev-only, not needed |
| JSDoc examples | ~300 KB | Documentation, not code |
| **Total removed** | **~1.85 MB** | **65% reduction** |

## What Stays in dist-cli/

✅ All .js files (runtime)
✅ All .d.ts files (types)
✅ @param/@returns docs
✅ @throws documentation
✅ Everything that makes CLI work

## Testing Checklist

```bash
# Build
npm run build

# Should create both
ls -d dist dist-cli   # Both exist

# Check sizes
du -sh dist dist-cli  # dist: 3.3 MB, dist-cli: 1.15 MB

# CLI works
node dist-cli/src/cli/index.js --help

# Library works
node -e "const {BuildMCPServer} = require('./dist/src'); console.log('✅')"

# CLI has no maps
find dist-cli -name "*.map" | wc -l  # Should be 0

# Full has maps
find dist/src -name "*.map" | wc -l  # Should be > 0
```

## Size Tracking

```bash
# Monitor build sizes
du -sh dist dist-cli

# Before implementation:
# dist/     3.3 MB
# dist-cli/ 3.3 MB

# After implementation:
# dist/     3.3 MB (unchanged)
# dist-cli/ 1.15 MB (65% smaller)
```

## User Impact

| Use Case | Before | After | Change |
|----------|--------|-------|--------|
| `npx simply-mcp` | 3.3 MB | 1.15 MB | **✅ 65% smaller** |
| `npm install` | 3.3 MB | 3.3 MB | No change |
| IDE hover docs | Full JSDoc | Full JSDoc | No change |
| Type checking | Full types | Full types | No change |

## No Breaking Changes

```typescript
// ✅ All existing code works
import { BuildMCPServer } from 'simply-mcp';
const server = new BuildMCPServer({ name: 'test', version: '1.0' });
server.addTool({ ... });

// ✅ CLI still works
npx simply-mcp run server.ts

// ✅ IDE hints still show
// Hover over methods → see full @param/@returns docs
```

## Implementation Time

| Phase | Time |
|-------|------|
| Create build script | 30 min |
| Update config | 10 min |
| Testing & validation | 15 min |
| CI/CD updates | 5 min |
| **Total** | **~1 hour** |

## Key Files to Create/Modify

### Create
- ✨ `scripts/build.js` - Dual build logic
- ✨ `scripts/test-build.sh` - Validation script

### Modify
- 📝 `package.json` - Update bin, files, scripts
- 📝 `.github/workflows/build.yml` - CI/CD (if exists)

### No Changes Needed
- ✅ `tsconfig.json`
- ✅ `src/**/*.ts`
- ✅ Export configuration

## Quick Start Commands

```bash
# Copy full implementation from slim-cli-for-npx.md
# Create scripts/build.js with the build script code

# Test it works
npm run clean
npm run build
./scripts/test-build.sh

# Done! Now:
npm publish  # Publishes both dist/ and dist-cli/
npx simply-mcp --help  # Uses dist-cli/ (1.15 MB)
```

## FAQ

**Q: Will this break anything?**
A: No. Both versions are identical except for docs/maps. Runtime behavior unchanged.

**Q: Do library users lose anything?**
A: No. They get `dist/` with full JSDoc.

**Q: Do CLI users lose anything?**
A: Only hover tooltip examples (kept @param/@returns docs). Worth the 65% reduction.

**Q: What if someone needs the examples?**
A: They can: 1) Check docs website, 2) Read GitHub source, 3) Install locally with npm.

**Q: What if this breaks in CI?**
A: Check that bin entries point to `dist-cli/` and files array includes both dirs.

## Next Steps

1. Read full plan: `plans/slim-cli-for-npx.md`
2. Create `scripts/build.js` from the plan
3. Update `package.json` (3 sections)
4. Test: `npm run build && ./scripts/test-build.sh`
5. Verify all tests pass
6. Commit and release

---

**Benefit:** npx users get 65% faster downloads while library users see zero changes.
**Effort:** ~1 hour implementation
**Risk:** Very low (no breaking changes)
