# MCP-UI Implementation Documentation - Complete Index

## Quick Start

**New to MCP-UI?** Start here:
1. Read `00-introduction.md` for the big picture
2. Understand the 5-layer approach
3. Jump to the layer you're implementing

**Implementing a specific layer?**
- Foundation: `01-foundation-layer-spec.md`
- Feature: `02-feature-layer-spec.md`
- Remote DOM: `03-remote-dom-layer-spec.md`
- API Integration: `04-api-integration-spec.md`
- Polish: `05-polish-layer-spec.md`

**Need reference material?**
- API Reference: `06-api-reference.md`
- Security Guide: `07-security-guide.md`
- Remote DOM Deep Dive: `08-remote-dom-deep-dive.md`
- Examples Walkthrough: `09-examples-walkthrough.md`

---

## Document Map

### Core Documentation

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| `00-introduction.md` | Project overview, architecture, strategy | Everyone | 15 min |
| `01-foundation-layer-spec.md` | Layer 1: Basic HTML resources | Implementers | 20 min |
| `02-feature-layer-spec.md` | Layer 2: Interactive callbacks | Implementers | 20 min |
| `03-remote-dom-layer-spec.md` | Layer 3: Remote DOM + Web Worker | Implementers | 25 min |
| `04-api-integration-spec.md` | Layer 4: All API styles | Implementers | 10 min |
| `05-polish-layer-spec.md` | Layer 5: Optimization + docs | Implementers | 10 min |

### Reference Documentation

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| `06-api-reference.md` | Complete API documentation | Developers | 30 min |
| `07-security-guide.md` | Security architecture & best practices | Security reviewers | 20 min |
| `08-remote-dom-deep-dive.md` | Remote DOM architecture details | Advanced developers | 25 min |
| `09-examples-walkthrough.md` | All examples explained | New users | 30 min |

---

## Implementation Timeline

### Layer 1: Foundation (4 hours)
**Status**: Ready to implement
- Server UI resource helpers
- Basic client renderer
- Static HTML example
- **Exit Gate**: Simple form renders in iframe

### Layer 2: Feature (5 hours)
**Depends on**: Layer 1 ✅
- PostMessage communication
- External URL support
- Interactive form example
- **Exit Gate**: Form submission triggers tool call

### Layer 3: Remote DOM (6 hours)
**Depends on**: Layer 2 ✅
- Web Worker sandbox
- DOM operation protocol
- Component library
- Remote DOM renderer
- **Exit Gate**: Remote DOM script renders natively

### Layer 4: API Integration (4 hours)
**Depends on**: Layer 3 ✅
- Decorator API support
- Functional API support
- Interface API support
- **Exit Gate**: All APIs work identically

### Layer 5: Polish (6 hours)
**Depends on**: Layer 4 ✅
- Error boundaries
- Auto-resizing
- Metadata support
- Complete documentation
- **Exit Gate**: Production-ready, fully documented

**Total**: 24-28 hours

---

## By Use Case

### "I'm implementing MCP-UI for the first time"
1. Read `00-introduction.md` for context
2. Follow `01-foundation-layer-spec.md` step-by-step
3. Validate against checklist
4. Proceed to Layer 2

### "I need to understand security"
1. Review `00-introduction.md` architecture section
2. Read `07-security-guide.md` completely
3. Review sandbox implementation in `03-remote-dom-layer-spec.md`

### "I'm reviewing code"
1. Check `06-api-reference.md` for API correctness
2. Review `07-security-guide.md` for security
3. Validate against layer specifications

### "I'm using MCP-UI as a user"
1. Read `00-introduction.md` for capabilities
2. Browse `09-examples-walkthrough.md`
3. Reference `06-api-reference.md` for API

### "I need to extend/customize MCP-UI"
1. Understand foundation in `00-introduction.md`
2. Review implementation in respective layer spec
3. Read `08-remote-dom-deep-dive.md` for advanced customization

---

## Key Files (By Category)

### Server-Side Implementation
- `src/core/ui-resource.ts` - UI resource helpers
- `src/api/programmatic/types.ts` - Type definitions
- `src/api/programmatic/BuildMCPServer.ts` - Server integration

### Client-Side Implementation
- `src/client/UIResourceRenderer.tsx` - Main router
- `src/client/HTMLResourceRenderer.tsx` - HTML/URL rendering
- `src/client/RemoteDOMRenderer.tsx` - Remote DOM rendering
- `src/client/remote-dom/sandbox-worker.ts` - Web Worker
- `src/client/remote-dom/host-receiver.ts` - Operation handler
- `src/client/remote-dom/component-library.ts` - Component whitelist

### Examples
- `examples/ui-inline-html-demo.ts` - Layer 1
- `examples/ui-interactive-form-demo.ts` - Layer 2
- `examples/ui-external-url-demo.ts` - Layer 2
- `examples/ui-remote-dom-basic-demo.ts` - Layer 3
- `examples/ui-remote-dom-advanced-demo.ts` - Layer 3
- `examples/ui-all-apis-demo.ts` - Layer 4

### Tests
- `tests/ui-resource.test.ts` - Server tests
- `tests/ui-renderer.test.tsx` - Client tests
- `tests/ui-remote-dom.test.ts` - Remote DOM tests
- `tests/integration/ui-workflow.test.ts` - E2E tests

---

## Validation Gates (Critical)

Each layer must pass ALL gates before proceeding:

### Foundation Layer Gates
✅ Code compiles
✅ Static HTML renders in sandbox
✅ Sandbox attribute present
✅ Tests pass (meaningful assertions)
✅ No regressions

### Feature Layer Gates
✅ All Foundation gates still pass
✅ Form submission → tool call works
✅ postMessage origin validation works
✅ External URLs embed correctly
✅ Tests pass

### Remote DOM Gates
✅ All Feature gates still pass
✅ Web Worker executes safely
✅ DOM operations translate to React
✅ Component whitelist enforced
✅ Tests pass
✅ Security audit passes

### API Integration Gates
✅ All Remote DOM gates still pass
✅ All API styles work identically
✅ Tests pass for each style
✅ Examples work for each style

### Polish Gates
✅ All previous gates still pass
✅ Production-ready error handling
✅ Comprehensive documentation
✅ All edge cases handled
✅ Security best practices documented

---

## Orchestration Strategy

This implementation follows the **Agentic Coding Framework** with orchestrated agents:

### Agent Roles

1. **Planning Agent**
   - Break down each layer
   - Define success criteria
   - Identify risks

2. **Implementation Agent (Server)**
   - Write server-side code
   - Follow TypeScript patterns
   - Create examples

3. **Implementation Agent (Client)**
   - Write React components
   - Implement security measures
   - Handle edge cases

4. **Test Validation Agent** ⚠️ (SEPARATE from implementers!)
   - Verify tests are meaningful
   - Check assertions are specific
   - Confirm coverage
   - **NEVER the same agent that wrote code**

5. **Functional Validation Agent**
   - Run manual tests
   - Verify requirements met
   - Check no regressions

6. **Security Validation Agent**
   - Audit security measures
   - Check for vulnerabilities
   - Validate isolation

### Iteration Protocol

**If validation fails**:
1. Extract specific issues
2. Limit to 2-3 iterations per layer
3. Focus on blockers only
4. Escalate if can't resolve

**Never skip validation gates** - this is critical!

---

## Security Checklist

Before each layer ships, verify:

- [ ] Input validation (URIs, MIME types)
- [ ] iframe sandboxing (allow-scripts only)
- [ ] Web Worker isolation (Layer 3+)
- [ ] Origin validation (postMessage)
- [ ] Component whitelisting (Layer 3+)
- [ ] No arbitrary code execution
- [ ] Error handling prevents leaks
- [ ] No sensitive data in errors

---

## Testing Strategy

### Unit Tests
- Helper functions work correctly
- Type guards validate properly
- Utilities handle edge cases

### Component Tests
- Renderers produce correct output
- postMessage handlers work
- Error boundaries catch errors

### Integration Tests
- Full flow end-to-end
- Server → Client → User → Server
- All features work together

### Security Tests
- Sandbox prevents escapes
- Origin validation works
- Component whitelist enforced
- Malicious input rejected

---

## Quick Reference

### URIs Format
```
ui://resource-name/version
```
Examples:
```
ui://feedback-form/v1
ui://product-selector/v2
ui://dashboard/external
```

### MIME Types
```
text/html - Inline HTML
text/uri-list - External URL
application/vnd.mcp-ui.remote-dom+javascript - Remote DOM
```

### Creating UI Resources (Server)

```typescript
// Inline HTML
createInlineHTMLResource('ui://form/v1', '<form>...</form>')

// External URL
createExternalURLResource('ui://dashboard/v1', 'https://example.com')

// Remote DOM
createRemoteDOMResource('ui://ui/v1', 'remoteDOM.createElement(...)')
```

### Using UI Resources (Programmatic API)

```typescript
server.addUIResource(
  'ui://form/v1',
  'Form',
  'A form',
  'text/html',
  '<form>...</form>'
)
```

### Rendering UI Resources (Client)

```typescript
<UIResourceRenderer
  resource={uiResource}
  onUIAction={handleAction}
/>
```

### Tool Callbacks from UI

```javascript
// In iframe/worker
window.parent.postMessage({
  type: 'tool',
  payload: {
    toolName: 'submit_form',
    params: { name: 'John', email: 'john@example.com' }
  }
}, '*');
```

---

## Common Questions

**Q: Why 5 layers?**
A: Each layer adds complete functionality with validation gates. Layer 1 proves the concept, Layer 2 adds interactivity, Layer 3 adds sophisticated features, Layers 4-5 complete the implementation.

**Q: Can I skip layers?**
A: No. Each layer builds on previous. Must validate each gate before proceeding.

**Q: How long does implementation take?**
A: 24-28 hours total, including testing. Can be distributed across multiple sessions.

**Q: Is Remote DOM required?**
A: No, but it's included in this plan. You can stop after Layer 2 if needed.

**Q: What about other frameworks?**
A: Currently React only. Vue/Svelte support deferred to future work.

**Q: Can I modify the plan?**
A: Yes, but keep layers and validation gates. Don't skip ahead without proving each stage works.

---

## Getting Started

### Step 1: Understand the Vision
Read `00-introduction.md` completely.

### Step 2: Plan Layer 1
Read `01-foundation-layer-spec.md` completely.

### Step 3: Implement Layer 1
Follow the spec, create all files listed.

### Step 4: Validate Layer 1
Run all tests, verify checklist items.

### Step 5: Proceed
If Layer 1 passes, start Layer 2.

---

## Resources

### Official MCP-UI Specification
https://mcpui.dev/

### MCP Specification
https://modelcontextprotocol.io/

### simple-mcp Repository
/mnt/Shared/cs-projects/simple-mcp/

### Orchestrator Framework
/mnt/Shared/cs-projects/prompt-library/ORCHESTRATOR_PROMPT.md

---

## Document Updates

This documentation is living and evolves as implementation progresses.

**Last Updated**: October 16, 2025
**Status**: Ready to begin Layer 1 implementation
**Version**: 1.0

---

**Ready to build MCP-UI?** Start with `01-foundation-layer-spec.md`
