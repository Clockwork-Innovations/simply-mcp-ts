# Phase 1 Architecture Design Summary

**Document:** PHASE-1-ARCHITECTURE.md
**Date:** 2025-10-18
**Status:** Ready for Team Review

---

## Overview

This summary provides a high-level overview of the Phase 1 Context System architecture designed for the FastMCP parity implementation across TypeScript and Python repositories.

---

## Key Architectural Decisions

### 1. Context Object Structure

**Three Property Groups:**

```typescript
interface Context {
  fastmcp: FastMCPInfo;           // Server metadata (immutable)
  session: Session;                // Session operations (async methods)
  request_context: RequestContext; // Request-specific data (immutable)
}
```

**Property Distribution:**

| Group | Purpose | Properties | Phase 1 |
|-------|---------|------------|---------|
| `fastmcp` | Server metadata | `name`, `version`, `description`, `instructions`, `website_url`, `icons`, `settings` | 3/7 properties |
| `session` | Client interaction | `client_params` + 7 async methods | All methods stubbed |
| `request_context` | Request data | `request_id`, `meta`, `lifespan_context` | `request_id` only |

---

### 2. Session Methods (All Async)

**Phase 1 Implementation:** All methods are stubbed with warning logs or NotImplementedError

| Method | Purpose | Implementation |
|--------|---------|----------------|
| `send_log_message()` | Send log to client | Phase 2 |
| `create_message()` | Request LLM completion | Phase 2 |
| `send_progress_notification()` | Send progress updates | Phase 2 |
| `send_resource_updated()` | Notify resource changed | Phase 2 |
| `send_resource_list_changed()` | Notify resource list changed | Phase 2 |
| `send_tool_list_changed()` | Notify tool list changed | Phase 2 |
| `send_prompt_list_changed()` | Notify prompt list changed | Phase 2 |

**Key Principle:** All methods return `Promise<void>` (TS) or are `async def` (Python) for consistency.

---

### 3. Request ID System

**Generation:**
- TypeScript: `randomUUID()` from `node:crypto`
- Python: `uuid.uuid4()`
- Format: UUID v4 (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)

**Lifecycle:**
1. Generate fresh ID per request
2. Create `RequestContext` with ID
3. Bundle into `Context` object
4. Pass to handler
5. Handler accesses via `context.request_context.request_id`

**Thread Safety:**
- TypeScript: Single-threaded event loop (no concerns)
- Python: Immutable `RequestContext` (no race conditions)

---

### 4. Handler Integration

**Backward Compatibility Strategy:**

```typescript
// Old style (still works)
async function oldTool(args: any) {
  return "Result";
}

// New style (with context)
async function newTool(args: any, context: Context) {
  console.log(context.request_context.request_id);
  return "Result";
}
```

**Implementation:**
- Optional context parameter: `execute(args: T, context?: Context)`
- Handlers without context continue to work
- Handlers with context receive full Context object

**Integration Points:**
- Tool handlers: `tools/call` → `execute(args, context?)`
- Prompt handlers: `prompts/get` → `template(args, context?)`
- Resource handlers: `resources/read` → `content(context?)`

---

### 5. Cross-Language Consistency

**Naming Conventions:**
- Classes: `PascalCase` (universal)
- Properties: `snake_case` (`request_id`, `website_url`)
- Methods: `snake_case` (`send_log_message()`)

**Async Patterns:**
- TypeScript: `async/await` with `Promise<T>`
- Python: `async def` with `await`
- No synchronous fallbacks (forces consistency)

**Type Safety:**
- TypeScript: Full interface definitions with `readonly` properties
- Python: `@dataclass(frozen=True)` for immutability, ABC for Session

---

## Implementation Plan

### Files to Create (7 per repo)

**TypeScript:**
```
src/core/Context.ts
src/core/SessionImpl.ts
src/core/RequestContext.ts
src/core/request-id.ts
tests/context.test.ts
tests/request-id.test.ts
tests/integration/context-injection.test.ts
```

**Python:**
```
src/simply_mcp/core/context.py
src/simply_mcp/core/session_impl.py
src/simply_mcp/core/request_id.py
tests/test_context.py
tests/test_request_id.py
tests/integration/test_context_injection.py
src/simply_mcp/core/__init__.py (update exports)
```

### Files to Modify (3 TS, 2 PY)

**TypeScript:**
- `src/api/programmatic/types.ts` (update signatures)
- `src/api/programmatic/BuildMCPServer.ts` (inject context)
- `src/core/types.ts` (optional deprecation)

**Python:**
- `src/simply_mcp/core/server.py` (inject context)
- `src/simply_mcp/core/types.py` (update type hints)

---

## Implementation Order (5 Days)

### Day 1: Core Classes
- Define all interfaces/dataclasses
- Implement SessionImpl with stubs
- Create request ID generation

### Day 2: BuildMCPServer Integration
- Initialize `fastmcpInfo` and `sessionObject` in constructor
- Create Context in tool handler registration
- Create Context in prompt handler registration
- Create Context in resource handler registration

### Day 3: Handler Signatures
- Update `ExecuteFunction` type
- Update `PromptDefinition.template` type
- Update `ResourceDefinition.content` type

### Day 4: Testing
- Unit tests for Context creation
- Unit tests for request ID uniqueness
- Integration tests for backward compatibility

### Day 5: Documentation & Review
- Update API documentation
- Add usage examples
- Cross-repo parity verification

---

## Success Criteria

**Must Have:**
- [ ] Context object with 3 property groups implemented
- [ ] Request ID system generating unique UUIDs
- [ ] All session methods stubbed (7 methods)
- [ ] Context injected into all handler types
- [ ] Backward compatibility maintained
- [ ] Test coverage > 90%
- [ ] Cross-repo API parity verified

**Quality Gates:**
- All unit tests passing
- All integration tests passing
- No breaking changes to existing handlers
- Documentation complete
- Both repos synchronized

---

## Risk Mitigation

### High Risk: Breaking Changes
**Risk:** Existing handlers break with new context parameter
**Mitigation:** Optional parameter with default value
**Test:** Extensive backward compatibility tests

### Medium Risk: Performance
**Risk:** Context creation overhead per request
**Mitigation:** Lightweight object creation, shared Session instance
**Test:** Benchmark before/after implementation

### Low Risk: Type Safety
**Risk:** Developers misuse Context API
**Mitigation:** Strong TypeScript types, Python type hints, comprehensive docs
**Test:** Example-based validation

---

## Next Steps

1. **Team Review** (1 hour)
   - Review architecture document
   - Approve design decisions
   - Identify any concerns

2. **Kick-off Meeting** (Monday Week 1)
   - Sync both teams
   - Assign implementation tasks
   - Set up daily standups

3. **Implementation** (Week 1-2)
   - Parallel development in both repos
   - Daily sync on progress
   - Integration testing Friday Week 2

4. **Phase 2 Planning** (End of Week 2)
   - Review Phase 1 completion
   - Plan notification system implementation
   - Schedule Phase 2 kick-off

---

## Questions for Team Review

1. **Context vs HandlerContext:** Should we replace `HandlerContext` entirely or extend it?
   - **Recommendation:** Replace for cleaner separation

2. **Session Instance:** Should Session be per-MCP-session or singleton?
   - **Recommendation:** Per-MCP-session for future multi-session support

3. **Request ID Format:** UUID v4 sufficient or need custom format?
   - **Recommendation:** UUID v4 is standard and sufficient

4. **Stub Warnings:** Console warnings or silent stubs?
   - **Recommendation:** Console warnings for developer feedback

5. **Migration Guide:** Do we need a migration guide for Phase 1?
   - **Recommendation:** Yes, even though it's backward compatible (helps adoption)

---

## Resources

- **Full Architecture:** `/plans/fastmcp-parity/PHASE-1-ARCHITECTURE.md`
- **Main Plan:** `/plans/fastmcp-parity/FASTMCP-PARITY-PLAN.md`
- **Task Breakdown:** `/plans/fastmcp-parity/PHASE-1-TASKS.md`
- **Coordination:** `/plans/fastmcp-parity/COORDINATION.md`

---

**Prepared By:** Architecture Team
**Review Status:** Pending Team Approval
**Target Start:** Week 1 Monday
**Target Completion:** Week 2 Friday
