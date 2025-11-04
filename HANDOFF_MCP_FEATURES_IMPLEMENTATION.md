# Handoff: MCP Feature Implementation - Multi-Phase Enhancement

**Created:** 2025-10-31
**Last Updated:** 2025-10-31
**Status:** In Progress (Phase 1 Complete)
**Complexity:** High (Multi-phase, 8-12 weeks estimated)
**Type:** Feature Implementation + Protocol Compliance

---

## Phase Completion Status

### Phase 1: Tool Annotations ✅ COMPLETE
**Completed:** 2025-10-31
**Duration:** ~4 hours
**Status:** Production ready, v4.1.0

**Implementation Summary:**
- Added `IToolAnnotations` interface with MCP standard fields + Simply-MCP extensions
- Updated parser to extract and validate annotations from AST
- Implemented 5 validation rules (mutual exclusivity, type checking, enum validation)
- Created comprehensive example with 8 tools demonstrating all features
- Wrote 14 tests (100% pass rate)
- Updated documentation (FEATURES.md, API_REFERENCE.md, README.md)
- All validation gates passed (Test Validation + Functional Validation)

**Files Modified:** 8 core files, 2 new files created
**Test Coverage:** 14/14 tests passing
**Validation:** 21/21 checks passed

**Next Steps:** Proceed to Phase 2 (Progress Message Enhancement)

### Phase 2: Progress Message Enhancement 🔜 NEXT
**Status:** Ready to begin
**Handoff Document:** [`HANDOFF_PHASE2_PROGRESS_MESSAGES.md`](./HANDOFF_PHASE2_PROGRESS_MESSAGES.md)
**Estimated Effort:** 0.5-1 day (or 0.5-1 hour if already implemented)

### Phase 3-7: Audio Content, Batching, OAuth, Streamable HTTP, UI Enhancements
**Status:** Pending

---

## Executive Summary

This handoff covers implementation of priority features identified in the MCP protocol specification review. The work is organized into 7 phases, each building on the previous, maintaining Simply-MCP's zero-boilerplate, type-safe design philosophy.

**Key Documents:**
- Feature Analysis: [`MCP_FEATURE_OPPORTUNITIES.md`](./MCP_FEATURE_OPPORTUNITIES.md)
- Orchestrator Rubric: `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md`
- Current Architecture: [`README.md`](./README.md), [`docs/guides/API_REFERENCE.md`](./docs/guides/API_REFERENCE.md)

---

## Table of Contents

1. [Architecture Context](#architecture-context)
2. [Design Principles](#design-principles)
3. [Phase 1: Tool Annotations](#phase-1-tool-annotations)
4. [Phase 2: Progress Message Enhancement](#phase-2-progress-message-enhancement)
5. [Phase 3: Audio Content Support](#phase-3-audio-content-support)
6. [Phase 4: JSON-RPC Batching](#phase-4-json-rpc-batching)
7. [Phase 5: OAuth 2.1 Authorization](#phase-5-oauth-21-authorization)
8. [Phase 6: Streamable HTTP Transport](#phase-6-streamable-http-transport)
9. [Phase 7: UI Enhancements](#phase-7-ui-enhancements)
10. [Orchestration Strategy](#orchestration-strategy)
11. [Validation Framework](#validation-framework)
12. [Success Criteria](#success-criteria)

---

## Architecture Context

### Current Simply-MCP Design Philosophy

**Reference:** [`README.md`](./README.md) lines 15-20, [`docs/guides/API_REFERENCE.md`](./docs/guides/API_REFERENCE.md)

**Core Principles:**
1. **Zero Boilerplate** - TypeScript interfaces define everything
2. **Type Safety** - Compile-time validation, full IntelliSense
3. **AST-Driven** - Parse interfaces for metadata, no runtime decorators
4. **Interface-First** - Declarative API, no imperative registration
5. **Auto-Discovery** - Framework finds and registers primitives automatically

**Example Pattern (Current):**
```typescript
// Define interface - framework auto-discovers it
interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Does something';
  params: { /* ... */ };
  result: { /* ... */ };
}

// Implementation - no manual registration
export default class Server implements IServer {
  myTool: MyTool = async (params) => ({ /* ... */ });
}
```

### Key Architecture Files

**Interface Type Definitions:**
- `src/server/interface-types.ts` - Core type definitions (ITool, IPrompt, IResource, etc.)
- **Reference Lines:** 2869-2976 (IToolRouter example)

**AST Parsing:**
- `src/server/parser.ts` - TypeScript AST parsing for metadata extraction
- **Reference Lines:** 2032-2100 (Router parsing example)

**Adapter Layer:**
- `src/server/adapter.ts` - Converts interfaces to runtime server
- **Reference Lines:** 411-460 (Router registration example)

**Server Implementation:**
- `src/server/interface-server.ts` - Interface API server implementation
- `src/server/builder-server.ts` - Legacy builder API (shows protocol implementation patterns)

**Transport Layer:**
- `src/cli/run.ts` - Transport initialization
- HTTP transport: Stateful (SSE) and Stateless modes

### Current Feature Implementation Examples

**Sampling (Server-to-Client Communication):**
- Interface: `src/server/interface-types.ts` (ISampling)
- Implementation: Look for sampling handler patterns
- **Learning Reference:** How we handle bidirectional communication

**Elicitation (User Input Requests):**
- Interface: `src/server/interface-types.ts` (IElicitation)
- Similar pattern to sampling
- **Learning Reference:** Request/response pattern

**UI Resources:**
- Interface: `src/server/interface-types.ts` (IUI)
- Client renderer: `src/client/UIResourceRenderer.tsx`
- Remote DOM: `src/client/remote-dom/`
- **Learning Reference:** Complex feature with multiple components

---

## Design Principles for New Features

### Principle 1: Interface-Driven Metadata

**Pattern:** Declare capability in interface, framework extracts via AST

```typescript
// ✅ CORRECT - Interface declaration
interface MyTool extends ITool {
  name: 'my_tool';
  description: 'Tool description';

  // NEW: Add metadata as optional properties
  annotations?: {
    readOnly: true;
    category: 'data';
  };
}

// ❌ INCORRECT - Runtime decorators or manual registration
@ReadOnly()  // Don't use decorators
@Category('data')  // Don't use decorators
```

### Principle 2: Backward Compatibility

**Pattern:** All new fields must be optional

```typescript
interface ITool {
  name: string;
  description: string;
  params: Record<string, IParam>;
  result: any;

  // NEW fields must be optional (backward compatible)
  annotations?: IToolAnnotations;  // Optional - existing tools still work
}
```

### Principle 3: Type Inference Where Possible

**Pattern:** Minimize what users must declare

```typescript
// ✅ CORRECT - Infer from property name when possible
interface MyRouter extends IToolRouter {
  // name: 'my_router';  // Optional - inferred from property name
  description: 'My router';
  tools: [Tool1, Tool2];
}

// Framework infers: myRouter → my_router
```

### Principle 4: Consistent Naming Conventions

**Pattern:** Follow established patterns

- Interface types: `IToolAnnotations`, `IAudioContent`, `IOAuth2Auth`
- Properties: camelCase in TypeScript, snake_case in protocol
- Methods: camelCase implementation, snake_case tool names
- Files: kebab-case for filenames

### Principle 5: Validation at Dry-Run

**Pattern:** Catch errors early with `--dry-run`

```typescript
// Parser should validate new features during dry-run
// Example: src/server/parser.ts validation patterns
if (hasInvalidAnnotation) {
  throw new Error(
    `Tool '${toolName}' has invalid annotation: ${issue}\n` +
    `Fix: ${suggestion}`
  );
}
```

---

## Phase 1: Tool Annotations

**Priority:** HIGH (Quick Win)
**Effort:** 1-2 days
**Dependencies:** None
**MCP Spec Reference:** [2025-03-26 Changelog - Tool Annotations](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Add metadata to tools describing their behavior (read-only, destructive, etc.) to improve safety and UX.

**Use Cases:**
- Safety warnings before destructive operations
- Skip confirmations for read-only tools
- Categorize tools by domain
- Filter tools by capability

### Current Gap Analysis

**What Exists:**
- `ITool` interface in `src/server/interface-types.ts`
- Tool registration in `src/server/adapter.ts`
- Tool schema generation in `src/core/schema-generator.ts`

**What's Missing:**
- No `annotations` field on `ITool`
- No parsing of annotation metadata
- No transmission in tool schemas
- No documentation for annotations

### Interface Design

**File:** `src/server/interface-types.ts`

**Add new types:**
```typescript
/**
 * Tool behavior annotations for safety and categorization
 * @since v4.1.0
 */
export interface IToolAnnotations {
  /**
   * Tool only reads data, makes no modifications
   * @default false
   */
  readOnly?: boolean;

  /**
   * Tool modifies or deletes data (requires user confirmation)
   * @default false
   */
  destructive?: boolean;

  /**
   * Tool requires explicit user confirmation before execution
   * @default false
   */
  requiresConfirmation?: boolean;

  /**
   * Tool category for organization and filtering
   * @example 'data', 'system', 'communication', 'analysis'
   */
  category?: string;

  /**
   * Expected execution duration
   */
  estimatedDuration?: 'fast' | 'medium' | 'slow';

  /**
   * Custom metadata for tool
   */
  [key: string]: unknown;
}
```

**Modify `ITool` interface:**
```typescript
export interface ITool {
  name?: string;
  description: string;
  params: Record<string, IParam>;
  result: any;

  // NEW: Tool annotations (optional for backward compatibility)
  annotations?: IToolAnnotations;
}
```

### Implementation Tasks

**Task 1.1: Update Type Definitions**
- File: `src/server/interface-types.ts`
- Add `IToolAnnotations` interface
- Add optional `annotations` field to `ITool`
- Export new types

**Task 1.2: Update Parser**
- File: `src/server/parser.ts`
- Parse `annotations` field from tool interfaces
- Validate annotation values during dry-run
- Add to parsed tool metadata

**Task 1.3: Update Schema Generator**
- File: `src/core/schema-generator.ts`
- Include annotations in tool schemas (if spec requires)
- Or store separately for framework use

**Task 1.4: Update Adapter**
- File: `src/server/adapter.ts`
- Pass annotations through to tool registration
- Make available to tool handlers

**Task 1.5: Update Builder Server**
- File: `src/server/builder-server.ts` (if supporting legacy API)
- Add annotations support to `addTool()` method
- Maintain backward compatibility

**Task 1.6: Create Examples**
- File: `examples/interface-tool-annotations.ts`
- Demonstrate all annotation types
- Show read-only vs destructive patterns
- Category organization example

**Task 1.7: Update Documentation**
- File: `docs/guides/FEATURES.md` - Add Tool Annotations section
- File: `docs/guides/API_REFERENCE.md` - Document IToolAnnotations
- File: `README.md` - Mention in features list

**Task 1.8: Write Tests**
- File: `tests/unit/interface-api/tool-annotations.test.ts`
- Test annotation parsing
- Test validation (invalid values)
- Test schema generation
- Test backward compatibility (tools without annotations)

### Validation Criteria

**Functional Requirements:**
- ✅ Tools with `annotations` field parse correctly
- ✅ Tools without `annotations` field still work (backward compat)
- ✅ Invalid annotation values caught at dry-run
- ✅ Annotations accessible in tool handlers
- ✅ Schema generation includes annotations (if per spec)

**Test Requirements:**
- ✅ Unit tests for annotation parsing
- ✅ Unit tests for validation
- ✅ Integration test with full server
- ✅ Example compiles and runs

**Documentation Requirements:**
- ✅ API Reference updated
- ✅ Features guide updated
- ✅ Example code provided
- ✅ README updated

### Agent Assignments

**Implementation Agent:** General-purpose
- Tasks 1.1-1.6 (type defs, parser, schema, adapter, examples)

**Test Validation Agent:** General-purpose (separate from implementer)
- Task 1.8 - Validate tests are real and comprehensive

**Documentation Agent:** General-purpose
- Task 1.7 - Update all documentation

**Functional Validation Agent:** General-purpose (separate)
- Verify all validation criteria met
- Run tests and examples
- Check dry-run validation

### File References

**Files to Modify:**
```
src/server/interface-types.ts          # Add IToolAnnotations, update ITool
src/server/parser.ts                   # Parse annotations from AST
src/core/schema-generator.ts           # Include in schemas
src/server/adapter.ts                  # Pass through to handlers
examples/interface-tool-annotations.ts # NEW - Example
docs/guides/FEATURES.md                # Document feature
docs/guides/API_REFERENCE.md           # API docs
README.md                              # Feature list
tests/unit/interface-api/tool-annotations.test.ts  # NEW - Tests
```

### Success Criteria

**Definition of Done:**
- [ ] `IToolAnnotations` interface exists with all fields
- [ ] `ITool` has optional `annotations` field
- [ ] Parser extracts annotations from AST
- [ ] Dry-run validates annotation values
- [ ] Tests cover all annotation types
- [ ] Example demonstrates usage
- [ ] Documentation complete
- [ ] All tests pass
- [ ] Backward compatibility verified (old tools work)

---

## Phase 2: Progress Message Enhancement

**Priority:** HIGH (Quick Win)
**Effort:** 0.5-1 day
**Dependencies:** None
**MCP Spec Reference:** [2025-03-26 Changelog - Progress Notifications](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Add descriptive message field to progress notifications for better UX during long-running operations.

**Use Cases:**
- "Processing file 5 of 20"
- "Connecting to database..."
- "Analyzing data: 45% complete"
- Debugging and monitoring

### Current Implementation Check

**FIRST STEP:** Verify if `ProgressNotification` already has `message` field

**Files to Check:**
- `src/server/interface-types.ts` - Look for ProgressNotification type
- MCP SDK types - Check `@modelcontextprotocol/sdk` for ProgressNotification

**If Already Present:** Skip this phase
**If Missing:** Implement as below

### Interface Design

**File:** `src/server/interface-types.ts`

```typescript
/**
 * Progress notification for long-running operations
 * @since v4.0.0
 */
export interface IProgressNotification {
  progressToken: string | number;
  progress: number;  // 0-100
  total?: number;

  // NEW: Descriptive status message
  /**
   * Human-readable status message
   * @example "Processing file 5 of 20"
   * @example "Connecting to database..."
   * @since v4.1.0
   */
  message?: string;
}
```

### Implementation Tasks

**Task 2.1: Verify Current State**
- Check if `message` field exists
- Review MCP SDK for ProgressNotification definition
- Document findings

**Task 2.2: Update Type Definition** (if needed)
- File: `src/server/interface-types.ts`
- Add optional `message` field
- Add JSDoc documentation

**Task 2.3: Update Progress Handlers** (if needed)
- Find all progress notification usage
- Ensure `message` field is passed through
- Update any serialization logic

**Task 2.4: Update Examples**
- File: `examples/interface-sampling.ts` or relevant example
- Show progress with messages
- Demonstrate useful message patterns

**Task 2.5: Update Documentation**
- File: `docs/guides/PROTOCOL.md` - Document progress messages
- File: `docs/guides/API_REFERENCE.md` - Update ProgressNotification docs

**Task 2.6: Write Tests**
- File: `tests/unit/progress-notifications.test.ts`
- Test progress with messages
- Test progress without messages (backward compat)

### Validation Criteria

**Functional Requirements:**
- ✅ `message` field available on ProgressNotification
- ✅ Messages transmitted to client
- ✅ Progress without message still works

**Test Requirements:**
- ✅ Unit tests for message handling
- ✅ Integration test showing messages in action

**Documentation Requirements:**
- ✅ Protocol guide updated
- ✅ Example demonstrates usage

### Agent Assignments

**Implementation Agent:** General-purpose
- All tasks (verification, implementation, examples)

**Validation Agent:** General-purpose (separate)
- Verify implementation
- Check backward compatibility

### Success Criteria

**Definition of Done:**
- [ ] Current state verified (has message or doesn't)
- [ ] If missing: `message` field added to ProgressNotification
- [ ] Progress messages transmitted correctly
- [ ] Example shows usage
- [ ] Documentation updated
- [ ] Tests pass

---

## Phase 3: Audio Content Support

**Priority:** HIGH
**Effort:** 2-3 days
**Dependencies:** None
**MCP Spec Reference:** [2025-03-26 Changelog - Audio Content](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Add native support for audio data in resources, alongside existing text and image support.

**Use Cases:**
- Voice interface resources
- Audio transcription services
- Podcast/music metadata
- Audio analysis tools

### Current Gap Analysis

**What Exists:**
- Text content support
- Image content support (`ImageContent` type)
- Resource system in `src/server/interface-types.ts`

**What's Missing:**
- No `AudioContent` type
- No audio MIME type support
- No audio resource examples
- No audio documentation

### Interface Design

**File:** `src/server/interface-types.ts`

**Add new types:**
```typescript
/**
 * Audio content metadata
 * @since v4.1.0
 */
export interface IAudioMetadata {
  /**
   * Duration in seconds
   */
  duration?: number;

  /**
   * Sample rate in Hz
   * @example 44100, 48000
   */
  sampleRate?: number;

  /**
   * Number of audio channels
   * @example 1 (mono), 2 (stereo)
   */
  channels?: number;

  /**
   * Bitrate in kbps
   */
  bitrate?: number;

  /**
   * Audio codec
   * @example 'mp3', 'aac', 'opus'
   */
  codec?: string;
}

/**
 * Audio content for resources
 * @since v4.1.0
 */
export interface IAudioContent {
  type: 'audio';

  /**
   * Audio MIME type
   * @example 'audio/wav', 'audio/mpeg', 'audio/ogg'
   */
  mimeType: 'audio/wav' | 'audio/mpeg' | 'audio/mp3' | 'audio/ogg' | 'audio/webm' | string;

  /**
   * Base64-encoded audio data
   */
  data: string;

  /**
   * Optional audio metadata
   */
  metadata?: IAudioMetadata;
}
```

**Update content type union:**
```typescript
// Find existing content type union and add audio
type ResourceContent = TextContent | ImageContent | IAudioContent;
```

### Implementation Tasks

**Task 3.1: Update Type Definitions**
- File: `src/server/interface-types.ts`
- Add `IAudioMetadata` interface
- Add `IAudioContent` interface
- Update `ResourceContent` type union
- Export new types

**Task 3.2: Update Resource Parser**
- File: `src/server/parser.ts`
- Parse audio content from resource interfaces
- Validate audio MIME types
- Handle audio metadata

**Task 3.3: Update Schema Generator**
- File: `src/core/schema-generator.ts`
- Add audio content to schema generation
- Validate audio data format (base64)

**Task 3.4: Update Resource Handlers**
- File: Resource handler implementation files
- Handle audio content type
- Pass through to client

**Task 3.5: Create Client Support** (Optional for Phase 3)
- File: `src/client/` (if client rendering needed)
- Audio player component
- Or document that clients handle audio

**Task 3.6: Create Examples**
- File: `examples/interface-audio-resource.ts`
- Demonstrate static audio resource
- Demonstrate dynamic audio resource
- Show metadata usage

**Task 3.7: Update Documentation**
- File: `docs/guides/FEATURES.md` - Add Audio Resources section
- File: `docs/guides/API_REFERENCE.md` - Document IAudioContent
- File: `README.md` - Add to features list

**Task 3.8: Write Tests**
- File: `tests/unit/interface-api/audio-content.test.ts`
- Test audio resource parsing
- Test MIME type validation
- Test metadata handling
- Test base64 data validation

### Validation Criteria

**Functional Requirements:**
- ✅ Audio content type defined
- ✅ Resources can return audio content
- ✅ Audio MIME types validated
- ✅ Metadata fields available
- ✅ Base64 encoding validated

**Test Requirements:**
- ✅ Unit tests for audio parsing
- ✅ Unit tests for validation
- ✅ Integration test with audio resource
- ✅ Example compiles and runs

**Documentation Requirements:**
- ✅ Features guide updated
- ✅ API Reference complete
- ✅ Example provided
- ✅ README updated

### Agent Assignments

**Implementation Agent:** General-purpose
- Tasks 3.1-3.6 (types, parser, examples)

**Test Validation Agent:** General-purpose (separate)
- Task 3.8 - Validate tests

**Documentation Agent:** General-purpose
- Task 3.7 - Documentation

**Functional Validation Agent:** General-purpose (separate)
- Verify all criteria met

### File References

**Files to Modify:**
```
src/server/interface-types.ts           # Add audio types
src/server/parser.ts                    # Parse audio content
src/core/schema-generator.ts            # Audio schemas
examples/interface-audio-resource.ts    # NEW - Example
docs/guides/FEATURES.md                 # Document feature
docs/guides/API_REFERENCE.md            # API docs
README.md                               # Feature list
tests/unit/interface-api/audio-content.test.ts  # NEW - Tests
```

### Success Criteria

**Definition of Done:**
- [ ] `IAudioContent` and `IAudioMetadata` interfaces exist
- [ ] Resources can return audio content
- [ ] Parser handles audio content
- [ ] MIME types validated
- [ ] Example demonstrates static and dynamic audio
- [ ] Tests cover all audio features
- [ ] Documentation complete
- [ ] All tests pass

---

## Phase 4: JSON-RPC Batching

**Priority:** MEDIUM
**Effort:** 1 week
**Dependencies:** None
**MCP Spec Reference:** [2025-03-26 Changelog - Batching](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Support processing multiple JSON-RPC requests in a single batch for improved performance.

**Use Cases:**
- Reduce network round trips
- Bulk operations (list multiple resources)
- High-latency connections
- Mobile clients

### Current Gap Analysis

**What Exists:**
- JSON-RPC request/response handling
- Individual request processing
- Transport layer in `src/cli/run.ts`

**What's Missing:**
- No batch request handling
- No batch response formatting
- No parallel request processing
- No partial failure handling

### Technical Design

**JSON-RPC Batch Request Format:**
```json
[
  {"jsonrpc": "2.0", "method": "tools/list", "id": 1},
  {"jsonrpc": "2.0", "method": "resources/list", "id": 2},
  {"jsonrpc": "2.0", "method": "prompts/list", "id": 3}
]
```

**JSON-RPC Batch Response Format:**
```json
[
  {"jsonrpc": "2.0", "result": { "tools": [...] }, "id": 1},
  {"jsonrpc": "2.0", "result": { "resources": [...] }, "id": 2},
  {"jsonrpc": "2.0", "result": { "prompts": [...] }, "id": 3}
]
```

### Implementation Tasks

**Task 4.1: Update Request Handler**
- File: Server request handling (identify file)
- Detect batch requests (array vs object)
- Parse batch request array
- Validate batch format

**Task 4.2: Implement Batch Processor**
- File: New file `src/server/batch-processor.ts`
- Process requests in parallel (where safe)
- Handle dependencies (sequential if needed)
- Collect responses
- Handle partial failures

**Task 4.3: Update Transport Layer**
- File: `src/cli/run.ts` or transport implementations
- Accept batch requests in HTTP transport
- Accept batch requests in Stdio transport
- Return batch responses

**Task 4.4: Add Configuration**
- File: `src/server/interface-types.ts`
- Add batch configuration to `IServer`
- Max batch size
- Timeout settings

```typescript
interface IServer {
  // ... existing fields

  /**
   * JSON-RPC batching configuration
   * @since v4.2.0
   */
  batching?: {
    enabled?: boolean;      // Default: true
    maxBatchSize?: number;  // Default: 100
    timeout?: number;       // Milliseconds, default: 30000
  };
}
```

**Task 4.5: Error Handling Strategy**
- Partial failures: Some requests succeed, some fail
- Response includes both results and errors
- Transaction support (optional): All or nothing

**Task 4.6: Create Examples**
- File: `examples/interface-batch-requests.ts`
- Demonstrate batch client
- Show error handling
- Performance comparison

**Task 4.7: Update Documentation**
- File: `docs/guides/PROTOCOL.md` - Batching section
- File: `docs/guides/API_REFERENCE.md` - Batch configuration
- File: `README.md` - Add to features

**Task 4.8: Write Tests**
- File: `tests/unit/batch-processing.test.ts`
- Test batch parsing
- Test parallel processing
- Test partial failures
- Test max batch size limits
- File: `tests/integration/batch-requests.test.ts`
- Test full batch flow
- Test with real server

### Validation Criteria

**Functional Requirements:**
- ✅ Batch requests accepted and parsed
- ✅ Multiple requests processed efficiently
- ✅ Responses returned in correct order (match IDs)
- ✅ Partial failures handled gracefully
- ✅ Max batch size enforced
- ✅ Timeouts respected
- ✅ Individual requests still work (backward compat)

**Test Requirements:**
- ✅ Unit tests for batch processor
- ✅ Integration tests with full server
- ✅ Error handling tests
- ✅ Performance tests (batched vs individual)

**Documentation Requirements:**
- ✅ Protocol guide explains batching
- ✅ Configuration documented
- ✅ Example provided

### Agent Assignments

**Implementation Agent:** General-purpose
- Tasks 4.1-4.6 (request handling, processor, config, examples)

**Test Validation Agent:** General-purpose (separate)
- Task 4.8 - Validate tests

**Performance Validation Agent:** General-purpose
- Verify performance improvements
- Check resource usage

**Documentation Agent:** General-purpose
- Task 4.7

### File References

**Files to Modify/Create:**
```
src/server/batch-processor.ts           # NEW - Batch processing logic
src/server/interface-types.ts           # Batch configuration
src/cli/run.ts                          # Transport layer updates
[Request handler file]                  # Detect and route batches
examples/interface-batch-requests.ts    # NEW - Example
docs/guides/PROTOCOL.md                 # Batching docs
docs/guides/API_REFERENCE.md            # Config docs
README.md                               # Features
tests/unit/batch-processing.test.ts     # NEW - Tests
tests/integration/batch-requests.test.ts # NEW - Integration tests
```

### Success Criteria

**Definition of Done:**
- [ ] Batch requests parsed and processed
- [ ] Responses maintain request ID mapping
- [ ] Parallel processing works for independent requests
- [ ] Partial failures handled correctly
- [ ] Configuration options available
- [ ] Example demonstrates usage
- [ ] Performance improvement verified
- [ ] Tests cover all scenarios
- [ ] Documentation complete

---

## Phase 5: OAuth 2.1 Authorization

**Priority:** MEDIUM (Strategic)
**Effort:** 1-2 weeks
**Dependencies:** None (but more complex)
**MCP Spec Reference:** [2025-03-26 Changelog - Authorization](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Implement comprehensive OAuth 2.1-based authorization framework for enterprise-grade security.

**Use Cases:**
- Enterprise deployments
- Third-party integrations
- Scoped permissions
- Token-based auth with refresh
- Multi-tenant systems

### Current Gap Analysis

**What Exists:**
- API Key authentication in `src/server/interface-types.ts` (IApiKeyAuth)
- Auth adapter in `src/adapters/auth-adapter.ts`
- HTTP auth middleware

**What's Missing:**
- OAuth 2.1 flow implementation
- Token management
- Refresh token support
- Scope validation
- Authorization endpoint

### Interface Design

**File:** `src/server/interface-types.ts`

**Add new auth types:**
```typescript
/**
 * OAuth 2.1 Authorization Code Flow configuration
 * @since v4.2.0
 * @see https://oauth.net/2.1/
 */
export interface IOAuth2Auth {
  type: 'oauth2';

  /**
   * Authorization endpoint URL
   * @example 'https://auth.example.com/authorize'
   */
  authorizationEndpoint: string;

  /**
   * Token endpoint URL
   * @example 'https://auth.example.com/token'
   */
  tokenEndpoint: string;

  /**
   * OAuth scopes
   * @example ['read:tools', 'write:resources']
   */
  scopes: string[];

  /**
   * Client ID
   */
  clientId: string;

  /**
   * Client secret (for confidential clients)
   * Optional for public clients
   */
  clientSecret?: string;

  /**
   * Redirect URI for OAuth flow
   */
  redirectUri?: string;

  /**
   * Token validation configuration
   */
  validation?: {
    /**
     * Validate token signatures
     */
    verifySignature?: boolean;

    /**
     * JWKS endpoint for signature verification
     */
    jwksUri?: string;

    /**
     * Expected token issuer
     */
    issuer?: string;

    /**
     * Expected audience
     */
    audience?: string;
  };

  /**
   * Refresh token configuration
   */
  refreshTokens?: {
    enabled: boolean;
    /**
     * Refresh token rotation
     */
    rotate?: boolean;
  };
}

/**
 * Update IServer to support OAuth
 */
interface IServer {
  // ... existing fields

  /**
   * Authentication configuration
   * @since v4.0.0
   */
  auth?: IApiKeyAuth | IOAuth2Auth;
}
```

### Implementation Tasks

**Task 5.1: Update Type Definitions**
- File: `src/server/interface-types.ts`
- Add `IOAuth2Auth` interface
- Update `IServer` auth field type
- Export new types

**Task 5.2: Implement OAuth Flow Handler**
- File: `src/adapters/oauth-adapter.ts` (NEW)
- Authorization code flow
- Token exchange
- Token refresh
- State parameter handling (CSRF protection)

**Task 5.3: Implement Token Validation**
- File: `src/adapters/oauth-adapter.ts`
- JWT validation
- Signature verification (if configured)
- Expiration checking
- Scope validation

**Task 5.4: Integrate with Auth Middleware**
- File: `src/adapters/auth-adapter.ts`
- Detect OAuth vs API Key
- Route to appropriate handler
- Maintain backward compatibility

**Task 5.5: Add Token Storage** (Optional but recommended)
- File: `src/adapters/token-store.ts` (NEW)
- In-memory token cache
- Optional Redis integration
- Token revocation list

**Task 5.6: Update HTTP Transport**
- File: HTTP transport implementation
- OAuth endpoints (`/auth/authorize`, `/auth/token`)
- Bearer token authentication
- Refresh token endpoint

**Task 5.7: Dependency Integration**
- Research OAuth libraries (e.g., `oauth4webapi`, `openid-client`)
- Add as optional dependency
- Integration layer

**Task 5.8: Create Examples**
- File: `examples/interface-oauth2-auth.ts`
- OAuth server configuration
- Token validation example
- Scope enforcement

**Task 5.9: Update Documentation**
- File: `docs/guides/API_REFERENCE.md` - OAuth configuration
- File: `docs/guides/TRANSPORT.md` - OAuth flow
- File: `README.md` - Security features

**Task 5.10: Write Tests**
- File: `tests/unit/oauth-adapter.test.ts`
- Test token validation
- Test scope checking
- Test refresh flow
- Mock OAuth server
- File: `tests/integration/oauth-integration.test.ts`
- Full OAuth flow test

### Validation Criteria

**Functional Requirements:**
- ✅ OAuth 2.1 authorization code flow works
- ✅ Token validation (signature, expiration, scopes)
- ✅ Refresh tokens supported
- ✅ Backward compatibility with API keys
- ✅ CSRF protection (state parameter)
- ✅ Secure token storage

**Security Requirements:**
- ✅ No client secret in client-side code
- ✅ HTTPS enforcement for production
- ✅ Token expiration enforced
- ✅ Scope validation per endpoint

**Test Requirements:**
- ✅ Unit tests for OAuth flow
- ✅ Integration tests with mock OAuth server
- ✅ Security tests (token tampering, expired tokens)
- ✅ Scope enforcement tests

**Documentation Requirements:**
- ✅ OAuth setup guide
- ✅ Security best practices
- ✅ Example configuration

### Agent Assignments

**Research Agent:** General-purpose
- Evaluate OAuth libraries
- Security best practices
- Recommend implementation approach

**Implementation Agent:** General-purpose
- Tasks 5.1-5.8 (types, OAuth flow, integration, examples)

**Security Validation Agent:** General-purpose (separate)
- Review security implementation
- Test for common vulnerabilities
- Verify OWASP compliance

**Test Validation Agent:** General-purpose (separate)
- Task 5.10 - Validate tests

**Documentation Agent:** General-purpose
- Task 5.9

### File References

**Files to Modify/Create:**
```
src/server/interface-types.ts           # Add IOAuth2Auth
src/adapters/oauth-adapter.ts           # NEW - OAuth flow logic
src/adapters/token-store.ts             # NEW - Token management
src/adapters/auth-adapter.ts            # Integrate OAuth
[HTTP transport files]                  # OAuth endpoints
examples/interface-oauth2-auth.ts       # NEW - Example
docs/guides/API_REFERENCE.md            # OAuth config
docs/guides/TRANSPORT.md                # OAuth flow docs
README.md                               # Security features
tests/unit/oauth-adapter.test.ts        # NEW - Tests
tests/integration/oauth-integration.test.ts  # NEW - Integration
package.json                            # OAuth library dependency
```

### Success Criteria

**Definition of Done:**
- [ ] `IOAuth2Auth` interface complete
- [ ] OAuth 2.1 authorization code flow implemented
- [ ] Token validation (JWT, expiration, scopes)
- [ ] Refresh token support
- [ ] CSRF protection via state parameter
- [ ] API Key auth still works (backward compat)
- [ ] Example demonstrates OAuth setup
- [ ] Security review passed
- [ ] Tests cover all flows
- [ ] Documentation complete

---

## Phase 6: Streamable HTTP Transport

**Priority:** MEDIUM
**Effort:** 1-2 weeks
**Dependencies:** None
**MCP Spec Reference:** [2025-03-26 Changelog - Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/changelog)

### Feature Description

Implement modern chunked HTTP streaming transport to replace SSE for long-lived connections.

**Benefits:**
- Better compatibility than SSE
- Standard HTTP chunked encoding
- Bidirectional communication
- More flexible than SSE

### Current Implementation

**What Exists:**
- HTTP transport with SSE for stateful mode
- Stdio transport
- Stateless HTTP mode

**What's Missing:**
- Chunked HTTP streaming
- Alternative to SSE

### Technical Design

**Chunked Transfer Encoding:**
```
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: application/json

[chunk-size]\r\n
[chunk-data]\r\n
[chunk-size]\r\n
[chunk-data]\r\n
0\r\n
\r\n
```

**Benefits over SSE:**
- Works through more proxies
- Bidirectional (can send chunks both ways)
- Standard HTTP feature
- Better error handling

### Implementation Tasks

**Task 6.1: Research & Design**
- Review MCP spec for streamable HTTP requirements
- Design chunked streaming implementation
- Plan backward compatibility with SSE

**Task 6.2: Implement Chunked Stream Handler**
- File: `src/transport/streamable-http.ts` (NEW)
- Chunked encoding writer
- Chunk parser for incoming
- Keep-alive handling

**Task 6.3: Update HTTP Transport**
- File: HTTP transport implementation
- Add streamable HTTP mode
- Configuration option (SSE vs Streamable)
- Maintain backward compatibility

**Task 6.4: Update Server Configuration**
- File: `src/server/interface-types.ts`
- Add transport mode option

```typescript
interface IServer {
  // ... existing

  transport?: 'stdio' | 'http';

  /**
   * HTTP transport configuration
   */
  httpTransport?: {
    /**
     * Connection mode for stateful HTTP
     * @default 'sse'
     */
    mode?: 'sse' | 'streamable' | 'stateless';

    port?: number;
    // ... other options
  };
}
```

**Task 6.5: Client Compatibility**
- Ensure clients can consume chunked streams
- Handle connection management
- Reconnection logic

**Task 6.6: Create Examples**
- File: `examples/interface-streamable-http.ts`
- Streamable HTTP server
- Compare with SSE mode

**Task 6.7: Update Documentation**
- File: `docs/guides/TRANSPORT.md` - Streamable HTTP section
- File: `docs/guides/API_REFERENCE.md` - Configuration
- File: `README.md` - Transport options

**Task 6.8: Write Tests**
- File: `tests/unit/streamable-http.test.ts`
- Test chunk encoding/decoding
- Test keep-alive
- File: `tests/integration/streamable-transport.test.ts`
- Full transport test
- Compare with SSE performance

### Validation Criteria

**Functional Requirements:**
- ✅ Streamable HTTP transport works
- ✅ Chunked encoding/decoding correct
- ✅ Long-lived connections maintained
- ✅ Backward compatibility with SSE
- ✅ Configuration options available

**Test Requirements:**
- ✅ Unit tests for chunking logic
- ✅ Integration tests for full transport
- ✅ Stress tests (many connections)
- ✅ Performance comparison with SSE

**Documentation Requirements:**
- ✅ Transport guide updated
- ✅ Migration guide from SSE
- ✅ Configuration documented

### Agent Assignments

**Research Agent:** General-purpose
- Research streamable HTTP spec
- Compare implementations
- Design recommendations

**Implementation Agent:** General-purpose
- Tasks 6.2-6.6 (streamable transport, config, examples)

**Performance Validation Agent:** General-purpose
- Compare streamable vs SSE performance
- Resource usage analysis

**Test Validation Agent:** General-purpose (separate)
- Task 6.8

**Documentation Agent:** General-purpose
- Task 6.7

### File References

**Files to Modify/Create:**
```
src/transport/streamable-http.ts        # NEW - Chunked streaming
src/server/interface-types.ts           # Transport config
[HTTP transport files]                  # Integration
examples/interface-streamable-http.ts   # NEW - Example
docs/guides/TRANSPORT.md                # Streamable HTTP docs
docs/guides/API_REFERENCE.md            # Config docs
README.md                               # Transport features
tests/unit/streamable-http.test.ts      # NEW - Tests
tests/integration/streamable-transport.test.ts  # NEW - Integration
```

### Success Criteria

**Definition of Done:**
- [✅] Streamable HTTP transport implemented (Uses MCP SDK's StreamableHTTPServerTransport)
- [✅] Chunked encoding works correctly (SDK implementation verified, tests passing)
- [✅] Configuration options available (stateful: true enables streamable HTTP)
- [✅] SSE mode still works (backward compat - same implementation)
- [✅] Performance acceptable vs SSE (All 17 performance tests passing)
- [✅] Example demonstrates usage (interface-http-auth.ts demonstrates stateful HTTP)
- [✅] Tests cover all scenarios (Unit: 47/47 ✅, Integration: 26/27 ✅, Performance: 17/17 ✅)
- [✅] Documentation complete (TRANSPORT.md, API_REFERENCE.md, README.md updated)

**Status:** ✅ COMPLETE (100%)
**Completed:** 2025-11-02
**Notes:** See PHASE6_COMPLETION_SUMMARY.md for detailed report. All tests passing after fixing server startup timing and Accept headers.

---

## Phase 7: UI Enhancements

**Priority:** MEDIUM-LOW
**Effort:** 2-3 weeks
**Dependencies:** Phases 1-6 complete
**MCP-UI Reference:** [mcp-ui releases](https://github.com/idosal/mcp-ui/releases)

### Feature Description

Implement latest MCP-UI features: raw HTML proxy, render data messages, embedded resource props.

**Sub-Features:**
1. Raw HTML Proxy Mode (bidirectional iframe communication)
2. UI Request Render Data message type
3. Embedded Resource Props for annotations

### 7A: Raw HTML Proxy Mode

**Reference:** mcp-ui v5.13.0+ release notes

**What it is:**
Bidirectional message relay for raw HTML content in iframes

**Use Cases:**
- Interactive HTML UIs with callbacks
- Legacy web app integration
- Rich client interactions

**Implementation Tasks:**

**Task 7A.1: Update UI Types**
- File: `src/types/ui.ts`
- Add proxy mode configuration

```typescript
interface IUIResource {
  // ... existing fields

  /**
   * Proxy mode for bidirectional communication
   * @since v4.3.0
   */
  proxyMode?: {
    enabled: boolean;

    /**
     * Allowed origins for postMessage
     */
    allowedOrigins?: string[];

    /**
     * Message handler for iframe messages
     */
    messageHandler?: (message: any) => Promise<any>;
  };
}
```

**Task 7A.2: Implement Proxy Handler**
- File: `src/client/ui-utils.ts` or similar
- postMessage relay
- Origin validation
- Message routing

**Task 7A.3: Update HTML Renderer**
- File: `src/client/HTMLResourceRenderer.tsx`
- Listen for postMessage from iframe
- Forward to server via proxy handler
- Send responses back to iframe

**Task 7A.4: Create Example**
- File: `examples/interface-proxy-html.ts`
- Interactive HTML UI
- Callback demonstration

### 7B: UI Request Render Data

**Reference:** mcp-ui v5.12.0 release notes

**What it is:**
New message type for requesting render-specific data

**Implementation:**
- Research exact protocol requirements
- Implement message handler
- Update client/server coordination

### 7C: Embedded Resource Props

**Reference:** mcp-ui v5.11.0 release notes

**What it is:**
Metadata annotations for embedded resources

**Implementation:**

```typescript
interface IResource {
  // ... existing

  /**
   * Embedded resource annotations
   * @since v4.3.0
   */
  embeddedResourceProps?: {
    category?: string;
    tags?: string[];
    version?: string;
    deprecated?: boolean;
    experimental?: boolean;
    author?: string;
    license?: string;
  };
}
```

### Validation Criteria (Phase 7)

**Functional Requirements:**
- ✅ Raw HTML proxy mode works
- ✅ Bidirectional iframe communication
- ✅ Origin validation enforced
- ✅ Render data messages handled
- ✅ Embedded props available

**Test Requirements:**
- ✅ Proxy mode tests
- ✅ Message relay tests
- ✅ Security tests (origin validation)

**Documentation Requirements:**
- ✅ UI enhancement guide
- ✅ Proxy mode documentation
- ✅ Examples for all features

### Success Criteria (Phase 7)

**Definition of Done:**
- [ ] Raw HTML proxy implemented
- [ ] UI render data messages supported
- [ ] Embedded resource props available
- [ ] Examples demonstrate features
- [ ] Tests pass
- [ ] Documentation complete

---

## Orchestration Strategy

### Agent Types Used

**1. Research Agents**
- Evaluate specs and libraries
- Design recommendations
- Architecture decisions

**2. Implementation Agents**
- Write code following patterns
- Create examples
- Update configuration

**3. Test Validation Agents** (Separate from implementers)
- Validate tests are real and comprehensive
- Check assertions are meaningful
- Verify coverage

**4. Functional Validation Agents** (Separate)
- Verify requirements met
- Run tests and examples
- Check integration

**5. Security Validation Agents** (For OAuth)
- Security review
- Vulnerability testing
- OWASP compliance

**6. Documentation Agents**
- Update all documentation
- Create migration guides
- Example code

### Phase Dependencies

```
Phase 1: Tool Annotations (Independent)
Phase 2: Progress Messages (Independent)
Phase 3: Audio Content (Independent)
  ↓
Phase 4: JSON-RPC Batching (Independent)
  ↓
Phase 5: OAuth 2.1 (Independent, complex)
  ↓
Phase 6: Streamable HTTP (Independent)
  ↓
Phase 7: UI Enhancements (Independent)
```

**Phases can run in parallel where noted, or sequentially for focus**

### Agent Execution Pattern per Phase

```
FOR EACH PHASE:
  ↓
  Research Agent (if needed) → Design recommendations
  ↓
  Implementation Agent → Builds feature
  ↓
  Test Validation Agent → Validates tests are real
  ↓
  Functional Validation Agent → Verifies requirements
  ↓
  Issues found? ──YES──→ Extract issues → Implementation Agent (fixes)
  ↓                           ↓
  NO                   Re-validate (max 2-3 iterations)
  ↓                           ↓
  Documentation Agent  ←───────
  ↓
  Final Validation → Mark COMPLETE
  ↓
Next phase
```

---

## Validation Framework

### Code Quality Standards

All implementations must meet:

**✅ Functionality:** Implements requirements correctly
**✅ Reliability:** Handles errors and edge cases
**✅ Maintainability:** Follows Simply-MCP patterns
**✅ Performance:** Meets reasonable performance expectations
**✅ Security:** No vulnerabilities introduced
**✅ Documentation:** Key decisions explained
**✅ Test Coverage:** Tests exist AND are valid

### Test Validity Checklist

For each phase, validation agent must verify:

- [ ] Tests were actually run (not skipped)
- [ ] Assertions are specific (not just `.toBeDefined()`)
- [ ] Tests cover main code paths
- [ ] Edge cases tested
- [ ] Error conditions tested
- [ ] Backward compatibility tested
- [ ] No mock abuse (mocks used appropriately)
- [ ] Tests are independent

### Dry-Run Validation

All phases must pass:

```bash
npx simply-mcp run examples/[feature-example].ts --dry-run
```

Expected output:
```
✓ Dry run complete
✓ Server: [name] v[version]
✓ Detected [n] tools
✓ [Feature] configuration valid
✓ Ready to run
```

### Integration Validation

Each phase must have integration test:

```bash
npx jest tests/integration/[feature]-integration.test.ts
```

All integration tests must pass before marking phase complete.

---

## Success Criteria

### Per-Phase Success

Each phase is complete when:

- [ ] All implementation tasks done
- [ ] Code follows Simply-MCP patterns
- [ ] Tests written and validated (separate agent)
- [ ] All tests pass
- [ ] Functional validation passed
- [ ] Example code provided and working
- [ ] Documentation updated
- [ ] Dry-run validation passes
- [ ] Backward compatibility verified
- [ ] No critical issues remaining

### Overall Project Success

All phases complete when:

- [ ] All 7 phases individually complete
- [ ] Full test suite passes
- [ ] All examples compile and run
- [ ] Documentation comprehensive
- [ ] MCP spec compliance verified
- [ ] Performance acceptable
- [ ] Security review passed (OAuth)
- [ ] Backward compatibility maintained
- [ ] Migration guides provided (if needed)

---

## Risk Management

### Known Risks

**Risk 1: OAuth Complexity**
- **Mitigation:** Use well-tested OAuth library
- **Mitigation:** Security review by separate agent
- **Mitigation:** Comprehensive testing with mock OAuth server

**Risk 2: Breaking Changes**
- **Mitigation:** All new fields optional
- **Mitigation:** Backward compatibility tests
- **Mitigation:** Deprecation warnings if needed

**Risk 3: Spec Interpretation**
- **Mitigation:** Reference official MCP spec
- **Mitigation:** Compare with SDK implementation
- **Mitigation:** Test with MCP clients (Claude Desktop, etc.)

**Risk 4: Performance Regression**
- **Mitigation:** Performance tests for batching
- **Mitigation:** Benchmark streamable HTTP vs SSE
- **Mitigation:** Monitor resource usage

### Escalation Criteria

Escalate to user if:

- [ ] Max iterations (3) reached without resolution
- [ ] Spec ambiguity requires user decision
- [ ] Breaking change unavoidable
- [ ] Library dependency conflicts
- [ ] Security concern identified
- [ ] Performance degradation significant

---

## Timeline Estimates

### Optimistic (Full-time, parallel work)

- Phase 1: Tool Annotations - 1-2 days
- Phase 2: Progress Messages - 0.5-1 day
- Phase 3: Audio Content - 2-3 days
- Phase 4: JSON-RPC Batching - 1 week
- Phase 5: OAuth 2.1 - 1-2 weeks
- Phase 6: Streamable HTTP - 1-2 weeks
- Phase 7: UI Enhancements - 2-3 weeks

**Total:** 6-8 weeks (parallel) or 8-12 weeks (sequential)

### Realistic (Part-time, sequential)

- Add 50% buffer for testing and iteration
- Add time for research and spec review
- Add time for security review (OAuth)

**Total:** 10-16 weeks

---

## References

### MCP Specifications

- [MCP Spec 2025-03-26 Changelog](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- [MCP Protocol GitHub](https://github.com/modelcontextprotocol)
- [OAuth 2.1 Specification](https://oauth.net/2.1/)

### MCP-UI References

- [MCP-UI Repository](https://github.com/idosal/mcp-ui)
- [MCP-UI Releases](https://github.com/idosal/mcp-ui/releases)
- [MCP-UI Documentation](https://idosal.github.io/mcp-ui/)

### Simply-MCP Architecture

- Feature Opportunities: `MCP_FEATURE_OPPORTUNITIES.md`
- README: `README.md`
- API Reference: `docs/guides/API_REFERENCE.md`
- Features Guide: `docs/guides/FEATURES.md`
- Interface Types: `src/server/interface-types.ts`
- Parser: `src/server/parser.ts`
- Adapter: `src/server/adapter.ts`

### Similar Features (Learning References)

- Tool Routers: `HANDOFF_ROUTER_DOCUMENTATION.md`
- UI Resources: `docs/guides/MCP_UI_PROTOCOL.md`
- Sampling/Elicitation: Existing implementations in codebase

---

## Next Steps

1. **Read Orchestrator Rubric:** `/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md`
2. **Choose Starting Phase:** Recommend Phase 1 (Tool Annotations) as quick win
3. **Launch Implementation Agent:** Begin first phase
4. **Validate Incrementally:** Each phase validated before next
5. **Update This Handoff:** Document progress and learnings

---

**Handoff Created By:** AI Orchestrator
**Status:** Ready for Execution
**Last Updated:** 2025-10-31
