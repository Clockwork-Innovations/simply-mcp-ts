# MCP UI Primer

## Welcome

This primer provides comprehensive documentation for implementing MCP UI support in LLM clients and applications. Whether you're building an extender for LLMs that don't natively support MCP UI, or adding support to an existing client, this documentation will guide you through the entire implementation.

## What is MCP UI?

**MCP UI** is an experimental extension to the Model Context Protocol (MCP) that enables servers to deliver **interactive web components** to clients. It transforms MCP from a text-based protocol into a rich, visual experience platform.

**Key Features**:
- 🎨 Interactive HTML components
- 🔧 Tool integration for bidirectional communication
- 🔒 Security-first design with sandboxing
- 📱 React component support
- 🔄 Real-time updates via resource notifications
- 🌐 Multiple rendering modes (HTML, external URLs, Remote DOM)

## Official Resources

- **GitHub Repository**: https://github.com/idosal/mcp-ui
- **Website**: https://mcpui.dev
- **Reference Implementation**: This repository (`simply-mcp-ts`)
- **Status**: Experimental (rapid iteration expected)
- **License**: Apache 2.0

## Documentation Structure

This primer is organized into focused documents that build upon each other:

### 📖 [00-OVERVIEW.md](./00-OVERVIEW.md)
**Start here!** High-level introduction to MCP UI concepts.

**You'll learn**:
- What MCP UI is and why it exists
- Core concepts (URI scheme, MIME types, actions)
- Architecture overview
- Progressive enhancement layers
- Design philosophy

**Read this if**: You're new to MCP UI or need a conceptual overview.

---

### 📋 [01-PROTOCOL-SPECIFICATION.md](./01-PROTOCOL-SPECIFICATION.md)
Detailed specification of the MCP UI protocol extension.

**You'll learn**:
- URI scheme format and mapping
- MIME type specifications
- Resource structure and metadata
- Request/response flow
- UI actions (tool calls, prompts, notifications)
- Content enhancement pipeline
- Lifecycle hooks and updates

**Read this if**: You need to understand the protocol at a technical level.

---

### 🛠️ [02-IMPLEMENTATION-GUIDE.md](./02-IMPLEMENTATION-GUIDE.md)
Step-by-step guide for implementing MCP UI in your client.

**You'll learn**:
- Phase-by-phase implementation approach
- Resource discovery and filtering
- Rendering infrastructure setup
- Bidirectional communication handling
- Security implementation
- Complete working examples

**Read this if**: You're building an MCP UI client implementation.

---

### 📨 [03-MESSAGE-FORMAT.md](./03-MESSAGE-FORMAT.md)
Complete reference of all message formats and data structures.

**You'll learn**:
- Exact JSON-RPC message formats
- Resource discovery messages
- Resource retrieval messages
- UI action messages (postMessage protocol)
- Tool call request/response format
- Complete TypeScript type definitions
- Wire format specifications

**Read this if**: You need exact message format specifications or type definitions.

---

### 💡 [04-EXAMPLES.md](./04-EXAMPLES.md)
Concrete, working code examples for both servers and clients.

**You'll learn**:
- Server-side UI creation examples
- Client-side rendering examples
- Common patterns (loading states, forms, real-time updates)
- Complete working applications
- React component examples

**Read this if**: You prefer learning from code examples or need reference implementations.

---

### 🔒 [05-SECURITY.md](./05-SECURITY.md)
Comprehensive security guide covering threats and mitigations.

**You'll learn**:
- Security model and trust boundaries
- Threat analysis (XSS, clickjacking, etc.)
- Six security layers explained
- Implementation requirements
- Best practices
- Common vulnerabilities and fixes
- Security checklist

**Read this if**: You need to understand security implications or are implementing security features.

---

## Quick Start Paths

### Path 1: "I want to understand MCP UI"
1. Read [00-OVERVIEW.md](./00-OVERVIEW.md) for concepts
2. Skim [01-PROTOCOL-SPECIFICATION.md](./01-PROTOCOL-SPECIFICATION.md) for protocol details
3. Review [04-EXAMPLES.md](./04-EXAMPLES.md) to see it in action

### Path 2: "I need to implement MCP UI client support"
1. Read [00-OVERVIEW.md](./00-OVERVIEW.md) for background
2. Study [01-PROTOCOL-SPECIFICATION.md](./01-PROTOCOL-SPECIFICATION.md) for protocol
3. Follow [02-IMPLEMENTATION-GUIDE.md](./02-IMPLEMENTATION-GUIDE.md) step-by-step
4. Reference [03-MESSAGE-FORMAT.md](./03-MESSAGE-FORMAT.md) for exact formats
5. Review [05-SECURITY.md](./05-SECURITY.md) for security requirements
6. Use [04-EXAMPLES.md](./04-EXAMPLES.md) as reference

### Path 3: "I need to create MCP UI servers"
1. Read [00-OVERVIEW.md](./00-OVERVIEW.md) for concepts
2. Study [04-EXAMPLES.md](./04-EXAMPLES.md) for server patterns
3. Review [01-PROTOCOL-SPECIFICATION.md](./01-PROTOCOL-SPECIFICATION.md) for details
4. Check [05-SECURITY.md](./05-SECURITY.md) for security best practices

### Path 4: "I'm building an LLM extender"
1. Read all documents in order (00 → 05)
2. Pay special attention to:
   - [02-IMPLEMENTATION-GUIDE.md](./02-IMPLEMENTATION-GUIDE.md) for architecture
   - [03-MESSAGE-FORMAT.md](./03-MESSAGE-FORMAT.md) for message translation
   - [05-SECURITY.md](./05-SECURITY.md) for security requirements

## Key Concepts Summary

### URI Scheme
```
ui://category/name → maps to → categoryName() method
```

### MIME Types
- `text/html` - Inline HTML content
- `text/uri-list` - External URL
- `application/vnd.mcp-ui.remote-dom` - Remote DOM component

### UI Actions
- `CALL_TOOL` - Invoke MCP tool
- `SUBMIT_PROMPT` - Send text to LLM
- `NOTIFY` - Show notification
- `NAVIGATE` - Open URL

### Security Layers
1. iframe sandbox
2. Content Security Policy
3. Tool allowlist
4. Origin validation
5. Input sanitization
6. Rate limiting

## Implementation Checklist

### Minimum Viable Implementation

#### Client Side
- [ ] Filter `ui://` resources from `resources/list`
- [ ] Fetch UI content via `resources/read`
- [ ] Render HTML in sandboxed iframe
- [ ] Handle `CALL_TOOL` actions
- [ ] Enforce tool allowlist
- [ ] Validate message source

#### Server Side (using simply-mcp-ts)
- [ ] Define interface extending `IUI`
- [ ] Set `html` or `htmlFile` property
- [ ] Declare `tools` array
- [ ] Export async function matching URI pattern
- [ ] Implement corresponding tool functions

### Production-Ready Implementation

Add to minimum viable:

#### Client
- [ ] Handle all action types (SUBMIT_PROMPT, NOTIFY, NAVIGATE)
- [ ] Implement rate limiting
- [ ] Add timeout protection
- [ ] Input sanitization
- [ ] Audit logging
- [ ] User controls (disable UI)
- [ ] Resource update subscriptions
- [ ] Error handling and fallbacks

#### Server
- [ ] Input validation in all tools
- [ ] Output sanitization
- [ ] User confirmation for sensitive operations
- [ ] Comprehensive error handling
- [ ] Resource update notifications
- [ ] Security audit

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MCP UI Flow                           │
└─────────────────────────────────────────────────────────┘

 SERVER                          WIRE                 CLIENT
┌─────────┐                 ┌───────────┐           ┌─────────┐
│Interface│                 │           │           │Resource │
│  with   │────────────────>│   MCP     │──────────>│  List   │
│   IUI   │  resources/list │ Protocol  │           │         │
│         │                 │           │           │         │
└─────────┘                 └───────────┘           └─────────┘
                                  │                       │
┌─────────┐                       │                       ▼
│Enhanced │                       │                 ┌─────────┐
│  HTML   │<──────────────────────┘                 │Resource │
│ Content │  resources/read                         │  Read   │
│         │                                          │         │
└─────────┘                                          └─────────┘
                                                           │
                                                           ▼
                                                     ┌─────────┐
┌─────────┐                 ┌───────────┐           │Sandboxed│
│  Tool   │<────────────────│ postMessage│<─────────│ iframe  │
│Execute  │  CALL_TOOL      │  Protocol │           │Renderer │
│         │                 │           │           │         │
└─────────┘                 └───────────┘           └─────────┘
     │                            ▲
     │                            │
     └────────────────────────────┘
          TOOL_RESULT
```

## Common Use Cases

### Dashboard Widget
```typescript
interface DashboardUI extends IUI {
  html: string;
  tools: ["getMetrics"];
}
```
Display real-time metrics with refresh capability.

### Configuration Panel
```typescript
interface ConfigUI extends IUI {
  htmlFile: "./ui/config.html";
  tools: ["getSettings", "saveSettings"];
}
```
Interactive form for server configuration.

### Data Visualization
```typescript
interface ChartUI extends IUI {
  reactFile: "./ui/Chart.tsx";
  tools: ["getData"];
}
```
Rich charting with React components.

### Status Monitor
```typescript
interface StatusUI extends IUI {
  html: string;
  tools: ["getStatus"];
}
```
Live status with auto-refresh.

## Troubleshooting

### UI Not Rendering
1. Check MIME type is supported
2. Verify iframe sandbox attributes
3. Check browser console for CSP errors
4. Ensure HTML is valid

### Tool Calls Failing
1. Verify tool is in allowlist
2. Check tool name matches exactly
3. Validate arguments match tool schema
4. Check for rate limiting

### postMessage Not Working
1. Verify event.source validation
2. Check message format
3. Ensure iframe is loaded
4. Check browser console for errors

### Security Warnings
1. Review sandbox attributes
2. Check CSP headers
3. Verify origin validation
4. Audit tool allowlist

## Reference Implementation

This repository (`simply-mcp-ts`) provides a complete, production-ready reference implementation:

**Key Files**:
- `/src/adapters/ui-adapter.ts` - Server-side UI registration and enhancement
- `/src/parser.ts` - Interface parsing and metadata extraction
- `/src/client/UIResourceRenderer.tsx` - Client-side React renderer
- `/src/client/remote-dom/sandbox-worker.ts` - Secure Remote DOM execution
- `/examples/interface-ui-foundation.ts` - Example UI implementations

**To explore**:
```bash
# View UI examples
cat examples/interface-ui-foundation.ts

# Run example server
npm run example:ui

# Study the adapter implementation
cat src/adapters/ui-adapter.ts
```

## Next Steps

1. **Read the overview**: Start with [00-OVERVIEW.md](./00-OVERVIEW.md)

2. **Choose your path**: Follow one of the quick start paths above

3. **Try examples**: Run the examples in this repository:
   ```bash
   npm install
   npm run example:ui
   ```

4. **Implement**: Follow [02-IMPLEMENTATION-GUIDE.md](./02-IMPLEMENTATION-GUIDE.md)

5. **Secure it**: Review [05-SECURITY.md](./05-SECURITY.md)

6. **Test**: Use examples from [04-EXAMPLES.md](./04-EXAMPLES.md)

## Getting Help

- **GitHub Issues**: https://github.com/idosal/mcp-ui/issues
- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **This Repository**: https://github.com/cyanheads/simply-mcp-ts

## Contributing

This primer is part of the `simply-mcp-ts` project. If you find errors or have suggestions:

1. Open an issue
2. Submit a pull request
3. Improve examples
4. Add use cases

## Version

**Primer Version**: 1.0
**Based on**: `simply-mcp-ts` implementation (October 2025)
**MCP UI Status**: Experimental

---

**Happy building! 🚀**

MCP UI brings rich, interactive experiences to the Model Context Protocol. With proper security and implementation, it enables powerful new use cases while maintaining the flexibility and simplicity that makes MCP great.
