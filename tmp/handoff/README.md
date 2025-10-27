# Handoff Documents Directory

This directory contains handoff documents for this project.

## Purpose

Handoff documents serve as **read-only historical records** of work completed at specific points in time. They enable clean context transfers between:
- Different development sessions
- Different developers
- Before/after token limit boundaries
- At layer completion milestones

## File Naming Convention

All handoff documents follow this format:
```
YYYY-MM-DD-HH-MM-<descriptive-name>.md
```

**Examples**:
- `2025-10-26-14-30-ui-feature-layer-complete.md`
- `2025-10-26-15-45-auth-security-implementation.md`
- `2025-10-26-18-20-bundle-system-foundation.md`

## Important Guidelines

### ⚠️ Read-Only Files

**DO NOT modify handoff documents after creation**. They are snapshots at a specific point in time and serve as historical records.

When you complete work, **create a NEW handoff document** rather than modifying an existing one.

### Document Structure

Each handoff document contains:
1. **Read-Only Warning** - Marks document as historical snapshot
2. **Receiver Instructions** - MANDATORY steps for next developer:
   - Review `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md`
   - Use TodoWrite tool to plan work
   - Maintain context and patterns
3. **Status Overview** - What's done, what's not, next steps
4. **Completed Work** - Files modified, tests added, quality metrics
5. **Framework Reference** - Orchestrator methodology context
6. **Next Steps** - Ordered, time-estimated action items
7. **Implementation Details** - Architecture and key decisions
8. **Gotchas & Blockers** - Known issues and workarounds

### When to Create Handoffs

Create a handoff document when:
- ✓ One complete layer finished (Foundation, Feature, or Polish)
- ✓ Near token limit with significant progress
- ✓ Handing off to another developer
- ✓ Creating a clean checkpoint before ending session

### Validation Gates

All handoffs must pass:
- ✓ `npm test` passes (all tests)
- ✓ `npm run build` succeeds (zero TypeScript errors)
- ✓ Zero regressions
- ✓ One complete layer documented

## Using the Skill

To create a handoff document, invoke the skill:
```
/skill prepare-handoff
```

Or reference the skill documentation:
- Location: `~/.claude/skills/prepare-handoff/`
- Main guide: `SKILL.md`
- Template: `templates/handoff-template.md`
- Examples: `examples.md`
- Reference: `REFERENCE.md`

---

**Project**: simply-mcp-ts
**Created**: 2025-10-26
