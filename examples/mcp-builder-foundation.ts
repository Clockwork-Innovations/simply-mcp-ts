/**
 * MCP Builder - Foundation Layer Example
 *
 * Demonstrates the MCP Builder API with the Design Tools preset.
 * This is a minimal example showing the foundation layer capabilities.
 *
 * The MCP Builder API is a new API style specifically designed for creating
 * MCP servers that help build other MCP servers. It uses preset tool collections
 * following Anthropic's agent-driven development principles.
 *
 * ## What This Server Provides
 *
 * This server includes the DesignToolsPreset which provides 3 tools:
 * - `design_tool` - Interactive assistant for designing MCP tools
 * - `create_zod_schema` - Generate Zod schemas from descriptions
 * - `validate_schema` - Validate schema quality and best practices
 *
 * ## Usage
 *
 * Run with stdio transport (default):
 * ```bash
 * simply-mcp run examples/mcp-builder-foundation.ts
 * ```
 *
 * Run with HTTP transport:
 * ```bash
 * simply-mcp run examples/mcp-builder-foundation.ts --http --port 3000
 * ```
 *
 * ## Example Agent Workflow
 *
 * 1. Agent calls `design_tool` with tool purpose
 * 2. Receives structured tool design with recommendations
 * 3. Calls `create_zod_schema` to generate schema code
 * 4. Calls `validate_schema` to check quality
 * 5. Iterates on design based on validation feedback
 *
 * ## Why Use MCP Builder API?
 *
 * Instead of writing individual tools from scratch, you use pre-built,
 * battle-tested tool collections. This ensures:
 * - Consistency with Anthropic's best practices
 * - High-quality, agent-optimized tool descriptions
 * - Faster development of MCP development servers
 * - Reusable components across projects
 */

import { defineMCPBuilder, DesignToolsPreset } from '../src/api/mcp/index.js';

export default defineMCPBuilder({
  name: 'mcp-dev-foundation',
  version: '1.0.0',
  description: 'MCP development assistant (foundation layer with design tools)',
  toolPresets: [DesignToolsPreset],
});
