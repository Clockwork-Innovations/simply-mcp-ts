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

Create a descriptively named handoff document in `/tmp/handoff/` with these required sections:

**File naming**: Use format `YYYY-MM-DD-HH-MM-<descriptive-name>.md`
- Example: `2025-10-26-14-30-ui-feature-layer-complete.md`
- Example: `2025-10-26-15-45-auth-security-implementation.md`

**Location**: All handoff documents go in `/tmp/handoff/`

**Read-Only Notice**: Include this header at the top:
```markdown
> **⚠️ READ-ONLY HANDOFF DOCUMENT**
> This document is a snapshot created at handoff time.
> Do NOT modify this file - it serves as a historical record.
> Create a new handoff document when you complete your work.
```

**Receiver Instructions**: Include clear instructions for the next developer:
```markdown
## 📋 Instructions for Receiver

**Before starting work, you MUST:**

1. **Review the Orchestrator Framework**
   - Read: `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md` (v2.1)
   - Understand the layered development approach (Foundation → Feature → Polish)
   - Understand validation gates and test validity requirements

2. **Plan Your Work**
   - Use the TodoWrite tool to create a task list based on the "Next Steps" section below
   - Break down tasks following the orchestrator methodology
   - Mark ONE task as `in_progress` before you begin

3. **Maintain Context**
   - Follow the patterns referenced in this document
   - Maintain the same test quality standards
   - Run validation gates before marking layers complete
```

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
✓ Handoff document created in /tmp/handoff/ with descriptive name
✓ Read-only notice included at top of document
✓ Receiver instructions included (review ORCHESTRATOR_PROMPT.md, use TodoWrite)
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
- View previous handoff documents in `/tmp/handoff/` for examples
