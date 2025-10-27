# /src/ Directory Restructuring - Handoff Document

**Date**: October 26, 2025
**Project**: Simply MCP TypeScript Framework
**Task**: Major /src/ directory restructuring to improve organization and maintainability
**Proposal**: `/tmp/src-migration-proposal.md`

---

## Status Overview

| Status | Description |
|--------|-------------|
| ✓ **What's Done** | Root cleanup (27 .md files archived), documentation verbosity reduction, /src/ analysis complete, migration proposal created |
| ✗ **What's Not** | /src/ restructuring not started, imports not refactored, types not consolidated |
| → **Next Step** | Phase 0 immediate cleanup (delete src/docs/, empty dirs) using safe file operations |
| ⊙ **Why Stop Here** | Need TypeScript-aware refactoring tools for import management; handoff before major structural changes |

---

## Framework

This work follows the orchestrator methodology with a phased approach:

**Completed Layers:**
- ✅ **Analysis Layer** (100% complete): Full /src/ audit, identified 40+ redundant files, 6 major structural issues
- ✅ **Planning Layer** (100% complete): Comprehensive migration proposal with before/after structure, file-by-file mapping

**Validation Gates:**
- ✅ All tests passing before analysis (53/53 tests, 100%)
- ✅ Zero regressions from root cleanup work
- ✅ Documentation cleanup validated (Grade A-)
- ✅ Migration proposal reviewed and approved

**Next Layers:**
- **Phase 0 - Immediate Cleanup** (1-2 hours): Delete redundant files, zero risk
- **Phase 1 - Structure Simplification** (3-4 hours): Consolidate server files, requires import refactoring
- **Phase 2 - Feature Extraction** (4-6 hours): Organize features into features/ directory
- **Phase 3 - Final Organization** (2-3 hours): CLI organization, final cleanup

---

## Completed Work

### Analysis & Planning

**Files Created:**
- `/tmp/src-migration-proposal.md` (630 lines) - Complete restructuring proposal
  - Current issues analysis (7 major problems identified)
  - Proposed directory structure
  - File-by-file migration mapping
  - Breaking changes analysis
  - Implementation phases with time estimates

**Analysis Results:**
- **Redundant documentation**: 30+ markdown files in `src/docs/` duplicating `/docs/`
- **Empty directories**: 2 (src/transports/, src/monitoring/)
- **Redundant wrappers**: 2 server files (stdioServer.ts, statelessServer.ts)
- **Example files in src**: 3 files in src/handlers/examples/
- **Root clutter**: 14 TypeScript files in src/ root (should be 1)
- **Type fragmentation**: Types spread across 6 different locations
- **Confusing nesting**: src/api/programmatic/ for single API pattern

**Root Cleanup Already Completed:**
- `trash/root-cleanup/` (30 files archived):
  - 27 .md developer notes/reports
  - 2 .txt summary files
  - tmp/, logs/, coverage/ directories
- `docs/PRE-RELEASE-CHECKLIST.md` (moved from root)
- `tests/fixtures/config/` (moved from root config/)
- Test files moved to appropriate tests/ subdirectories

**Documentation Cleanup Completed:**
- `claude.md` created (47 lines, 76% reduction from initial draft)
- Root directory now has exactly 3 .md files (README, CHANGELOG, claude.md)
- Clear guidelines for maintaining clean root

### Quality Metrics

**Tests:** ✅ All passing (no changes to source code yet)
```bash
npm test  # All test suites pass
```

**Build:** ✅ Clean build
```bash
npm run build  # No TypeScript errors
```

**Validation:**
- ✅ Root directory: 3 .md files only (target achieved)
- ✅ No test files in root
- ✅ No temp directories in root
- ✅ Zero breaking changes from cleanup work

---

## Key Issues Requiring TypeScript-Aware Refactoring

### Critical: Import Path Updates

**Problem**: Moving files will break imports throughout the codebase.

**Example - Moving api/programmatic → server/**:
```typescript
// Current imports (will break):
import { BuildMCPServer } from './api/programmatic/BuildMCPServer.js';
import type { InternalTool } from './api/programmatic/types.js';

// After move → server/:
import { BuildMCPServer } from './server/builder-server.js';
import type { InternalTool } from './server/builder-types.js';
```

**Affected Files**:
- `src/index.ts` (main export file) - ~267 lines, dozens of imports
- All files importing from moved modules
- External package.json "exports" field configuration

**Solution Required**: Use TypeScript Language Service for safe refactoring:

1. **TypeScript Compiler API** - Track all references
2. **ts-morph** library - AST-based refactoring
3. **VS Code Rename Symbol** - If doing manually
4. **jscodeshift** - For complex transformations

**DO NOT use simple find/replace** - it will break:
- Re-exported types
- Conditional imports
- Type-only imports vs value imports
- .js extension handling (ESM)

### Files Requiring Careful Import Management

**High-risk files (many imports):**
- `src/index.ts` (main export, 267 lines, 40+ exports)
- `src/api/programmatic/BuildMCPServer.ts` (94KB, dozens of SDK imports)
- `src/InterfaceServer.ts` (18KB, imports from core, handlers, types)
- `src/parser.ts` (67KB, complex type imports)

**Package.json exports also need updating:**
```json
{
  "exports": {
    ".": "./dist/src/index.js",
    "./client": "./dist/src/client/index.js",
    // These will need updates after restructuring
  }
}
```

---

## Next Steps (Ordered by Dependency)

### Phase 0: Immediate Cleanup (1-2 hours) ⚠️ START HERE

**ZERO RISK - No import changes needed**

```bash
# 1. Delete redundant documentation
rm -rf src/docs/
# Impact: Removes 30+ markdown files
# Risk: ZERO (not compiled, not exported)

# 2. Delete empty directories
rmdir src/transports/ src/monitoring/
# Impact: Removes 2 empty directories
# Risk: ZERO (no files affected)

# 3. Move example handlers to /examples/
mkdir -p examples/handlers/
mv src/handlers/examples/calculateHandler.ts examples/handlers/
mv src/handlers/examples/fetchDataHandler.ts examples/handlers/
mv src/handlers/examples/greetHandler.ts examples/handlers/
rmdir src/handlers/examples/
# Impact: Moves 3 example files
# Risk: ZERO (examples not imported by src)

# 4. Delete redundant server wrappers
rm src/servers/stdioServer.ts
rm src/servers/statelessServer.ts
rmdir src/servers/
# Impact: Removes 2 redundant wrapper files
# Risk: ZERO (not exported from index.ts, check with: grep -r "servers/" src/)

# 5. Move adapters README to docs
mv src/adapters/README.md docs/development/ADAPTERS.md
# Impact: Moves 1 documentation file
# Risk: ZERO (documentation only)
```

**Verification after Phase 0:**
```bash
npm run build  # Should succeed with no errors
npm test       # Should pass all tests (no source code changed)
git status     # Review deletions
```

**Time Estimate**: 15-30 minutes

---

### Phase 1: Server Consolidation (3-4 hours) ⚠️ REQUIRES TYPESCRIPT REFACTORING TOOLS

**MODERATE RISK - Many import path updates**

**Step 1.1: Setup TypeScript Refactoring Tool**

Choose ONE approach:

**Option A: ts-morph (Recommended)**
```bash
npm install --save-dev ts-morph
```

Create `scripts/refactor-imports.ts`:
```typescript
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json'
});

// Move api/programmatic → server/
const buildMCPFile = project.getSourceFile('src/api/programmatic/BuildMCPServer.ts');
buildMCPFile.move('src/server/builder-server.ts');

// Update all import paths automatically
project.saveSync();
```

**Option B: Use VS Code Rename/Move**
1. Open VS Code
2. Right-click on `src/api/programmatic/BuildMCPServer.ts`
3. Choose "Move to..." → `src/server/builder-server.ts`
4. VS Code will automatically update all imports

**Option C: jscodeshift (For complex transforms)**
```bash
npx jscodeshift -t transform.js src/
```

**Step 1.2: Create server/ directory structure**
```bash
mkdir -p src/server/
```

**Step 1.3: Move files using tool (NOT manual mv)**
```
src/InterfaceServer.ts                      → src/server/interface-server.ts
src/interface-types.ts                      → src/server/interface-types.ts
src/parser.ts                               → src/server/parser.ts
src/adapter.ts                              → src/server/adapter.ts
src/api/programmatic/BuildMCPServer.ts      → src/server/builder-server.ts
src/api/programmatic/types.ts               → src/server/builder-types.ts
```

**Step 1.4: Update index.ts exports**

After moving files, update main exports in `src/index.ts`:
```typescript
// Before:
export { InterfaceServer } from './InterfaceServer.js';
export { loadInterfaceServer } from './adapter.js';

// After:
export { InterfaceServer } from './server/interface-server.js';
export { loadInterfaceServer } from './server/adapter.js';
```

**Step 1.5: Delete api/ directory**
```bash
rm -rf src/api/
```

**Verification:**
```bash
npm run build  # Must succeed
npm test       # Must pass all tests
git diff       # Review all import changes
```

**Time Estimate**: 3-4 hours (including tool setup and testing)

---

### Phase 2: Type Consolidation (2-3 hours) ⚠️ REQUIRES CAREFUL REVIEW

**MODERATE RISK - Type imports throughout codebase**

**Current type files to consolidate:**
```
src/types.ts (1.4KB)
src/types-extended.ts (3.2KB)
src/core/types.ts
src/types/* (6 files)
```

**Target structure:**
```
src/types/
  ├── index.ts       # Re-exports all types
  ├── core.ts        # Merge types.ts + types-extended.ts
  ├── protocol.ts    # From core/types.ts
  ├── config.ts      # Existing
  ├── schema.ts      # Existing
  └── ui.ts          # Existing
```

**Process:**
1. Create consolidated `types/core.ts` merging types.ts + types-extended.ts
2. Move `core/types.ts` → `types/protocol.ts`
3. Create `types/index.ts` re-exporting everything
4. Use TypeScript refactoring tool to update imports
5. Delete original scattered files

**Verification:**
```bash
npm run build
npm test
# Check no duplicate type definitions
```

**Time Estimate**: 2-3 hours

---

### Phase 3: Feature Extraction (4-6 hours) ⚠️ LARGEST REFACTORING

**HIGH RISK - Moving 37 files from core/**

**Extract features from core/ into features/:**

```
src/core/ui-*.ts (10 files)           → src/features/ui/
src/core/component-registry.ts        → src/features/ui/components/
src/core/theme-manager.ts             → src/features/ui/themes/
src/core/dependency-*.ts (7 files)    → src/features/dependencies/
src/validation/*                      → src/features/validation/
src/auth-adapter.ts                   → src/features/auth/
src/security/*                        → src/features/auth/security/
```

**Process:**
1. Create feature directories
2. Use TypeScript refactoring tool for each feature extraction
3. Update index.ts exports to group by feature
4. Test after EACH feature extraction (don't batch)

**Time Estimate**: 4-6 hours (test frequently)

---

### Phase 4: Final Organization (2-3 hours)

**LOW RISK - CLI and utilities cleanup**

**Organize CLI:**
```bash
mkdir -p src/cli/{commands,runners,utils}
# Move files to subdirectories using TypeScript tool
```

**Organize utilities:**
```bash
mkdir -p src/utils/
# Move logger, errors, helpers from core/
```

**Time Estimate**: 2-3 hours

---

## Critical Gotchas & Blockers

### 1. ESM .js Extensions

**Problem**: All imports use `.js` extensions for ESM compatibility:
```typescript
import { foo } from './bar.js';  // NOT './bar.ts'
```

**When files move, extensions must be updated correctly.**

**Solution**: Use a tool that handles ESM extensions properly (ts-morph does this).

### 2. Re-exported Types

**Problem**: Some types are re-exported through index.ts:
```typescript
// src/index.ts
export type { ITool } from './interface-types.js';

// Users import:
import type { ITool } from 'simply-mcp';
```

**After moving interface-types.ts, the re-export path must update.**

**Solution**: Carefully review ALL exports in src/index.ts after each move.

### 3. Package.json Exports Field

**Problem**: package.json defines subpath exports:
```json
{
  "exports": {
    ".": "./dist/src/index.js",
    "./client": "./dist/src/client/index.js"
  }
}
```

**After restructuring, these paths must be updated.**

**Solution**: Review package.json exports after Phase 1 completion.

### 4. Build Output Path Changes

**Problem**: Users may rely on specific paths in dist/:
```
dist/src/api/programmatic/BuildMCPServer.js
```

**After move:**
```
dist/src/server/builder-server.js
```

**This is a BREAKING CHANGE if anyone imports from dist directly.**

**Solution**: Document breaking change, provide migration guide.

---

## Tools & Resources

### TypeScript Refactoring Tools

**ts-morph (Recommended):**
- Docs: https://ts-morph.com/
- Install: `npm install --save-dev ts-morph`
- Handles: File moves, import updates, type references
- Safe: AST-based, understands TypeScript semantics

**VS Code Built-in:**
- Right-click → "Rename Symbol" for renames
- Right-click → "Move to..." for file moves (with import updates)
- Free, no setup required

**jscodeshift:**
- For complex, custom transformations
- More powerful but steeper learning curve
- Install: `npm install --save-dev jscodeshift @types/jscodeshift`

### Verification Commands

```bash
# Before any changes
npm test && npm run build  # Establish baseline

# After each phase
npm run build              # Check TypeScript errors
npm test                   # Check test failures
git diff                   # Review all changes
git status                 # Check for untracked files

# Check imports
grep -r "api/programmatic" src/  # Should return nothing after Phase 1
grep -r "interface-types" src/   # Should use new path after Phase 1
```

### Migration Proposal Reference

**Full details**: `/tmp/src-migration-proposal.md`

Key sections:
- Lines 8-53: Immediate deletions (Phase 0)
- Lines 157-261: Proposed structure
- Lines 265-407: File-by-file migration mapping
- Lines 570-625: File count summary

---

## Pre-Handoff Checklist

- ✅ npm test passes (all 53/53 tests)
- ✅ npm run build succeeds (no TypeScript errors)
- ✅ Zero regressions from root cleanup
- ✅ Analysis layer complete (src structure audit)
- ✅ Planning layer complete (migration proposal)
- ✅ next-task.md created with all sections
- ✅ Orchestrator framework explicitly referenced
- ✅ Line numbers included for all analysis files
- ✅ Next steps ordered by dependency (Phase 0 → 1 → 2 → 3)
- ✅ TypeScript refactoring tools documented
- ✅ Import management strategy defined
- ✅ Breaking changes identified
- ✅ Someone else can start Phase 0 immediately

---

## Success Criteria

### Phase 0 Success (Immediate Cleanup)
- [ ] src/docs/ deleted (30+ files removed)
- [ ] Empty directories deleted (transports/, monitoring/)
- [ ] Example handlers moved to /examples/handlers/
- [ ] Redundant server files deleted
- [ ] npm test still passes (no regressions)
- [ ] npm run build succeeds

### Phase 1 Success (Server Consolidation)
- [ ] src/server/ directory created with all server files
- [ ] src/api/ directory deleted
- [ ] All imports updated automatically (no manual find/replace)
- [ ] index.ts exports updated
- [ ] npm test passes
- [ ] npm run build succeeds
- [ ] Zero TypeScript errors

### Phase 2 Success (Type Consolidation)
- [ ] All types consolidated into src/types/
- [ ] No duplicate type definitions
- [ ] types/index.ts re-exports all types
- [ ] All type imports updated
- [ ] npm test passes
- [ ] npm run build succeeds

### Phase 3 Success (Feature Extraction)
- [ ] features/ui/ contains all UI code
- [ ] features/dependencies/ contains dependency management
- [ ] features/validation/ contains validation logic
- [ ] features/auth/ contains authentication
- [ ] core/ directory significantly smaller
- [ ] npm test passes

### Final Success (Complete Restructuring)
- [ ] Only 1 TypeScript file in src/ root (index.ts)
- [ ] Clear directory structure: server/, protocol/, features/, cli/, utils/
- [ ] No redundant files
- [ ] No documentation in src/
- [ ] No examples in src/
- [ ] All tests passing (53/53)
- [ ] Build succeeds with zero errors
- [ ] Migration guide created for breaking changes

---

## Quick Start (For Next Developer)

```bash
# 1. Verify current state
cd /mnt/Shared/cs-projects/simply-mcp-ts/
npm test        # Should pass 53/53
npm run build   # Should succeed

# 2. Review the migration proposal
cat /tmp/src-migration-proposal.md

# 3. Start with Phase 0 (safest, immediate wins)
# See "Next Steps - Phase 0" above for exact commands

# 4. Verify Phase 0
npm run build
npm test
git status

# 5. For Phase 1+, setup TypeScript refactoring tool first
npm install --save-dev ts-morph
# Then see "Phase 1: Server Consolidation" above
```

---

**Estimated Total Time**: 10-16 hours across all phases
**Safe to start**: Phase 0 can be done immediately
**Requires planning**: Phases 1-3 need TypeScript refactoring tool setup

**Questions? Check**: `/tmp/src-migration-proposal.md` for complete details
