# MCP Framework Documentation Index

**Last Updated:** 2025-09-30
**Version:** 1.0.0

---

## Overview

The **MCP (Model Context Protocol) Framework** is a comprehensive, production-ready platform for building configurable MCP servers with custom tools, handlers, and validation. It provides a secure, scalable architecture that supports multiple transport types (Stdio, HTTP, SSE) and enables AI models like Claude to interact with external systems through standardized interfaces.

**Key Capabilities:** JSON-based configuration, pluggable handler system, built-in security features, multiple transport types, input validation, session management, and LLM-friendly error handling.

---

## 📚 Start Here

New to the MCP Framework? Begin with these documents:

| Document | Time | Description |
|----------|------|-------------|
| **[Quick Start](../README.md#quick-start)** | 5 min | Get your first server running in minutes |
| **[README Overview](../README.md)** | 15 min | Framework overview, features, and basic concepts |
| **[API Examples](./guides/API-INTEGRATION.md)** | 20 min | Working examples with curl, TypeScript, and Python |
| **[Configuration Format](../README.md#configuration-format)** | 10 min | Learn how to define tools, prompts, and resources |

**Recommended First Hour:**
1. Read the Quick Start (5 min)
2. Run the simple server example (10 min)
3. Review API Examples (20 min)
4. Modify the example config and test (25 min)

---

## 🏗️ Architecture

Deep dive into the system design and component interactions:

| Document | Audience | Time | Description |
|----------|----------|------|-------------|
| **[ARCHITECTURE.md](./architecture/TECHNICAL.md)** | Developers & Architects | 45 min | Complete system architecture with diagrams covering transport layer, session management, security, handler resolution, and data flow |
| **[TRANSPORTS.md](./reference/TRANSPORTS.md)** | Developers | 30 min | Comparison of Stdio, HTTP (stateless/stateful), and SSE transports with decision matrix and use case recommendations |
| **[Implementation Plan](./architecture/OVERVIEW.md)** | Architects | 60 min | Comprehensive roadmap covering phased implementation, design decisions, and architectural trade-offs |

**What you'll learn:**
- How requests flow through the system (Transport → Session → Security → Handler → Response)
- When to use Stdio vs HTTP vs SSE transport
- Component responsibilities and extension points
- Security layers and validation pipelines

---

## 🛠️ Developer Guides

Practical guides for building with the framework:

### Handler Development
| Document | Time | What You'll Learn |
|----------|------|-------------------|
| **[HANDLER-GUIDE.md](./guides/HANDLER-DEVELOPMENT.md)** | 45 min | Complete guide to creating file handlers, inline handlers, HTTP handlers, and registry handlers with best practices and security considerations |

**Covers:** Handler basics, async operations, error handling, testing strategies, performance optimization, and 10+ complete working examples.

### Input Validation
| Document | Time | What You'll Learn |
|----------|------|-------------------|
| **[VALIDATION-GUIDE.md](./guides/INPUT-VALIDATION.md)** | 40 min | Comprehensive validation reference covering string, number, array, object, enum, and format validation with real-world examples |

**Covers:** JSON Schema validation patterns, regex patterns, custom validators, nested object validation, and security validation patterns. Includes quick reference table.

### API Integration
| Document | Time | What You'll Learn |
|----------|------|-------------------|
| **[API-EXAMPLES.md](./guides/API-INTEGRATION.md)** | 30 min | Working code examples for integrating with the MCP server using curl, TypeScript (Node.js), and Python clients |

**Covers:** Session initialization, tool calling, prompt retrieval, resource access, error handling, and complete client implementation examples.

### Deployment
| Document | Time | What You'll Learn |
|----------|------|-------------------|
| **[DEPLOYMENT.md](./guides/DEPLOYMENT.md)** | 50 min | Production deployment guide with Docker, systemd, reverse proxy configuration, SSL/TLS setup, monitoring, and scaling strategies |

**Covers:** Production checklist, environment variables, security hardening, performance tuning, health checks, backup strategies, and multi-instance deployment.

---

## 📘 Reference Documentation

Technical references and specifications:

### Transport Types
**[TRANSPORTS.md](./reference/TRANSPORTS.md)** - Detailed comparison of all transport types

**Quick Reference:**
- **Stdio:** Best for CLI tools, local scripts, subprocess communication
- **Stateless HTTP:** Best for serverless, Lambda, stateless APIs
- **Stateful HTTP:** Best for web apps, persistent sessions, streaming
- **SSE:** Legacy support for older systems

### LLM Integration
**[LLM-SELF-HEALING.md](./reference/LLM-INTEGRATION.md)** - LLM-friendly error messages and self-healing patterns

**Covers:** Structured error responses that enable AI models to automatically fix validation errors, suggest corrections, and recover from failures.

### Testing
**[TESTING.md](./testing/OVERVIEW.md)** - Test suite documentation and coverage

**Current Status:**
- 53 total test cases across all transports
- Stdio, Stateless HTTP, and Stateful HTTP test suites
- Automated test scripts: `test-framework.sh`, `test-llm-errors.sh`
- Detailed test reports in `tests/TEST-REPORT.md`

### Validation Patterns
**[Validation Implementation](../validation/IMPLEMENTATION.md)** - Deep dive into validation architecture

**Covers:** Validation engine design, constraint system, error reporting, and extensibility patterns.

---

## 💡 Examples & Use Cases

### Configuration Examples
Located in `/mcp/examples/`:

| File | Use Case | Description |
|------|----------|-------------|
| `basic-config.json` | Learning | Minimal configuration for getting started |
| `development-config.json` | Development | Development-friendly settings with debugging |
| `production-config.json` | Production | Hardened configuration with security enabled |
| `secure-config.json` | High Security | Maximum security features enabled |
| `high-performance-config.json` | Performance | Optimized for throughput and low latency |

### Real-World Use Case
**Resume Automation System** - Browser automation for resume submission

Referenced throughout the documentation as a real-world example of:
- Native messaging transport
- Chrome extension integration
- API key validation
- Process isolation
- 1MB message size limits
- Memory constraints (<50MB)

---

## 🗺️ Recommended Reading Paths

### For New Users (1 Hour - Get Started)
```
1. README.md (Quick Start section)          → 10 min
2. Run simple server example                → 10 min
3. API-EXAMPLES.md (curl examples)          → 15 min
4. Modify config.json and test              → 15 min
5. HANDLER-GUIDE.md (Handler Basics)        → 10 min
```

**Goal:** Understand basics, run your first server, make your first tool call.

---

### For Developers (4 Hours - Deep Dive)
```
1. README.md (complete)                     → 20 min
2. ARCHITECTURE.md                          → 45 min
3. HANDLER-GUIDE.md (complete)              → 45 min
4. VALIDATION-GUIDE.md                      → 40 min
5. API-EXAMPLES.md                          → 30 min
6. Create custom handler + validation       → 60 min
```

**Goal:** Build custom tools with validation, understand architecture, implement handlers.

---

### For Architects (8 Hours - Complete Understanding)
```
1. README.md                                → 20 min
2. MCP-FRAMEWORK-IMPLEMENTATION-PLAN.md     → 90 min
3. ARCHITECTURE.md                          → 60 min
4. TRANSPORTS.md                            → 30 min
5. DEPLOYMENT.md                            → 60 min
6. HANDLER-GUIDE.md                         → 45 min
7. VALIDATION-GUIDE.md                      → 40 min
8. LLM-SELF-HEALING.md                      → 20 min
9. Review all example configs               → 30 min
10. TESTING.md + test scripts               → 30 min
```

**Goal:** Complete system understanding, make architectural decisions, plan production deployment.

---

## 🚀 Quick Reference

**"I want to..."** → **"Read this doc"** → **"Section"**

| Goal | Document | Section |
|------|----------|---------|
| Get started in 5 minutes | README.md | Quick Start |
| Understand what MCP is | README.md | Overview |
| Call a tool via API | API-EXAMPLES.md | Tool Calling |
| Create a custom handler | HANDLER-GUIDE.md | File Handlers |
| Add input validation | VALIDATION-GUIDE.md | String/Number Validation |
| Choose a transport type | TRANSPORTS.md | Quick Comparison Table |
| Deploy to production | DEPLOYMENT.md | Production Checklist |
| Secure my server | DEPLOYMENT.md | Security Hardening |
| Add API authentication | DEPLOYMENT.md | Environment Variables |
| Enable session management | TRANSPORTS.md | Stateful HTTP |
| Run automated tests | TESTING.md | Running Tests |
| Fix LLM validation errors | LLM-SELF-HEALING.md | Error Structure |
| Scale to multiple instances | DEPLOYMENT.md | Scaling |
| Debug connection issues | API-EXAMPLES.md | Session Initialization |
| Optimize performance | DEPLOYMENT.md | Performance Tuning |
| Create a serverless deployment | TRANSPORTS.md | Stateless HTTP |
| Build a CLI tool integration | TRANSPORTS.md | Stdio Transport |
| Add custom validation rules | VALIDATION-GUIDE.md | Advanced Validation |
| Implement rate limiting | DEPLOYMENT.md | Security Hardening |
| Set up monitoring | DEPLOYMENT.md | Monitoring and Logging |
| Configure SSL/TLS | DEPLOYMENT.md | SSL/TLS Setup |

---

## 📂 Documentation Structure

```
/mcp/
├── README.md                          # Framework overview & quick start
├── /docs/
│   ├── INDEX.md                       # This file - complete documentation guide
│   ├── QUICK-START.md                 # 5-minute getting started guide
│   ├── TROUBLESHOOTING.md             # Common issues and solutions
│   ├── /architecture/
│   │   ├── OVERVIEW.md                # Implementation plan & roadmap
│   │   ├── DESIGN.md                  # System design document
│   │   └── TECHNICAL.md               # Technical architecture & diagrams
│   ├── /guides/
│   │   ├── HANDLER-DEVELOPMENT.md     # Handler development guide
│   │   ├── INPUT-VALIDATION.md        # Input validation reference
│   │   ├── API-INTEGRATION.md         # Client integration examples
│   │   └── DEPLOYMENT.md              # Production deployment guide
│   ├── /reference/
│   │   ├── TRANSPORTS.md              # Transport comparison
│   │   └── LLM-INTEGRATION.md         # LLM-friendly errors
│   └── /testing/
│       └── OVERVIEW.md                # Test suite documentation
├── /examples/
│   ├── basic-config.json
│   ├── development-config.json
│   ├── production-config.json
│   ├── secure-config.json
│   └── high-performance-config.json
├── /tests/
│   ├── README.md                      # Test documentation
│   └── TEST-REPORT.md                 # Latest test results
└── /validation/
    ├── README.md                      # Validation system overview
    └── IMPLEMENTATION.md              # Validation architecture
```

---

## 🔗 External Resources

### MCP Protocol Specification
- [Official MCP Specification](https://modelcontextprotocol.io/) - Protocol details
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK

### Related Technologies
- [JSON Schema](https://json-schema.org/) - Validation schema format
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification) - Communication protocol
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) - SSE specification

---

## 💬 Common Questions

### What is the MCP Framework?
A configurable server implementation of the Model Context Protocol that allows AI models to interact with external tools through JSON-based configuration.

### What's the difference between MCP and this framework?
MCP is the protocol specification. This framework is a full-featured server implementation with added features like pluggable handlers, validation, security, and multiple transport types.

### Can I use this in production?
Yes. See [DEPLOYMENT.md](./guides/DEPLOYMENT.md) for production setup, security hardening, and scaling strategies.

### What transport should I use?
- **Stdio:** CLI tools, local scripts
- **Stateless HTTP:** Serverless, Lambda functions
- **Stateful HTTP:** Web applications, persistent sessions
See [TRANSPORTS.md](./reference/TRANSPORTS.md) for detailed comparison.

### How do I add custom tools?
See [HANDLER-GUIDE.md](./guides/HANDLER-DEVELOPMENT.md) - start with file handlers, which are the most flexible and secure.

### How secure is this framework?
Includes session management, API key authentication, rate limiting, input validation, and audit logging. See [DEPLOYMENT.md - Security Hardening](./guides/DEPLOYMENT.md#security-hardening) for full security features.

### Can I extend the framework?
Yes. The framework is designed for extensibility through:
- Custom handlers
- Validation patterns
- Transport implementations
- Middleware plugins

See [ARCHITECTURE.md - Extension Points](./architecture/TECHNICAL.md#extension-points).

---

## 📝 Contributing

### Documentation Guidelines
- Keep examples practical and tested
- Include time estimates for reading
- Provide working code samples
- Update this index when adding new docs
- Cross-reference related documents

### Reporting Issues
- Check [TESTING.md](./testing/OVERVIEW.md) for known issues
- Include server version and transport type
- Provide configuration and error logs
- Test with example configs first

---

## 📊 Documentation Metrics

| Category | Documents | Total Pages | Est. Reading Time |
|----------|-----------|-------------|-------------------|
| Getting Started | 2 | ~10 | 30 min |
| Architecture | 3 | ~45 | 135 min |
| Developer Guides | 4 | ~60 | 165 min |
| Reference | 3 | ~20 | 60 min |
| Examples | 5 configs | N/A | 30 min |
| **Total** | **17** | **~135** | **~7 hours** |

---

## 🎯 What's Next?

After reading the documentation:

1. **Build Your First Tool**
   - Start with [basic-config.json](../examples/basic-config.json)
   - Follow [HANDLER-GUIDE.md](./guides/HANDLER-DEVELOPMENT.md)
   - Test with [API-EXAMPLES.md](./guides/API-INTEGRATION.md) curl commands

2. **Go to Production**
   - Review [DEPLOYMENT.md](./guides/DEPLOYMENT.md) checklist
   - Use [production-config.json](../examples/production-config.json) as template
   - Set up monitoring and logging

3. **Join the Community**
   - Share your use case
   - Contribute handlers
   - Improve documentation

---

**Happy Building!** 🚀

For questions or feedback, see the main [README.md](../README.md) for contact information.
