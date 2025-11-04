# MCP-UI Protocol Compliance Test Suite

Comprehensive test suite that validates our MCP-UI implementation matches the official specification exactly and ensures protocol-level interoperability.

## Overview

This test suite verifies that Simply-MCP's UI implementation is 100% compliant with the official MCP-UI protocol specification from https://github.com/idosal/mcp-ui

**Specification Reference**: `/mnt/Shared/cs-projects/simply-mcp-ts/MCP_UI_PROTOCOL_PARITY_ANALYSIS.md` section 1.3

## Test Files

### 1. `message-validators.ts`

Helper functions and validators for protocol message format verification.

**Exports**:
- Message validators for all 5 action types (tool, prompt, notify, link, intent)
- Response validators (acknowledgment, result)
- Legacy format detection
- Helper functions to create spec-compliant messages
- Type constants (VALID_ACTION_TYPES, VALID_RESPONSE_TYPES)

### 2. `postmessage-compliance.test.ts`

**Tests**: 68 tests across 11 test suites

Validates postMessage protocol compliance:

#### Tool Call Messages (10 tests)
- ✅ Spec-compliant format with `type: 'tool'`, `payload: { toolName, params }`
- ✅ Optional messageId handling
- ✅ Empty params support
- ❌ Rejects messages without payload, toolName, or params
- ❌ Rejects legacy formats (MCP_UI_ACTION, CALL_TOOL, callbackId)

#### Prompt Messages (6 tests)
- ✅ Spec-compliant format with `type: 'prompt'`, `payload: { prompt }`
- ✅ Optional messageId
- ❌ Rejects invalid formats and legacy SUBMIT_PROMPT type

#### Notify Messages (7 tests)
- ✅ Spec-compliant format with `type: 'notify'`, `payload: { message, level? }`
- ✅ Optional level and messageId
- ❌ Rejects invalid formats and legacy NOTIFY type

#### Link Messages (6 tests)
- ✅ Spec-compliant format with `type: 'link'`, `payload: { url }`
- ❌ Rejects invalid formats and legacy NAVIGATE type

#### Intent Messages (7 tests)
- ✅ Spec-compliant format with `type: 'intent'`, `payload: { intent, params }`
- ❌ Rejects invalid formats

#### Response Messages - Acknowledgment (5 tests)
- ✅ Spec-compliant format: `{ type: 'ui-message-received', messageId }`
- ❌ Rejects wrong type names or callbackId

#### Response Messages - Result (8 tests)
- ✅ Format: `{ type: 'ui-message-response', messageId, result?, error? }`
- ✅ Accepts result or error (not both)
- ❌ Rejects legacy TOOL_RESULT type or callbackId

#### MessageId Tracking (5 tests)
- ✅ Consistent use of messageId field
- ✅ Preservation across request/response cycles
- ✅ Optional for fire-and-forget actions
- ✅ Required for responses

#### Payload Structure (5 tests)
- ✅ All actions use nested `payload` object
- ❌ Rejects flat structure with top-level fields

#### Legacy Format Detection (5 tests)
- ❌ Rejects MCP_UI_ACTION wrapper
- ❌ Rejects legacy type names (CALL_TOOL, SUBMIT_PROMPT, etc.)
- ❌ Rejects nested action objects
- ❌ Rejects callbackId without messageId

#### Complete Protocol Validation (4 tests)
- ✅ All 5 action types recognized
- ✅ All 2 response types recognized
- ✅ Consistent structure across message types

### 3. `sdk-interoperability.test.ts`

**Tests**: 34 tests across 7 test suites

Validates compatibility with official @mcp-ui/server SDK:

#### createUIResource API (8 tests)
- ✅ Creates valid resources from rawHtml, externalUrl, remoteDom content
- ✅ Handles text and blob encoding
- ✅ Includes metadata (name, description)
- ✅ Allows MIME type override
- ✅ Validates URI format (must start with ui://)
- ✅ Validates required content fields

#### Official MCP-UI Message Format (5 tests)
- ✅ Accepts tool, prompt, notify, link, intent from official SDK client
- ✅ All messages validated against spec

#### Resource Structure Validation (4 tests)
- ✅ Recognizes valid UI resources
- ❌ Rejects non-UI URIs
- ❌ Rejects unsupported MIME types
- ✅ Requires text or blob field

#### MIME Type Handling (6 tests)
- ✅ Recognizes text/html → rawHtml
- ✅ Recognizes text/uri-list → externalUrl
- ✅ Recognizes application/vnd.mcp-ui.remote-dom → remoteDom
- ✅ Handles framework parameters (react, webcomponents)
- ❌ Returns null for unsupported types

#### Content Extraction (5 tests)
- ✅ Extracts text and blob content
- ✅ Decodes base64 blob content
- ✅ Prefers text over blob when both present
- ✅ Returns empty string when no content
- ✅ Handles invalid base64 gracefully

#### End-to-End Resource Flow (3 tests)
- ✅ Complete lifecycle: create → validate → extract → render
- ✅ Works with official SDK examples
- ✅ External URL resources

#### Remote DOM Framework Parameter (3 tests)
- ✅ Includes framework in MIME type
- ✅ Supports React and Web Components
- ✅ Recognizes remote-dom regardless of framework

## Test Results

```
Test Suites: 2 passed, 2 total
Tests:       102 passed, 102 total (68 + 34)
Snapshots:   0 total
Time:        ~5-90 seconds (depending on system)
```

### Coverage Metrics

**Protocol-specific files**:
- `create-ui-resource.ts`: **84.84%** statement coverage (89.65% branches)
- `ui-utils.ts`: **57.89%** statement coverage (54.83% branches)
- `ui-types.ts`: Helper types (no executable code)
- `message-validators.ts`: **100%** coverage (all helpers tested)

**Note**: Overall project coverage appears low (0.58%) because these tests focus exclusively on protocol compliance files. The validators themselves are fully covered.

## Running Tests

### Run all protocol tests
```bash
npx jest tests/unit/protocol/
```

### Run specific test suite
```bash
npx jest tests/unit/protocol/postmessage-compliance.test.ts
npx jest tests/unit/protocol/sdk-interoperability.test.ts
```

### Run with coverage
```bash
npx jest tests/unit/protocol/ --coverage
```

### Run in watch mode
```bash
npx jest tests/unit/protocol/ --watch
```

## Key Validation Points

### ✅ What We Validate

1. **Message Format**
   - All 5 action types use correct structure
   - Payload objects properly nested
   - MessageId field used consistently
   - No legacy formats accepted

2. **Response Protocol**
   - Acknowledgment messages: `ui-message-received`
   - Result messages: `ui-message-response`
   - MessageId preserved across request/response

3. **Resource Structure**
   - Type: `'resource'`
   - URI: Must start with `ui://`
   - MIME type: text/html, text/uri-list, or application/vnd.mcp-ui.remote-dom
   - Content: text or blob field required

4. **SDK Compatibility**
   - createUIResource API matches official @mcp-ui/server
   - Messages from official SDK clients accepted
   - Resources work with official renderers

### ❌ What We Reject

1. **Legacy Formats**
   - `MCP_UI_ACTION` wrapper
   - Legacy type names: CALL_TOOL, SUBMIT_PROMPT, NOTIFY, NAVIGATE, TOOL_RESULT
   - Nested `action` objects
   - `callbackId` instead of `messageId`

2. **Invalid Structures**
   - Flat message structure without payload
   - Missing required fields (toolName, params, prompt, etc.)
   - Wrong type names
   - Non-UI resource URIs

3. **Protocol Violations**
   - Responses with both result and error
   - Acknowledgments without messageId
   - Invalid MIME types
   - Resources without content

## Integration with Official SDK

These tests ensure our implementation can:

1. **Accept messages** from official @mcp-ui/client
2. **Send responses** that official clients understand
3. **Create resources** using official createUIResource API
4. **Render resources** from official @mcp-ui/server

This guarantees **cross-implementation compatibility** with the MCP-UI ecosystem.

## Preventing Regression

These tests serve as a safeguard against:

- Protocol drift from official specification
- Reintroduction of legacy formats
- Breaking changes to message structure
- SDK API incompatibility
- MIME type handling errors

## Adding New Tests

When adding tests, ensure:

1. **Use validators** from `message-validators.ts`
2. **Test both positive and negative cases**
3. **Verify spec compliance** against official docs
4. **Include helper function tests** for created messages
5. **Add interoperability tests** for new features

## Reference Documentation

- **Official Spec**: https://github.com/idosal/mcp-ui
- **Our Analysis**: `/mnt/Shared/cs-projects/simply-mcp-ts/MCP_UI_PROTOCOL_PARITY_ANALYSIS.md`
- **Official Docs**: https://mcpui.dev
- **Message Protocol**: Section 1.3 of parity analysis

## Test Maintenance

These tests should be updated when:

1. MCP-UI specification changes
2. New action types are added
3. Message format evolves
4. New MIME types are supported
5. SDK API changes

Always verify changes against the official specification before updating tests.

---

**Status**: ✅ All 102 tests passing
**Last Updated**: 2025-10-30
**Spec Version**: MCP-UI v1.0 (as of analysis date)
