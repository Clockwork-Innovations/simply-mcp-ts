# Handoff Document Examples

This page shows good examples of handoff documents and explains what makes them effective.

## Example 1: Complete Handoff (Foundation + Feature)

**Location**: `../../../next-task.md` (project root)

**What to look for**:
- ✓ Clear status overview with checkmarks
- ✓ Specific file paths with line numbers
- ✓ Test count and pass rate documented
- ✓ Orchestrator framework explicitly referenced
- ✓ Next steps ordered by dependency
- ✓ Time estimates provided (2-3 hours per task)

**Key features**:
- Shows how to list multiple layers (Foundation: 15 tests + Feature: 25 tests)
- Explains validation gates clearly
- Includes specific code references
- Patterns documented for next developer

## Example 2: Structure of a Good Status Section

```
✓ What's Done     | Decorator API Foundation + Feature (40 tests, 100% pass rate)
✗ What's Not      | Polish layer not started (edge case handling, error messages)
→ Next Step       | Implement Polish layer with comprehensive error handling
⊙ Why Stop Here   | Feature layer complete and all validation gates passed; ready for Polish
```

**Why this works**:
- One line per section
- Includes concrete numbers (40 tests)
- Specifies which layer (Feature)
- Clear next step
- Explains the decision to stop

## Example 3: Completed Work Section

```markdown
### Files Modified
- `src/api/decorator/decorators.ts:1-150` - Basic decorator implementation
- `src/api/decorator/metadata.ts:1-80` - Metadata storage system
- `src/api/decorator/adapter.ts:1-120` - Adapter integration

### Tests Added
- `tests/decorator-foundation.test.ts` - Foundation layer tests (15 tests)
- `tests/decorator-feature.test.ts` - Feature layer tests (25 new tests)
- Total new tests: 40
- Pass rate: 100%

### Quality
- ✓ npm test passes (all tests)
- ✓ npm run build succeeds (zero TypeScript errors)
- ✓ Zero regressions
- ✓ Validation gates passed
```

**Why this works**:
- File paths include line ranges (specific and testable)
- Shows test distribution across layers
- Total test count clear
- Quality metrics explicit

## Example 4: Next Steps That Enable Handoff

```markdown
## Next Steps

### Phase: Polish Layer

1. **Implement comprehensive error handling** - 1-2 hours
   - Add try-catch to decorator application
   - Validate decorator arguments
   - Return meaningful error messages
   - Reference: Error handling pattern in src/api/decorator/adapter.ts:50-80

2. **Add edge case tests** - 1-2 hours
   - Test invalid decorator combinations
   - Test with class properties vs methods
   - Test inheritance scenarios
   - Verify no regressions with existing tests

3. **Performance optimization** - 30 minutes
   - Profile metadata lookup performance
   - Cache frequently accessed metadata
   - Run benchmark suite before/after

Total time: 2.5-3.5 hours
Can complete in one session: Yes
```

**Why this works**:
- Each step is clear and actionable
- Time estimates given
- Dependencies implicit (steps in order)
- References existing code patterns
- Total time calculated
- Feasibility stated

## Example 5: What NOT to Do

### ❌ Vague Handoff

```
✓ What's Done     | Added decorator support
✗ What's Not      | Some edge cases
→ Next Step       | Finish the rest
⊙ Why Stop Here   | Got tired
```

**Problems**:
- "Added decorator support" is too vague (Foundation? Feature?)
- "Some edge cases" is unclear
- No test count
- "Finish the rest" doesn't explain what
- No validation gates mentioned

### ❌ Partial Layer Handoff

```
This is 50% done with the Feature layer. I got the router support working but validation middleware is still in progress.
```

**Problems**:
- Partial work (50% of Feature)
- No clear validation gate status
- Next developer has to figure out what's broken
- Can't test reliably

### ❌ Missing Framework Reference

```
✓ Tests: 35 passing
✗ Next: Error handling
```

**Problems**:
- No orchestrator framework mentioned
- Unclear which layer this is
- No layered development context
- Can't verify against methodology

## Anatomy of a Good Handoff

A good handoff has these characteristics:

### 1. Crystal Clear Status
```
✓ What's Done     | [Specific layers with test counts]
```
Not just "done" but "Foundation (15 tests) + Feature (25 tests, 40 total, 100% pass)"

### 2. Precise File References
```
- src/api/decorator/decorators.ts:1-150
```
Not just "src/api/decorator/decorators.ts" but include line ranges

### 3. Explicit Framework Reference
```
This work follows the orchestrator methodology:
- Completed layers: Foundation (15 tests) + Feature (25 tests)
- Validation gates: All passed
```

### 4. Ordered Next Steps
```
1. First dependency
2. Depends on step 1
3. Depends on steps 1-2
```
Not random order, but dependency order

### 5. Time Estimates
```
- Step 1: 1-2 hours
- Step 2: 2-3 hours
- Total: 3-5 hours
- Can complete in one session: Yes/No
```

### 6. Reference Patterns
```
Follow the pattern from src/api/decorator/adapter.ts:50-80
```
Helps maintain consistency

## Common Mistakes

### ❌ Mistake 1: Unclear Layer
**Wrong**: "Completed work on decorators"
**Right**: "Completed Decorator API Foundation layer (15 tests, 100% pass)"

### ❌ Mistake 2: Generic File References
**Wrong**: `src/api/decorator/decorators.ts`
**Right**: `src/api/decorator/decorators.ts:1-150`

### ❌ Mistake 3: Missing Test Context
**Wrong**: "15 tests passing"
**Right**: "Foundation layer: 15 tests (100% pass); Feature layer: 25 new tests (100% pass); Total: 40 tests, zero regressions"

### ❌ Mistake 4: Vague Next Steps
**Wrong**: "Do error handling"
**Right**: "Implement comprehensive error handling (1-2 hours): Add try-catch to decorator application, validate arguments, return meaningful messages"

### ❌ Mistake 5: Missing Gotchas
**Wrong**: [No section for known issues]
**Right**:
```
Gotchas:
- WeakMap behavior with multiple instances (see test on line 123)
- Inheritance requires special handling (documented in adapter pattern)
```

## Quick Checklist

When reviewing a handoff, verify:

- ✓ Status section has all 4 items (Done, Not, Next, Why)
- ✓ At least one complete layer documented
- ✓ File paths include line numbers
- ✓ Test count and pass rate explicit
- ✓ Orchestrator framework mentioned
- ✓ Validation gates status clear
- ✓ Next steps are 3-5 items
- ✓ Each step has time estimate
- ✓ No partial layer work
- ✓ Someone else could start immediately

## Tips for Writing Great Handoffs

1. **Use the template**: Start with `templates/handoff-template.md`
2. **Be specific**: Replace every `[bracket]` with real information
3. **Include numbers**: Test counts, line ranges, time estimates
4. **Reference patterns**: Help the next developer by showing code patterns
5. **Test first**: Verify validation gates before handoff
6. **Ask questions**: If you're unclear, document the question for the next developer
7. **Review against framework**: Ensure orchestrator methodology is followed
8. **Peer review**: Have someone else read it before handing off

## When to Handoff

Hand off after:

- ✓ One complete layer finished (Foundation, Feature, or Polish)
- ✓ Validation gates passed
- ✓ Tests comprehensive for that layer
- ✓ All regressions resolved
- ✓ Documentation complete

Do NOT hand off:

- ✗ Partial layer work
- ✗ Failing tests
- ✗ TypeScript compilation errors
- ✗ Regressions present
- ✗ Vague next steps

## Further Reading

- [REFERENCE.md](reference.md) - Orchestrator methodology details
- [SKILL.md](../SKILL.md) - How to use this skill
- [handoff-template.md](handoff-template.md) - Template to use as starting point
