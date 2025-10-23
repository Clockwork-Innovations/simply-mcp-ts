# Phase 2: Notifications & Session Enhancement - Planning Documents

**Status**: Ready for Implementation
**Created**: 2025-10-18
**Phase**: FastMCP Parity - Phase 2

---

## Overview

This directory contains comprehensive planning documents for Phase 2 of the FastMCP parity initiative. Phase 2 focuses on implementing MCP notification capabilities and session enhancements.

**Goal**: Achieve full parity with FastMCP's session features using ONLY MCP SDK primitives.

---

## Document Index

### 1. Architecture Document
**File**: [PHASE-2-ARCHITECTURE.md](./PHASE-2-ARCHITECTURE.md)
**Size**: ~30 KB
**Purpose**: Complete technical architecture and design specifications

**Contents**:
- Executive Summary
- System architecture diagrams (text-based)
- Component design (SessionImpl, ContextBuilder, BuildMCPServer)
- MCP SDK integration points
- Data flow diagrams for all notification types
- Client capability detection strategy
- Error handling strategy
- Backward compatibility analysis
- Security considerations

**When to Read**: First - understand the overall architecture before implementation

---

### 2. Implementation Guide
**File**: [PHASE-2-IMPLEMENTATION-GUIDE.md](./PHASE-2-IMPLEMENTATION-GUIDE.md)
**Size**: ~32 KB
**Purpose**: Step-by-step implementation instructions for all three layers

**Contents**:
- **Layer 1**: Client Capabilities + Logging
  - Step-by-step code changes with exact line numbers
  - SessionImpl constructor update
  - send_log_message() implementation
  - ContextBuilder updates
  - BuildMCPServer initialize handler
  - Testing instructions

- **Layer 2**: List Changed Notifications
  - send_resource_updated() implementation
  - send_resource_list_changed() implementation
  - send_tool_list_changed() implementation
  - send_prompt_list_changed() implementation
  - Testing instructions

- **Layer 3**: Progress + Sampling
  - send_progress_notification() implementation
  - create_message() implementation with capability checks
  - Testing instructions

- **Testing Strategy**: Unit, integration, and E2E tests
- **Validation Checklist**: Complete checklist for each layer
- **Troubleshooting**: Common issues and solutions

**When to Read**: Second - follow this during implementation

---

### 3. Code Examples
**File**: [PHASE-2-CODE-EXAMPLES.md](./PHASE-2-CODE-EXAMPLES.md)
**Size**: ~29 KB
**Purpose**: Production-ready code snippets and comprehensive examples

**Contents**:
- **Complete SessionImpl Implementation**: Full production code (copy-paste ready)
- **Complete ContextBuilder Updates**: All necessary changes
- **BuildMCPServer Initialize Handler**: Two implementation options
- **Usage Examples**:
  - Basic logging in tools
  - Progress tracking for long-running operations
  - LLM sampling requests
  - Dynamic resource updates
  - Multi-tool orchestration with notifications
- **Test Examples**:
  - Unit tests for SessionImpl methods
  - Integration tests for full server
  - Mock server setup

**When to Read**: During implementation - reference for exact code patterns

---

## Implementation Workflow

### Recommended Approach

```
1. READ: PHASE-2-ARCHITECTURE.md
   └─> Understand the design and architecture
       └─> Review component diagrams
       └─> Understand data flows
       └─> Review error handling strategy

2. IMPLEMENT: Layer 1 (using PHASE-2-IMPLEMENTATION-GUIDE.md)
   └─> Step 1.1: Update SessionImpl constructor
   └─> Step 1.2: Implement send_log_message()
   └─> Step 1.3: Update ContextBuilder
   └─> Step 1.4: Implement setClientParams()
   └─> Step 1.5: Add initialize handler
   └─> Step 1.6: Test Layer 1
   └─> REFERENCE: PHASE-2-CODE-EXAMPLES.md for exact code

3. VERIFY: Layer 1 Tests Pass
   └─> Unit tests pass
   └─> Integration tests pass
   └─> Manual testing with MCP Inspector

4. IMPLEMENT: Layer 2 (using PHASE-2-IMPLEMENTATION-GUIDE.md)
   └─> Step 2.1-2.4: Implement all list change methods
   └─> Step 2.5: Test Layer 2
   └─> REFERENCE: PHASE-2-CODE-EXAMPLES.md for exact code

5. VERIFY: Layer 2 Tests Pass
   └─> All Layer 1 tests still pass
   └─> Layer 2 tests pass
   └─> Manual testing with MCP Inspector

6. IMPLEMENT: Layer 3 (using PHASE-2-IMPLEMENTATION-GUIDE.md)
   └─> Step 3.1: Implement send_progress_notification()
   └─> Step 3.2: Implement create_message()
   └─> Step 3.3: Test Layer 3
   └─> REFERENCE: PHASE-2-CODE-EXAMPLES.md for exact code

7. VERIFY: Layer 3 Tests Pass
   └─> All previous tests still pass
   └─> Layer 3 tests pass
   └─> E2E testing with Claude Desktop

8. FINALIZE:
   └─> Run complete test suite
   └─> Update documentation
   └─> Update examples
   └─> Update changelog
   └─> Create PR for review
```

---

## Key Architectural Decisions

### 1. MCP SDK Only
**Decision**: Use ONLY MCP SDK primitives, NOT FastMCP library
**Rationale**: Avoid circular dependencies, maintain independence
**Impact**: All notification methods use `@modelcontextprotocol/sdk` directly

### 2. Three-Layer Implementation
**Decision**: Progressive enhancement in three layers
**Rationale**:
- Enables incremental testing
- Reduces risk of breaking changes
- Easier to debug and validate
**Layers**:
- Layer 1: Foundation (capabilities + logging)
- Layer 2: Dynamic updates (list changes)
- Layer 3: Advanced (progress + sampling)

### 3. Graceful Degradation for Notifications
**Decision**: Notifications fail silently, sampling fails fast
**Rationale**:
- Notifications are "fire-and-forget" - shouldn't crash tools
- Sampling requires response - must fail clearly if unsupported
**Impact**:
- Logging errors caught and logged to stderr
- Sampling errors thrown with helpful messages

### 4. Capability Detection
**Decision**: Capture capabilities during initialize, expose via session.client_params
**Rationale**: Enables tools to adapt behavior based on client capabilities
**Implementation**: Hook into MCP SDK's initialize handler or lazy-load on first request

### 5. Backward Compatibility
**Decision**: All changes internal, public API unchanged
**Rationale**: Seamless upgrade for existing Simply-MCP users
**Impact**:
- No breaking changes to Context interface
- Tool handlers work identically before/after upgrade
- SessionImpl changes are internal implementation details

---

## File Locations

### Files to Modify

| File | Path | Changes |
|------|------|---------|
| SessionImpl | `/mnt/Shared/cs-projects/simple-mcp/src/core/SessionImpl.ts` | Complete rewrite (70 lines → ~250 lines) |
| ContextBuilder | `/mnt/Shared/cs-projects/simple-mcp/src/core/ContextBuilder.ts` | Add field, update constructor, implement setClientParams() |
| BuildMCPServer | `/mnt/Shared/cs-projects/simple-mcp/src/api/programmatic/BuildMCPServer.ts` | Add initialize handler hook |
| Context (types) | `/mnt/Shared/cs-projects/simple-mcp/src/core/Context.ts` | No changes needed (interface already defined) |

### Files to Create

| File | Path | Purpose |
|------|------|---------|
| Layer 1 Tests | `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer1.test.ts` | Unit tests for capabilities + logging |
| Layer 2 Tests | `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer2.test.ts` | Unit tests for list changes |
| Layer 3 Tests | `/mnt/Shared/cs-projects/simple-mcp/tests/phase2-layer3.test.ts` | Unit tests for progress + sampling |
| Integration Test Server | `/mnt/Shared/cs-projects/simple-mcp/examples/phase2-test-server.ts` | Example server for manual testing |

---

## Testing Strategy

### Unit Tests (Vitest)
- Mock MCP Server instance
- Test each SessionImpl method independently
- Validate error handling
- Coverage requirement: 100%

### Integration Tests
- Use `BuildMCPServer.executeToolDirect()` for synchronous testing
- Test full tool execution with notifications
- Verify context injection works correctly

### Manual Testing (MCP Inspector)
- Start test server with `npx @modelcontextprotocol/inspector`
- Call tools and verify notifications appear
- Test progress tracking visually
- Verify sampling requests (if client supports)

### End-to-End Testing (Claude Desktop)
- Configure Claude Desktop with test server
- Execute tools through Claude chat interface
- Verify logging appears in Claude Desktop logs
- Verify progress shows in UI (if supported)
- Verify sampling requests work

---

## Success Criteria

Phase 2 is complete when:

- [ ] All three layers implemented
- [ ] All unit tests pass (100% coverage)
- [ ] Integration tests pass
- [ ] Manual testing successful with MCP Inspector
- [ ] E2E testing successful with Claude Desktop
- [ ] No breaking changes to public API
- [ ] All existing tests still pass
- [ ] Documentation updated
- [ ] Examples updated
- [ ] Changelog updated
- [ ] Code reviewed and approved
- [ ] Merged to main branch

---

## MCP SDK Methods Used

### Server Methods (from @modelcontextprotocol/sdk)

```typescript
// Capability queries
server.getClientCapabilities(): ClientCapabilities | undefined
server.getClientVersion(): Implementation | undefined

// Notification methods (high-level)
server.sendLoggingMessage(params: { level, data, logger? }): Promise<void>
server.sendResourceUpdated(params: { uri }): Promise<void>
server.sendResourceListChanged(): Promise<void>
server.sendToolListChanged(): Promise<void>
server.sendPromptListChanged(): Promise<void>

// Request methods
server.createMessage(params: CreateMessageRequest['params']): Promise<CreateMessageResult>

// Generic notification (for progress)
server.notification(notification: Notification): Promise<void>
```

### Notification Schemas

```typescript
// From @modelcontextprotocol/sdk/types.js
LoggingMessageNotificationSchema        // "notifications/message"
ProgressNotificationSchema               // "notifications/progress"
ResourceUpdatedNotificationSchema        // "notifications/resources/updated"
ResourceListChangedNotificationSchema    // "notifications/resources/list_changed"
ToolListChangedNotificationSchema        // "notifications/tools/list_changed"
PromptListChangedNotificationSchema      // "notifications/prompts/list_changed"
CreateMessageRequestSchema               // "sampling/createMessage"
```

---

## Dependencies

### Runtime Dependencies
- `@modelcontextprotocol/sdk` (already installed)
- No new dependencies required

### Dev Dependencies
- `vitest` (already installed)
- No new dev dependencies required

---

## Timeline Estimate

Based on three-layer approach with testing:

| Layer | Tasks | Estimated Time |
|-------|-------|----------------|
| Layer 1 | Setup + Capabilities + Logging | 2-3 hours |
| Layer 1 Testing | Unit + Integration + Manual | 1-2 hours |
| Layer 2 | List Change Notifications | 1-2 hours |
| Layer 2 Testing | Unit + Integration + Manual | 1 hour |
| Layer 3 | Progress + Sampling | 2-3 hours |
| Layer 3 Testing | Unit + Integration + E2E | 2 hours |
| Documentation | Update docs + examples | 1 hour |
| Review & Polish | Code review + fixes | 1-2 hours |
| **Total** | | **11-16 hours** |

---

## Questions or Issues?

If you encounter issues during implementation:

1. Check [PHASE-2-IMPLEMENTATION-GUIDE.md](./PHASE-2-IMPLEMENTATION-GUIDE.md) Troubleshooting section
2. Review [PHASE-2-CODE-EXAMPLES.md](./PHASE-2-CODE-EXAMPLES.md) for working code
3. Verify against [PHASE-2-ARCHITECTURE.md](./PHASE-2-ARCHITECTURE.md) design decisions
4. Check MCP SDK documentation: https://modelcontextprotocol.io
5. Report bugs: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues

---

## Related Documents

- [Phase 1 Architecture](./PHASE-1-ARCHITECTURE.md) - Context system (prerequisite)
- [Feature Matrix](./FEATURE-MATRIX.md) - Complete FastMCP parity tracking
- [Overall Plan](./FASTMCP-PARITY-PLAN.md) - High-level roadmap

---

**Ready to Start?** Begin with [PHASE-2-ARCHITECTURE.md](./PHASE-2-ARCHITECTURE.md)

**Need Code?** Jump to [PHASE-2-CODE-EXAMPLES.md](./PHASE-2-CODE-EXAMPLES.md)

**Implementation?** Follow [PHASE-2-IMPLEMENTATION-GUIDE.md](./PHASE-2-IMPLEMENTATION-GUIDE.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Ready for Implementation
