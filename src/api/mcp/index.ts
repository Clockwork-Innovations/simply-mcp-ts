/**
 * MCP Builder API - Foundation Layer
 *
 * A specialized API for creating MCP servers that help build other MCP servers.
 * This API provides preset tool collections following Anthropic's agent-driven
 * development principles.
 *
 * ## Overview
 *
 * The MCP Builder API is the 5th API style for Simply MCP, joining:
 * 1. Decorator API (`@MCPServer`, `@tool`)
 * 2. Functional API (`defineMCP()`)
 * 3. Interface API (`interface ITool`)
 * 4. Programmatic API (`new BuildMCPServer()`)
 * 5. **MCP Builder API** (`defineMCPBuilder()`) ← New!
 *
 * ## Key Features
 *
 * - **Preset System**: Pre-built tool collections for MCP development
 * - **Agent-Optimized**: Tools designed for AI agent workflows
 * - **Anthropic-Aligned**: Follows agent tool-building best practices
 * - **Composable**: Mix presets with custom tools (in Layer 2+)
 * - **Type-Safe**: Full TypeScript support
 *
 * ## Quick Start
 *
 * ```typescript
 * import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev',
 *   version: '1.0.0',
 *   toolPresets: [DesignToolsPreset]
 * });
 * ```
 *
 * Run it:
 * ```bash
 * simply-mcp run mcp-dev.ts
 * ```
 *
 * ## Available Presets (Foundation Layer)
 *
 * - **DesignToolsPreset**: Tools for designing MCP tools and Zod schemas
 *   - `design_tool` - Interactive tool design assistant
 *   - `create_zod_schema` - Generate Zod schemas
 *   - `validate_schema` - Validate schema quality
 *
 * ## Example: MCP Development Server
 *
 * ```typescript
 * import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';
 *
 * export default defineMCPBuilder({
 *   name: 'mcp-dev-assistant',
 *   version: '1.0.0',
 *   description: 'Agent-driven MCP development assistant',
 *   toolPresets: [DesignToolsPreset],
 *   port: 3000 // Optional: for HTTP transport
 * });
 * ```
 *
 * ## Layered Development
 *
 * This is Layer 1 (Foundation). Additional presets coming in Layer 2:
 * - TestToolsPreset (testing & validation)
 * - GenerateToolsPreset (code generation)
 * - AnalyzeToolsPreset (analysis & refinement)
 * - WorkflowPromptsPreset (agent workflows)
 * - KnowledgeResourcesPreset (documentation)
 *
 * @module api/mcp
 */

// ============================================================================
// Types
// ============================================================================
export type {
  MCPBuilderTool,
  ToolPreset,
  MCPBuilderConfig,
} from './types.js';

// ============================================================================
// Builders
// ============================================================================
export {
  defineMCPBuilder,
} from './builders.js';

// ============================================================================
// Adapter (for internal use and advanced users)
// ============================================================================
export {
  createServerFromMCPBuilder,
  loadMCPBuilderServer,
  isMCPBuilderFile,
} from './adapter.js';

// ============================================================================
// Presets - Foundation Layer
// ============================================================================
export {
  DesignToolsPreset,
} from './presets/index.js';

// Layer 2 presets will be added when Feature Layer is implemented:
// - TestToolsPreset
// - GenerateToolsPreset
// - AnalyzeToolsPreset
// - WorkflowPromptsPreset
// - KnowledgeResourcesPreset
