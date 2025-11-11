# Production MCP Servers

This directory contains production-ready MCP servers that ship with the Simply MCP framework.

## Available Servers

### simply-mcp-builder.ts

An MCP server that teaches LLMs how to build MCP servers using Simply MCP.

**Purpose**: Meta-tool for MCP development - provides step-by-step instructions, patterns, and examples.

**Features**:
- Interactive prompts for building MCP servers from scratch, REST APIs, or TypeScript classes
- Quick reference resources for common tool, resource, and prompt patterns
- Complete guides loaded from docs/
- Validation cheatsheets
- Example code snippets

**Usage**:
```bash
# Run with simply-mcp CLI
simply-mcp run servers/simply-mcp-builder.ts

# Use with Claude CLI
claude --mcp-config <config> "Show me how to build an MCP server"
```

**Resources**:
- `quickref://tool-patterns` - Common tool implementation patterns
- `quickref://resource-patterns` - Common resource patterns
- `quickref://prompt-patterns` - Prompt patterns with type inference
- `quickref://validation-cheatsheet` - IParam validation reference
- `quickref://conversion-guide` - API/class conversion checklist
- `guide://quick-start` - Quick start guide
- `guide://tools` - Tools guide
- `guide://prompts` - Prompts guide
- `guide://resources` - Resources guide
- `example://minimal` - Minimal example server
- `example://advanced` - Advanced example server

**Prompts**:
- `how_to_build_mcp` - Step-by-step instructions for building MCP servers
- `convert_rest_api` - Convert REST APIs to MCP servers
- `convert_class` - Convert TypeScript classes to MCP servers

## Adding New Servers

When adding production-ready MCP servers to this directory:

1. Ensure the server is fully tested and documented
2. Include clear descriptions for all tools, resources, and prompts
3. Follow the interface-based pattern (ITool, IResource, IPrompt)
4. Add usage examples to this README
5. Consider adding the server to package.json scripts for easy access
