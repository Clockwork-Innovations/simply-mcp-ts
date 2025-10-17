# MCP-UI Complete Implementation: Introduction & Roadmap

## Overview

This documentation outlines the **complete implementation** of MCP-UI support in simple-mcp as an experimental feature. We will build full MCP-UI capabilities—including Remote DOM support—**without adding new dependencies**, creating a native, production-ready solution.

**Core Commitment**: Zero new npm dependencies. Pure TypeScript/React implementation.

---

## What is MCP-UI?

MCP-UI extends the Model Context Protocol to support interactive user interfaces, enabling AI agents to display rich UIs, collect structured input, and maintain bidirectional interaction with users through secure sandboxed components.

### Three UI Rendering Mechanisms

1. **Inline HTML** (`text/html`)
   - Server sends raw HTML string
   - Renders in sandboxed iframe using `srcdoc`
   - Best for simple self-contained forms and widgets
   - Example: Product selector, feedback form, configuration card

2. **External URL** (`text/uri-list`)
   - Server sends HTTPS URL
   - Renders existing web app in iframe using `src`
   - Best for embedding complex applications
   - Example: Analytics dashboard, payment form, chart builder

3. **Remote DOM** (`application/vnd.mcp-ui.remote-dom+javascript`) ⭐ NEW
   - Server sends JavaScript that describes UI
   - Executes in Web Worker sandbox on client
   - Renders as native React components matching host's design system
   - Best for rich interactive experiences that feel native to the application
   - Example: Complex data visualization, interactive form wizard, real-time collaboration UI

### Interaction Flow

```
AI Agent
   ↓ (requests UI)
MCP Server
   ↓ (returns UIResource)
Client App
   ↓ (renders in sandbox)
User Interface
   ↓ (user interacts)
postMessage
   ↓ (calls tool)
MCP Server
   ↓ (processes action)
Response back to Agent
```

---

## Complete Architecture

### Server Side
- **UIResource Creation**: Type-safe helpers for all 3 UI types
- **Resource Registration**: Extend existing resource system
- **Dynamic Content**: Support function-based resource generation
- **Metadata**: Optional preferences (size, initial data)

### Client Side
- **UIResourceRenderer**: Main component that auto-detects UI type
- **HTMLResourceRenderer**: Handles inline HTML + external URLs
- **RemoteDOMRenderer**: Handles Remote DOM scripts
- **RemoteDOMSandbox**: Web Worker-based sandbox
- **ComponentLibrary**: Basic UI components (Button, Input, Text, Card, etc.)

### Security Model
- **iframe Sandboxing**: `sandbox="allow-scripts"` with minimal permissions
- **Web Worker Isolation**: Remote DOM runs in isolated thread
- **Origin Validation**: postMessage origin checks
- **Protocol Validation**: Serializable message protocol, no arbitrary code
- **Component Whitelisting**: Only allowed components in Remote DOM

---

## Implementation Strategy: Agentic Coding Framework

We follow the **Orchestrator Pattern** with layered development, validated at each stage:

### Why Layered?
- ✅ New complex feature (spans server + client + 3 UI types)
- ✅ Each layer produces working, testable code
- ✅ Can catch issues early before adding complexity
- ✅ Users get value at each stage (Foundation → Feature → Remote DOM)

---

## Five Implementation Layers

### **Layer 1: Foundation** (4 hours)
**Goal**: Basic HTML UI resources working end-to-end

**What Gets Built**:
- Server: `createInlineHTMLResource()` function
- Client: `<UIResourceRenderer>` component
- Example: Static HTML card demo

**Validation Gate**:
- ✅ Server creates UIResource correctly
- ✅ Client renders HTML in sandboxed iframe
- ✅ Iframe is secure (sandbox attribute)
- ✅ Static demo works

**Success**: Simple form renders securely

---

### **Layer 2: Interactive Features** (5 hours)
**Goal**: Interactive callbacks and external URL support

**What Gets Built**:
- PostMessage communication (iframe ↔ host)
- Tool callback execution from UI
- External URL iframe embedding
- Origin validation
- Examples: Form with submission, multi-step wizard

**Validation Gate**:
- ✅ Form submission triggers tool call
- ✅ Tool executes and returns response
- ✅ postMessage origin validation works
- ✅ External URLs render correctly

**Success**: Full interaction loop (UI → tool → response)

---

### **Layer 3: Remote DOM** (6 hours)
**Goal**: Complete Remote DOM implementation with Web Worker sandbox

**What Gets Built**:
- `createRemoteDOMResource()` function
- Web Worker sandbox implementation
- Protocol for DOM operations
- Basic component library (Button, Input, Text, Card, Stack, Image)
- Remote event handling

**Validation Gate**:
- ✅ Remote DOM script executes in Web Worker
- ✅ DOM operations translate to React components
- ✅ No arbitrary code runs in main thread
- ✅ Events propagate back from components
- ✅ Component library extensible

**Success**: Native-looking interactive UI with no security compromise

---

### **Layer 4: API Integration** (4 hours)
**Goal**: Support all API styles for UI resources

**What Gets Built**:
- Decorator API: `@uiResource()` decorator
- Functional API: UI builders
- Interface API: `IUIResource` interface
- Comprehensive examples

**Validation Gate**:
- ✅ All API styles can create all 3 UI types
- ✅ Behavior consistent across APIs
- ✅ Examples for each style

**Success**: UI resources available in all API styles

---

### **Layer 5: Polish & Production-Ready** (6 hours)
**Goal**: Optimization, error handling, documentation

**What Gets Built**:
- Iframe auto-resizing
- Error boundaries
- Loading states
- Resource metadata support
- Comprehensive security documentation
- API reference guide
- Troubleshooting guide

**Validation Gate**:
- ✅ Production-ready error handling
- ✅ Security best practices documented
- ✅ All edge cases handled
- ✅ No console errors in examples

**Success**: Feature complete, documented, production-ready

---

## Complete File Structure

```
src/
├── core/
│   └── ui-resource.ts                    # NEW: UI resource helpers
│       ├── createInlineHTMLResource()
│       ├── createExternalURLResource()
│       └── createRemoteDOMResource()
│
├── client/                                # NEW: Complete client implementation
│   ├── UIResourceRenderer.tsx            # Main router component
│   ├── HTMLResourceRenderer.tsx          # Inline HTML + External URL
│   ├── RemoteDOMRenderer.tsx             # Remote DOM renderer
│   ├── ui-types.ts                       # Type definitions
│   ├── ui-utils.ts                       # Utilities
│   │
│   └── remote-dom/                       # NEW: Remote DOM sandbox
│       ├── sandbox-worker.ts             # Web Worker sandbox
│       ├── host-receiver.ts              # Host-side DOM receiver
│       ├── component-library.ts          # Component mappings
│       ├── protocol.ts                   # Communication protocol
│       └── operations.ts                 # DOM operation types
│
├── api/
│   ├── programmatic/
│   │   ├── types.ts                      # MODIFIED: Add UI types
│   │   └── BuildMCPServer.ts             # MODIFIED: addUIResource()
│   ├── decorator/
│   │   └── decorators.ts                 # MODIFIED: @uiResource()
│   ├── functional/
│   │   └── builders.ts                   # MODIFIED: UI builders
│   └── interface/
│       └── types.ts                      # MODIFIED: IUIResource
│
└── types/
    └── ui.ts                             # NEW: Exported UI types

examples/
├── ui-inline-html-demo.ts                # Layer 1: Static HTML
├── ui-interactive-form-demo.ts           # Layer 2: Form callbacks
├── ui-product-selector-demo.ts           # Layer 2: Complex interactive
├── ui-external-url-demo.ts               # Layer 2: Iframe embedding
├── ui-remote-dom-basic-demo.ts           # Layer 3: Remote DOM basic
├── ui-remote-dom-advanced-demo.ts        # Layer 3: Remote DOM interactive
└── ui-all-apis-demo.ts                   # Layer 4: All API styles

tests/
├── ui-resource.test.ts                   # Server tests
├── ui-renderer.test.tsx                  # Client component tests
├── ui-remote-dom.test.ts                 # Remote DOM tests
└── integration/
    └── ui-workflow.test.ts               # End-to-end integration tests

docs/mcp-ui/
├── 00-introduction.md                    # THIS FILE: Overview
├── 01-foundation-layer-spec.md           # Layer 1 technical spec
├── 02-feature-layer-spec.md              # Layer 2 technical spec
├── 03-remote-dom-layer-spec.md           # Layer 3 technical spec (Remote DOM)
├── 04-api-integration-spec.md            # Layer 4 technical spec
├── 05-polish-layer-spec.md               # Layer 5 technical spec
├── 06-api-reference.md                   # Complete API documentation
├── 07-security-guide.md                  # Security best practices
├── 08-remote-dom-deep-dive.md            # Remote DOM architecture
└── 09-examples-walkthrough.md            # Example demonstrations
```

---

## Validation Strategy (Critical)

Each layer follows this validation protocol:

### Agents Involved
1. **Planning Agent**: Design specifications
2. **Implementation Agent**: Build code
3. **Test Validation Agent** (SEPARATE!): Verify tests are real and meaningful
4. **Functional Validation Agent**: Test functionality manually
5. **Security Validation Agent**: Audit security measures

### Validation Gates (One Per Layer)

Before proceeding to next layer:
- ✅ Code builds without errors
- ✅ Tests are meaningful (not mocked, not trivial assertions)
- ✅ Tests actually run and pass
- ✅ Functionality requirements met
- ✅ Security measures validated
- ✅ No regressions in existing code

### Escalation Rules
- **Max 2-3 iterations per layer** for fixes
- **If blocked**: Escalate to user with specific issue
- **Never skip validation gates**

---

## Remote DOM Technical Details

### Architecture
```
Server                      Client Host                    Web Worker
┌──────────────┐           ┌─────────────────┐           ┌──────────────┐
│ Remote DOM   │ Script    │ RemoteDOMRenderer            │ Sandbox      │
│ JavaScript   ├──────────→│ instantiates    ├───────────→│ Executes     │
│ UIResource   │           │ Web Worker      │           │ script       │
└──────────────┘           └─────────────────┘           └──────────────┘
                                   ↑                             │
                                   │ postMessage                 │
                                   │ (DOM operations)            │
                                   │                             │
                                   ├─────────────────────────────┘
                                   │
                           ┌───────┴──────────┐
                           │ Host Receiver    │
                           │ Validates ops    │
                           │ Translates to    │
                           │ React components │
                           └──────────────────┘
                                   │
                                   ↓
                           ┌──────────────────┐
                           │ React DOM        │
                           │ Rendered UI      │
                           └──────────────────┘
```

### Key Principles
- **Sandboxed Execution**: Web Worker isolates script execution
- **Protocol-Based**: DOM operations use serializable message protocol
- **No Eval**: Never use `eval()` or `Function()` constructor
- **Component Whitelist**: Only allowed components can be rendered
- **Event Bridging**: Host captures component events, sends back to Worker

---

## Success Criteria: Complete Implementation

### Foundation Layer ✅
- Server creates UIResource objects correctly
- Client renders HTML in iframe
- Security: sandbox attribute applied
- Static demo works

### Feature Layer ✅
- PostMessage communication secure
- Tool callbacks execute
- External URLs embed correctly
- Forms + interactive demos work

### Remote DOM Layer ✅
- Web Worker executes scripts safely
- DOM operations translate to React
- Component library works
- Interactive Remote DOM demo works
- No XSS or code injection possible

### API Integration ✅
- All API styles support all UI types
- Behavior consistent
- Examples for each style

### Polish Layer ✅
- Production-ready error handling
- Comprehensive documentation
- Security best practices guide
- No console errors or warnings

### Overall Feature ✅
- **100% Complete MCP-UI support**
- **Zero new npm dependencies**
- **Production-ready**
- **Security validated**
- **Well documented**

---

## Timeline: 24-28 Hours Total

| Layer | Hours | Focus |
|-------|-------|-------|
| 1. Foundation | 4 | Basic HTML rendering |
| 2. Feature | 5 | Interactive callbacks |
| 3. Remote DOM | 6 | Web Worker sandbox + components |
| 4. API Integration | 4 | All API styles |
| 5. Polish | 6 | Documentation + optimization |
| Testing & Validation | 3-5 | Throughout all layers |
| **Total** | **24-28** | **Complete feature** |

---

## What's Included (vs Deferred)

### ✅ In This Implementation (Complete)

1. **Inline HTML** (text/html)
   - Self-contained HTML forms
   - Responsive design support
   - Examples with validation

2. **External URLs** (text/uri-list)
   - Iframe embedding
   - CSP considerations
   - Examples with third-party services

3. **Remote DOM** (application/vnd.mcp-ui.remote-dom) ⭐
   - Web Worker sandbox
   - Protocol-based DOM operations
   - Basic component library (Button, Input, Text, Card, Stack, Image)
   - Event handling
   - Extensible architecture

4. **Security**
   - iframe sandboxing
   - Web Worker isolation
   - Origin validation
   - Message validation
   - Component whitelisting

5. **API Support**
   - Programmatic API
   - Decorator API
   - Functional API
   - Interface API

6. **Documentation**
   - Complete API reference
   - Security best practices
   - Remote DOM deep dive
   - Examples walkthrough
   - Troubleshooting guide

---

## Next Phase: Future Enhancements (Not in Scope Now)

These can be added later based on demand:

- Advanced component library (Table, Modal, Tooltip, etc.)
- Platform-specific adapters (Skybridge for Apps SDK)
- Framework support (Vue, Svelte, Web Components)
- Custom component registration system
- State management helpers
- Animation framework integration

---

## Key Principles

### Development Approach
✅ **Layered**: Each layer builds on previous, validated separately
✅ **Incremental**: Working code at each stage
✅ **Validated**: Separate validation agents (not self-grading)
✅ **Secure**: Security first, not an afterthought
✅ **Documented**: Comprehensive docs at each stage

### Code Quality
✅ **No Dependencies**: Zero new npm packages
✅ **Type-Safe**: Full TypeScript throughout
✅ **Tested**: Meaningful tests at each layer
✅ **Patterns**: Follow existing simple-mcp conventions
✅ **Error Handling**: Graceful degradation

### Security
✅ **Sandboxed**: All untrusted code runs in isolation
✅ **Validated**: All inputs validated
✅ **Limited**: Components/operations whitelist
✅ **Documented**: Security considerations explicit
✅ **Auditable**: Clear security boundaries

---

## How to Use This Documentation

1. **Start here** (`00-introduction.md`): Understand the complete vision
2. **Read layer specs**: `01-foundation-layer-spec.md`, etc. for technical details
3. **Reference API docs**: `06-api-reference.md` for implementation details
4. **Security review**: `07-security-guide.md` for trust model
5. **Remote DOM deep dive**: `08-remote-dom-deep-dive.md` for architecture
6. **Examples**: `09-examples-walkthrough.md` for demonstrations

---

## Status & Next Steps

🟢 **Status**: Ready to begin implementation

**Next Document**: `01-foundation-layer-spec.md` - Foundation Layer Technical Specification

**Ready to build the complete MCP-UI feature!**
