# In-Progress Features

This document tracks features currently under active development for SimpleMCP.

## Active Development

### Interface-Driven API (v3.0.0)

**Status:** 🟡 Proposal - Design Phase
**Timeline:** Q1-Q2 2025 (Estimated 8-10 weeks)
**Priority:** High

A new API paradigm that provides the cleanest, most TypeScript-native way to define MCP servers using pure TypeScript interfaces.

**Key Features:**
- Pure TypeScript interface definitions
- Zero boilerplate - just write interfaces
- Automatic schema generation from types
- Tools implemented as class methods
- Prompts and resources as pure static interfaces (no implementation needed)
- Full type safety and IntelliSense
- AST-powered parsing and code generation

**Import Path:** `simply-mcp/types`

**Example:**
```typescript
import type { Tool, Prompt, Resource, Server } from 'simply-mcp/types';

interface GetWeatherTool extends Tool {
  name: 'get_weather';
  description: 'Get current weather';
  params: { location: string; units?: 'celsius' | 'fahrenheit'; };
  result: { temperature: number; conditions: string; };
}

interface WeatherServiceServer extends Server {
  name: 'weather-service';
  version: '1.0.0';
}

export default class WeatherService implements WeatherServiceServer {
  getWeather: GetWeatherTool = async (params) => {
    // Implementation with full type safety
  }
}
```

**Detailed Proposal:** [Interface-Driven API](./in-progress/INTERFACE_DRIVEN_API.md)

**Current Phase:** Phase 1 - Design & Community Feedback

**Next Steps:**
1. Community feedback and design review
2. Core type definitions implementation
3. AST parser development
4. Schema generator
5. CLI integration

---

## Completed Features

### Unified Import Pattern (v2.5.0)

**Status:** ✅ Completed
**Released:** v2.5.0

All exports now available from main `'simply-mcp'` package. Subpath imports (`simply-mcp/decorators`, `simply-mcp/config`) are deprecated and will be removed in v4.0.0.

### Auto-Detection and Aliases (v2.4.6)

**Status:** ✅ Completed
**Released:** v2.4.6

- CLI automatically detects API style (decorator, functional, programmatic)
- Command aliases for easier usage (`simple-mcp`, `smcp`)
- Improved UX and documentation

---

## Planned Features

### Enhanced Validation System

**Status:** 📋 Planned
**Timeline:** Q2 2025
**Priority:** Medium

Enhanced input validation with better error messages and support for custom validators.

### Plugin System

**Status:** 📋 Planned
**Timeline:** Q3 2025
**Priority:** Low

Plugin architecture for extending SimpleMCP functionality.

### Visual Studio Code Extension

**Status:** 📋 Planned
**Timeline:** Q3 2025
**Priority:** Medium

VS Code extension providing:
- Interface validation and linting
- Real-time error checking
- Autocomplete for schemas
- Tool testing within IDE

---

## API Paradigms Overview

SimpleMCP supports multiple API paradigms to suit different development styles:

| API Style | Import | Best For | Status |
|-----------|--------|----------|--------|
| **Decorator** | `simply-mcp` | Quick servers, Python developers | ✅ Stable |
| **Functional** | `simply-mcp` | Config-driven, declarative | ✅ Stable |
| **Programmatic** | `simply-mcp` | Complex apps, full control | ✅ Stable |
| **Interface-Driven** | `simply-mcp/types` | Enterprise, pure TypeScript | 🟡 In Progress |

All APIs can coexist in the same codebase and are fully interoperable.

---

## How to Contribute

Want to help with in-progress features?

1. **Provide Feedback:** Review proposals and share your thoughts in [GitHub Discussions](https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions)
2. **Test Early Builds:** Try pre-release versions and report issues
3. **Contribute Code:** Check implementation plans in feature proposals
4. **Improve Documentation:** Help document new features and write examples

---

## Status Legend

- ✅ **Completed** - Feature is released and stable
- 🟢 **In Development** - Actively being coded
- 🟡 **Proposal** - Design phase, gathering feedback
- 📋 **Planned** - On roadmap, not yet started
- 🔴 **On Hold** - Paused or blocked

---

**Last Updated:** 2025-10-06
**Next Review:** Monthly during active development
