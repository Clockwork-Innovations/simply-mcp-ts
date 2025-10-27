# Handoff: [Feature/Component Name]

> **⚠️ READ-ONLY HANDOFF DOCUMENT**
> This document is a snapshot created at handoff time.
> Do NOT modify this file - it serves as a historical record.
> Create a new handoff document when you complete your work.

---

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

---

## Template Instructions (for document creator)

Copy this template to create your handoff document in `/tmp/handoff/` with a descriptive name:
- Format: `YYYY-MM-DD-HH-MM-<descriptive-name>.md`
- Example: `2025-10-26-14-30-ui-feature-layer-complete.md`

Replace sections in `[brackets]` with your specific details.

---

## Status Overview

```
✓ What's Done     | [List completed layers, e.g., "Foundation + Feature (Router decorator, metadata storage, adapter integration)"]
✗ What's Not      | [e.g., "Polish layer not started"; or "Edge case handling, performance optimization"]
→ Next Step       | [e.g., "Implement Polish layer: error handling and optimization"]
⊙ Why Stop Here   | [e.g., "Feature layer complete and validation gates passed"; or "Reached token limit at end of Feature"]
```

---

## Completed Work

### Files Modified
- `[path/to/file.ts:123-456]` - [Brief description of changes]
- `[path/to/another/file.ts:789-1000]` - [Brief description]

### Tests Added
- `[tests/feature.test.ts]` - [Number of new tests added]
- Total new tests: `[N tests]`
- Test pass rate: `[100%]`

### Quality Checklist
- ✓ `npm test` passes (all tests)
- ✓ `npm run build` succeeds (zero TypeScript errors)
- ✓ Zero regressions compared to previous layer
- ✓ Validation gates passed

### Verification Commands
```bash
# Run new tests for this feature
npm test -- [test-file-or-pattern]

# Full build
npm run build

# Full test suite
npm test
```

---

## Framework

This work follows the orchestrator methodology with layered development:

**Layered approach used**:
- ✓ Foundation: [e.g., "Basic decorator structure, metadata storage (15 tests)"]
- ✓ Feature: [e.g., "Router integration, validation middleware (25 tests, total 40)"]
- ○ Polish: [Status: "Not started" or "In progress" or "Complete"]

**Completed layers**: [e.g., "Foundation (15 tests, 100% pass) + Feature (25 tests, 100% pass) = 40 total, zero regressions"]

**Validation gates**: All passed ✓

**Next layer**: [Specify which layer and time estimate, e.g., "Polish layer: 1-2 hours for edge case handling"]

---

## Implementation Details

### Architecture
[Brief overview of how the feature is structured. 2-3 sentences.]

Example:
```typescript
// Key pattern used throughout
[1-2 lines of key code showing the pattern]
```

### Key Decision Points
- [Decision made and why]: [e.g., "Used composition over inheritance for adapter pattern - easier to extend"]
- [Decision made and why]: [e.g., "Stored metadata in WeakMap - prevents memory leaks"]

---

## Next Steps

### Phase: [Feature/Polish/Next Iteration]

1. **[Task 1 - clear objective]** - [Time estimate: 1-2 hours]
   - [Specific subtask]
   - [Reference to completed pattern: "Follow Router decorator pattern from src/api/decorator/..."]
   - Gotcha: [If known issue or blocker]

2. **[Task 2 - clear objective]** - [Time estimate: 2-3 hours]
   - [Specific subtask]
   - [Dependency: "Requires Task 1 to complete"]

3. **[Task 3 - clear objective]** - [Time estimate: 1 hour]
   - [Specific subtask]

### Time Estimate
Total for next phase: [X hours] (can complete in one session: yes/no)

---

## Gotchas & Blockers

- [Issue]: [Workaround or resolution]
- [Dependency]: [What blocks this and where to find info]
- [Test assumption]: [Important test behavior to know about]

---

## Reference Implementation

The completed work follows these patterns. Next layer should maintain consistency:

### Pattern 1: [Name]
```typescript
// Location: src/api/[path]/file.ts:lines
// Used for: [What this pattern does]
[Code example]
```

### Pattern 2: [Name]
```typescript
// Location: src/api/[path]/file.ts:lines
// Used for: [What this pattern does]
[Code example]
```

---

## Handoff Checklist

Before handing off, verify:

- ✓ All required sections completed
- ✓ Specific file paths and line numbers included
- ✓ `npm test` passes
- ✓ `npm run build` succeeds
- ✓ Zero regressions
- ✓ Next steps are clear and ordered
- ✓ Time estimates provided
- ✓ Someone else can start immediately from "Next Steps"

**Ready to hand off:** [YES/NO]

---

## Questions for Next Developer

Document any unanswered questions or decisions needed:

- [Question]: [Context]
- [Question]: [Context]

---

## Related Documentation

- [Link to architecture doc]
- [Link to design decisions]
- [Link to test patterns]
