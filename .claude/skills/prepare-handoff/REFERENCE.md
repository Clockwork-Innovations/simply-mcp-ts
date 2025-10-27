# Reference Materials

## Handoff Document Format

**Location**: All handoff documents are stored in `/tmp/handoff/`

**Naming Convention**: `YYYY-MM-DD-HH-MM-<descriptive-name>.md`
- Example: `2025-10-26-14-30-ui-feature-layer-complete.md`
- Example: `2025-10-26-15-45-auth-security-implementation.md`

**Read-Only**: Handoff documents are snapshots at handoff time. They should NOT be modified after creation - they serve as historical records. When completing your work, create a NEW handoff document rather than modifying an existing one.

## Core Framework

**Agentic Coding Loop: Orchestrator Guide**
Path: `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md` (v2.1)

This is the foundational document that defines:
- Layered development methodology (Foundation → Feature → Polish)
- Validation gates and test validity requirements
- Decomposition and orchestration patterns
- Iteration protocol and escalation criteria

**All handoff documents must reference and follow this framework.**

## Key Orchestrator Concepts for Handoffs

### Layered Development
- **Foundation**: Minimal viable implementation (core functionality only)
- **Feature**: Add essential capabilities and proper error handling
- **Polish**: Complete feature set with optimizations and refinements

Each layer must be fully validated before the next begins.

### Validation Gates
Every completed layer must pass:
1. Code compilation (no TypeScript errors)
2. Test execution (all tests passing, not skipped)
3. Test validity (separate validation agent confirms assertions are meaningful)
4. Regression testing (zero regressions in existing functionality)
5. Requirements met (layer objectives achieved)

### Task State Tracking
Use TodoWrite tool to maintain explicit task state:
- **pending**: Tasks not yet started
- **in_progress**: Currently active task (limit to ONE)
- **completed**: Task fully finished

### When to Use Layered Development
**Use it for:**
- Building NEW complex features from scratch
- Features spanning multiple files/systems
- Multiple distinct capabilities needed

**Don't use it for:**
- Simple bug fixes
- Modifying/enhancing existing features
- Single-file changes
- Fixing something that already works

## How Handoffs Integrate with Orchestration

Your handoff document (saved in `/tmp/handoff/` with a descriptive timestamped name) should capture:

1. **Receiver instructions**: Explicit steps for the next developer to follow
   - Review ORCHESTRATOR_PROMPT.md before starting
   - Use TodoWrite tool to plan work
   - Maintain context and patterns

2. **Current orchestration state**: Which layer(s) completed, which is next

3. **Task checkpoint**: All tasks with current state (pending/in_progress/completed)

4. **Validation proof**: Documentation that all gates passed for completed layers

5. **Structured continuity**: Next subtask unambiguous (ordered by dependency)

6. **Reference materials**: Active documentation used during this session

This enables the next developer to:
- **Start properly**: Review orchestrator framework before jumping into code
- **Plan work**: Use TodoWrite to break down tasks systematically
- Understand exactly what layer of work was completed
- See all validation gates that passed
- Know the exact state of all tasks
- Resume immediately at the next ordered subtask
- Have all reference materials at hand

## Orchestrator Mantras

From `ORCHESTRATOR_PROMPT.md`:

- **Match complexity to task**: simple → work directly, complex → orchestrate with layers
- **Layered = Foundation → Feature → Polish** (only for NEW complex features)
- **Each layer fully validated before next begins**
- **Never trust agents to validate their own tests** (separate validation agent required)
- **"Tests pass" means nothing without test validity confirmation**
- **Working code at each layer > perfect code at the end**
- **Max 2-3 iterations per layer before escalation**

---

**When creating a handoff document, always reference the Agentic Coding Loop framework and ensure your document reflects its principles.**
