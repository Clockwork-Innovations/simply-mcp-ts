# Orchestrator Methodology Reference

## Overview

The orchestrator methodology uses **layered development** to structure work into three phases:

- **Foundation**: Core architecture, basic structure, and infrastructure
- **Feature**: Complete functionality and integration
- **Polish**: Refinement, optimization, and edge cases

## Layered Development Pattern

Each layer builds on the previous:

```
Foundation (Create the structure)
    ↓
Feature (Fill in functionality)
    ↓
Polish (Refine and optimize)
```

### Foundation Layer

**What it includes**:
- Core interfaces and types
- Basic data structures
- Adapter/integration hooks
- Minimal tests proving structure works

**Success criteria**:
- ✓ Code compiles
- ✓ Basic tests pass (10-20 tests typical)
- ✓ Architecture is sound
- ✓ Ready for feature layer

**Example**: "Decorator API Foundation - basic decorator, metadata storage, adapter integration"

### Feature Layer

**What it includes**:
- Complete functionality
- Integration with other systems
- Comprehensive test coverage
- All use cases supported

**Success criteria**:
- ✓ All features implemented
- ✓ Tests comprehensive (30+ tests typical)
- ✓ No regressions to Foundation
- ✓ Integration complete

**Example**: "Decorator API Feature - router support, validation, middleware integration (20 new tests, 100% pass)"

### Polish Layer

**What it includes**:
- Edge case handling
- Performance optimization
- Error message improvement
- Documentation refinement

**Success criteria**:
- ✓ Edge cases covered
- ✓ Performance acceptable
- ✓ Error handling complete
- ✓ All tests still passing

**Example**: "Decorator API Polish - edge case handling, error messages, performance optimization"

## Validation Gates

Before declaring a layer complete, check:

### Compilation Gate
```bash
npm run build
# Must have zero TypeScript errors
```

### Test Gate
```bash
npm test
# All tests must pass
# New tests must show layer's functionality
```

### Regression Gate
- Compare test results to previous layer
- No tests should have regressed
- New failures mean incomplete work

## Handoff Documentation

**Location**: All handoff documents are stored in `/tmp/handoff/`

**Naming**: Use format `YYYY-MM-DD-HH-MM-<descriptive-name>.md`
- Example: `2025-10-26-14-30-ui-feature-layer-complete.md`

**Read-Only**: Handoff documents are snapshots - do NOT modify after creation

A good handoff clearly documents:

1. **Which layer is complete** (Foundation, Feature, or Polish)
2. **Validation status** (gates passed/not passed)
3. **What was done** (files modified, tests added, specific line ranges)
4. **What's next** (next layer with clear steps and time estimates)
5. **Gotchas** (blockers, dependencies, or tricky parts)

### Do NOT handoff:

- Partial work (e.g., "50% of Feature layer done")
- Without validation gates passing
- With unclear which layer was completed
- With vague next steps
- Without line number references

## Framework Reference

The full orchestrator methodology is documented in:
`/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md`

For team-specific guidance, check your project's documentation.

## Common Patterns

### Small Feature (Foundation + Feature only)
- ~20 tests total
- No Polish layer needed
- Handoff after Feature passes all gates

### Large Feature (All three layers)
- Foundation: 15 tests
- Feature: +30 tests = 45 total
- Polish: +10 tests = 55 total
- Handoff after each layer completes

### Bug Fix (Quick Polish)
- Already has Foundation + Feature
- Polish layer: focused edge case fixes
- Quick 1-2 test additions
- Handoff when Polish gates pass

## When to Stop and Handoff

### After Foundation:
- ✓ Architecture is proven
- ✓ Basic tests pass
- ✓ Ready for Feature layer work
- → Handoff for someone to build features

### After Feature:
- ✓ Feature is complete
- ✓ Integration works
- ✓ Tests comprehensive
- → Handoff for someone to polish or integrate elsewhere

### After Polish:
- ✓ Edge cases handled
- ✓ Performance acceptable
- ✓ All tests passing
- → Handoff complete, ready for integration/production

## Time Estimates

When handoff documents specify next layer, include time estimates:

- Foundation: "2-3 hours" (structure and basic tests)
- Feature: "4-6 hours" (implementation and comprehensive tests)
- Polish: "1-2 hours" (edge cases and optimization)

These help the next developer decide whether to continue in the same session.
