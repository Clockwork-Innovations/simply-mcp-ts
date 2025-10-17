# Simply MCP Documentation

Master index for all Simply MCP guides and examples. Find what you need below.

---

## 🚀 Getting Started (Start Here!)

**New to Simply MCP?** Start with one of these:

1. **[QUICK_START.md](./guides/QUICK_START.md)** - 5-minute intro with runnable examples
2. **[EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md)** - Browse all 50+ code examples by use case
3. **[API_GUIDE.md](./guides/API_GUIDE.md)** - Compare the 4 API styles

---

## 📚 Core Topics

### Understanding the Basics

- **[What is MCP?](./guides/API_GUIDE.md#-quick-comparison)** - Model Context Protocol overview
- **[API Styles](./guides/API_GUIDE.md)** - Functional vs Decorator vs Interface vs MCPBuilder
  - Which should you use? See [API_GUIDE.md](./guides/API_GUIDE.md#decision-tree)
- **[Your First Server](./guides/QUICK_START.md#your-first-server-choose-your-style)** - Complete working example

### Building Servers

- **Adding Tools** - See [examples/single-file-advanced.ts](../examples/single-file-advanced.ts)
- **Adding Prompts** - See [examples/class-prompts-resources.ts](../examples/class-prompts-resources.ts)
- **Adding Resources** - See [examples/class-prompts-resources.ts](../examples/class-prompts-resources.ts)
- **Error Handling** - See [examples/auto-install-error-handling.ts](../examples/auto-install-error-handling.ts)

### API Reference

Choose your API style for detailed reference:

- **[Functional API](./guides/FUNCTIONAL_API_REFERENCE.md)** - Simple, JavaScript-first
  - Example: [examples/single-file-basic.ts](../examples/single-file-basic.ts)
- **[Decorator API](./guides/DECORATOR_API_REFERENCE.md)** - Class-based, OOP
  - Example: [examples/class-basic.ts](../examples/class-basic.ts)
- **[Interface API](./guides/INTERFACE_API_REFERENCE.md)** - Strict types, TypeScript-first
  - Example: [examples/interface-minimal.ts](../examples/interface-minimal.ts)
- **[MCPBuilder](./guides/MCCPBUILDER_API_REFERENCE.md)** - Fluent builder pattern
  - Example: [examples/mcp-builder-foundation.ts](../examples/mcp-builder-foundation.ts)

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

- **[Transport Guide](./guides/TRANSPORT_GUIDE.md)** - HTTP, WebSocket, stdio
  - Stateful vs stateless HTTP
  - Performance considerations
  - WebSocket for real-time

### Development Tools

- **[CLI Reference](./guides/CLI_REFERENCE.md)** - Command-line interface
  - `simplymcp run`, `bundle`, `create-bundle`
  - Flags and options
- **[Watch Mode Guide](./guides/WATCH_MODE_GUIDE.md)** - Auto-reload during development
- **[Debugging](./guides/DEBUGGING.md)** - Debug your server
  - Breakpoints, logs, verbose output

---

## 📖 Guides by Topic

### For Different Scenarios

**Building a simple tool?**
→ [QUICK_START.md](./guides/QUICK_START.md) → [examples/single-file-basic.ts](../examples/single-file-basic.ts)

**Building a production server?**
→ [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) → [Bundling Guide](./guides/BUNDLING.md)

**Integrating with existing code?**
→ [API_GUIDE.md](./guides/API_GUIDE.md) → Pick your API style → See examples/

**Need HTTP endpoints?**
→ [TRANSPORT_GUIDE.md](./guides/TRANSPORT_GUIDE.md)

**Want to bundle for sharing?**
→ [BUNDLING.md](./guides/BUNDLING.md)

**Running in production?**
→ [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md)

### By Skill Level

**Beginner**
1. [QUICK_START.md](./guides/QUICK_START.md) - Get running in 5 minutes
2. [API_GUIDE.md](./guides/API_GUIDE.md) - Understand your options
3. [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) - Find a similar example

**Intermediate**
1. [TOOLS.md](./guides/TOOLS.md) - Add capabilities
2. [TRANSPORT_GUIDE.md](./guides/TRANSPORT_GUIDE.md) - Use HTTP or WebSocket
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
| Hello World (Functional) | `single-file-basic.ts` | `npx tsx examples/single-file-basic.ts` |
| Hello World (Decorator) | `class-basic.ts` | `npx tsx examples/class-basic.ts` |
| Add tools | `single-file-advanced.ts` | `npx tsx examples/single-file-advanced.ts` |
| Prompts & Resources | `class-prompts-resources.ts` | `npx tsx examples/class-prompts-resources.ts` |
| Error handling | `auto-install-error-handling.ts` | `npx tsx examples/auto-install-error-handling.ts` |
| Bundle example | See `calculator-bundle/` | `cd examples/calculator-bundle && npm install && npm start` |
| HTTP transport | Any example with `--http` flag | `npx simply-mcp run examples/single-file-basic.ts --http --port 3000` |

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

**API-specific issues?**

- Functional API → See [FUNCTIONAL_API_REFERENCE.md](./guides/FUNCTIONAL_API_REFERENCE.md)
- Decorator API → See [DECORATOR_API_REFERENCE.md](./guides/DECORATOR_API_REFERENCE.md)
- Interface API → See [INTERFACE_API_REFERENCE.md](./guides/INTERFACE_API_REFERENCE.md)
- MCPBuilder → See [MCCPBUILDER_API_REFERENCE.md](./guides/MCCPBUILDER_API_REFERENCE.md)

**Deployment issues?**

- See [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md)
- See [BUNDLING.md](./guides/BUNDLING.md) for distribution

**Performance issues?**

- See [TRANSPORT_GUIDE.md](./guides/TRANSPORT_GUIDE.md) - Connection options
- See [CONFIGURATION.md](./guides/CONFIGURATION.md) - Performance tuning

---

## 🗂️ Documentation Structure

This documentation is organized into focused guides:

```
docs/
├── README.md (YOU ARE HERE - master index)
├── guides/
│   ├── QUICK_START.md              (→ START HERE!)
│   ├── API_GUIDE.md                (Compare all 4 APIs)
│   ├── TOOLS.md                    (Adding tools)
│   ├── PROMPTS.md                  (Prompts & templates)
│   ├── RESOURCES.md                (Resources)
│   ├── CONFIGURATION.md            (Server config)
│   ├── ERROR_HANDLING.md           (Error management)
│   ├── BUNDLING.md                 (Distribution)
│   ├── TRANSPORT_GUIDE.md          (HTTP, WebSocket, stdio)
│   ├── DEPLOYMENT_GUIDE.md         (Production)
│   ├── CLI_REFERENCE.md            (Commands)
│   ├── WATCH_MODE_GUIDE.md         (Development)
│   ├── DEBUGGING.md                (Troubleshooting)
│   ├── FUNCTIONAL_API_REFERENCE.md (Functional API details)
│   ├── DECORATOR_API_REFERENCE.md  (Decorator API details)
│   ├── INTERFACE_API_REFERENCE.md  (Interface API details)
│   └── MCCPBUILDER_API_REFERENCE.md (MCPBuilder details)
│
├── development/
│   └── IMPORT_STYLE_GUIDE.md       (For contributors)
│
└── [other development docs]

examples/
├── EXAMPLES_INDEX.md               (All 50+ examples organized)
├── single-file-basic.ts            (Functional API - START HERE!)
├── class-basic.ts                  (Decorator API)
├── interface-minimal.ts            (Interface API)
├── mcp-builder-foundation.ts       (MCPBuilder)
├── [40+ more examples...]
└── [subdirectories for bundles, ui, etc.]
```

---

## 🎯 Quick Navigation

| I want to... | Go to |
|---|---|
| Get started quickly | [QUICK_START.md](./guides/QUICK_START.md) |
| Learn about APIs | [API_GUIDE.md](./guides/API_GUIDE.md) |
| See working code | [EXAMPLES_INDEX.md](../examples/EXAMPLES_INDEX.md) |
| Add tools to my server | [TOOLS.md](./guides/TOOLS.md) |
| Use HTTP transport | [TRANSPORT_GUIDE.md](./guides/TRANSPORT_GUIDE.md) |
| Bundle for sharing | [BUNDLING.md](./guides/BUNDLING.md) |
| Deploy to production | [DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) |
| Find a command | [CLI_REFERENCE.md](./guides/CLI_REFERENCE.md) |
| Debug issues | [DEBUGGING.md](./guides/DEBUGGING.md) |
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
