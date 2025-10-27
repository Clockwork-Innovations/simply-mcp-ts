# Simply MCP Documentation

Master index for all Simply MCP guides and examples. Find what you need below.

---

## 🚀 Getting Started (Start Here!)

**New to Simply MCP?** Start with one of these:

1. **[QUICK_START.md](./guides/QUICK_START.md)** - 5-minute intro with runnable examples
2. **[API Core Reference](./guides/API_CORE.md)** - Core types and transport configuration
3. **[EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md)** - Browse all 50+ code examples by use case

---

## 📚 Core Topics

### Understanding the Basics

- **[What is MCP?](https://modelcontextprotocol.io)** - Model Context Protocol overview
- **[API Core](./guides/API_CORE.md)** - Core types and transport configuration
- **[API Features](./guides/API_FEATURES.md)** - Tools, prompts, and resources
- **[API Protocol](./guides/API_PROTOCOL.md)** - Sampling, elicitation, roots, subscriptions
- **[Your First Server](./guides/QUICK_START.md)** - Complete working example

### Building Servers

- **Adding Tools** - See [TOOLS.md](./guides/TOOLS.md) and [examples/interface-advanced.ts](../examples/interface-advanced.ts)
- **Adding Prompts** - See [PROMPTS.md](./guides/PROMPTS.md) and [examples/interface-file-prompts.ts](../examples/interface-file-prompts.ts)
- **Adding Resources** - See [RESOURCES.md](./guides/RESOURCES.md) and [examples/interface-protocol-comprehensive.ts](../examples/interface-protocol-comprehensive.ts)
- **Error Handling** - See [ERROR_HANDLING.md](./guides/ERROR_HANDLING.md)

### API Reference

**Core API Documentation:**
- **[API Core](./guides/API_CORE.md)** - Core types and transport configuration
- **[API Features](./guides/API_FEATURES.md)** - Tools, prompts, and resources
- **[API Protocol](./guides/API_PROTOCOL.md)** - Sampling, elicitation, roots, subscriptions

Type-safe, interface-based development with full IDE support and autocomplete.
Example: [examples/interface-minimal.ts](../examples/interface-minimal.ts)

---

## 🔧 Features & Capabilities

### Core Features

- **[Tools](./guides/TOOLS.md)** - Add capabilities to your server
- **[Prompts](./guides/PROMPTS.md)** - Template-based prompts for LLMs
- **[Resources](./guides/RESOURCES.md)** - Shared data and configuration
- **[Configuration](./guides/CONFIGURATION.md)** - Server setup and options
- **[Error Handling](./guides/ERROR_HANDLING.md)** - Robust error management

### Distribution & Deployment

- **[Bundling Guide](./guides/BUNDLING.md)** - Create single-file or package bundles
  - Single-file bundles (most portable)
  - Package bundles (with dependencies)
  - ESM/CJS formats for libraries
- **[Deployment Guide](./guides/DEPLOYMENT_GUIDE.md)** - Deploy to production
  - Docker, systemd, cloud platforms
  - Environment configuration
  - Health checks and monitoring

### Communication & Transport

- **[Transport Overview](./guides/TRANSPORT_OVERVIEW.md)** - Compare and choose transport
- **[Stdio Transport](./guides/TRANSPORT_STDIO.md)** - For Claude Desktop integration
- **[HTTP Transport](./guides/TRANSPORT_HTTP.md)** - Stateful/stateless modes
- **[Advanced Transport](./guides/TRANSPORT_ADVANCED.md)** - Multi-transport, production deployment

### Development Tools

- **[CLI Basics](./guides/CLI_BASICS.md)** - Basic commands and common usage
- **[CLI Advanced](./guides/CLI_ADVANCED.md)** - Bundling, debugging, advanced features
- **[Watch Mode Guide](./guides/WATCH_MODE_GUIDE.md)** - Auto-reload during development
- **[Debugging](./guides/DEBUGGING.md)** - Debug your server

---

## 📖 Guides by Topic

### For Different Scenarios

**Building a simple tool?**
→ [QUICK_START.md](./guides/QUICK_START.md) → [examples/interface-minimal.ts](../examples/interface-minimal.ts)

**Building a production server?**
→ [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) → [Bundling Guide](./guides/BUNDLING.md)

**Need API documentation?**
→ [API Core](./guides/API_CORE.md) → [API Features](./guides/API_FEATURES.md) → See examples/

**Need HTTP endpoints?**
→ [Transport Overview](./guides/TRANSPORT_OVERVIEW.md) → [HTTP Transport](./guides/TRANSPORT_HTTP.md)

**Want to bundle for sharing?**
→ [BUNDLING.md](./guides/BUNDLING.md)

**Running in production?**
→ [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md)

### By Skill Level

**Beginner**
1. [QUICK_START.md](./guides/QUICK_START.md) - Get running in 5 minutes
2. [API Core](./guides/API_CORE.md) - Core types and configuration
3. [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) - Find a similar example

**Intermediate**
1. [TOOLS.md](./guides/TOOLS.md) - Add capabilities
2. [Transport Overview](./guides/TRANSPORT_OVERVIEW.md) - Choose your transport
3. [WATCH_MODE_GUIDE.md](./guides/WATCH_MODE_GUIDE.md) - Speed up development

**Advanced**
1. [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) - Production setup
2. [BUNDLING.md](./guides/BUNDLING.md) - Distribution strategies
3. [CONFIGURATION.md](./guides/CONFIGURATION.md) - Fine-tuning
4. [DEBUGGING.md](./guides/DEBUGGING.md) - Advanced troubleshooting

---

## 💻 Code Examples

**[EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md)** - Complete index of all examples

Quick access to common patterns:

| Need | Example | Run |
|------|---------|-----|
| Hello World | `interface-minimal.ts` | `npx tsx examples/interface-minimal.ts` |
| Add tools | `interface-advanced.ts` | `npx tsx examples/interface-advanced.ts` |
| Prompts & Resources | `interface-comprehensive.ts` | `npx tsx examples/interface-comprehensive.ts` |
| File-based prompts | `interface-file-prompts.ts` | `npx tsx examples/interface-file-prompts.ts` |
| HTTP transport | Any example with `--http` flag | `npx simply-mcp run examples/interface-minimal.ts --http --port 3000` |

**Run any example with:**
```bash
npx tsx examples/[filename].ts
```

---

## ❓ Troubleshooting

**Can't find what you need?**

- Check [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) - Search by feature
- Run `grep -r "your-topic" docs/` to find mentions
- Check [DEBUGGING.md](./guides/DEBUGGING.md) for common issues

**API questions?**

- See [API Core](./guides/API_CORE.md), [API Features](./guides/API_FEATURES.md), or [API Protocol](./guides/API_PROTOCOL.md)
- See [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) for code patterns

**Deployment issues?**

- See [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md)
- See [BUNDLING.md](./guides/BUNDLING.md) for distribution

**Performance issues?**

- See [Transport Overview](./guides/TRANSPORT_OVERVIEW.md) - Choose optimal transport
- See [Transport Advanced](./guides/TRANSPORT_ADVANCED.md) - Production optimization
- See [CONFIGURATION.md](./guides/CONFIGURATION.md) - Performance tuning

---

## 🗂️ Documentation Structure

This documentation is organized into focused guides:

```
docs/
├── README.md (YOU ARE HERE - master index)
├── guides/
│   ├── QUICK_START.md              (→ START HERE!)
│   │
│   ├── API_CORE.md                 (Core types & transport config)
│   ├── API_FEATURES.md             (Tools, prompts, resources)
│   ├── API_PROTOCOL.md             (Sampling, elicitation, roots, subscriptions)
│   │
│   ├── TOOLS.md                    (Adding tools)
│   ├── PROMPTS.md                  (Prompts & templates)
│   ├── RESOURCES.md                (Resources)
│   ├── CONFIGURATION.md            (Server config)
│   ├── ERROR_HANDLING.md           (Error management)
│   │
│   ├── TRANSPORT_OVERVIEW.md       (Compare & choose transport)
│   ├── TRANSPORT_STDIO.md          (Claude Desktop integration)
│   ├── TRANSPORT_HTTP.md           (Stateful/stateless modes)
│   ├── TRANSPORT_ADVANCED.md       (Multi-transport, production)
│   │
│   ├── CLI_BASICS.md               (Basic commands)
│   ├── CLI_ADVANCED.md             (Bundling, debugging)
│   │
│   ├── BUNDLING.md                 (Distribution)
│   ├── DEPLOYMENT_GUIDE.md         (Production)
│   ├── WATCH_MODE_GUIDE.md         (Development)
│   └── DEBUGGING.md                (Troubleshooting)
│
├── migration/
│   └── DECORATOR_TO_INTERFACE.md   (Migration guide)
│
└── [other development docs]

examples/
├── EXAMPLES_INDEX.md               (All examples organized)
├── interface-minimal.ts            (START HERE!)
├── interface-advanced.ts           (Multiple tools)
├── interface-comprehensive.ts      (Full-featured server)
├── interface-file-prompts.ts       (File-based prompts)
├── [legacy examples for migration reference]
└── [subdirectories for bundles, ui, etc.]
```

---

## 🎯 Quick Navigation

| I want to... | Go to |
|---|---|
| Get started quickly | [QUICK_START.md](./guides/QUICK_START.md) |
| Learn core API types | [API Core](./guides/API_CORE.md) |
| Add features (tools/prompts/resources) | [API Features](./guides/API_FEATURES.md) |
| Use protocol features | [API Protocol](./guides/API_PROTOCOL.md) |
| See working code | [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) |
| Choose a transport | [Transport Overview](./guides/TRANSPORT_OVERVIEW.md) |
| Use stdio (Claude Desktop) | [Stdio Transport](./guides/TRANSPORT_STDIO.md) |
| Use HTTP transport | [HTTP Transport](./guides/TRANSPORT_HTTP.md) |
| Learn CLI commands | [CLI Basics](./guides/CLI_BASICS.md) |
| Bundle or debug | [CLI Advanced](./guides/CLI_ADVANCED.md) |
| Deploy to production | [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) |
| Speed up development | [WATCH_MODE_GUIDE.md](./guides/WATCH_MODE_GUIDE.md) |

---

## 📝 Version

**Documentation Version:** 3.0.0+
**Last Updated:** 2025-10-17
**Package Version:** See package.json

---

## 🤝 Contributing

Found an issue? Want to improve docs?

- Report bugs: [GitHub Issues](https://github.com/Clockwork-Innovations/simply-mcp-ts/issues)
- Suggest improvements: Create an issue with "docs:" prefix
- All examples should be runnable (tested regularly)

---

**Start with [QUICK_START.md](./guides/QUICK_START.md) or browse examples at [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md)!**
