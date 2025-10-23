# Reference Materials

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

Your `next-task.md` handoff document should capture:

1. **Current orchestration state**: Which layer(s) completed, which is next
2. **Task checkpoint**: All tasks with current state (pending/in_progress/completed)
3. **Validation proof**: Documentation that all gates passed for completed layers
4. **Structured continuity**: Next subtask unambiguous (ordered by dependency)
5. **Reference materials**: Active documentation used during this session

This enables the next developer to:
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
