---
name: Prepare Handoff Document
description: Create a next-step document when work is complete, near token limit, or handing off to another developer. Uses orchestrator methodology with layered development (Foundation → Feature → Polish). Use when finishing a feature/layer, running low on tokens with significant progress, or passing context to another developer.
---

# Prepare Handoff Document

## When to Use This Skill

- **Feature layer complete**: Foundation, Feature, or Polish layer finished with tests passing and validation gates passed
- **Near token limit**: Significant progress made but running low on tokens; document a clean stopping point
- **Handing off to another developer**: Passing context to continue work on another machine or session
- **Clean checkpoint**: Want to document the current state before ending the session

## Create Handoff Document

Create `next-task.md` with these required sections:

### 1. Status Overview
```
✓ What's Done     | Completed layers/features
✗ What's Not      | Incomplete work, skipped polish
→ Next Step       | First task to resume
⊙ Why Stop Here   | Stopping context (token limit, layer complete, etc)
```

### 2. Completed Work
- **Files modified**: `src/path/file.ts:line-range` (with line numbers)
- **Tests added**: `tests/filename.test.ts` (test files only)
- **Quality**: ✓ Tests passing, ✓ Zero regressions, ✓ Validation gates passed
- **Verify**: `npm test -- [test files]` or `npm run build`

### 3. Orchestrator Framework Reference (REQUIRED)
Include this section explicitly:
```
## Framework
This work follows the orchestrator methodology:
- Layered development: Foundation → Feature → Polish
- Completed layers: [e.g., "Decorator API Foundation + Feature (30 tests, 100% pass)"]
- Validation gates: All passed
- Next layer: [Specify with 2-3 time estimates]
```

### 4. Next Steps (3-5 bullets, ordered by dependency)
- Clear objective (what, not how)
- Time estimate per step
- Gotchas/blockers if known
- Reference patterns from completed work

For detailed guidance, see [REFERENCE.md](reference.md) and use [the template](templates/handoff-template.md).

## Pre-Handoff Checklist

```
✓ npm test passes (all tests)
✓ npm run build succeeds (no TypeScript errors)
✓ Zero regressions
✓ One complete layer (Foundation OR Feature OR Polish)
✓ next-task.md created with all sections
✓ Orchestrator framework explicitly referenced
✓ Line numbers included for file changes
✓ Next steps ordered by dependency
✓ Someone else can start immediately
```

## Key Principles

- **Concise**: One sentence per status item
- **Specific**: Include line numbers, file names, test counts
- **Orchestrated**: Reference framework, use layered approach
- **Self-contained**: No hidden assumptions or context needed
- **Actionable**: Clear next steps ordered by dependency

## Resources

- See [REFERENCE.md](reference.md) for detailed orchestrator methodology
- Use [the template](templates/handoff-template.md) for structure
- Example: `next-task.md` in the project root
